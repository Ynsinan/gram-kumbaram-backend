import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { calculatePortfolio } from '../services/portfolio.service.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/portfolio:
 *   get:
 *     summary: Get portfolio summary with current values and profit/loss
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Calculates the complete portfolio including:
 *       - Net quantity for each gold type
 *       - Current market value (using live sell prices)
 *       - Unrealized profit/loss
 *       - Realized profit from completed sales
 *     responses:
 *       200:
 *         description: Portfolio summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalPortfolioValue:
 *                       type: number
 *                       description: Total current value in TL
 *                       example: 125000
 *                     totalCost:
 *                       type: number
 *                       description: Total cost basis of remaining holdings
 *                       example: 100000
 *                     totalUnrealizedProfitLoss:
 *                       type: number
 *                       description: Unrealized profit/loss on current holdings
 *                       example: 25000
 *                     totalRealizedProfit:
 *                       type: number
 *                       description: Realized profit from completed sales
 *                       example: 5000
 *                     assets:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           goldType:
 *                             type: string
 *                             enum: [gram, ceyrek, yarim, cumhuriyet]
 *                           netQuantity:
 *                             type: number
 *                             description: Current holdings
 *                           averageCost:
 *                             type: number
 *                             description: Average cost per unit
 *                           totalCost:
 *                             type: number
 *                             description: Total cost of current holdings
 *                           currentPrice:
 *                             type: number
 *                             description: Current market sell price
 *                           currentValue:
 *                             type: number
 *                             description: Current market value
 *                           unrealizedProfitLoss:
 *                             type: number
 *                             description: Paper profit/loss
 *                           realizedProfit:
 *                             type: number
 *                             description: Profit from sales of this type
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to calculate portfolio
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const portfolio = await calculatePortfolio(userId);

    res.json({
      success: true,
      data: portfolio,
    });
  } catch (error) {
    console.error('Error calculating portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Portföy hesaplanamadı',
    });
  }
});

export default router;
