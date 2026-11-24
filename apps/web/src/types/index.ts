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

export interface ShopSummary {
  shopId: string;
  name: string;
  locality: string;
  addressOrLandmark: string;
  isDemoData: boolean;
  updatedAt: string;
}
