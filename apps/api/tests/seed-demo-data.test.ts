import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  generateDemoShops,
  generateInitialDemoReports,
  seedDemoData,
  QUEUE_TTL_SECONDS,
  EPOS_TTL_SECONDS,
  STOCK_TTL_SECONDS,
} from '../../../scripts/seed-demo-data.js';
import { ReportType } from '../src/domain/types.js';

describe('Demo Data Seed Script', () => {
  const fixedNow = new Date('2026-11-26T10:00:00.000Z');
  const fixedEpochSeconds = Math.floor(fixedNow.getTime() / 1000);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Data Generation & Timestamps', () => {
    it('generates exactly 5 synthetic shop records with isDemoData: true', () => {
      const shops = generateDemoShops(fixedNow);

      expect(shops).toHaveLength(5);
      shops.forEach((shop) => {
        expect(shop.isDemoData).toBe(true);
        expect(shop.locality).toBe('Demo Locality A');
        expect(shop.createdAt).toBe('2026-11-26T10:00:00.000Z');
        expect(shop.updatedAt).toBe('2026-11-26T10:00:00.000Z');
      });
    });

    it('generates exactly 15 synthetic report records with isDemoData: true', () => {
      const reports = generateInitialDemoReports(fixedNow);

      expect(reports).toHaveLength(15);
      reports.forEach((report) => {
        expect(report.isDemoData).toBe(true);
        expect(report.createdAt).toBe('2026-11-26T10:00:00.000Z');
        expect(report.reportKey).toBe(`REPORT#2026-11-26T10:00:00.000Z#${report.reportId}`);
      });
    });

    it('sets QUEUE expiry to exactly 2 hours (7200s) after creation', () => {
      const reports = generateInitialDemoReports(fixedNow);
      const queueReports = reports.filter((r) => r.reportType === ReportType.QUEUE);

      expect(queueReports).toHaveLength(5);
      queueReports.forEach((report) => {
        expect(report.expiresAt).toBe(fixedEpochSeconds + QUEUE_TTL_SECONDS);
        expect(report.expiresAt - fixedEpochSeconds).toBe(7200);
      });
    });

    it('sets EPOS expiry to exactly 4 hours (14400s) after creation', () => {
      const reports = generateInitialDemoReports(fixedNow);
      const eposReports = reports.filter((r) => r.reportType === ReportType.EPOS);

      expect(eposReports).toHaveLength(5);
      eposReports.forEach((report) => {
        expect(report.expiresAt).toBe(fixedEpochSeconds + EPOS_TTL_SECONDS);
        expect(report.expiresAt - fixedEpochSeconds).toBe(14400);
      });
    });

    it('sets STOCK expiry to exactly 24 hours (86400s) after creation', () => {
      const reports = generateInitialDemoReports(fixedNow);
      const stockReports = reports.filter((r) => r.reportType === ReportType.STOCK);

      expect(stockReports).toHaveLength(5);
      stockReports.forEach((report) => {
        expect(report.expiresAt).toBe(fixedEpochSeconds + STOCK_TTL_SECONDS);
        expect(report.expiresAt - fixedEpochSeconds).toBe(86400);
      });
    });
  });

  describe('Dry-run and Execution Modes', () => {
    it('performs zero DynamoDB writes in default dry-run mode', async () => {
      const mockSend = vi.fn();
      const mockDocClient = { send: mockSend } as unknown as DynamoDBDocumentClient;

      const result = await seedDemoData({
        docClient: mockDocClient,
        now: () => fixedNow,
      });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.shopsCount).toBe(5);
      expect(result.reportsCount).toBe(15);
      expect(result.shopsWritten).toBe(0);
      expect(result.reportsWritten).toBe(0);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('throws when SHOPS_TABLE or REPORTS_TABLE are missing in execution mode', async () => {
      vi.stubEnv('SHOPS_TABLE', '');
      vi.stubEnv('REPORTS_TABLE', '');
      vi.stubEnv('AWS_REGION', 'ap-south-1');

      const mockSend = vi.fn();
      const mockDocClient = { send: mockSend } as unknown as DynamoDBDocumentClient;

      await expect(
        seedDemoData({
          dryRun: false,
          docClient: mockDocClient,
          now: fixedNow,
        })
      ).rejects.toThrow(/SHOPS_TABLE and REPORTS_TABLE/i);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('throws when AWS_REGION is missing in execution mode', async () => {
      vi.stubEnv('SHOPS_TABLE', 'rationready-shops-dev');
      vi.stubEnv('REPORTS_TABLE', 'rationready-reports-dev');
      vi.stubEnv('AWS_REGION', '');

      const mockSend = vi.fn();
      const mockDocClient = { send: mockSend } as unknown as DynamoDBDocumentClient;

      await expect(
        seedDemoData({
          dryRun: false,
          docClient: mockDocClient,
          now: fixedNow,
        })
      ).rejects.toThrow(/AWS_REGION/i);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('attempts all 20 writes using configured table names and returns success only after all succeed', async () => {
      const mockSend = vi.fn().mockResolvedValue({});
      const mockDocClient = { send: mockSend } as unknown as DynamoDBDocumentClient;

      const result = await seedDemoData({
        dryRun: false,
        docClient: mockDocClient,
        shopsTable: 'rationready-shops-test',
        reportsTable: 'rationready-reports-test',
        region: 'ap-south-1',
        now: () => fixedNow,
      });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(false);
      expect(result.shopsWritten).toBe(5);
      expect(result.reportsWritten).toBe(15);
      expect(result.createdAt).toBe('2026-11-26T10:00:00.000Z');
      expect(mockSend).toHaveBeenCalledTimes(20);

      const commands = mockSend.mock.calls.map((call) => call[0] as PutCommand);
      const shopCommands = commands.slice(0, 5);
      const reportCommands = commands.slice(5, 20);

      shopCommands.forEach((cmd) => {
        expect(cmd).toBeInstanceOf(PutCommand);
        expect(cmd.input.TableName).toBe('rationready-shops-test');
        expect(cmd.input.Item?.isDemoData).toBe(true);
      });

      reportCommands.forEach((cmd) => {
        expect(cmd).toBeInstanceOf(PutCommand);
        expect(cmd.input.TableName).toBe('rationready-reports-test');
        expect(cmd.input.Item?.isDemoData).toBe(true);
      });
    });

    it('reports partial write failures accurately and does not return success', async () => {
      let callCount = 0;
      const mockSend = vi.fn().mockImplementation(async () => {
        callCount += 1;
        if (callCount === 7) {
          throw new Error('ProvisionedThroughputExceededException');
        }
        return {};
      });
      const mockDocClient = { send: mockSend } as unknown as DynamoDBDocumentClient;

      await expect(
        seedDemoData({
          dryRun: false,
          docClient: mockDocClient,
          shopsTable: 'rationready-shops-test',
          reportsTable: 'rationready-reports-test',
          region: 'ap-south-1',
          now: fixedNow,
        })
      ).rejects.toThrow(
        /Write failed for report 'demo-rep-001-epos'.*ProvisionedThroughputExceededException.*Partial progress: 5\/5 shops, 1\/15 reports written/
      );

      expect(mockSend).toHaveBeenCalledTimes(7);
    });
  });
});
