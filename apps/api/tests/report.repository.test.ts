import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ReportRepository } from '../src/repositories/report.repository.js';
import {
  Report,
  ReportType,
  UserRole,
  EposStatus,
  CommodityAvailability,
  createReportKey,
} from '../src/domain/types.js';

describe('ReportRepository', () => {
  let mockSend: ReturnType<typeof vi.fn>;
  let mockDocClient: DynamoDBDocumentClient;
  let repo: ReportRepository;

  const mockReport: Report = {
    shopId: 'demo-shop-001',
    reportKey: createReportKey('2026-11-24T10:00:00.000Z', 'rep-001'),
    reportId: 'rep-001',
    reportType: ReportType.EPOS,
    createdAt: '2026-11-24T10:00:00.000Z',
    expiresAt: 1795521600,
    reporterSub: 'demo-reporter-1',
    reporterRole: UserRole.BENEFICIARY,
    payload: { status: EposStatus.WORKING },
    isDemoData: true,
  };

  beforeEach(() => {
    mockSend = vi.fn();
    mockDocClient = { send: mockSend } as unknown as DynamoDBDocumentClient;
    repo = new ReportRepository(mockDocClient, 'TestReportsTable');
  });

  it('creates and writes a report into DynamoDB', async () => {
    mockSend.mockResolvedValueOnce({});

    const result = await repo.createReport(mockReport);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const callArg = mockSend.mock.calls[0][0];
    expect(callArg.input.TableName).toBe('TestReportsTable');
    expect(callArg.input.Item).toEqual(mockReport);
    expect(result).toEqual(mockReport);
  });

  it('queries reports by shopId in sort-key order (newest first)', async () => {
    mockSend.mockResolvedValueOnce({ Items: [mockReport] });

    const result = await repo.getReportsByShopId('demo-shop-001', 10);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const callArg = mockSend.mock.calls[0][0];
    expect(callArg.input.TableName).toBe('TestReportsTable');
    expect(callArg.input.KeyConditionExpression).toBe('shopId = :shopId');
    expect(callArg.input.ExpressionAttributeValues).toEqual({ ':shopId': 'demo-shop-001' });
    expect(callArg.input.ScanIndexForward).toBe(false);
    expect(callArg.input.Limit).toBe(10);
    expect(result).toEqual([mockReport]);
  });

  describe('P3-10: getAllReportsByShopId (Pagination Handling)', () => {
    it('retrieves single page when LastEvaluatedKey is undefined', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [mockReport],
        LastEvaluatedKey: undefined,
      });

      const result = await repo.getAllReportsByShopId('demo-shop-001');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockReport]);
    });

    it('loops across multiple paginated pages until LastEvaluatedKey is undefined', async () => {
      const secondReport: Report = {
        ...mockReport,
        reportId: 'rep-002',
        reportKey: createReportKey('2026-11-24T09:00:00.000Z', 'rep-002'),
      };

      // Page 1
      mockSend.mockResolvedValueOnce({
        Items: [mockReport],
        LastEvaluatedKey: { shopId: 'demo-shop-001', reportKey: mockReport.reportKey },
      });
      // Page 2
      mockSend.mockResolvedValueOnce({
        Items: [secondReport],
        LastEvaluatedKey: undefined,
      });

      const result = await repo.getAllReportsByShopId('demo-shop-001');

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(result).toEqual([mockReport, secondReport]);

      // Check second call included ExclusiveStartKey
      const secondCallArg = mockSend.mock.calls[1][0];
      expect(secondCallArg.input.ExclusiveStartKey).toEqual({
        shopId: 'demo-shop-001',
        reportKey: mockReport.reportKey,
      });
    });
  });

  describe('P3-05: findRecentUserReport (Duplicate Cooldown Lookup & Pagination)', () => {
    const cutoff = '2026-11-26T12:00:00.000Z';

    it('finds matching report on the first page and returns immediately without requesting further pages', async () => {
      const matchingReport: Report = {
        ...mockReport,
        createdAt: '2026-11-26T12:00:30.000Z',
        reportKey: createReportKey('2026-11-26T12:00:30.000Z', 'rep-001'),
      };

      mockSend.mockResolvedValueOnce({
        Items: [matchingReport],
        LastEvaluatedKey: { shopId: 'demo-shop-001', reportKey: matchingReport.reportKey },
      });

      const result = await repo.findRecentUserReport(
        'demo-shop-001',
        'demo-reporter-1',
        ReportType.EPOS,
        cutoff
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArg = mockSend.mock.calls[0][0];
      expect(callArg.input.KeyConditionExpression).toBe(
        'shopId = :shopId AND reportKey > :minReportKey'
      );
      expect(callArg.input.ExpressionAttributeValues).toEqual({
        ':shopId': 'demo-shop-001',
        ':minReportKey': `REPORT#${cutoff}~`,
      });
      expect(result).toEqual(matchingReport);
    });

    it('finds matching report on a later page after searching previous pages', async () => {
      const otherUserReport: Report = {
        ...mockReport,
        reporterSub: 'other-user',
        createdAt: '2026-11-26T12:00:45.000Z',
        reportKey: createReportKey('2026-11-26T12:00:45.000Z', 'rep-other'),
      };

      const matchingReportOnPage2: Report = {
        ...mockReport,
        createdAt: '2026-11-26T12:00:15.000Z',
        reportKey: createReportKey('2026-11-26T12:00:15.000Z', 'rep-match-page2'),
      };

      // Page 1: only other users
      mockSend.mockResolvedValueOnce({
        Items: [otherUserReport],
        LastEvaluatedKey: { shopId: 'demo-shop-001', reportKey: otherUserReport.reportKey },
      });
      // Page 2: contains the matching report
      mockSend.mockResolvedValueOnce({
        Items: [matchingReportOnPage2],
        LastEvaluatedKey: undefined,
      });

      const result = await repo.findRecentUserReport(
        'demo-shop-001',
        'demo-reporter-1',
        ReportType.EPOS,
        cutoff
      );

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(result).toEqual(matchingReportOnPage2);

      // Verify second call passed ExclusiveStartKey from page 1
      const secondCallArg = mockSend.mock.calls[1][0];
      expect(secondCallArg.input.ExclusiveStartKey).toEqual({
        shopId: 'demo-shop-001',
        reportKey: otherUserReport.reportKey,
      });
    });

    it('returns null when no matching report exists across multiple pages', async () => {
      const otherUserReport1: Report = {
        ...mockReport,
        reporterSub: 'other-user-1',
        createdAt: '2026-11-26T12:00:45.000Z',
        reportKey: createReportKey('2026-11-26T12:00:45.000Z', 'rep-o1'),
      };
      const otherUserReport2: Report = {
        ...mockReport,
        reporterSub: 'other-user-2',
        createdAt: '2026-11-26T12:00:20.000Z',
        reportKey: createReportKey('2026-11-26T12:00:20.000Z', 'rep-o2'),
      };

      // Page 1
      mockSend.mockResolvedValueOnce({
        Items: [otherUserReport1],
        LastEvaluatedKey: { shopId: 'demo-shop-001', reportKey: otherUserReport1.reportKey },
      });
      // Page 2
      mockSend.mockResolvedValueOnce({
        Items: [otherUserReport2],
        LastEvaluatedKey: undefined,
      });

      const result = await repo.findRecentUserReport(
        'demo-shop-001',
        'demo-reporter-1',
        ReportType.EPOS,
        cutoff
      );

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(result).toBeNull();
    });

    it('propagates DynamoDB query errors so callers can fail closed', async () => {
      mockSend.mockRejectedValueOnce(new Error('DynamoDB socket timeout'));

      await expect(
        repo.findRecentUserReport('demo-shop-001', 'demo-reporter-1', ReportType.EPOS, cutoff)
      ).rejects.toThrow('DynamoDB socket timeout');
    });

    describe('Exact 60-second boundary behavior', () => {
      // Cutoff is exactly 2026-11-26T12:00:00.000Z
      it('matches and rejects when report age is 59.999 seconds (createdAt = cutoff + 1ms)', async () => {
        const report59s: Report = {
          ...mockReport,
          createdAt: '2026-11-26T12:00:00.001Z',
          reportKey: createReportKey('2026-11-26T12:00:00.001Z', 'rep-59s'),
        };

        mockSend.mockResolvedValueOnce({
          Items: [report59s],
        });

        const result = await repo.findRecentUserReport(
          'demo-shop-001',
          'demo-reporter-1',
          ReportType.EPOS,
          cutoff
        );

        expect(result).toEqual(report59s);
      });

      it('does not match when report age is exactly 60.000 seconds (createdAt === cutoff)', async () => {
        const report60s: Report = {
          ...mockReport,
          createdAt: cutoff, // Exactly equal to cutoff
          reportKey: createReportKey(cutoff, 'rep-60s'),
        };

        // Note: Even if DynamoDB were to return it, the in-memory check excludes it
        mockSend.mockResolvedValueOnce({
          Items: [report60s],
        });

        const result = await repo.findRecentUserReport(
          'demo-shop-001',
          'demo-reporter-1',
          ReportType.EPOS,
          cutoff
        );

        expect(result).toBeNull();
      });

      it('does not match when report age is 60.001 seconds (createdAt < cutoff)', async () => {
        const report60s1ms: Report = {
          ...mockReport,
          createdAt: '2026-11-26T11:59:59.999Z',
          reportKey: createReportKey('2026-11-26T11:59:59.999Z', 'rep-60s1ms'),
        };

        mockSend.mockResolvedValueOnce({
          Items: [report60s1ms],
        });

        const result = await repo.findRecentUserReport(
          'demo-shop-001',
          'demo-reporter-1',
          ReportType.EPOS,
          cutoff
        );

        expect(result).toBeNull();
      });
    });

    it('differentiates stock commodities during cooldown check', async () => {
      const riceReport: Report = {
        ...mockReport,
        reportType: ReportType.STOCK,
        createdAt: '2026-11-26T12:00:30.000Z',
        reportKey: createReportKey('2026-11-26T12:00:30.000Z', 'rep-rice'),
        payload: { commodityCode: 'RICE', availability: CommodityAvailability.AVAILABLE },
      };

      mockSend.mockResolvedValueOnce({ Items: [riceReport] });

      const foundRice = await repo.findRecentUserReport(
        'demo-shop-001',
        'demo-reporter-1',
        ReportType.STOCK,
        cutoff,
        'RICE'
      );
      expect(foundRice).toEqual(riceReport);
    });
  });
});
