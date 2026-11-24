import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createJsonResponse } from '../utils/response.js';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const currentUtc = new Date().toISOString();

  return createJsonResponse(200, {
    status: 'healthy',
    service: 'rationready-api',
    version: '0.1.0',
    timestamp: currentUtc,
    runtime: 'nodejs22.x',
    environment: process.env.NODE_ENV || 'development',
    region: process.env.AWS_REGION || 'ap-south-1',
    requestPath: event.rawPath || '/',
  });
}
