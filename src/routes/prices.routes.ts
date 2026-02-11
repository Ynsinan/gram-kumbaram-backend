import { Router, Request, Response } from 'express';
import { getGoldPrices } from '../services/scraper.service.js';
import { pricesRateLimiter } from '../middleware/rate-limit.middleware.js';
import { GOLD_TYPES } from '../types/index.js';
import type { GoldType } from '../types/index.js';

const router = Router();

// Apply rate limiting to all prices routes
router.use(pricesRateLimiter);

/**
 * @swagger
 * /api/prices:
 *   get:
 *     summary: Get current gold prices
 *     tags: [Gold Prices]
 *     description: Fetches live buy/sell prices for all gold types from altin.in
 *     parameters:
 *       - in: query
 *         name: refresh
 *         schema:
 *           type: boolean
 *         description: Force refresh prices (bypass cache)
 *     responses:
 *       200:
 *         description: Current gold prices
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
 *                     prices:
 *                       type: object
 *                       description: Gold prices keyed by gold type ID (1=gram, 2=ceyrek, 3=yarim, 4=cumhuriyet)
 *                       additionalProperties:
 *                         $ref: '#/components/schemas/GoldPrice'
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *       429:
 *         description: Too many requests (rate limit exceeded)
 *       500:
 *         description: Failed to fetch prices
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const prices = await getGoldPrices(forceRefresh);

    res.json({
      success: true,
      data: prices,
    });
  } catch (error) {
    console.error('Error fetching gold prices:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Altın fiyatları getirilemedi',
    });
  }
});

/**
 * @swagger
 * /api/prices/{goldType}:
 *   get:
 *     summary: Get price for a specific gold type
 *     tags: [Gold Prices]
 *     parameters:
 *       - in: path
 *         name: goldType
 *         required: true
 *         schema:
 *           type: integer
 *           enum: [1, 2, 3, 4]
 *         description: Type of gold (1=gram, 2=ceyrek, 3=yarim, 4=cumhuriyet)
 *     responses:
 *       200:
 *         description: Gold price for specified type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/GoldPrice'
 *       400:
 *         description: Invalid gold type
 *       500:
 *         description: Failed to fetch price
 */
router.get('/:goldType', async (req: Request, res: Response) => {
  try {
    const goldTypeParam = parseInt(req.params.goldType ?? '', 10);

    if (isNaN(goldTypeParam) || !(GOLD_TYPES as readonly number[]).includes(goldTypeParam)) {
      res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: `Geçersiz altın türü. Şunlardan biri olmalıdır: ${GOLD_TYPES.join(', ')}`,
      });
      return;
    }

    const goldType = goldTypeParam as GoldType;
    const prices = await getGoldPrices();
    const price = prices.prices[goldType];

    res.json({
      success: true,
      data: {
        ...price,
        lastUpdated: prices.lastUpdated,
      },
    });
  } catch (error) {
    console.error('Error fetching gold price:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Altın fiyatı getirilemedi',
    });
  }
});

export default router;
