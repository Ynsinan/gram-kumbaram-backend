import type { Request } from 'express';
import type { User } from '@prisma/client';

// Gold Types - Only these are valid
export const GOLD_TYPES = ['gram', 'ceyrek', 'yarim', 'cumhuriyet'] as const;
export type GoldType = (typeof GOLD_TYPES)[number];

// Transaction Types
export type TransactionTypeEnum = 'BUY' | 'SELL';

// Authenticated Request
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Gold Type IDs (numeric)
export const GOLD_TYPE_IDS: Record<GoldType, number> = {
  gram: 1,
  ceyrek: 2,
  yarim: 3,
  cumhuriyet: 4,
} as const;

// Gold Prices from scraper
export interface GoldPrice {
  id: number;
  name: string;
  buyPrice: number;
  sellPrice: number;
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
