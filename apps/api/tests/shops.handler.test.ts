import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler, listShopsHandler, getShopByIdHandler } from '../src/handlers/shops.js';
import { ShopRepository } from '../src/repositories/shop.repository.js';
import { Shop, ApiErrorCode } from '../src/domain/types.js';

describe('Shops Handlers', () => {
  let mockRepo: ShopRepository;

  const mockShop: Shop = {
    shopId: 'demo-shop-001',
    name: 'Demo Shop 01',
    locality: 'Demo Locality A',
    addressOrLandmark: 'Fictional Demonstration Facility 01, Sector Alpha',
    isDemoData: true,
    createdAt: '2026-11-24T00:00:00.000Z',
    updatedAt: '2026-11-24T00:00:00.000Z',
  };

  const createEvent = (
    overrides: Partial<APIGatewayProxyEventV2> = {}
  ): APIGatewayProxyEventV2 => ({
    version: '2.0',
    routeKey: 'GET /shops',
    rawPath: '/shops',
    rawQueryString: '',
    headers: {},
    requestContext: {
      accountId: '123456789012',
      apiId: 'rready-api',
      domainName: 'localhost',
      domainPrefix: 'localhost',
      http: {
        method: 'GET',
        path: '/shops',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      },
      requestId: 'test-req-1',
      routeKey: 'GET /shops',
      stage: '$default',
      time: '24/Nov/2026:12:00:00 +0000',
      timeEpoch: 1795521600000,
    },
    isBase64Encoded: false,
    ...overrides,
  });

  beforeEach(() => {
    mockRepo = {
      getShopById: vi.fn(),
      listShops: vi.fn(),
      saveShop: vi.fn(),
    } as unknown as ShopRepository;
  });

  describe('listShopsHandler', () => {
    it('returns 200 with all shops when no locality filter is supplied', async () => {
      vi.mocked(mockRepo.listShops).mockResolvedValueOnce([mockShop]);

      const event = createEvent();
      const response = await listShopsHandler(event, mockRepo);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.success).toBe(true);
      expect(body.data.shops).toHaveLength(1);
      expect(body.data.count).toBe(1);
      expect(body.data.locality).toBeUndefined();
    });

    it('returns 200 with filtered shops when valid locality is supplied', async () => {
      vi.mocked(mockRepo.listShops).mockResolvedValueOnce([mockShop]);

      const event = createEvent({
        queryStringParameters: { locality: 'Demo Locality A' },
      });
      const response = await listShopsHandler(event, mockRepo);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.success).toBe(true);
      expect(body.data.shops[0].locality).toBe('Demo Locality A');
      expect(body.data.locality).toBe('Demo Locality A');
    });

    it('returns 400 when locality exceeds length limit', async () => {
      const event = createEvent({
        queryStringParameters: { locality: 'a'.repeat(101) },
      });
      const response = await listShopsHandler(event, mockRepo);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ApiErrorCode.VALIDATION_ERROR);
    });

    it('returns 500 when repository throws an error', async () => {
      vi.mocked(mockRepo.listShops).mockRejectedValueOnce(new Error('DynamoDB timeout'));

      const event = createEvent();
      const response = await listShopsHandler(event, mockRepo);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body as string);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ApiErrorCode.INTERNAL_ERROR);
      expect(body.error.message).not.toContain('DynamoDB timeout'); // Does not leak internal stack/message
    });
  });

  describe('getShopByIdHandler', () => {
    it('returns 200 with shop data when shop is found', async () => {
      vi.mocked(mockRepo.getShopById).mockResolvedValueOnce(mockShop);

      const event = createEvent({
        pathParameters: { shopId: 'demo-shop-001' },
      });
      const response = await getShopByIdHandler(event, mockRepo);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.success).toBe(true);
      expect(body.data.shopId).toBe('demo-shop-001');
    });

    it('returns 404 when shop is not found', async () => {
      vi.mocked(mockRepo.getShopById).mockResolvedValueOnce(null);

      const event = createEvent({
        pathParameters: { shopId: 'nonexistent-shop' },
      });
      const response = await getShopByIdHandler(event, mockRepo);

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body as string);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ApiErrorCode.SHOP_NOT_FOUND);
    });

    it('returns 400 for invalid shopId format', async () => {
      const event = createEvent({
        pathParameters: { shopId: 'invalid/slash/id' },
      });
      const response = await getShopByIdHandler(event, mockRepo);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ApiErrorCode.VALIDATION_ERROR);
    });
  });

  describe('unified handler', () => {
    it('routes to getShopByIdHandler when shopId path parameter is present', async () => {
      vi.mocked(mockRepo.getShopById).mockResolvedValueOnce(mockShop);

      const event = createEvent({
        pathParameters: { shopId: 'demo-shop-001' },
      });
      const response = await handler(event, mockRepo);

      expect(response.statusCode).toBe(200);
      expect(mockRepo.getShopById).toHaveBeenCalledWith('demo-shop-001');
    });

    it('routes to listShopsHandler when no shopId path parameter is present', async () => {
      vi.mocked(mockRepo.listShops).mockResolvedValueOnce([mockShop]);

      const event = createEvent();
      const response = await handler(event, mockRepo);

      expect(response.statusCode).toBe(200);
      expect(mockRepo.listShops).toHaveBeenCalled();
    });

    it('returns 405 for non-GET methods', async () => {
      const event = createEvent({
        requestContext: {
          ...createEvent().requestContext,
          http: { ...createEvent().requestContext.http, method: 'POST' },
        },
      });
      const response = await handler(event, mockRepo);

      expect(response.statusCode).toBe(405);
      const body = JSON.parse(response.body as string);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ApiErrorCode.METHOD_NOT_ALLOWED);
    });
  });
});
