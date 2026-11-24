import { Shop } from '../domain/types.js';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  errors?: string[];
}

/**
 * Validates a shopId parameter.
 * Must be a non-empty string, 1 to 64 chars, containing alphanumeric, hyphen, or underscore.
 */
export function validateShopId(shopId: unknown): ValidationResult {
  if (typeof shopId !== 'string') {
    return {
      valid: false,
      error: 'Invalid shopId parameter. Must be a string.',
    };
  }

  const trimmed = shopId.trim();
  if (trimmed.length === 0 || trimmed.length > 64) {
    return {
      valid: false,
      error: 'Invalid shopId parameter. Must be between 1 and 64 characters.',
    };
  }

  const pattern = /^[a-zA-Z0-9_-]+$/;
  if (!pattern.test(trimmed)) {
    return {
      valid: false,
      error: 'Invalid shopId parameter. Only alphanumeric, hyphens, and underscores are allowed.',
    };
  }

  return { valid: true };
}

/**
 * Validates an optional locality query parameter.
 * If provided, must be a string between 1 and 100 characters.
 */
export function validateLocality(locality: unknown): ValidationResult {
  if (locality === undefined || locality === null || locality === '') {
    return { valid: true };
  }

  if (typeof locality !== 'string') {
    return {
      valid: false,
      error: 'Invalid locality parameter. Must be a string.',
    };
  }

  const trimmed = locality.trim();
  if (trimmed.length === 0 || trimmed.length > 100) {
    return {
      valid: false,
      error: 'Invalid locality parameter. Locality must be between 1 and 100 characters.',
    };
  }

  return { valid: true };
}

/**
 * Validates a Shop entity for database persistence.
 */
export function validateShop(shop: unknown): ValidationResult {
  if (!shop || typeof shop !== 'object') {
    return { valid: false, errors: ['Shop payload must be a non-null object.'] };
  }

  const errors: string[] = [];
  const s = shop as Partial<Shop>;

  const idCheck = validateShopId(s.shopId);
  if (!idCheck.valid && idCheck.error) {
    errors.push(idCheck.error);
  }

  if (typeof s.name !== 'string' || s.name.trim().length === 0 || s.name.length > 100) {
    errors.push('Shop name is required and must be between 1 and 100 characters.');
  }

  if (typeof s.locality !== 'string' || s.locality.trim().length === 0 || s.locality.length > 100) {
    errors.push('Shop locality is required and must be between 1 and 100 characters.');
  }

  if (
    typeof s.addressOrLandmark !== 'string' ||
    s.addressOrLandmark.trim().length === 0 ||
    s.addressOrLandmark.length > 250
  ) {
    errors.push('Shop addressOrLandmark is required and must be between 1 and 250 characters.');
  }

  if (typeof s.isDemoData !== 'boolean') {
    errors.push('Shop isDemoData must be a boolean flag.');
  }

  if (typeof s.createdAt !== 'string' || isNaN(Date.parse(s.createdAt))) {
    errors.push('Shop createdAt must be a valid ISO-8601 UTC date string.');
  }

  if (typeof s.updatedAt !== 'string' || isNaN(Date.parse(s.updatedAt))) {
    errors.push('Shop updatedAt must be a valid ISO-8601 UTC date string.');
  }

  // Optional attributes validation
  if (s.latitude !== undefined) {
    if (typeof s.latitude !== 'number' || s.latitude < -90 || s.latitude > 90) {
      errors.push('Shop latitude must be a valid number between -90 and 90.');
    }
  }

  if (s.longitude !== undefined) {
    if (typeof s.longitude !== 'number' || s.longitude < -180 || s.longitude > 180) {
      errors.push('Shop longitude must be a valid number between -180 and 180.');
    }
  }

  if (s.openingHours !== undefined) {
    if (typeof s.openingHours !== 'string' || s.openingHours.length > 200) {
      errors.push('Shop openingHours must be a string up to 200 characters.');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
