import { prisma } from '../config/database.js';
import type { GoldType } from '../types/index.js';
import { GOLD_TYPE_NAMES } from '../types/index.js';
import type { CreateTransactionInput } from '../validators/transaction.validator.js';

export interface TransactionServiceResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Calculate current holdings for a specific gold type
export const calculateHoldings = async (
  userId: string,
  goldType: GoldType
): Promise<number> => {
  const result = await prisma.goldTransaction.groupBy({
    by: ['type'],
    where: {
      userId,
      goldType,
    },
    _sum: {
      quantity: true,
    },
  });

  let buyTotal = 0;
  let sellTotal = 0;

  for (const row of result) {
    if (row.type === 'BUY') {
      buyTotal = row._sum.quantity ?? 0;
    } else if (row.type === 'SELL') {
      sellTotal = row._sum.quantity ?? 0;
    }
  }

  return buyTotal - sellTotal;
};

// Create a new transaction
export const createTransaction = async (
  userId: string,
  input: CreateTransactionInput
): Promise<TransactionServiceResult> => {
  const { type, goldType: goldTypeInput, quantity, pricePerUnit, date } = input;
  const goldType = goldTypeInput as GoldType;

  // If SELL, validate sufficient holdings
  if (type === 'SELL') {
    const currentHoldings = await calculateHoldings(userId, goldType);

    if (currentHoldings < quantity) {
      return {
        success: false,
        error: `Yetersiz altın bakiyesi. Mevcut: ${currentHoldings} ${GOLD_TYPE_NAMES[goldType as GoldType]}, satılmak istenen: ${quantity}.`,
      };
    }
  }

  // Create the transaction
  const transaction = await prisma.goldTransaction.create({
    data: {
      userId,
      type,
      goldType,
      quantity,
      pricePerUnit,
      transactionDate: new Date(date),
    },
  });

  return {
    success: true,
    data: transaction,
  };
};

// Get all transactions for a user
export const getTransactions = async (userId: string) => {
  return prisma.goldTransaction.findMany({
    where: { userId },
    orderBy: { transactionDate: 'desc' },
  });
};

// Get transaction by ID
export const getTransactionById = async (userId: string, transactionId: string) => {
  return prisma.goldTransaction.findFirst({
    where: {
      id: transactionId,
      userId,
    },
  });
};

// Delete transaction (with validation for SELL)
export const deleteTransaction = async (
  userId: string,
  transactionId: string
): Promise<TransactionServiceResult> => {
  const transaction = await getTransactionById(userId, transactionId);

  if (!transaction) {
    return {
      success: false,
      error: 'İşlem bulunamadı',
    };
  }

  // If deleting a BUY, check if it would make holdings negative
  if (transaction.type === 'BUY') {
    const goldType = transaction.goldType as unknown as GoldType;
    const currentHoldings = await calculateHoldings(userId, goldType);
    const holdingsAfterDelete = currentHoldings - transaction.quantity;

    if (holdingsAfterDelete < 0) {
      return {
        success: false,
        error: `Bu ALIŞ işlemi silinemez. Silme işlemi sonrasında bakiye negatif olur (${holdingsAfterDelete} ${GOLD_TYPE_NAMES[goldType]}).`,
      };
    }
  }

  await prisma.goldTransaction.delete({
    where: { id: transactionId },
  });

  return {
    success: true,
    data: { message: 'İşlem başarıyla silindi' },
  };
};

// Get holdings summary by gold type
export const getHoldingsSummary = async (userId: string) => {
  const transactions = await prisma.goldTransaction.findMany({
    where: { userId },
  });

  const holdings: Record<number, { buyQuantity: number; sellQuantity: number; netQuantity: number }> = {};

  for (const tx of transactions) {
    const goldTypeId = tx.goldType as unknown as number;
    if (!holdings[goldTypeId]) {
      holdings[goldTypeId] = { buyQuantity: 0, sellQuantity: 0, netQuantity: 0 };
    }

    const holding = holdings[goldTypeId]!;
    
    if (tx.type === 'BUY') {
      holding.buyQuantity += tx.quantity;
    } else {
      holding.sellQuantity += tx.quantity;
    }
    
    holding.netQuantity = holding.buyQuantity - holding.sellQuantity;
  }

  return holdings;
};
