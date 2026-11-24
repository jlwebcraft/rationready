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

export interface Shop {
  shopId: string;
  name: string;
  locality: string;
  addressOrLandmark: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string;
  isDemoData: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShopSummary {
  shopId: string;
  name: string;
  locality: string;
  addressOrLandmark: string;
  isDemoData: boolean;
  updatedAt: string;
}

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
