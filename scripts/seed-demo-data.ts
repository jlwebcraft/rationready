/**
 * RationReady — Demo Data Seed Script (Phase 2)
 *
 * Implements deterministic generation of the five approved synthetic demonstration
 * shops for Demo Locality A and initial synthetic demo reports.
 *
 * SAFETY GUARDRAILS:
 * - Defaults to DRY-RUN mode. Live writes require explicit --execute flag and valid environment configuration.
 * - Every record has isDemoData: true.
 * - No real addresses, coordinates, or live operational claims are introduced.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  Shop,
  Report,
  ReportType,
  UserRole,
  EposStatus,
  CommodityAvailability,
  createReportKey,
} from '../apps/api/src/domain/types.js';
import { ShopRepository } from '../apps/api/src/repositories/shop.repository.js';
import { ReportRepository } from '../apps/api/src/repositories/report.repository.js';

export const DEMO_LOCALITY = 'Demo Locality A';

export const QUEUE_TTL_SECONDS = 2 * 60 * 60; // 2 hours
export const EPOS_TTL_SECONDS = 4 * 60 * 60; // 4 hours
export const STOCK_TTL_SECONDS = 24 * 60 * 60; // 24 hours

interface DemoShopTemplate {
  shopId: string;
  name: string;
  addressOrLandmark: string;
}

const DEMO_SHOP_TEMPLATES: DemoShopTemplate[] = [
  {
    shopId: 'demo-shop-001',
    name: 'Demo Shop 01',
    addressOrLandmark: 'Fictional Demonstration Facility 01, Sector Alpha',
  },
  {
    shopId: 'demo-shop-002',
    name: 'Demo Shop 02',
    addressOrLandmark: 'Fictional Demonstration Facility 02, Sector Beta',
  },
  {
    shopId: 'demo-shop-003',
    name: 'Demo Shop 03',
    addressOrLandmark: 'Fictional Demonstration Facility 03, Sector Gamma',
  },
  {
    shopId: 'demo-shop-004',
    name: 'Demo Shop 04',
    addressOrLandmark: 'Fictional Demonstration Facility 04, Sector Delta',
  },
  {
    shopId: 'demo-shop-005',
    name: 'Demo Shop 05',
    addressOrLandmark: 'Fictional Demonstration Facility 05, Sector Epsilon',
  },
];

/**
 * Generates the five synthetic demonstration shops with timestamps from the provided clock.
 */
