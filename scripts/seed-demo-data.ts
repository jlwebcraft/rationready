/**
 * RationReady — Demo Data Seed Script Skeleton
 * Phase 2 will implement live DynamoDB seeding using these approved demonstration records.
 */

export const DEMO_LOCALITY = 'Demo Locality A';

export const INITIAL_DEMO_SHOPS = [
  {
    shopId: 'demo-shop-001',
    name: 'Demo Shop 01',
    locality: DEMO_LOCALITY,
    addressOrLandmark: 'Fictional Demonstration Facility 01, Sector Alpha',
    isDemoData: true,
  },
  {
    shopId: 'demo-shop-002',
    name: 'Demo Shop 02',
    locality: DEMO_LOCALITY,
    addressOrLandmark: 'Fictional Demonstration Facility 02, Sector Beta',
    isDemoData: true,
  },
  {
    shopId: 'demo-shop-003',
    name: 'Demo Shop 03',
    locality: DEMO_LOCALITY,
    addressOrLandmark: 'Fictional Demonstration Facility 03, Sector Gamma',
    isDemoData: true,
  },
  {
    shopId: 'demo-shop-004',
    name: 'Demo Shop 04',
    locality: DEMO_LOCALITY,
    addressOrLandmark: 'Fictional Demonstration Facility 04, Sector Delta',
    isDemoData: true,
  },
  {
    shopId: 'demo-shop-005',
    name: 'Demo Shop 05',
    locality: DEMO_LOCALITY,
    addressOrLandmark: 'Fictional Demonstration Facility 05, Sector Epsilon',
    isDemoData: true,
  },
];

console.log(
  `[RationReady] Loaded ${INITIAL_DEMO_SHOPS.length} approved demonstration shops for ${DEMO_LOCALITY}.`
);
