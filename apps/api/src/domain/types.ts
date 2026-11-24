/**
 * RationReady Domain Types & Enums
 * Source of Truth: RATIONREADY_ROADMAP.md Section 2 & Phase 2 Specifications
 */

// ============================================================================
// 1. ROLES & REPORT ENUMS
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
}

// ============================================================================
// 2. REPORT PAYLOADS
// ============================================================================

export interface QueuePayload {
  waitMinutes: number; // 0 to 180
}

export interface EposPayload {
  status: EposStatus;
}

export interface StockPayload {
  commodityCode: string;
  availability: CommodityAvailability;
}

export type ReportPayload = QueuePayload | EposPayload | StockPayload;

// ============================================================================
// 3. DYNAMODB ENTITIES & KEY SCHEMAS
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
// 4. API CONTRACT & RESPONSE ENVELOPES
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
