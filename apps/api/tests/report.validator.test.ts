import { describe, it, expect } from 'vitest';
import {
  validateQueuePayload,
  validateEposPayload,
  validateStockPayload,
  validateSubmitReportInput,
  validateReport,
} from '../src/validators/report.validator.js';
import {
  ReportType,
  UserRole,
  EposStatus,
  CommodityAvailability,
  Report,
} from '../src/domain/types.js';

describe('Report Validators', () => {
  describe('P3-01: validateQueuePayload', () => {
    it('accepts valid boundary and normal wait times', () => {
      expect(validateQueuePayload({ waitMinutes: 0 }).valid).toBe(true);
      expect(validateQueuePayload({ waitMinutes: 45 }).valid).toBe(true);
      expect(validateQueuePayload({ waitMinutes: 180 }).valid).toBe(true);
    });

    it('rejects negative numbers and values exceeding 180 minutes', () => {
      const neg = validateQueuePayload({ waitMinutes: -1 });
      expect(neg.valid).toBe(false);
      expect(neg.error).toContain('between 0 and 180');

      const over = validateQueuePayload({ waitMinutes: 181 });
      expect(over.valid).toBe(false);
      expect(over.error).toContain('between 0 and 180');
    });

    it('rejects decimal / floating-point numbers', () => {
      const decimal = validateQueuePayload({ waitMinutes: 15.5 });
      expect(decimal.valid).toBe(false);
      expect(decimal.error).toContain('must be an integer');
    });

    it('rejects non-numeric values, strings, null, and undefined', () => {
      expect(validateQueuePayload({ waitMinutes: '30' }).valid).toBe(false);
      expect(validateQueuePayload({ waitMinutes: null }).valid).toBe(false);
      expect(validateQueuePayload({}).valid).toBe(false);
      expect(validateQueuePayload(null).valid).toBe(false);
      expect(validateQueuePayload('invalid').valid).toBe(false);
    });
  });

  describe('P3-02: validateEposPayload', () => {
    it('accepts WORKING and NOT_WORKING statuses', () => {
      expect(validateEposPayload({ status: EposStatus.WORKING }).valid).toBe(true);
      expect(validateEposPayload({ status: EposStatus.NOT_WORKING }).valid).toBe(true);
    });

    it('rejects unknown strings, casing variations, and non-string values', () => {
      expect(validateEposPayload({ status: 'working' }).valid).toBe(false);
      expect(validateEposPayload({ status: 'ONLINE' }).valid).toBe(false);
      expect(validateEposPayload({ status: 'DOWN' }).valid).toBe(false);
      expect(validateEposPayload({ status: 1 }).valid).toBe(false);
      expect(validateEposPayload({}).valid).toBe(false);
      expect(validateEposPayload(null).valid).toBe(false);
    });
  });

  describe('P3-03: validateStockPayload (Pilot restricted to RICE)', () => {
    it('accepts RICE with all valid availability values', () => {
      expect(
        validateStockPayload({
          commodityCode: 'RICE',
          availability: CommodityAvailability.AVAILABLE,
        }).valid
      ).toBe(true);

      expect(
        validateStockPayload({
          commodityCode: 'RICE',
          availability: CommodityAvailability.LIMITED,
        }).valid
      ).toBe(true);

      expect(
        validateStockPayload({
          commodityCode: 'RICE',
          availability: CommodityAvailability.UNAVAILABLE,
        }).valid
      ).toBe(true);
    });

    it('rejects non-pilot commodities even if otherwise common ration items', () => {
      const wheat = validateStockPayload({
        commodityCode: 'WHEAT',
        availability: CommodityAvailability.AVAILABLE,
      });
      expect(wheat.valid).toBe(false);
      expect(wheat.error).toContain('Pilot allowlist is restricted strictly to: RICE');

      const sugar = validateStockPayload({
        commodityCode: 'SUGAR',
        availability: CommodityAvailability.AVAILABLE,
      });
      expect(sugar.valid).toBe(false);
      expect(sugar.error).toContain('Pilot allowlist is restricted strictly to: RICE');

      const kerosene = validateStockPayload({
        commodityCode: 'KEROSENE',
        availability: CommodityAvailability.AVAILABLE,
      });
      expect(kerosene.valid).toBe(false);
    });

    it('rejects invalid availability values', () => {
      expect(validateStockPayload({ commodityCode: 'RICE', availability: 'IN_STOCK' }).valid).toBe(
        false
      );
      expect(validateStockPayload({ commodityCode: 'RICE', availability: 'YES' }).valid).toBe(
        false
      );
      expect(validateStockPayload({ commodityCode: 'RICE' }).valid).toBe(false);
      expect(validateStockPayload(null).valid).toBe(false);
    });
  });

  describe('validateSubmitReportInput (Client security & payload structure)', () => {
    it('accepts valid QUEUE submission input', () => {
      const result = validateSubmitReportInput({
        reportType: ReportType.QUEUE,
        payload: { waitMinutes: 20 },
      });
      expect(result.valid).toBe(true);
    });

    it('accepts valid EPOS submission input', () => {
      const result = validateSubmitReportInput({
        reportType: ReportType.EPOS,
        payload: { status: EposStatus.WORKING },
      });
      expect(result.valid).toBe(true);
    });

    it('accepts valid STOCK submission input', () => {
      const result = validateSubmitReportInput({
        reportType: ReportType.STOCK,
        payload: { commodityCode: 'RICE', availability: CommodityAvailability.AVAILABLE },
      });
      expect(result.valid).toBe(true);
    });

    it('rejects client-supplied server metadata fields', () => {
      const forbidden = [
        'reportId',
        'reporterSub',
        'reporterRole',
        'createdAt',
        'expiresAt',
        'isDemoData',
        'shopId',
        'reportKey',
      ];

      for (const field of forbidden) {
        const input = {
          reportType: ReportType.QUEUE,
          payload: { waitMinutes: 10 },
          [field]: 'malicious-or-spoofed-data',
        };
        const result = validateSubmitReportInput(input);
        expect(result.valid).toBe(false);
        expect(result.error).toContain(`Forbidden field '${field}'`);
      }
    });

    it('rejects invalid reportType', () => {
      const result = validateSubmitReportInput({
        reportType: 'INVALID_TYPE',
        payload: { waitMinutes: 10 },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid reportType');
    });

    it('rejects non-object or array submissions', () => {
      expect(validateSubmitReportInput(null).valid).toBe(false);
      expect(validateSubmitReportInput([]).valid).toBe(false);
      expect(validateSubmitReportInput('string').valid).toBe(false);
    });
  });

  describe('validateReport (DynamoDB entity validation)', () => {
    const validReport: Report = {
      shopId: 'shop-001',
      reportKey: 'REPORT#2026-11-26T12:00:00.000Z#rep-123',
      reportId: 'rep-123',
      reportType: ReportType.QUEUE,
      createdAt: '2026-11-26T12:00:00.000Z',
      expiresAt: 1795528800,
      reporterSub: 'sub-user-1',
      reporterRole: UserRole.BENEFICIARY,
      payload: { waitMinutes: 15 },
      isDemoData: false,
    };

    it('validates a complete, sound Report entity', () => {
      const result = validateReport(validReport);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('catches missing or invalid entity fields', () => {
      const invalid = {
        ...validReport,
        shopId: '',
        reportKey: 'INVALID_PREFIX',
        expiresAt: -5,
        isDemoData: 'not-a-boolean' as unknown as boolean,
      };

      const result = validateReport(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThanOrEqual(4);
    });
  });
});
