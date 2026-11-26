/**
 * RationReady Domain Types & Enums
 * Source of Truth: RATIONREADY_ROADMAP.md Sections 1 & 2, Phase 2 & Phase 3 Specifications
 */

// ============================================================================
// 1. ROLES, COMMODITIES & REPORT ENUMS
// ============================================================================

export enum UserRole {
  VISITOR = 'VISITOR',
  BENEFICIARY = 'BENEFICIARY',
  SHOP_MANAGER = 'SHOP_MANAGER',
  ADMIN = 'ADMIN',
}

export enum ReportType {
  QUEUE = 'QUEUE',
  EPOS = 'EPOS',
  STOCK = 'STOCK',
}

export enum EposStatus {
  WORKING = 'WORKING',
  NOT_WORKING = 'NOT_WORKING',
}

export enum CommodityAvailability {
  AVAILABLE = 'AVAILABLE',
  LIMITED = 'LIMITED',
  UNAVAILABLE = 'UNAVAILABLE',
}

export enum ConfidenceLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  MIXED = 'MIXED',
}

export enum ApiErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SHOP_NOT_FOUND = 'SHOP_NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  COOLDOWN_ACTIVE = 'COOLDOWN_ACTIVE',
}

// ============================================================================
// 2. CENTRAL CONSTANTS & PILOT CONFIGURATION
// ============================================================================

/**
 * Approved commodities for the pilot.
 * The pilot supports exactly RICE. All other commodities must be rejected.
 */
export const ALLOWED_COMMODITY_CODES = ['RICE'] as const;
export type AllowedCommodityCode = (typeof ALLOWED_COMMODITY_CODES)[number];

/**
 * Fixed report validity windows in seconds.
 * QUEUE: 2 hours (7,200s)
 * EPOS: 4 hours (14,400s)
 * STOCK: 24 hours (86,400s)
 */
export const REPORT_EXPIRY_SECONDS = {
  [ReportType.QUEUE]: 2 * 60 * 60,
  [ReportType.EPOS]: 4 * 60 * 60,
  [ReportType.STOCK]: 24 * 60 * 60,
} as const;

/**
 * Cooldown duration in seconds for duplicate reports by the same user.
 */
export const REPORT_COOLDOWN_SECONDS = 60;

/**
 * Canonical source labels for trust and provenance display.
 */
export const REPORT_SOURCE_LABELS = {
  COMMUNITY: 'Community report',
  SHOP_MANAGER: 'Shop manager update',
} as const;

// ============================================================================
// 3. REPORT PAYLOADS & SUBMISSION INPUTS
// ============================================================================

export interface QueuePayload {
  waitMinutes: number; // 0 to 180 integer
}

export interface EposPayload {
  status: EposStatus;
}

export interface StockPayload {
  commodityCode: AllowedCommodityCode;
  availability: CommodityAvailability;
}

export type ReportPayload = QueuePayload | EposPayload | StockPayload;

export interface SubmitReportInput {
  reportType: ReportType;
  payload: ReportPayload;
}

// ============================================================================
// 4. DYNAMODB ENTITIES & KEY SCHEMAS
// ============================================================================

/**
 * Shops Table Entity
 * Key Schema:
 *   Partition Key (HASH): shopId (String)
 *   Sort Key: None
 */
export interface Shop {
  shopId: string;
  name: string;
  locality: string;
  addressOrLandmark: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string;
  isDemoData: boolean;
  createdAt: string; // UTC ISO-8601
  updatedAt: string; // UTC ISO-8601
}

/**
 * Reports Table Entity
 * Key Schema:
 *   Partition Key (HASH): shopId (String)
 *   Sort Key (RANGE): reportKey (String, format: REPORT#<createdAt>#<reportId>)
 */
export interface Report {
  shopId: string;
  reportKey: string; // Lexicographically sortable timestamp and unique report ID
  reportId: string;
  reportType: ReportType;
  createdAt: string; // UTC ISO-8601
  expiresAt: number; // Unix epoch seconds for DynamoDB TTL
  reporterSub: string;
  reporterRole: UserRole;
  payload: ReportPayload;
  isDemoData: boolean;
}

/**
 * Helper to construct lexicographically sortable reportKey
 */
export function createReportKey(createdAt: string, reportId: string): string {
  return `REPORT#${createdAt}#${reportId}`;
}

// ============================================================================
// 5. STATUS SUMMARY & AGGREGATION RESPONSES (Phase 3)
// ============================================================================

export interface QueueStatusSummary {
  waitMinutes: number | 'UNKNOWN';
  latestReportAt: string | null;
  ageSeconds: number | null;
  distinctReporterCount: number;
  confidence: ConfidenceLevel;
  sources: string[];
}

export interface EposStatusSummary {
  status: EposStatus | 'MIXED REPORTS' | 'UNKNOWN';
  latestReportAt: string | null;
  ageSeconds: number | null;
  distinctReporterCount: number;
  confidence: ConfidenceLevel;
  sources: string[];
}

export interface CommodityStockStatusSummary {
  commodityCode: AllowedCommodityCode;
  availability: CommodityAvailability | 'MIXED REPORTS' | 'UNKNOWN';
  latestReportAt: string | null;
  ageSeconds: number | null;
  distinctReporterCount: number;
  confidence: ConfidenceLevel;
  sources: string[];
}

export interface ShopStatusResponse {
  shopId: string;
  generatedAt: string;
  queue: QueueStatusSummary;
  epos: EposStatusSummary;
  stock: CommodityStockStatusSummary[];
}

// ============================================================================
// 6. API CONTRACT & RESPONSE ENVELOPES
// ============================================================================

export interface ApiResponseSuccess<T> {
  success: true;
  data: T;
}

export interface ApiResponseError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;

export interface ShopListResponse {
  shops: Shop[];
  count: number;
  locality?: string;
}

export interface ShopQueryParams {
  locality?: string;
}
