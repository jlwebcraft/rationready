import { describe, it, expect } from 'vitest';
import { handler } from '../src/handlers/health.js';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

describe('Health Handler', () => {
  it('returns a healthy status response with 200 code', async () => {
    const mockEvent = {
      rawPath: '/health',
      headers: {},
    } as unknown as APIGatewayProxyEventV2;

    const response = await handler(mockEvent);

    expect(response).toBeDefined();
    if (typeof response === 'object' && 'statusCode' in response) {
      expect(response.statusCode).toBe(200);
      expect(response.headers?.['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body as string);
      expect(body.status).toBe('healthy');
      expect(body.service).toBe('rationready-api');
      expect(body.runtime).toBe('nodejs22.x');
      expect(body.region).toBe('ap-south-1');
    }
  });
});
