import {
  Report,
  ReportType,
  UserRole,
  EposStatus,
  CommodityAvailability,
  ALLOWED_COMMODITY_CODES,
} from '../domain/types.js';
import { validateShopId, ValidationResult } from './shop.validator.js';

export { ValidationResult };

const FORBIDDEN_SUBMISSION_FIELDS = [
  'reportId',
  'reporterSub',
  'reporterRole',
  'createdAt',
  'expiresAt',
  'isDemoData',
  'shopId',
  'reportKey',
] as const;

/**
 * Validates a QUEUE report payload.
 * waitMinutes must be an integer between 0 and 180.
 */
export function validateQueuePayload(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'Queue payload must be a non-null object.' };
  }

  const p = payload as Record<string, unknown>;

  if (p.waitMinutes === undefined || p.waitMinutes === null) {
    return { valid: false, error: 'waitMinutes is required for QUEUE reports.' };
  }

  if (typeof p.waitMinutes !== 'number' || !Number.isInteger(p.waitMinutes)) {
    return { valid: false, error: 'waitMinutes must be an integer.' };
  }

  if (p.waitMinutes < 0 || p.waitMinutes > 180) {
    return { valid: false, error: 'waitMinutes must be between 0 and 180 minutes.' };
  }

  return { valid: true };
}

/**
 * Validates an EPOS report payload.
 * status must be WORKING or NOT_WORKING.
 */
export function validateEposPayload(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'ePOS payload must be a non-null object.' };
  }

  const p = payload as Record<string, unknown>;

  if (!p.status || typeof p.status !== 'string') {
    return { valid: false, error: 'status is required for EPOS reports.' };
  }

  const allowedStatuses = Object.values(EposStatus) as string[];
  if (!allowedStatuses.includes(p.status)) {
    return {
      valid: false,
      error: `Invalid ePOS status '${p.status}'. Allowed values: ${allowedStatuses.join(', ')}.`,
    };
  }

  return { valid: true };
}

/**
 * Validates a STOCK report payload.
 * commodityCode must be restricted strictly to pilot allowlist (RICE).
 * availability must be AVAILABLE, LIMITED, or UNAVAILABLE.
 */
export function validateStockPayload(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'Stock payload must be a non-null object.' };
  }

  const p = payload as Record<string, unknown>;

  if (!p.commodityCode || typeof p.commodityCode !== 'string') {
    return { valid: false, error: 'commodityCode is required for STOCK reports.' };
  }

  if (!(ALLOWED_COMMODITY_CODES as readonly string[]).includes(p.commodityCode)) {
    return {
      valid: false,
      error: `Invalid commodityCode '${p.commodityCode}'. Pilot allowlist is restricted strictly to: ${ALLOWED_COMMODITY_CODES.join(', ')}.`,
    };
  }

  if (!p.availability || typeof p.availability !== 'string') {
    return { valid: false, error: 'availability is required for STOCK reports.' };
  }

  const allowedAvailabilities = Object.values(CommodityAvailability) as string[];
  if (!allowedAvailabilities.includes(p.availability)) {
    return {
      valid: false,
      error: `Invalid availability '${p.availability}'. Allowed values: ${allowedAvailabilities.join(', ')}.`,
    };
  }

  return { valid: true };
}

/**
 * Validates a report payload based on its reportType.
 */
export function validateReportPayload(reportType: ReportType, payload: unknown): ValidationResult {
  switch (reportType) {
    case ReportType.QUEUE:
      return validateQueuePayload(payload);
    case ReportType.EPOS:
      return validateEposPayload(payload);
    case ReportType.STOCK:
      return validateStockPayload(payload);
    default:
      return {
        valid: false,
        error: `Invalid reportType '${reportType}'. Allowed types: ${Object.values(ReportType).join(', ')}.`,
      };
  }
}

/**
 * Validates user submission body for POST /shops/{shopId}/reports.
 * Checks for forbidden client-supplied fields, valid reportType, and valid payload.
 */
export function validateSubmitReportInput(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Report submission body must be a non-null object.' };
  }

  const b = body as Record<string, unknown>;

  // Check forbidden client-supplied metadata fields
  for (const forbiddenField of FORBIDDEN_SUBMISSION_FIELDS) {
    if (forbiddenField in b) {
      return {
        valid: false,
        error: `Forbidden field '${forbiddenField}' in submission body. Client-supplied server metadata is not permitted.`,
      };
    }
  }

  if (!b.reportType || typeof b.reportType !== 'string') {
    return { valid: false, error: 'reportType is required.' };
  }

  const validReportTypes = Object.values(ReportType) as string[];
  if (!validReportTypes.includes(b.reportType)) {
    return {
      valid: false,
      error: `Invalid reportType '${b.reportType}'. Allowed types: ${validReportTypes.join(', ')}.`,
    };
  }

  if (!b.payload || typeof b.payload !== 'object' || Array.isArray(b.payload)) {
    return { valid: false, error: 'payload object is required.' };
  }

  return validateReportPayload(b.reportType as ReportType, b.payload);
}

/**
 * Validates a complete Report entity before database persistence.
 */
export function validateReport(report: unknown): ValidationResult {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    return { valid: false, errors: ['Report entity must be a non-null object.'] };
  }

  const errors: string[] = [];
  const r = report as Partial<Report>;

  const shopIdCheck = validateShopId(r.shopId);
  if (!shopIdCheck.valid && shopIdCheck.error) {
    errors.push(shopIdCheck.error);
  }

  if (typeof r.reportId !== 'string' || r.reportId.trim().length === 0) {
    errors.push('reportId is required and must be a non-empty string.');
  }

  if (typeof r.reportKey !== 'string' || !r.reportKey.startsWith('REPORT#')) {
    errors.push("reportKey is required and must start with 'REPORT#'.");
  }

  const validReportTypes = Object.values(ReportType);
  if (!r.reportType || !validReportTypes.includes(r.reportType)) {
    errors.push(`reportType must be one of: ${validReportTypes.join(', ')}.`);
  }

  if (typeof r.createdAt !== 'string' || Number.isNaN(Date.parse(r.createdAt))) {
    errors.push('createdAt must be a valid ISO-8601 UTC timestamp string.');
  }

  if (typeof r.expiresAt !== 'number' || !Number.isInteger(r.expiresAt) || r.expiresAt <= 0) {
    errors.push('expiresAt must be a positive integer representing epoch seconds.');
  }

  if (typeof r.reporterSub !== 'string' || r.reporterSub.trim().length === 0) {
    errors.push('reporterSub is required.');
  }

  const validRoles = Object.values(UserRole);
  if (!r.reporterRole || !validRoles.includes(r.reporterRole)) {
    errors.push(`reporterRole must be one of: ${validRoles.join(', ')}.`);
  }

  if (typeof r.isDemoData !== 'boolean') {
    errors.push('isDemoData must be a boolean flag.');
  }

  if (r.reportType && r.payload) {
    const payloadCheck = validateReportPayload(r.reportType, r.payload);
    if (!payloadCheck.valid && payloadCheck.error) {
      errors.push(payloadCheck.error);
    }
  } else if (!r.payload) {
    errors.push('payload is required.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}
