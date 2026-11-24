/**
 * RationReady Domain Types & Enums
 * Source of Truth: RATIONREADY_ROADMAP.md Section 2
 */

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

export interface Report {
  shopId: string;
  reportKey: string;
  reportId: string;
  reportType: ReportType;
  createdAt: string;
  expiresAt: number; // Unix epoch seconds
  reporterSub: string;
  reporterRole: UserRole;
  payload: ReportPayload;
  isDemoData: boolean;
}
