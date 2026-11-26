import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { ApiResponseSuccess, ApiResponseError, ApiErrorCode } from '../domain/types.js';

export function getCorsHeaders(): Record<string, string> {
  const allowedOrigin = process.env.CORS_ALLOW_ORIGIN || 'http://localhost:3000';
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  };
}

export function createJsonResponse<T>(
  statusCode: number,
  body: T,
  headers: Record<string, string> = {}
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      ...getCorsHeaders(),
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

export function createSuccessResponse<T>(
  statusCode: number,
  data: T,
  headers: Record<string, string> = {}
): APIGatewayProxyStructuredResultV2 {
  const payload: ApiResponseSuccess<T> = {
    success: true,
    data,
  };
  return createJsonResponse(statusCode, payload, headers);
}

export function createErrorResponse(
  statusCode: number,
  message: string,
  code: string = ApiErrorCode.INTERNAL_ERROR,
  details?: unknown,
  headers: Record<string, string> = {}
): APIGatewayProxyStructuredResultV2 {
  const payload: ApiResponseError = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
  return createJsonResponse(statusCode, payload, headers);
}
