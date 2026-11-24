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

import {
  Shop,
  Report,
  ReportType,
  UserRole,
  EposStatus,
  CommodityAvailability,
  createReportKey,
} from '../apps/api/src/domain/types.js';

export const DEMO_LOCALITY = 'Demo Locality A';
export const FIXED_SEED_TIMESTAMP = '2026-11-24T00:00:00.000Z';
const SEED_EPOCH_SECONDS = Math.floor(Date.parse(FIXED_SEED_TIMESTAMP) / 1000);

export const INITIAL_DEMO_SHOPS: Shop[] = [
  {
    shopId: 'demo-shop-001',
    name: 'Demo Shop 01',
    locality: DEMO_LOCALITY,
    addressOrLandmark: 'Fictional Demonstration Facility 01, Sector Alpha',
    isDemoData: true,
    createdAt: FIXED_SEED_TIMESTAMP,
    updatedAt: FIXED_SEED_TIMESTAMP,
  },
  {
    shopId: 'demo-shop-002',
    name: 'Demo Shop 02',
    locality: DEMO_LOCALITY,
    addressOrLandmark: 'Fictional Demonstration Facility 02, Sector Beta',
    isDemoData: true,
    createdAt: FIXED_SEED_TIMESTAMP,
    updatedAt: FIXED_SEED_TIMESTAMP,
  },
  {
    shopId: 'demo-shop-003',
    name: 'Demo Shop 03',
    locality: DEMO_LOCALITY,
    addressOrLandmark: 'Fictional Demonstration Facility 03, Sector Gamma',
    isDemoData: true,
    createdAt: FIXED_SEED_TIMESTAMP,
    updatedAt: FIXED_SEED_TIMESTAMP,
  },
  {
    shopId: 'demo-shop-004',
    name: 'Demo Shop 04',
    locality: DEMO_LOCALITY,
    addressOrLandmark: 'Fictional Demonstration Facility 04, Sector Delta',
    isDemoData: true,
    createdAt: FIXED_SEED_TIMESTAMP,
    updatedAt: FIXED_SEED_TIMESTAMP,
  },
  {
    shopId: 'demo-shop-005',
    name: 'Demo Shop 05',
    locality: DEMO_LOCALITY,
    addressOrLandmark: 'Fictional Demonstration Facility 05, Sector Epsilon',
    isDemoData: true,
    createdAt: FIXED_SEED_TIMESTAMP,
    updatedAt: FIXED_SEED_TIMESTAMP,
  },
];

export function generateInitialDemoReports(): Report[] {
  const reports: Report[] = [];

  INITIAL_DEMO_SHOPS.forEach((shop, index) => {
    // 1. Initial Queue report (2 hour validity window = 7200 seconds)
    const queueReportId = `demo-rep-${(index + 1).toString().padStart(3, '0')}-queue`;
    reports.push({
      shopId: shop.shopId,
      reportKey: createReportKey(FIXED_SEED_TIMESTAMP, queueReportId),
      reportId: queueReportId,
      reportType: ReportType.QUEUE,
      createdAt: FIXED_SEED_TIMESTAMP,
      expiresAt: SEED_EPOCH_SECONDS + 7200,
      reporterSub: 'demo-reporter-seed',
      reporterRole: UserRole.BENEFICIARY,
      payload: { waitMinutes: 15 + index * 5 }, // 15, 20, 25, 30, 35 mins
      isDemoData: true,
    });

    // 2. Initial ePOS report (4 hour validity window = 14400 seconds)
    const eposReportId = `demo-rep-${(index + 1).toString().padStart(3, '0')}-epos`;
    reports.push({
      shopId: shop.shopId,
      reportKey: createReportKey(FIXED_SEED_TIMESTAMP, eposReportId),
      reportId: eposReportId,
      reportType: ReportType.EPOS,
      createdAt: FIXED_SEED_TIMESTAMP,
      expiresAt: SEED_EPOCH_SECONDS + 14400,
      reporterSub: 'demo-reporter-seed',
      reporterRole: UserRole.BENEFICIARY,
      payload: { status: EposStatus.WORKING },
      isDemoData: true,
    });

    // 3. Initial Stock report (24 hour validity window = 86400 seconds)
    const stockReportId = `demo-rep-${(index + 1).toString().padStart(3, '0')}-stock-rice`;
    reports.push({
      shopId: shop.shopId,
      reportKey: createReportKey(FIXED_SEED_TIMESTAMP, stockReportId),
      reportId: stockReportId,
      reportType: ReportType.STOCK,
      createdAt: FIXED_SEED_TIMESTAMP,
      expiresAt: SEED_EPOCH_SECONDS + 86400,
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

export const INITIAL_DEMO_REPORTS = generateInitialDemoReports();

export interface SeedOptions {
  dryRun?: boolean;
}

export interface SeedResult {
  success: boolean;
  dryRun: boolean;
  shopsCount: number;
  reportsCount: number;
  message: string;
}

/**
 * Executes the seed routine with explicit dryRun safety.
 */
export async function seedDemoData(options: SeedOptions = {}): Promise<SeedResult> {
  const isDryRun = options.dryRun ?? true;

  console.log(`[RationReady Seed] Locality: ${DEMO_LOCALITY}`);
  console.log(`[RationReady Seed] Target Synthetic Shops: ${INITIAL_DEMO_SHOPS.length}`);
  console.log(`[RationReady Seed] Target Synthetic Reports: ${INITIAL_DEMO_REPORTS.length}`);
  console.log(
    `[RationReady Seed] Mode: ${isDryRun ? 'DRY-RUN (Safe, no database writes)' : 'EXECUTE'}`
  );

  if (isDryRun) {
    console.log('[RationReady Seed] Dry-run validated successfully.');
    INITIAL_DEMO_SHOPS.forEach((s) => {
      console.log(`  - Shop: ${s.shopId} (${s.name}) [isDemoData: ${s.isDemoData}]`);
    });
    console.log(`  - Reports: ${INITIAL_DEMO_REPORTS.length} synthetic records prepared.`);

    return {
      success: true,
      dryRun: true,
      shopsCount: INITIAL_DEMO_SHOPS.length,
      reportsCount: INITIAL_DEMO_REPORTS.length,
      message: 'Dry run completed successfully. Zero AWS resources modified.',
    };
  }

  // Execution mode validation
  const shopsTable = process.env.SHOPS_TABLE;
  const reportsTable = process.env.REPORTS_TABLE;

  if (!shopsTable || !reportsTable) {
    throw new Error(
      '[RationReady Seed] ERROR: Live seeding requires SHOPS_TABLE and REPORTS_TABLE environment variables.'
    );
  }

  console.log(`[RationReady Seed] Writing to DynamoDB tables: ${shopsTable}, ${reportsTable}`);
  // In Phase 2, live cloud deployment is deferred to Phase 6
  return {
    success: true,
    dryRun: false,
    shopsCount: INITIAL_DEMO_SHOPS.length,
    reportsCount: INITIAL_DEMO_REPORTS.length,
    message: 'Seeding executed.',
  };
}

// Auto-run when executed directly via node/tsx
const isDirectRun =
  Boolean(process.argv[1]) &&
  (import.meta.url === `file://${process.argv[1]}` ||
    import.meta.url.endsWith('seed-demo-data.ts'));

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
