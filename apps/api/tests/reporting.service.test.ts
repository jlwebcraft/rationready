import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportingService } from '../src/services/reporting.service.js';
import { ShopRepository } from '../src/repositories/shop.repository.js';
import { ReportRepository } from '../src/repositories/report.repository.js';
import {
  Shop,
  Report,
  ReportType,
  UserRole,
  EposStatus,
  CommodityAvailability,
  ConfidenceLevel,
  createReportKey,
} from '../src/domain/types.js';

describe('ReportingService (Trust & Freshness Engine)', () => {
  let mockShopRepo: ShopRepository;
  let mockReportRepo: ReportRepository;
  let service: ReportingService;

  const fixedNow = new Date('2026-11-26T12:00:00.000Z');
  const fixedNowEpoch = Math.floor(fixedNow.getTime() / 1000); // 1795694400

  const mockShop: Shop = {
    shopId: 'shop-001',
    name: 'Fair Price Shop 101',
    locality: 'Sector 5',
    addressOrLandmark: 'Building 12, Market Complex',
    isDemoData: false,
    createdAt: '2026-11-20T00:00:00.000Z',
    updatedAt: '2026-11-20T00:00:00.000Z',
  };

  beforeEach(() => {
    mockShopRepo = {
      getShopById: vi.fn(),
      listShops: vi.fn(),
      saveShop: vi.fn(),
    } as unknown as ShopRepository;

    mockReportRepo = {
      createReport: vi.fn().mockImplementation(async (r) => r),
      getReportsByShopId: vi.fn(),
      getAllReportsByShopId: vi.fn(),
      findRecentUserReport: vi.fn(),
    } as unknown as ReportRepository;

    service = new ReportingService({
      shopRepo: mockShopRepo,
      reportRepo: mockReportRepo,
      clock: () => fixedNow,
    });
  });

  describe('submitReport', () => {
    it('successfully persists a QUEUE report with correct server timestamps and 2-hour TTL', async () => {
      vi.mocked(mockShopRepo.getShopById).mockResolvedValueOnce(mockShop);
      vi.mocked(mockReportRepo.findRecentUserReport).mockResolvedValueOnce(null);

      const result = await service.submitReport(
        'shop-001',
        { reportType: ReportType.QUEUE, payload: { waitMinutes: 25 } },
        'user-sub-1',
        UserRole.BENEFICIARY
      );

      expect(result.shopId).toBe('shop-001');
      expect(result.reportType).toBe(ReportType.QUEUE);
      expect(result.createdAt).toBe('2026-11-26T12:00:00.000Z');
      expect(result.expiresAt).toBe(fixedNowEpoch + 2 * 60 * 60); // 7200s
      expect(result.isDemoData).toBe(false);
      expect(result.reporterSub).toBe('user-sub-1');
      expect(result.reporterRole).toBe(UserRole.BENEFICIARY);
      expect(result.reportKey).toMatch(/^REPORT#2026-11-26T12:00:00\.000Z#/);
      expect(mockReportRepo.createReport).toHaveBeenCalledWith(result);
    });

    it('sets 4-hour TTL for EPOS and 24-hour TTL for STOCK reports', async () => {
      vi.mocked(mockShopRepo.getShopById).mockResolvedValue(mockShop);
      vi.mocked(mockReportRepo.findRecentUserReport).mockResolvedValue(null);

      // EPOS
      const eposResult = await service.submitReport(
        'shop-001',
        { reportType: ReportType.EPOS, payload: { status: EposStatus.WORKING } },
        'user-sub-1',
        UserRole.BENEFICIARY
      );
      expect(eposResult.expiresAt).toBe(fixedNowEpoch + 4 * 60 * 60); // 14400s

      // STOCK
      const stockResult = await service.submitReport(
        'shop-001',
        {
          reportType: ReportType.STOCK,
          payload: { commodityCode: 'RICE', availability: CommodityAvailability.AVAILABLE },
        },
        'user-sub-1',
        UserRole.BENEFICIARY
      );
      expect(stockResult.expiresAt).toBe(fixedNowEpoch + 24 * 60 * 60); // 86400s
    });

    it('throws 404 SHOP_NOT_FOUND when shopId does not exist', async () => {
      vi.mocked(mockShopRepo.getShopById).mockResolvedValueOnce(null);

      await expect(
        service.submitReport(
          'non-existent',
          { reportType: ReportType.QUEUE, payload: { waitMinutes: 10 } },
          'user-sub-1',
          UserRole.BENEFICIARY
        )
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'SHOP_NOT_FOUND',
      });
      expect(mockReportRepo.createReport).not.toHaveBeenCalled();
    });

    it('P3-05: throws 429 COOLDOWN_ACTIVE when a duplicate report occurs within 60 seconds', async () => {
      vi.mocked(mockShopRepo.getShopById).mockResolvedValueOnce(mockShop);
      const existingReport: Report = {
        shopId: 'shop-001',
        reportKey: createReportKey('2026-11-26T11:59:30.000Z', 'rep-prev'),
        reportId: 'rep-prev',
        reportType: ReportType.QUEUE,
        createdAt: '2026-11-26T11:59:30.000Z',
        expiresAt: fixedNowEpoch + 7200,
        reporterSub: 'user-sub-1',
        reporterRole: UserRole.BENEFICIARY,
        payload: { waitMinutes: 15 },
        isDemoData: false,
      };
      vi.mocked(mockReportRepo.findRecentUserReport).mockResolvedValueOnce(existingReport);

      await expect(
        service.submitReport(
          'shop-001',
          { reportType: ReportType.QUEUE, payload: { waitMinutes: 20 } },
          'user-sub-1',
          UserRole.BENEFICIARY
        )
      ).rejects.toMatchObject({
        statusCode: 429,
        code: 'COOLDOWN_ACTIVE',
      });
      expect(mockReportRepo.createReport).not.toHaveBeenCalled();
    });

    it('fails closed (throws) if recent report lookup in DynamoDB fails', async () => {
      vi.mocked(mockShopRepo.getShopById).mockResolvedValueOnce(mockShop);
      vi.mocked(mockReportRepo.findRecentUserReport).mockRejectedValueOnce(
        new Error('DynamoDB connection timeout')
      );

      await expect(
        service.submitReport(
          'shop-001',
          { reportType: ReportType.QUEUE, payload: { waitMinutes: 20 } },
          'user-sub-1',
          UserRole.BENEFICIARY
        )
      ).rejects.toThrow('DynamoDB connection timeout');
      expect(mockReportRepo.createReport).not.toHaveBeenCalled();
    });
  });

  describe('getShopStatus', () => {
    it('returns UNKNOWN with 0 distinct reporters and LOW confidence when no reports exist', async () => {
      vi.mocked(mockShopRepo.getShopById).mockResolvedValueOnce(mockShop);
      vi.mocked(mockReportRepo.getAllReportsByShopId).mockResolvedValueOnce([]);

      const status = await service.getShopStatus('shop-001');

      expect(status.shopId).toBe('shop-001');
      expect(status.generatedAt).toBe('2026-11-26T12:00:00.000Z');

      // Queue
      expect(status.queue.waitMinutes).toBe('UNKNOWN');
      expect(status.queue.latestReportAt).toBeNull();
      expect(status.queue.ageSeconds).toBeNull();
      expect(status.queue.distinctReporterCount).toBe(0);
      expect(status.queue.confidence).toBe(ConfidenceLevel.LOW);
      expect(status.queue.sources).toEqual([]);

      // ePOS
      expect(status.epos.status).toBe('UNKNOWN');
      expect(status.epos.distinctReporterCount).toBe(0);
      expect(status.epos.confidence).toBe(ConfidenceLevel.LOW);

      // Stock
      expect(status.stock).toHaveLength(1);
      expect(status.stock[0].commodityCode).toBe('RICE');
      expect(status.stock[0].availability).toBe('UNKNOWN');
      expect(status.stock[0].distinctReporterCount).toBe(0);
      expect(status.stock[0].confidence).toBe(ConfidenceLevel.LOW);
    });

    it('P3-10: strictly filters out expired reports (expiresAt <= nowEpoch)', async () => {
      vi.mocked(mockShopRepo.getShopById).mockResolvedValueOnce(mockShop);

      const expiredReport: Report = {
        shopId: 'shop-001',
        reportKey: createReportKey('2026-11-26T09:00:00.000Z', 'rep-exp'),
        reportId: 'rep-exp',
        reportType: ReportType.QUEUE,
        createdAt: '2026-11-26T09:00:00.000Z',
        expiresAt: fixedNowEpoch - 10, // Expired
        reporterSub: 'user-sub-old',
        reporterRole: UserRole.BENEFICIARY,
        payload: { waitMinutes: 100 },
        isDemoData: false,
      };

      const freshReport: Report = {
        shopId: 'shop-001',
        reportKey: createReportKey('2026-11-26T11:45:00.000Z', 'rep-fresh'),
        reportId: 'rep-fresh',
        reportType: ReportType.QUEUE,
        createdAt: '2026-11-26T11:45:00.000Z',
        expiresAt: fixedNowEpoch + 3600, // Valid for another hour
        reporterSub: 'user-sub-fresh',
        reporterRole: UserRole.BENEFICIARY,
        payload: { waitMinutes: 20 },
        isDemoData: false,
      };

      vi.mocked(mockReportRepo.getAllReportsByShopId).mockResolvedValueOnce([
        expiredReport,
        freshReport,
      ]);

      const status = await service.getShopStatus('shop-001');

      expect(status.queue.distinctReporterCount).toBe(1);
      expect(status.queue.waitMinutes).toBe(20);
      expect(status.queue.latestReportAt).toBe('2026-11-26T11:45:00.000Z');
      expect(status.queue.ageSeconds).toBe(15 * 60); // 900 seconds
    });

    it('P3-06: deduplicates multiple reports from the same user sub keeping the newest', async () => {
      vi.mocked(mockShopRepo.getShopById).mockResolvedValueOnce(mockShop);

      const userOldReport: Report = {
        shopId: 'shop-001',
        reportKey: createReportKey('2026-11-26T11:00:00.000Z', 'rep-1'),
        reportId: 'rep-1',
        reportType: ReportType.QUEUE,
        createdAt: '2026-11-26T11:00:00.000Z',
        expiresAt: fixedNowEpoch + 3600,
        reporterSub: 'same-user',
        reporterRole: UserRole.BENEFICIARY,
        payload: { waitMinutes: 60 },
        isDemoData: false,
      };

      const userNewReport: Report = {
        shopId: 'shop-001',
        reportKey: createReportKey('2026-11-26T11:50:00.000Z', 'rep-2'),
        reportId: 'rep-2',
        reportType: ReportType.QUEUE,
        createdAt: '2026-11-26T11:50:00.000Z',
        expiresAt: fixedNowEpoch + 7000,
        reporterSub: 'same-user',
        reporterRole: UserRole.BENEFICIARY,
        payload: { waitMinutes: 10 },
        isDemoData: false,
      };

      vi.mocked(mockReportRepo.getAllReportsByShopId).mockResolvedValueOnce([
        userOldReport,
        userNewReport,
      ]);

      const status = await service.getShopStatus('shop-001');

      expect(status.queue.distinctReporterCount).toBe(1);
      expect(status.queue.waitMinutes).toBe(10); // Uses newer report (10), not older (60)
    });

    describe('P3-06 & P3-09: Queue median, rounding, and confidence tiers', () => {
      const makeQueueReport = (
        id: string,
        sub: string,
        wait: number,
        role: UserRole = UserRole.BENEFICIARY
      ): Report => ({
        shopId: 'shop-001',
        reportKey: createReportKey('2026-11-26T11:50:00.000Z', id),
        reportId: id,
        reportType: ReportType.QUEUE,
        createdAt: '2026-11-26T11:50:00.000Z',
        expiresAt: fixedNowEpoch + 7200,
        reporterSub: sub,
        reporterRole: role,
        payload: { waitMinutes: wait },
        isDemoData: false,
      });

      it('calculates median for odd count and rounds to 5 minutes', async () => {
        vi.mocked(mockShopRepo.getShopById).mockResolvedValueOnce(mockShop);
        // values: 12, 23, 29 -> sorted: 12, 23, 29. Median is 23. Math.round(23/5)*5 = 25.
        vi.mocked(mockReportRepo.getAllReportsByShopId).mockResolvedValueOnce([
          makeQueueReport('1', 'u1', 12),
          makeQueueReport('2', 'u2', 23),
          makeQueueReport('3', 'u3', 29),
        ]);

        const status = await service.getShopStatus('shop-001');
        expect(status.queue.waitMinutes).toBe(25);
        expect(status.queue.distinctReporterCount).toBe(3);
        // range: 29 - 12 = 17 (16..30) -> MEDIUM
        expect(status.queue.confidence).toBe(ConfidenceLevel.MEDIUM);
      });

      it('calculates median for even count and rounds to 5 minutes', async () => {
        vi.mocked(mockShopRepo.getShopById).mockResolvedValueOnce(mockShop);
        // values: 10, 24 -> sorted: 10, 24. Average is 17. Math.round(17/5)*5 = 15.
        vi.mocked(mockReportRepo.getAllReportsByShopId).mockResolvedValueOnce([
          makeQueueReport('1', 'u1', 10),
          makeQueueReport('2', 'u2', 24),
        ]);

        const status = await service.getShopStatus('shop-001');
        expect(status.queue.waitMinutes).toBe(15);
        expect(status.queue.distinctReporterCount).toBe(2);
        // range: 14 <= 15 -> MEDIUM
        expect(status.queue.confidence).toBe(ConfidenceLevel.MEDIUM);
      });

      it('assigns LOW confidence for 1 reporter', async () => {
        vi.mocked(mockShopRepo.getShopById).mockResolvedValueOnce(mockShop);
        vi.mocked(mockReportRepo.getAllReportsByShopId).mockResolvedValueOnce([
          makeQueueReport('1', 'u1', 20),
        ]);

        const status = await service.getShopStatus('shop-001');
        expect(status.queue.confidence).toBe(ConfidenceLevel.LOW);
      });

      it('assigns MIXED confidence for 2 reporters with range > 15', async () => {
        vi.mocked(mockShopRepo.getShopById).mockResolvedValueOnce(mockShop);
        vi.mocked(mockReportRepo.getAllReportsByShopId).mockResolvedValueOnce([
          makeQueueReport('1', 'u1', 10),
          makeQueueReport('2', 'u2', 30), // range = 20 > 15
        ]);

        const status = await service.getShopStatus('shop-001');
        expect(status.queue.confidence).toBe(ConfidenceLevel.MIXED);
      });

      it('assigns HIGH confidence for 3+ reporters with range <= 15', async () => {
        vi.mocked(mockShopRepo.getShopById).mockResolvedValueOnce(mockShop);
        vi.mocked(mockReportRepo.getAllReportsByShopId).mockResolvedValueOnce([
          makeQueueReport('1', 'u1', 10),
          makeQueueReport('2', 'u2', 15),
          makeQueueReport('3', 'u3', 20), // range = 10 <= 15
        ]);

        const status = await service.getShopStatus('shop-001');
        expect(status.queue.confidence).toBe(ConfidenceLevel.HIGH);
      });

      it('assigns MIXED confidence for 3+ reporters with range > 30', async () => {
        vi.mocked(mockShopRepo.getShopById).mockResolvedValueOnce(mockShop);
        vi.mocked(mockReportRepo.getAllReportsByShopId).mockResolvedValueOnce([
          makeQueueReport('1', 'u1', 10),
          makeQueueReport('2', 'u2', 30),
          makeQueueReport('3', 'u3', 50), // range = 40 > 30
        ]);

        const status = await service.getShopStatus('shop-001');
        expect(status.queue.confidence).toBe(ConfidenceLevel.MIXED);
      });
    });

    describe('P3-07 & P3-09: ePOS strict majority and confidence tiers', () => {
      const makeEposReport = (id: string, sub: string, status: EposStatus): Report => ({
        shopId: 'shop-001',
        reportKey: createReportKey('2026-11-26T11:50:00.000Z', id),
        reportId: id,
        reportType: ReportType.EPOS,
        createdAt: '2026-11-26T11:50:00.000Z',
        expiresAt: fixedNowEpoch + 14400,
        reporterSub: sub,
        reporterRole: UserRole.BENEFICIARY,
        payload: { status },
        isDemoData: false,
      });

      it('returns WORKING and LOW confidence for 1 WORKING report', async () => {
        vi.mocked(mockShopRepo.getShopById).mockResolvedValueOnce(mockShop);
        vi.mocked(mockReportRepo.getAllReportsByShopId).mockResolvedValueOnce([
          makeEposReport('1', 'u1', EposStatus.WORKING),
        ]);

        const status = await service.getShopStatus('shop-001');
        expect(status.epos.status).toBe(EposStatus.WORKING);
        expect(status.epos.confidence).toBe(ConfidenceLevel.LOW);
      });

      it('returns MIXED REPORTS and MIXED confidence for a 1-1 tie', async () => {
        vi.mocked(mockShopRepo.getShopById).mockResolvedValueOnce(mockShop);
        vi.mocked(mockReportRepo.getAllReportsByShopId).mockResolvedValueOnce([
          makeEposReport('1', 'u1', EposStatus.WORKING),
          makeEposReport('2', 'u2', EposStatus.NOT_WORKING),
        ]);

        const status = await service.getShopStatus('shop-001');
        expect(status.epos.status).toBe('MIXED REPORTS');
        expect(status.epos.confidence).toBe(ConfidenceLevel.MIXED);
      });

      it('returns WORKING and HIGH confidence when majority >= 75%', async () => {
        vi.mocked(mockShopRepo.getShopById).mockResolvedValueOnce(mockShop);
        // 3 WORKING, 1 NOT_WORKING: 3/4 = 75% -> HIGH
        vi.mocked(mockReportRepo.getAllReportsByShopId).mockResolvedValueOnce([
          makeEposReport('1', 'u1', EposStatus.WORKING),
          makeEposReport('2', 'u2', EposStatus.WORKING),
          makeEposReport('3', 'u3', EposStatus.WORKING),
          makeEposReport('4', 'u4', EposStatus.NOT_WORKING),
        ]);

        const status = await service.getShopStatus('shop-001');
        expect(status.epos.status).toBe(EposStatus.WORKING);
        expect(status.epos.confidence).toBe(ConfidenceLevel.HIGH);
      });

      it('returns WORKING and MEDIUM confidence when strict majority is < 75%', async () => {
        vi.mocked(mockShopRepo.getShopById).mockResolvedValueOnce(mockShop);
        // 3 WORKING, 2 NOT_WORKING: 3/5 = 60% (> 50%, < 75%) -> MEDIUM
        vi.mocked(mockReportRepo.getAllReportsByShopId).mockResolvedValueOnce([
          makeEposReport('1', 'u1', EposStatus.WORKING),
          makeEposReport('2', 'u2', EposStatus.WORKING),
          makeEposReport('3', 'u3', EposStatus.WORKING),
          makeEposReport('4', 'u4', EposStatus.NOT_WORKING),
          makeEposReport('5', 'u5', EposStatus.NOT_WORKING),
        ]);

        const status = await service.getShopStatus('shop-001');
        expect(status.epos.status).toBe(EposStatus.WORKING);
        expect(status.epos.confidence).toBe(ConfidenceLevel.MEDIUM);
      });
    });

    describe('P3-08 & P3-09: Stock strict majority and confidence tiers', () => {
      const makeStockReport = (
        id: string,
        sub: string,
        availability: CommodityAvailability
      ): Report => ({
        shopId: 'shop-001',
        reportKey: createReportKey('2026-11-26T11:50:00.000Z', id),
        reportId: id,
        reportType: ReportType.STOCK,
        createdAt: '2026-11-26T11:50:00.000Z',
        expiresAt: fixedNowEpoch + 86400,
        reporterSub: sub,
        reporterRole: UserRole.BENEFICIARY,
        payload: { commodityCode: 'RICE', availability },
        isDemoData: false,
      });

      it('calculates strict majority and returns MIXED REPORTS on split vote', async () => {
        vi.mocked(mockShopRepo.getShopById).mockResolvedValueOnce(mockShop);
        // 1 AVAILABLE, 1 LIMITED, 1 UNAVAILABLE -> no strict majority (> 1.5)
        vi.mocked(mockReportRepo.getAllReportsByShopId).mockResolvedValueOnce([
          makeStockReport('1', 'u1', CommodityAvailability.AVAILABLE),
          makeStockReport('2', 'u2', CommodityAvailability.LIMITED),
          makeStockReport('3', 'u3', CommodityAvailability.UNAVAILABLE),
        ]);

        const status = await service.getShopStatus('shop-001');
        const rice = status.stock.find((s) => s.commodityCode === 'RICE')!;
        expect(rice.availability).toBe('MIXED REPORTS');
        expect(rice.confidence).toBe(ConfidenceLevel.MIXED);
      });

      it('returns AVAILABLE with HIGH confidence when consensus is 100%', async () => {
        vi.mocked(mockShopRepo.getShopById).mockResolvedValueOnce(mockShop);
        vi.mocked(mockReportRepo.getAllReportsByShopId).mockResolvedValueOnce([
          makeStockReport('1', 'u1', CommodityAvailability.AVAILABLE),
          makeStockReport('2', 'u2', CommodityAvailability.AVAILABLE),
          makeStockReport('3', 'u3', CommodityAvailability.AVAILABLE),
        ]);

        const status = await service.getShopStatus('shop-001');
        const rice = status.stock.find((s) => s.commodityCode === 'RICE')!;
        expect(rice.availability).toBe(CommodityAvailability.AVAILABLE);
        expect(rice.confidence).toBe(ConfidenceLevel.HIGH);
      });
    });

    describe('P3-09: Source provenance labels', () => {
      it('outputs both Community report and Shop manager update when both roles contribute', async () => {
        vi.mocked(mockShopRepo.getShopById).mockResolvedValueOnce(mockShop);

        const communityReport: Report = {
          shopId: 'shop-001',
          reportKey: createReportKey('2026-11-26T11:50:00.000Z', 'rep-c'),
          reportId: 'rep-c',
          reportType: ReportType.QUEUE,
          createdAt: '2026-11-26T11:50:00.000Z',
          expiresAt: fixedNowEpoch + 7200,
          reporterSub: 'u-comm',
          reporterRole: UserRole.BENEFICIARY,
          payload: { waitMinutes: 15 },
          isDemoData: false,
        };

        const managerReport: Report = {
          shopId: 'shop-001',
          reportKey: createReportKey('2026-11-26T11:55:00.000Z', 'rep-m'),
          reportId: 'rep-m',
          reportType: ReportType.QUEUE,
          createdAt: '2026-11-26T11:55:00.000Z',
          expiresAt: fixedNowEpoch + 7200,
          reporterSub: 'u-mgr',
          reporterRole: UserRole.SHOP_MANAGER,
          payload: { waitMinutes: 15 },
          isDemoData: false,
        };

        vi.mocked(mockReportRepo.getAllReportsByShopId).mockResolvedValueOnce([
          communityReport,
          managerReport,
        ]);

        const status = await service.getShopStatus('shop-001');
        expect(status.queue.sources).toContain('Community report');
        expect(status.queue.sources).toContain('Shop manager update');
      });
    });
  });
});
