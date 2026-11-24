import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

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

export function createErrorResponse(
  statusCode: number,
  message: string,
  code: string = 'ERROR'
): APIGatewayProxyStructuredResultV2 {
  return createJsonResponse(statusCode, {
    error: {
      code,
      message,
    },
  });
}
