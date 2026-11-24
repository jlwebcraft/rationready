import { Shop } from '../../types';

export const DEMO_LOCALITY = 'Demo Locality A';

export const DEMO_SHOPS: Shop[] = [
  {
    shopId: 'demo-shop-001',
    name: 'Demo Shop 01',
    locality: DEMO_LOCALITY,
    addressOrLandmark: 'Fictional Demonstration Facility 01, Sector Alpha',
    isDemoData: true,
    createdAt: '2026-11-24T00:00:00.000Z',
    updatedAt: '2026-11-24T00:00:00.000Z',
  },
  {
    shopId: 'demo-shop-002',
    name: 'Demo Shop 02',
    locality: DEMO_LOCALITY,
    addressOrLandmark: 'Fictional Demonstration Facility 02, Sector Beta',
    isDemoData: true,
    createdAt: '2026-11-24T00:00:00.000Z',
    updatedAt: '2026-11-24T00:00:00.000Z',
  },
  {
    shopId: 'demo-shop-003',
    name: 'Demo Shop 03',
    locality: DEMO_LOCALITY,
    addressOrLandmark: 'Fictional Demonstration Facility 03, Sector Gamma',
    isDemoData: true,
    createdAt: '2026-11-24T00:00:00.000Z',
    updatedAt: '2026-11-24T00:00:00.000Z',
  },
  {
    shopId: 'demo-shop-004',
    name: 'Demo Shop 04',
    locality: DEMO_LOCALITY,
    addressOrLandmark: 'Fictional Demonstration Facility 04, Sector Delta',
    isDemoData: true,
    createdAt: '2026-11-24T00:00:00.000Z',
    updatedAt: '2026-11-24T00:00:00.000Z',
  },
  {
    shopId: 'demo-shop-005',
    name: 'Demo Shop 05',
    locality: DEMO_LOCALITY,
    addressOrLandmark: 'Fictional Demonstration Facility 05, Sector Epsilon',
    isDemoData: true,
    createdAt: '2026-11-24T00:00:00.000Z',
    updatedAt: '2026-11-24T00:00:00.000Z',
  },
];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Fetches shops from backend API or falls back to synthetic demonstration shops.
 */
export async function fetchShops(locality?: string): Promise<Shop[]> {
  if (API_BASE_URL) {
    try {
      const url = new URL('/shops', API_BASE_URL);
      if (locality && locality !== 'ALL') {
        url.searchParams.set('locality', locality);
      }
      const res = await fetch(url.toString());
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data?.shops)) {
          return body.data.shops;
        }
      }
    } catch {
      // Fallback to local demo data
    }
  }

  // Local demo data filtering
  if (locality && locality !== 'ALL') {
    return DEMO_SHOPS.filter((s) => s.locality.toLowerCase() === locality.trim().toLowerCase());
  }

  return [...DEMO_SHOPS];
}

/**
 * Fetches an individual shop by shopId.
 */
export async function fetchShopById(shopId: string): Promise<Shop | null> {
  if (API_BASE_URL) {
    try {
      const url = new URL(`/shops/${encodeURIComponent(shopId)}`, API_BASE_URL);
      const res = await fetch(url.toString());
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data) {
          return body.data;
        }
      }
    } catch {
      // Fallback to local demo data
    }
  }

  const found = DEMO_SHOPS.find((s) => s.shopId === shopId);
  return found || null;
}
