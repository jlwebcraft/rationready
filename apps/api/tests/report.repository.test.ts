import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ReportRepository } from '../src/repositories/report.repository.js';
import { Report, ReportType, UserRole, EposStatus, createReportKey } from '../src/domain/types.js';

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
    reporterSub: 'demo-reporter',
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
});
