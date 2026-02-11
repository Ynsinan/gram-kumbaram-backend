import type { Request } from 'express';
import type { User } from '@prisma/client';

// Gold Type Enum - Integer-based
export const GoldTypeEnum = {
  GRAM: 1,
  CEYREK: 2,
  YARIM: 3,
  CUMHURIYET: 4,
} as const;

export type GoldType = (typeof GoldTypeEnum)[keyof typeof GoldTypeEnum]; // 1 | 2 | 3 | 4

// All valid gold type IDs as array
export const GOLD_TYPES = [
  GoldTypeEnum.GRAM,
  GoldTypeEnum.CEYREK,
  GoldTypeEnum.YARIM,
  GoldTypeEnum.CUMHURIYET,
] as const;

// Display names (Turkish)
export const GOLD_TYPE_NAMES: Record<GoldType, string> = {
  [GoldTypeEnum.GRAM]: 'Gram Altın',
  [GoldTypeEnum.CEYREK]: 'Çeyrek Altın',
  [GoldTypeEnum.YARIM]: 'Yarım Altın',
  [GoldTypeEnum.CUMHURIYET]: 'Cumhuriyet Altını',
};

// Reverse mapping: ID → internal code string (for scraper URL matching)
export const GOLD_TYPE_CODES: Record<GoldType, string> = {
  [GoldTypeEnum.GRAM]: 'gram',
  [GoldTypeEnum.CEYREK]: 'ceyrek',
  [GoldTypeEnum.YARIM]: 'yarim',
  [GoldTypeEnum.CUMHURIYET]: 'cumhuriyet',
};

// Transaction Types
export type TransactionTypeEnum = 'BUY' | 'SELL';

// Authenticated Request
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Gold Prices from scraper
export interface GoldPrice {
  id: GoldType;
  name: string;
  buyPrice: number;
  sellPrice: number;
  dailyChangePercent?: number; // Günlük değişim yüzdesi (%)
}

export interface GoldPricesResponse {
  prices: Record<GoldType, GoldPrice>;
  lastUpdated: string;
}

// Transaction DTOs
export interface CreateTransactionDTO {
  type: TransactionTypeEnum;
  goldType: GoldType;
  quantity: number;
  pricePerUnit: number;
  date: string; // ISO date string
}

// Portfolio Response
export interface PortfolioAsset {
  goldType: GoldType;
  netQuantity: number;
  averageCost: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedProfitLoss: number;
  realizedProfit: number;
}

export interface PortfolioSummary {
  totalPortfolioValue: number;
  totalCost: number;
  totalUnrealizedProfitLoss: number;
  totalRealizedProfit: number;
  assets: PortfolioAsset[];
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
}

// API Error Response
export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
}

// API Success Response
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
