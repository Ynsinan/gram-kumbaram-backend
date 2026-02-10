import { prisma } from '../config/database.js';
import { getGoldPrices } from './scraper.service.js';
import type { GoldType, PortfolioAsset, PortfolioSummary } from '../types/index.js';
import { GOLD_TYPES } from '../types/index.js';

interface TransactionGroup {
  buyQuantity: number;
  sellQuantity: number;
  buyTotalCost: number;
  sellTotalRevenue: number;
  sellTotalCost: number; // Cost basis of sold items (for realized profit)
}

export const calculatePortfolio = async (userId: string): Promise<PortfolioSummary> => {
  // Fetch all transactions
  const transactions = await prisma.goldTransaction.findMany({
    where: { userId },
    orderBy: { transactionDate: 'asc' },
  });

  // Fetch current prices
  const pricesResponse = await getGoldPrices();
  const currentPrices = pricesResponse.prices;

  // Group transactions by gold type
  const groups: Record<GoldType, TransactionGroup> = {} as Record<GoldType, TransactionGroup>;
  
  for (const goldType of GOLD_TYPES) {
    groups[goldType] = {
      buyQuantity: 0,
      sellQuantity: 0,
      buyTotalCost: 0,
      sellTotalRevenue: 0,
      sellTotalCost: 0,
    };
  }

  // Track buy lots for FIFO cost basis calculation
  const buyLots: Record<GoldType, Array<{ quantity: number; pricePerUnit: number }>> = {} as Record<
    GoldType,
    Array<{ quantity: number; pricePerUnit: number }>
  >;
  
  for (const goldType of GOLD_TYPES) {
    buyLots[goldType] = [];
  }

  // Process transactions in chronological order
  for (const tx of transactions) {
    const goldType = tx.goldType as GoldType;
    const group = groups[goldType];

    if (!group) continue;

    if (tx.type === 'BUY') {
      group.buyQuantity += tx.quantity;
      group.buyTotalCost += tx.quantity * tx.pricePerUnit;
      
      // Add to buy lots
      buyLots[goldType]?.push({
        quantity: tx.quantity,
        pricePerUnit: tx.pricePerUnit,
      });
    } else {
      // SELL - use FIFO to calculate cost basis
      group.sellQuantity += tx.quantity;
      group.sellTotalRevenue += tx.quantity * tx.pricePerUnit;

      // Calculate cost basis using FIFO
      let remainingToSell = tx.quantity;
      const lots = buyLots[goldType];

      while (remainingToSell > 0 && lots && lots.length > 0) {
        const oldestLot = lots[0]!;

        if (oldestLot.quantity <= remainingToSell) {
          // Use entire lot
          group.sellTotalCost += oldestLot.quantity * oldestLot.pricePerUnit;
          remainingToSell -= oldestLot.quantity;
          lots.shift();
        } else {
          // Partial lot
          group.sellTotalCost += remainingToSell * oldestLot.pricePerUnit;
          oldestLot.quantity -= remainingToSell;
          remainingToSell = 0;
        }
      }
    }
  }

  // Calculate portfolio assets
  const assets: PortfolioAsset[] = [];
  let totalPortfolioValue = 0;
  let totalCost = 0;
  let totalUnrealizedProfitLoss = 0;
  let totalRealizedProfit = 0;

  for (const goldType of GOLD_TYPES) {
    const group = groups[goldType];
    if (!group) continue;

    const netQuantity = group.buyQuantity - group.sellQuantity;
    const currentPrice = currentPrices[goldType]?.sellPrice ?? 0;
    const currentValue = netQuantity * currentPrice;

    // Calculate remaining cost (total bought - cost of sold items)
    const remainingCost = group.buyTotalCost - group.sellTotalCost;
    const averageCost = netQuantity > 0 ? remainingCost / netQuantity : 0;

    // Unrealized P/L = Current Value - Remaining Cost
    const unrealizedProfitLoss = currentValue - remainingCost;

    // Realized Profit = Sell Revenue - Cost Basis of Sold Items
    const realizedProfit = group.sellTotalRevenue - group.sellTotalCost;

    assets.push({
      goldType,
      netQuantity,
      averageCost,
      totalCost: remainingCost,
      currentPrice,
      currentValue,
      unrealizedProfitLoss,
      realizedProfit,
    });

    totalPortfolioValue += currentValue;
    totalCost += remainingCost;
    totalUnrealizedProfitLoss += unrealizedProfitLoss;
    totalRealizedProfit += realizedProfit;
  }

  return {
    totalPortfolioValue,
    totalCost,
    totalUnrealizedProfitLoss,
    totalRealizedProfit,
    assets,
  };
};
