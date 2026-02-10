import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { createTransactionSchema } from '../validators/transaction.validator.js';
import {
  createTransaction,
  getTransactions,
  getTransactionById,
  deleteTransaction,
  getHoldingsSummary,
} from '../services/transaction.service.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Create a new transaction (BUY or SELL)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - goldType
 *               - quantity
 *               - pricePerUnit
 *               - date
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [BUY, SELL]
 *                 description: Transaction type
 *               goldType:
 *                 type: string
 *                 enum: [gram, ceyrek, yarim, cumhuriyet]
 *                 description: Type of gold
 *               quantity:
 *                 type: number
 *                 minimum: 0
 *                 exclusiveMinimum: true
 *                 description: Amount of gold (always positive)
 *               pricePerUnit:
 *                 type: number
 *                 minimum: 0
 *                 exclusiveMinimum: true
 *                 description: Price per unit at transaction time
 *               date:
 *                 type: string
 *                 format: date-time
 *                 description: Transaction date (ISO format or YYYY-MM-DD)
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *       400:
 *         description: Validation error or insufficient balance for SELL
 *       401:
 *         description: Unauthorized
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Validate input
    const validationResult = createTransactionSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: validationResult.error.errors.map((e) => e.message).join(', '),
      });
      return;
    }

    const result = await createTransaction(userId, validationResult.data);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'InsufficientBalance',
        message: result.error,
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'İşlem oluşturulamadı',
    });
  }
});

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get all transactions for the authenticated user
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GoldTransaction'
 *       401:
 *         description: Unauthorized
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const transactions = await getTransactions(userId);

    res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'İşlemler getirilemedi',
    });
  }
});

/**
 * @swagger
 * /api/transactions/holdings:
 *   get:
 *     summary: Get current holdings summary by gold type
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Holdings summary
 *       401:
 *         description: Unauthorized
 */
router.get('/holdings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const holdings = await getHoldingsSummary(userId);

    res.json({
      success: true,
      data: holdings,
    });
  } catch (error) {
    console.error('Error fetching holdings:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Varlıklar getirilemedi',
    });
  }
});

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: Get a specific transaction by ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction details
 *       404:
 *         description: Transaction not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: 'İşlem ID gereklidir',
      });
      return;
    }

    const transaction = await getTransactionById(userId, id);

    if (!transaction) {
      res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'İşlem bulunamadı',
      });
      return;
    }

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'İşlem getirilemedi',
    });
  }
});

/**
 * @swagger
 * /api/transactions/{id}:
 *   delete:
 *     summary: Delete a transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction deleted
 *       400:
 *         description: Cannot delete (would cause negative holdings)
 *       404:
 *         description: Transaction not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: 'İşlem ID gereklidir',
      });
      return;
    }

    const result = await deleteTransaction(userId, id);

    if (!result.success) {
      const statusCode = result.error === 'İşlem bulunamadı' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'NotFound' : 'BadRequest',
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'İşlem silinemedi',
    });
  }
});

export default router;
