import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handler } from '../src/handlers/health.js';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

describe('Health Handler', () => {
  const originalEnv = process.env.CORS_ALLOW_ORIGIN;

  beforeEach(() => {
    delete process.env.CORS_ALLOW_ORIGIN;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.CORS_ALLOW_ORIGIN = originalEnv;
    } else {
      delete process.env.CORS_ALLOW_ORIGIN;
    }
  });

  it('returns a healthy status response with 200 code and default CORS origin', async () => {
    const mockEvent = {
      rawPath: '/health',
      headers: {},
    } as unknown as APIGatewayProxyEventV2;

    const response = await handler(mockEvent);

    expect(response).toBeDefined();
    if (typeof response === 'object' && 'statusCode' in response) {
      expect(response.statusCode).toBe(200);
      expect(response.headers?.['Content-Type']).toBe('application/json');
      expect(response.headers?.['Access-Control-Allow-Origin']).toBe('http://localhost:3000');

      const body = JSON.parse(response.body as string);
      expect(body.status).toBe('healthy');
      expect(body.service).toBe('rationready-api');
      expect(body.runtime).toBe('nodejs22.x');
      expect(body.region).toBe('ap-south-1');
    }
  });

  it('returns configured CORS origin from environment variable', async () => {
    process.env.CORS_ALLOW_ORIGIN = 'https://custom-origin.com';

    const mockEvent = {
      rawPath: '/health',
      headers: {},
    } as unknown as APIGatewayProxyEventV2;

    const response = await handler(mockEvent);

    if (typeof response === 'object' && 'statusCode' in response) {
      expect(response.headers?.['Access-Control-Allow-Origin']).toBe('https://custom-origin.com');
    }
  });
});
