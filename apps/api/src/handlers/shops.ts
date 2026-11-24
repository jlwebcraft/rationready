import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { shopRepository, ShopRepository } from '../repositories/shop.repository.js';
import { validateShopId, validateLocality } from '../validators/shop.validator.js';
import { createSuccessResponse, createErrorResponse } from '../utils/response.js';
import { ApiErrorCode, ShopListResponse } from '../domain/types.js';

/**
 * Handles GET /shops?locality={locality}
 */
export async function listShopsHandler(
  event: APIGatewayProxyEventV2,
  repo: ShopRepository = shopRepository
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const rawLocality = event.queryStringParameters?.locality;
    const localityValidation = validateLocality(rawLocality);

    if (!localityValidation.valid) {
      return createErrorResponse(
        400,
        localityValidation.error || 'Invalid locality query parameter.',
        ApiErrorCode.VALIDATION_ERROR
      );
    }

    const locality = rawLocality ? rawLocality.trim() : undefined;
    const shops = await repo.listShops(locality);

    const data: ShopListResponse = {
      shops,
      count: shops.length,
      ...(locality ? { locality } : {}),
    };

    return createSuccessResponse(200, data);
  } catch (error) {
    console.error('[listShopsHandler] Unhandled error:', error);
    return createErrorResponse(
      500,
      'An unexpected error occurred while retrieving shops.',
      ApiErrorCode.INTERNAL_ERROR
    );
  }
}

/**
 * Handles GET /shops/{shopId}
 */
export async function getShopByIdHandler(
  event: APIGatewayProxyEventV2,
  repo: ShopRepository = shopRepository
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
    const shop = await repo.getShopById(shopId);

    if (!shop) {
      return createErrorResponse(
        404,
        `Shop with ID '${shopId}' was not found.`,
        ApiErrorCode.SHOP_NOT_FOUND
      );
    }

    return createSuccessResponse(200, shop);
  } catch (error) {
    console.error('[getShopByIdHandler] Unhandled error:', error);
    return createErrorResponse(
      500,
      'An unexpected error occurred while retrieving shop details.',
      ApiErrorCode.INTERNAL_ERROR
    );
  }
}

/**
 * Unified Lambda entry point routing GET /shops and GET /shops/{shopId}
 */
export async function handler(
  event: APIGatewayProxyEventV2,
  repo: ShopRepository = shopRepository
): Promise<APIGatewayProxyStructuredResultV2> {
  const method = event.requestContext?.http?.method || 'GET';

  if (method !== 'GET') {
    return createErrorResponse(
      405,
      `HTTP method ${method} is not allowed.`,
      ApiErrorCode.METHOD_NOT_ALLOWED
    );
  }

  // Route to getShopByIdHandler when shopId path parameter exists
  if (event.pathParameters?.shopId) {
    return getShopByIdHandler(event, repo);
  }

  // Otherwise route to listShopsHandler
  return listShopsHandler(event, repo);
}
