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

  describe('P3-05: findRecentUserReport (Duplicate Cooldown Lookup)', () => {
    it('finds recent report by matching reporterSub and reportType within the time window', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [mockReport],
      });

      const result = await repo.findRecentUserReport(
        'demo-shop-001',
        'demo-reporter-1',
        ReportType.EPOS,
        '2026-11-24T09:59:00.000Z'
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArg = mockSend.mock.calls[0][0];
      expect(callArg.input.KeyConditionExpression).toBe(
        'shopId = :shopId AND reportKey >= :minReportKey'
      );
      expect(callArg.input.ExpressionAttributeValues).toEqual({
        ':shopId': 'demo-shop-001',
        ':minReportKey': 'REPORT#2026-11-24T09:59:00.000Z',
      });
      expect(result).toEqual(mockReport);
    });

    it('returns null if matching user or reportType is not present in recent results', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [mockReport],
      });

      // Different user
      const resultUser = await repo.findRecentUserReport(
        'demo-shop-001',
        'different-user',
        ReportType.EPOS,
        '2026-11-24T09:59:00.000Z'
      );
      expect(resultUser).toBeNull();

      // Different reportType
      mockSend.mockResolvedValueOnce({
        Items: [mockReport],
      });
      const resultType = await repo.findRecentUserReport(
        'demo-shop-001',
        'demo-reporter-1',
        ReportType.QUEUE,
        '2026-11-24T09:59:00.000Z'
      );
      expect(resultType).toBeNull();
    });

    it('differentiates stock commodities during cooldown check', async () => {
      const riceReport: Report = {
        ...mockReport,
        reportType: ReportType.STOCK,
        payload: { commodityCode: 'RICE', availability: CommodityAvailability.AVAILABLE },
      };

      mockSend.mockResolvedValueOnce({ Items: [riceReport] });

      const foundRice = await repo.findRecentUserReport(
        'demo-shop-001',
        'demo-reporter-1',
        ReportType.STOCK,
        '2026-11-24T09:59:00.000Z',
        'RICE'
      );
      expect(foundRice).toEqual(riceReport);
    });
  });
});
