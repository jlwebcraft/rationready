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

/**
 * Returns the configured backend API URL from VITE_API_URL, or empty string if unconfigured.
 */
export function getApiUrl(): string {
  return (import.meta.env.VITE_API_URL ?? '').trim();
}

async function parseJsonSafely(res: Response): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await res.json();
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function extractApiErrorMessage(body: Record<string, unknown> | null, fallback: string): string {
  const errObj = body?.error;
  if (errObj && typeof errObj === 'object' && 'message' in errObj) {
    const msg = (errObj as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim().length > 0) {
      return msg;
    }
  }
  return fallback;
}

/**
 * Fetches shops from the configured backend API (VITE_API_URL).
 * Falls back to local synthetic demonstration shops ONLY when no API URL is configured.
 * Throws meaningful errors on HTTP, network, or response-envelope failures.
 */
export async function fetchShops(locality?: string): Promise<Shop[]> {
  const apiUrl = getApiUrl();

  if (!apiUrl) {
    if (locality && locality !== 'ALL') {
      return DEMO_SHOPS.filter((s) => s.locality.toLowerCase() === locality.trim().toLowerCase());
    }
    return [...DEMO_SHOPS];
  }

  const url = new URL('/shops', apiUrl);
  if (locality && locality !== 'ALL') {
    url.searchParams.set('locality', locality);
  }

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Network request failed';
    throw new Error(`Unable to reach shop directory API: ${reason}`);
  }

  const body = await parseJsonSafely(res);

  if (!res.ok) {
    throw new Error(extractApiErrorMessage(body, `Failed to load shops (HTTP ${res.status})`));
  }

  const data = body?.data as { shops?: unknown } | undefined;
  if (!body || body.success !== true || !data || !Array.isArray(data.shops)) {
    throw new Error('Received an invalid response envelope from the shop directory API.');
  }

  return data.shops as Shop[];
}

/**
 * Fetches an individual shop by shopId from the configured backend API (VITE_API_URL).
 * Returns null on HTTP 404 so the UI can display a not-found state.
 * Falls back to local synthetic demonstration shops ONLY when no API URL is configured.
 * Throws meaningful errors on other HTTP, network, or response-envelope failures.
 */
export async function fetchShopById(shopId: string): Promise<Shop | null> {
  const apiUrl = getApiUrl();

  if (!apiUrl) {
    const found = DEMO_SHOPS.find((s) => s.shopId === shopId);
    return found || null;
  }

  const url = new URL(`/shops/${encodeURIComponent(shopId)}`, apiUrl);

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Network request failed';
    throw new Error(`Unable to reach shop detail API: ${reason}`);
  }

  if (res.status === 404) {
    return null;
  }

  const body = await parseJsonSafely(res);

  if (!res.ok) {
    throw new Error(
      extractApiErrorMessage(body, `Failed to load shop '${shopId}' (HTTP ${res.status})`)
    );
  }

  const shopData = body?.data as Partial<Shop> | undefined;
  if (!body || body.success !== true || !shopData || typeof shopData.shopId !== 'string') {
    throw new Error('Received an invalid response envelope from the shop detail API.');
  }

  return shopData as Shop;
}
