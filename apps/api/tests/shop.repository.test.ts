import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ShopRepository } from '../src/repositories/shop.repository.js';
import { Shop } from '../src/domain/types.js';

describe('ShopRepository', () => {
  let mockSend: ReturnType<typeof vi.fn>;
  let mockDocClient: DynamoDBDocumentClient;
  let repo: ShopRepository;

  const mockShop: Shop = {
    shopId: 'demo-shop-001',
    name: 'Demo Shop 01',
    locality: 'Demo Locality A',
    addressOrLandmark: 'Fictional Demonstration Facility 01, Sector Alpha',
    isDemoData: true,
    createdAt: '2026-11-24T00:00:00.000Z',
    updatedAt: '2026-11-24T00:00:00.000Z',
  };

  beforeEach(() => {
    mockSend = vi.fn();
    mockDocClient = { send: mockSend } as unknown as DynamoDBDocumentClient;
    repo = new ShopRepository(mockDocClient, 'TestShopsTable');
  });

  describe('getShopById', () => {
    it('retrieves an existing shop by shopId', async () => {
      mockSend.mockResolvedValueOnce({ Item: mockShop });

      const result = await repo.getShopById('demo-shop-001');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArg = mockSend.mock.calls[0][0];
      expect(callArg.input.TableName).toBe('TestShopsTable');
      expect(callArg.input.Key).toEqual({ shopId: 'demo-shop-001' });
      expect(result).toEqual(mockShop);
    });

    it('returns null when shop is not found', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });

      const result = await repo.getShopById('unknown-shop');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });
  });

  describe('listShops', () => {
    it('scans all shops when no locality filter is provided', async () => {
      mockSend.mockResolvedValueOnce({ Items: [mockShop] });

      const result = await repo.listShops();

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArg = mockSend.mock.calls[0][0];
      expect(callArg.input.TableName).toBe('TestShopsTable');
      expect(callArg.input.FilterExpression).toBeUndefined();
      expect(result).toEqual([mockShop]);
    });

    it('applies Scan FilterExpression when locality is specified', async () => {
      mockSend.mockResolvedValueOnce({ Items: [mockShop] });

      const result = await repo.listShops('Demo Locality A');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArg = mockSend.mock.calls[0][0];
      expect(callArg.input.TableName).toBe('TestShopsTable');
      expect(callArg.input.FilterExpression).toBe('locality = :locality');
      expect(callArg.input.ExpressionAttributeValues).toEqual({
        ':locality': 'Demo Locality A',
      });
      expect(result).toEqual([mockShop]);
    });
  });

  describe('saveShop', () => {
    it('puts shop item into DynamoDB table', async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await repo.saveShop(mockShop);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArg = mockSend.mock.calls[0][0];
      expect(callArg.input.TableName).toBe('TestShopsTable');
      expect(callArg.input.Item).toEqual(mockShop);
      expect(result).toEqual(mockShop);
    });
  });
});