export function generateDemoShops(now: Date = new Date()): Shop[] {
  const timestamp = now.toISOString();
  return DEMO_SHOP_TEMPLATES.map((template) => ({
    shopId: template.shopId,
    name: template.name,
    locality: DEMO_LOCALITY,
    addressOrLandmark: template.addressOrLandmark,
    isDemoData: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

/**
 * Generates fifteen initial synthetic reports (3 per shop: QUEUE, EPOS, STOCK)
 * with timestamps from the provided clock and roadmap-mandated TTL windows.
 */
export function generateInitialDemoReports(now: Date = new Date()): Report[] {
  const createdAt = now.toISOString();
  const epochSeconds = Math.floor(now.getTime() / 1000);
  const reports: Report[] = [];

  DEMO_SHOP_TEMPLATES.forEach((shop, index) => {
    // 1. Initial Queue report (2 hour validity window = 7200 seconds)
    const queueReportId = `demo-rep-${(index + 1).toString().padStart(3, '0')}-queue`;
    reports.push({
      shopId: shop.shopId,
      reportKey: createReportKey(createdAt, queueReportId),
      reportId: queueReportId,
      reportType: ReportType.QUEUE,
      createdAt,
      expiresAt: epochSeconds + QUEUE_TTL_SECONDS,
      reporterSub: 'demo-reporter-seed',
      reporterRole: UserRole.BENEFICIARY,
      payload: { waitMinutes: 15 + index * 5 }, // 15, 20, 25, 30, 35 mins
      isDemoData: true,
    });

    // 2. Initial ePOS report (4 hour validity window = 14400 seconds)
    const eposReportId = `demo-rep-${(index + 1).toString().padStart(3, '0')}-epos`;
    reports.push({
      shopId: shop.shopId,
      reportKey: createReportKey(createdAt, eposReportId),
      reportId: eposReportId,
      reportType: ReportType.EPOS,
      createdAt,
      expiresAt: epochSeconds + EPOS_TTL_SECONDS,
      reporterSub: 'demo-reporter-seed',
      reporterRole: UserRole.BENEFICIARY,
      payload: { status: EposStatus.WORKING },
      isDemoData: true,
    });

    // 3. Initial Stock report (24 hour validity window = 86400 seconds)
    const stockReportId = `demo-rep-${(index + 1).toString().padStart(3, '0')}-stock-rice`;
    reports.push({
      shopId: shop.shopId,
      reportKey: createReportKey(createdAt, stockReportId),
      reportId: stockReportId,
      reportType: ReportType.STOCK,
      createdAt,
      expiresAt: epochSeconds + STOCK_TTL_SECONDS,
      reporterSub: 'demo-reporter-seed',
      reporterRole: UserRole.SHOP_MANAGER,
      payload: {
        commodityCode: 'RICE',
        availability: CommodityAvailability.AVAILABLE,
      },
      isDemoData: true,
    });
  });

  return reports;
}

export interface SeedOptions {
  dryRun?: boolean;
  docClient?: DynamoDBDocumentClient;
  shopsTable?: string;
  reportsTable?: string;
  region?: string;
  now?: Date | (() => Date);
}

export interface SeedResult {
  success: boolean;
  dryRun: boolean;
  shopsCount: number;
  reportsCount: number;
  shopsWritten: number;
  reportsWritten: number;
  createdAt: string;
  message: string;
}

/**
 * Executes the seed routine with explicit dryRun safety.
 */
export async function seedDemoData(options: SeedOptions = {}): Promise<SeedResult> {
  const isDryRun = options.dryRun ?? true;
  const executionTime =
    typeof options.now === 'function' ? options.now() : (options.now ?? new Date());
  const shops = generateDemoShops(executionTime);
  const reports = generateInitialDemoReports(executionTime);

  console.log(`[RationReady Seed] Locality: ${DEMO_LOCALITY}`);
  console.log(`[RationReady Seed] Execution Timestamp: ${executionTime.toISOString()}`);
  console.log(`[RationReady Seed] Target Synthetic Shops: ${shops.length}`);
  console.log(`[RationReady Seed] Target Synthetic Reports: ${reports.length}`);
  console.log(
    `[RationReady Seed] Mode: ${isDryRun ? 'DRY-RUN (Safe, no database writes)' : 'EXECUTE'}`
  );

  if (isDryRun) {
    console.log('[RationReady Seed] Dry-run validated successfully.');
    shops.forEach((s) => {
      console.log(`  - Shop: ${s.shopId} (${s.name}) [isDemoData: ${s.isDemoData}]`);
    });
    console.log(`  - Reports: ${reports.length} synthetic records prepared.`);

    return {
      success: true,
      dryRun: true,
      shopsCount: shops.length,
      reportsCount: reports.length,
      shopsWritten: 0,
      reportsWritten: 0,
      createdAt: executionTime.toISOString(),
      message: 'Dry run completed successfully. Zero AWS resources modified.',
    };
  }

  // Execution mode configuration validation
  const shopsTable = (options.shopsTable ?? process.env.SHOPS_TABLE ?? '').trim();
  const reportsTable = (options.reportsTable ?? process.env.REPORTS_TABLE ?? '').trim();
  const region = (options.region ?? process.env.AWS_REGION ?? '').trim();

  if (!shopsTable || !reportsTable) {
    throw new Error(
      '[RationReady Seed] ERROR: Live seeding requires SHOPS_TABLE and REPORTS_TABLE environment variables.'
    );
  }

  if (!region) {
    throw new Error('[RationReady Seed] ERROR: Live seeding requires AWS_REGION configuration.');
  }

  const docClient =
    options.docClient ??
    DynamoDBDocumentClient.from(
      new DynamoDBClient({
        region,
        ...(process.env.DYNAMODB_ENDPOINT ? { endpoint: process.env.DYNAMODB_ENDPOINT } : {}),
      }),
      {
        marshallOptions: {
          removeUndefinedValues: true,
        },
      }
    );

  const shopRepo = new ShopRepository(docClient, shopsTable);
  const reportRepo = new ReportRepository(docClient, reportsTable);

  console.log(
    `[RationReady Seed] Writing to DynamoDB tables in ${region}: ${shopsTable}, ${reportsTable}`
  );

  let shopsWritten = 0;
  let reportsWritten = 0;

  for (const shop of shops) {
    try {
      await shopRepo.saveShop(shop);
      shopsWritten += 1;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(
        `[RationReady Seed] Write failed for shop '${shop.shopId}' in table '${shopsTable}': ${errorMessage}. Partial progress: ${shopsWritten}/${shops.length} shops, ${reportsWritten}/${reports.length} reports written.`
      );
    }
  }

  for (const report of reports) {
    try {
      await reportRepo.createReport(report);
      reportsWritten += 1;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(
        `[RationReady Seed] Write failed for report '${report.reportId}' in table '${reportsTable}': ${errorMessage}. Partial progress: ${shopsWritten}/${shops.length} shops, ${reportsWritten}/${reports.length} reports written.`
      );
    }
  }

  return {
    success: true,
    dryRun: false,
    shopsCount: shops.length,
    reportsCount: reports.length,
    shopsWritten,
    reportsWritten,
    createdAt: executionTime.toISOString(),
    message: `Seeding executed successfully. Wrote ${shopsWritten} shops and ${reportsWritten} reports.`,
  };
}

// Auto-run only when executed directly via node/tsx (not when imported in tests)
const currentFilePath = fileURLToPath(import.meta.url);
const invokedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const isDirectRun = invokedFilePath === currentFilePath;

if (isDirectRun) {
  const executeRequested = process.argv.includes('--execute');
  seedDemoData({ dryRun: !executeRequested })
    .then((result) => {
      console.log(`[RationReady Seed] Summary: ${result.message}`);
    })
    .catch((err) => {
      console.error('[RationReady Seed] Error:', err);
      process.exit(1);
    });
}
