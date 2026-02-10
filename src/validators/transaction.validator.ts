import { z } from 'zod';
import { GOLD_TYPES } from '../types/index.js';

export const createTransactionSchema = z.object({
  type: z.enum(['BUY', 'SELL'], {
    errorMap: () => ({ message: 'İşlem türü ALIŞ veya SATIŞ olmalıdır' }),
  }),
  goldType: z.enum(GOLD_TYPES, {
    errorMap: () => ({
      message: `Altın türü şunlardan biri olmalıdır: ${GOLD_TYPES.join(', ')}`,
    }),
  }),
  quantity: z
    .number({
      required_error: 'Miktar zorunludur',
      invalid_type_error: 'Miktar sayı olmalıdır',
    })
    .positive('Miktar pozitif bir sayı olmalıdır'),
  pricePerUnit: z
    .number({
      required_error: 'Birim fiyatı zorunludur',
      invalid_type_error: 'Birim fiyatı sayı olmalıdır',
    })
    .positive('Birim fiyatı pozitif bir sayı olmalıdır'),
  date: z
    .string({
      required_error: 'Tarih zorunludur',
    })
    .datetime({ message: 'Tarih geçerli bir ISO formatında olmalıdır' })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-MM-DD formatında olmalıdır')),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
