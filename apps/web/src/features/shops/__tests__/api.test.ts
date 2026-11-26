import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchShops, fetchShopById, getApiUrl, DEMO_SHOPS } from '../api';

describe('Shops API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads VITE_API_URL and ignores VITE_API_BASE_URL', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.rationready.example.com');
    vi.stubEnv('VITE_API_BASE_URL', 'https://wrong.example.com');

    expect(getApiUrl()).toBe('https://api.rationready.example.com');
  });

  describe('when VITE_API_URL is not configured', () => {
    it('returns the 5 local synthetic demo shops without calling fetch', async () => {
      vi.stubEnv('VITE_API_URL', '');
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const shops = await fetchShops();
      expect(shops).toHaveLength(5);
      expect(shops[0].shopId).toBe('demo-shop-001');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns a local demo shop or null for fetchShopById without calling fetch', async () => {
      vi.stubEnv('VITE_API_URL', '');
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const found = await fetchShopById('demo-shop-002');
      expect(found?.name).toBe('Demo Shop 02');

      const missing = await fetchShopById('unknown-id');
      expect(missing).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('when VITE_API_URL is configured', () => {
    const apiUrl = 'https://api.rationready.example.com';

    beforeEach(() => {
      vi.stubEnv('VITE_API_URL', apiUrl);
    });

    it('fetchShops returns API data on a valid 200 response', async () => {
      const apiShops = [{ ...DEMO_SHOPS[0], name: 'API Shop 01' }];
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: { shops: apiShops, total: 1 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const shops = await fetchShops('Demo Locality A');
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.rationready.example.com/shops?locality=Demo+Locality+A'
      );
      expect(shops).toEqual(apiShops);
    });

    it('fetchShops throws a meaningful error on non-success HTTP response instead of returning demo data', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Database unavailable' },
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await expect(fetchShops()).rejects.toThrow('Database unavailable');
    });

    it('fetchShops throws a meaningful error on network failure instead of returning demo data', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(fetchShops()).rejects.toThrow(
        /Unable to reach shop directory API: Failed to fetch/
      );
    });

    it('fetchShops throws a meaningful error on malformed response envelope', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ unexpected: 'shape' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await expect(fetchShops()).rejects.toThrow(/invalid response envelope/i);
    });

    it('fetchShopById returns shop on a valid 200 response', async () => {
      const apiShop = { ...DEMO_SHOPS[0], name: 'API Detail Shop 01' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: apiShop }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const shop = await fetchShopById('demo-shop-001');
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.rationready.example.com/shops/demo-shop-001'
      );
      expect(shop).toEqual(apiShop);
    });

    it('fetchShopById returns null on HTTP 404 so UI can show not-found state', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const shop = await fetchShopById('missing-shop');
      expect(shop).toBeNull();
    });

    it('fetchShopById throws a meaningful error on HTTP 500 instead of returning demo data', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Backend query failed' },
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await expect(fetchShopById('demo-shop-001')).rejects.toThrow('Backend query failed');
    });

    it('fetchShopById throws a meaningful error on network failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network timeout'));

      await expect(fetchShopById('demo-shop-001')).rejects.toThrow(
        /Unable to reach shop detail API: Network timeout/
      );
    });

    it('fetchShopById throws a meaningful error on invalid response envelope', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not-json', { status: 200 }));

      await expect(fetchShopById('demo-shop-001')).rejects.toThrow(/invalid response envelope/i);
    });
  });
});
