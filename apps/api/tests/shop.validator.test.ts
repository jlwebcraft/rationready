import { describe, it, expect } from 'vitest';
import {
  validateShopId,
  validateLocality,
  validateShop,
} from '../src/validators/shop.validator.js';
import { Shop } from '../src/domain/types.js';

describe('Shop Validators', () => {
  describe('validateShopId', () => {
    it('accepts valid alphanumeric, hyphens, and underscore IDs', () => {
      expect(validateShopId('demo-shop-001').valid).toBe(true);
      expect(validateShopId('shop_123').valid).toBe(true);
      expect(validateShopId('SHOP01').valid).toBe(true);
    });

    it('rejects empty or whitespace-only IDs', () => {
      const res = validateShopId('   ');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('between 1 and 64 characters');
    });

    it('rejects non-string inputs', () => {
      expect(validateShopId(12345).valid).toBe(false);
      expect(validateShopId(null).valid).toBe(false);
      expect(validateShopId(undefined).valid).toBe(false);
    });

    it('rejects IDs with invalid characters or special symbols', () => {
      expect(validateShopId('shop/123').valid).toBe(false);
      expect(validateShopId('shop?id=1').valid).toBe(false);
      expect(validateShopId('shop#1').valid).toBe(false);
    });

    it('rejects IDs longer than 64 characters', () => {
      const longId = 'a'.repeat(65);
      expect(validateShopId(longId).valid).toBe(false);
    });
  });

  describe('validateLocality', () => {
    it('accepts undefined, null, or empty string as optional filter', () => {
      expect(validateLocality(undefined).valid).toBe(true);
      expect(validateLocality(null).valid).toBe(true);
      expect(validateLocality('').valid).toBe(true);
    });

    it('accepts valid locality strings', () => {
      expect(validateLocality('Demo Locality A').valid).toBe(true);
      expect(validateLocality('Central Ward').valid).toBe(true);
    });

    it('rejects non-string values when provided', () => {
      expect(validateLocality(123).valid).toBe(false);
      expect(validateLocality({}).valid).toBe(false);
    });

    it('rejects localities longer than 100 characters', () => {
      const longLoc = 'x'.repeat(101);
      expect(validateLocality(longLoc).valid).toBe(false);
    });
  });

  describe('validateShop', () => {
    const validShop: Shop = {
      shopId: 'demo-shop-001',
      name: 'Demo Shop 01',
      locality: 'Demo Locality A',
      addressOrLandmark: 'Fictional Demonstration Facility 01, Sector Alpha',
      isDemoData: true,
      createdAt: '2026-11-24T00:00:00.000Z',
      updatedAt: '2026-11-24T00:00:00.000Z',
    };

    it('validates a complete valid Shop entity', () => {
      const res = validateShop(validShop);
      expect(res.valid).toBe(true);
      expect(res.errors).toBeUndefined();
    });

    it('accepts valid optional coordinates and opening hours', () => {
      const shopWithOptional: Shop = {
        ...validShop,
        latitude: 19.076,
        longitude: 72.8777,
        openingHours: '09:00 - 18:00',
      };
      const res = validateShop(shopWithOptional);
      expect(res.valid).toBe(true);
    });

    it('rejects invalid coordinates', () => {
      const invalidLat = { ...validShop, latitude: 120 };
      expect(validateShop(invalidLat).valid).toBe(false);

      const invalidLng = { ...validShop, longitude: -200 };
      expect(validateShop(invalidLng).valid).toBe(false);
    });

    it('rejects missing required attributes', () => {
      const incomplete = { shopId: 'demo-shop-001' };
      const res = validateShop(incomplete);
      expect(res.valid).toBe(false);
      expect(res.errors?.length).toBeGreaterThan(0);
    });
  });
});
