import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { reportingService, ReportingService } from '../services/reporting.service.js';
import { validateShopId } from '../validators/shop.validator.js';
import { validateSubmitReportInput } from '../validators/report.validator.js';
import { createSuccessResponse, createErrorResponse } from '../utils/response.js';
import { ApiErrorCode, UserRole, SubmitReportInput } from '../domain/types.js';

/**
 * Extracts verified user identity and role from Cognito JWT authorizer claims.
 * Returns null if claims or sub are missing (fail closed).
 */
export function extractAuthContext(event: APIGatewayProxyEventV2): {
  sub: string;
  role: UserRole;
} | null {
  // Inspect standard HTTP API Gateway JWT authorizer context
  const requestContext = event.requestContext as unknown as {
    authorizer?: { jwt?: { claims?: Record<string, unknown> } };
  };
  const authorizer = requestContext?.authorizer;

  const claims = authorizer?.jwt?.claims;
  if (!claims || typeof claims.sub !== 'string' || claims.sub.trim().length === 0) {
    return null;
  }

  const sub = claims.sub.trim();

  // Extract roles from cognito:groups
  let role = UserRole.BENEFICIARY;
  const groups = claims['cognito:groups'];

  if (Array.isArray(groups)) {
    if (groups.includes('SHOP_MANAGER') || groups.includes('ShopManager')) {
      role = UserRole.SHOP_MANAGER;
    } else if (groups.includes('ADMIN') || groups.includes('Admin')) {
      role = UserRole.ADMIN;
    }
  } else if (typeof groups === 'string') {
    if (groups === 'SHOP_MANAGER' || groups === 'ShopManager') {
      role = UserRole.SHOP_MANAGER;
    } else if (groups === 'ADMIN' || groups === 'Admin') {
      role = UserRole.ADMIN;
    }
  }

  return { sub, role };
}

/**
 * Handles POST /shops/{shopId}/reports
 * Protected endpoint requiring verified Cognito JWT claims.
 */
export async function submitReportHandler(
  event: APIGatewayProxyEventV2,
  service: ReportingService = reportingService
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    // 1. Verify shopId parameter
    const rawShopId = event.pathParameters?.shopId;
    const shopIdValidation = validateShopId(rawShopId);

    if (!shopIdValidation.valid) {
      return createErrorResponse(
        400,
        shopIdValidation.error || 'Invalid shopId parameter.',
        ApiErrorCode.VALIDATION_ERROR
      );
    }
    const shopId = (rawShopId as string).trim();

    // 2. Enforce Cognito authentication claims (P3-11: fail closed on missing claims)
    const auth = extractAuthContext(event);
    if (!auth) {
      return createErrorResponse(
        401,
        'Authentication required. Valid Cognito authorization claims are missing.',
        ApiErrorCode.UNAUTHORIZED
      );
    }

    // 3. Parse request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required.', ApiErrorCode.VALIDATION_ERROR);
    }

    let parsedBody: unknown;
    try {
      const rawText = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : event.body;
      parsedBody = JSON.parse(rawText);
    } catch {
      return createErrorResponse(
        400,
        'Malformed JSON in request body.',
        ApiErrorCode.VALIDATION_ERROR
      );
    }

    // 4. Validate input payload and reject forbidden client metadata
    const validation = validateSubmitReportInput(parsedBody);
    if (!validation.valid) {
      return createErrorResponse(
        400,
        validation.error || 'Invalid report submission payload.',
        ApiErrorCode.VALIDATION_ERROR
      );
    }

    // 5. Submit report through service layer
    const report = await service.submitReport(
      shopId,
      parsedBody as SubmitReportInput,
      auth.sub,
      auth.role
    );

    return createSuccessResponse(201, report);
  } catch (error: unknown) {
    const err = error as { code?: string; statusCode?: number; message?: string };
    if (err.code === ApiErrorCode.SHOP_NOT_FOUND) {
      return createErrorResponse(
        404,
        err.message || 'Shop was not found.',
        ApiErrorCode.SHOP_NOT_FOUND
      );
    }
    if (err.code === ApiErrorCode.COOLDOWN_ACTIVE) {
      return createErrorResponse(
        429,
        err.message || 'Submission cooldown active. Please wait 60 seconds.',
        ApiErrorCode.COOLDOWN_ACTIVE
      );
    }
    if (err.code === ApiErrorCode.VALIDATION_ERROR) {
      return createErrorResponse(
        400,
        err.message || 'Validation error.',
        ApiErrorCode.VALIDATION_ERROR
      );
    }

    console.error('[submitReportHandler] Unhandled error:', error);
    return createErrorResponse(
      500,
      'An unexpected error occurred while submitting report.',
      ApiErrorCode.INTERNAL_ERROR
    );
  }
}

/**
 * Handles GET /shops/{shopId}/status
 * Public endpoint aggregating active freshness and trust metrics.
 */
export async function getShopStatusHandler(
  event: APIGatewayProxyEventV2,
  service: ReportingService = reportingService
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const rawShopId = event.pathParameters?.shopId;
    const shopIdValidation = validateShopId(rawShopId);

    if (!shopIdValidation.valid) {
      return createErrorResponse(
        400,
        shopIdValidation.error || 'Invalid shopId parameter.',
        ApiErrorCode.VALIDATION_ERROR
      );
    }

    const shopId = (rawShopId as string).trim();
    const status = await service.getShopStatus(shopId);

    return createSuccessResponse(200, status);
  } catch (error: unknown) {
    const err = error as { code?: string; statusCode?: number; message?: string };
    if (err.code === ApiErrorCode.SHOP_NOT_FOUND) {
      return createErrorResponse(
        404,
        err.message || 'Shop was not found.',
        ApiErrorCode.SHOP_NOT_FOUND
      );
    }

    console.error('[getShopStatusHandler] Unhandled error:', error);
    return createErrorResponse(
      500,
      'An unexpected error occurred while retrieving shop status.',
      ApiErrorCode.INTERNAL_ERROR
    );
  }
}

/**
 * Unified Lambda entry point routing GET /shops/{shopId}/status and POST /shops/{shopId}/reports
 */
export async function handler(
  event: APIGatewayProxyEventV2,
  service: ReportingService = reportingService
): Promise<APIGatewayProxyStructuredResultV2> {
  const method = event.requestContext?.http?.method || 'GET';
  const path = event.rawPath || event.requestContext?.http?.path || '';

  if (method === 'GET') {
    if (path.endsWith('/status')) {
      return getShopStatusHandler(event, service);
    }
    return createErrorResponse(
      404,
      `Path '${path}' not found for GET method.`,
      ApiErrorCode.VALIDATION_ERROR
    );
  }

  if (method === 'POST') {
    if (path.endsWith('/reports')) {
      return submitReportHandler(event, service);
    }
    return createErrorResponse(
      404,
      `Path '${path}' not found for POST method.`,
      ApiErrorCode.VALIDATION_ERROR
    );
  }

  return createErrorResponse(
    405,
    `HTTP method ${method} is not allowed.`,
    ApiErrorCode.METHOD_NOT_ALLOWED
  );
}
