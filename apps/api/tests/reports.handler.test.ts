import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import {
  handler,
  submitReportHandler,
  getShopStatusHandler,
  extractAuthContext,
} from '../src/handlers/reports.js';
import { ReportingService } from '../src/services/reporting.service.js';
import {
  Report,
  ReportType,
  UserRole,
  EposStatus,
  CommodityAvailability,
  ConfidenceLevel,
  ApiErrorCode,
  ShopStatusResponse,
} from '../src/domain/types.js';

describe('Reports Handlers', () => {
  let mockService: ReportingService;

  const createEvent = (
    overrides: Partial<APIGatewayProxyEventV2> = {}
  ): APIGatewayProxyEventV2 => ({
    version: '2.0',
    routeKey: 'POST /shops/{shopId}/reports',
    rawPath: '/shops/shop-001/reports',
    rawQueryString: '',
    headers: { 'content-type': 'application/json' },
    requestContext: {
      accountId: '123456789012',
      apiId: 'rready-api',
      domainName: 'localhost',
      domainPrefix: 'localhost',
      http: {
        method: 'POST',
        path: '/shops/shop-001/reports',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      },
      requestId: 'test-req-1',
      routeKey: 'POST /shops/{shopId}/reports',
      stage: '$default',
      time: '26/Nov/2026:12:00:00 +0000',
      timeEpoch: 1795694400000,
      authorizer: {
        jwt: {
          claims: {
            sub: 'test-sub-123',
            'cognito:groups': ['BENEFICIARY'],
          },
          scopes: [],
        },
      },
    },
    pathParameters: {
      shopId: 'shop-001',
    },
    isBase64Encoded: false,
    ...overrides,
  });

  beforeEach(() => {
    mockService = {
      submitReport: vi.fn(),
      getShopStatus: vi.fn(),
    } as unknown as ReportingService;
  });

  describe('extractAuthContext', () => {
    it('returns null when authorizer context or jwt claims are absent (fail closed)', () => {
      const eventNoAuth = createEvent({
        requestContext: {
          ...createEvent().requestContext,
          authorizer: undefined,
        },
      });
      expect(extractAuthContext(eventNoAuth)).toBeNull();

      const eventNoClaims = createEvent({
        requestContext: {
          ...createEvent().requestContext,
          authorizer: { jwt: { claims: {}, scopes: [] } },
        },
      });
      expect(extractAuthContext(eventNoClaims)).toBeNull();
    });

    it('correctly extracts sub and maps SHOP_MANAGER group', () => {
      const event = createEvent({
        requestContext: {
          ...createEvent().requestContext,
          authorizer: {
            jwt: {
              claims: {
                sub: 'mgr-sub-999',
                'cognito:groups': ['SHOP_MANAGER'],
              },
              scopes: [],
            },
          },
        },
      });
      const auth = extractAuthContext(event);
      expect(auth).toEqual({
        sub: 'mgr-sub-999',
        role: UserRole.SHOP_MANAGER,
      });
    });

    it('defaults to BENEFICIARY when no recognized admin or manager groups exist', () => {
      const event = createEvent();
      const auth = extractAuthContext(event);
      expect(auth).toEqual({
        sub: 'test-sub-123',
        role: UserRole.BENEFICIARY,
      });
    });
  });

  describe('P3-11: submitReportHandler', () => {
    const validReport: Report = {
      shopId: 'shop-001',
      reportKey: 'REPORT#2026-11-26T12:00:00.000Z#rep-1',
      reportId: 'rep-1',
      reportType: ReportType.QUEUE,
      createdAt: '2026-11-26T12:00:00.000Z',
      expiresAt: 1795701600,
      reporterSub: 'test-sub-123',
      reporterRole: UserRole.BENEFICIARY,
      payload: { waitMinutes: 15 },
      isDemoData: false,
    };

    it('returns 401 UNAUTHORIZED when Cognito claims are missing (fail closed)', async () => {
      const event = createEvent({
        requestContext: {
          ...createEvent().requestContext,
          authorizer: undefined,
        },
        body: JSON.stringify({
          reportType: ReportType.QUEUE,
          payload: { waitMinutes: 15 },
        }),
      });

      const result = await submitReportHandler(event, mockService);
      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body as string);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ApiErrorCode.UNAUTHORIZED);
    });

    it('returns 400 VALIDATION_ERROR on invalid shopId', async () => {
      const event = createEvent({
        pathParameters: { shopId: 'invalid shop id with spaces' },
        body: JSON.stringify({
          reportType: ReportType.QUEUE,
          payload: { waitMinutes: 15 },
        }),
      });

      const result = await submitReportHandler(event, mockService);
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body as string);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ApiErrorCode.VALIDATION_ERROR);
    });

    it('returns 400 VALIDATION_ERROR when request body is missing or malformed', async () => {
      const eventNoBody = createEvent({ body: undefined });
      const resNoBody = await submitReportHandler(eventNoBody, mockService);
      expect(resNoBody.statusCode).toBe(400);

      const eventBadJson = createEvent({ body: '{ malformed json' });
      const resBadJson = await submitReportHandler(eventBadJson, mockService);
      expect(resBadJson.statusCode).toBe(400);
    });

    it('returns 400 VALIDATION_ERROR when client attempts to inject server-controlled fields', async () => {
      const event = createEvent({
        body: JSON.stringify({
          reportType: ReportType.QUEUE,
          payload: { waitMinutes: 15 },
          reportId: 'malicious-id',
        }),
      });

      const result = await submitReportHandler(event, mockService);
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body as string);
      expect(body.error.message).toContain("Forbidden field 'reportId'");
    });

    it('returns 400 VALIDATION_ERROR when payload violates domain rules', async () => {
      const event = createEvent({
        body: JSON.stringify({
          reportType: ReportType.QUEUE,
          payload: { waitMinutes: -10 },
        }),
      });

      const result = await submitReportHandler(event, mockService);
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body as string);
      expect(body.error.message).toContain('between 0 and 180');
    });

    it('returns 404 SHOP_NOT_FOUND when shop does not exist', async () => {
      const error = new Error("Shop with ID 'shop-001' was not found.");
      (error as unknown as { code: string }).code = ApiErrorCode.SHOP_NOT_FOUND;
      vi.mocked(mockService.submitReport).mockRejectedValueOnce(error);

      const event = createEvent({
        body: JSON.stringify({
          reportType: ReportType.QUEUE,
          payload: { waitMinutes: 15 },
        }),
      });

      const result = await submitReportHandler(event, mockService);
      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body as string);
      expect(body.error.code).toBe(ApiErrorCode.SHOP_NOT_FOUND);
    });

    it('returns 429 COOLDOWN_ACTIVE when cooldown is triggered', async () => {
      const error = new Error('A recent report was already submitted.');
      (error as unknown as { code: string }).code = ApiErrorCode.COOLDOWN_ACTIVE;
      vi.mocked(mockService.submitReport).mockRejectedValueOnce(error);

      const event = createEvent({
        body: JSON.stringify({
          reportType: ReportType.QUEUE,
          payload: { waitMinutes: 15 },
        }),
      });

      const result = await submitReportHandler(event, mockService);
      expect(result.statusCode).toBe(429);
      const body = JSON.parse(result.body as string);
      expect(body.error.code).toBe(ApiErrorCode.COOLDOWN_ACTIVE);
    });

    it('returns 201 Created with persisted report on successful submission', async () => {
      vi.mocked(mockService.submitReport).mockResolvedValueOnce(validReport);

      const event = createEvent({
        body: JSON.stringify({
          reportType: ReportType.QUEUE,
          payload: { waitMinutes: 15 },
        }),
      });

      const result = await submitReportHandler(event, mockService);
      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body as string);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(validReport);
      expect(mockService.submitReport).toHaveBeenCalledWith(
        'shop-001',
        { reportType: ReportType.QUEUE, payload: { waitMinutes: 15 } },
        'test-sub-123',
        UserRole.BENEFICIARY
      );
    });
  });

  describe('P3-12: getShopStatusHandler', () => {
    const mockStatus: ShopStatusResponse = {
      shopId: 'shop-001',
      generatedAt: '2026-11-26T12:00:00.000Z',
      queue: {
        waitMinutes: 20,
        latestReportAt: '2026-11-26T11:55:00.000Z',
        ageSeconds: 300,
        distinctReporterCount: 2,
        confidence: ConfidenceLevel.MEDIUM,
        sources: ['Community report'],
      },
      epos: {
        status: EposStatus.WORKING,
        latestReportAt: '2026-11-26T11:50:00.000Z',
        ageSeconds: 600,
        distinctReporterCount: 1,
        confidence: ConfidenceLevel.LOW,
        sources: ['Community report'],
      },
      stock: [
        {
          commodityCode: 'RICE',
          availability: CommodityAvailability.AVAILABLE,
          latestReportAt: '2026-11-26T11:40:00.000Z',
          ageSeconds: 1200,
          distinctReporterCount: 1,
          confidence: ConfidenceLevel.LOW,
          sources: ['Community report'],
        },
      ],
    };

    it('returns 200 OK with aggregated status payload', async () => {
      vi.mocked(mockService.getShopStatus).mockResolvedValueOnce(mockStatus);

      const event = createEvent({
        routeKey: 'GET /shops/{shopId}/status',
        rawPath: '/shops/shop-001/status',
        requestContext: {
          ...createEvent().requestContext,
          http: {
            method: 'GET',
            path: '/shops/shop-001/status',
            protocol: 'HTTP/1.1',
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
        },
      });

      const result = await getShopStatusHandler(event, mockService);
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body as string);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockStatus);
    });

    it('returns 404 SHOP_NOT_FOUND when shopId does not exist', async () => {
      const error = new Error("Shop with ID 'shop-001' was not found.");
      (error as unknown as { code: string }).code = ApiErrorCode.SHOP_NOT_FOUND;
      vi.mocked(mockService.getShopStatus).mockRejectedValueOnce(error);

      const event = createEvent({
        rawPath: '/shops/shop-001/status',
      });

      const result = await getShopStatusHandler(event, mockService);
      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body as string);
      expect(body.error.code).toBe(ApiErrorCode.SHOP_NOT_FOUND);
    });
  });

  describe('Unified Handler Routing', () => {
    it('routes GET /shops/{shopId}/status through handler', async () => {
      vi.mocked(mockService.getShopStatus).mockResolvedValueOnce({
        shopId: 'shop-001',
        generatedAt: '2026-11-26T12:00:00.000Z',
        queue: {
          waitMinutes: 'UNKNOWN',
          latestReportAt: null,
          ageSeconds: null,
          distinctReporterCount: 0,
          confidence: ConfidenceLevel.LOW,
          sources: [],
        },
        epos: {
          status: 'UNKNOWN',
          latestReportAt: null,
          ageSeconds: null,
          distinctReporterCount: 0,
          confidence: ConfidenceLevel.LOW,
          sources: [],
        },
        stock: [],
      });

      const event = createEvent({
        rawPath: '/shops/shop-001/status',
        requestContext: {
          ...createEvent().requestContext,
          http: {
            method: 'GET',
            path: '/shops/shop-001/status',
            protocol: 'HTTP/1.1',
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
        },
      });

      const result = await handler(event, mockService);
      expect(result.statusCode).toBe(200);
    });

    it('routes POST /shops/{shopId}/reports through handler', async () => {
      const validReport: Report = {
        shopId: 'shop-001',
        reportKey: 'REPORT#2026-11-26T12:00:00.000Z#rep-1',
        reportId: 'rep-1',
        reportType: ReportType.QUEUE,
        createdAt: '2026-11-26T12:00:00.000Z',
        expiresAt: 1795701600,
        reporterSub: 'test-sub-123',
        reporterRole: UserRole.BENEFICIARY,
        payload: { waitMinutes: 15 },
        isDemoData: false,
      };
      vi.mocked(mockService.submitReport).mockResolvedValueOnce(validReport);

      const event = createEvent({
        rawPath: '/shops/shop-001/reports',
        body: JSON.stringify({
          reportType: ReportType.QUEUE,
          payload: { waitMinutes: 15 },
        }),
      });

      const result = await handler(event, mockService);
      expect(result.statusCode).toBe(201);
    });

    it('returns 405 METHOD_NOT_ALLOWED for unsupported HTTP methods', async () => {
      const event = createEvent({
        rawPath: '/shops/shop-001/reports',
        requestContext: {
          ...createEvent().requestContext,
          http: {
            method: 'DELETE',
            path: '/shops/shop-001/reports',
            protocol: 'HTTP/1.1',
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
        },
      });

      const result = await handler(event, mockService);
      expect(result.statusCode).toBe(405);
      const body = JSON.parse(result.body as string);
      expect(body.error.code).toBe(ApiErrorCode.METHOD_NOT_ALLOWED);
    });
  });
});
