import { Router, Request, Response } from 'express';
import { getGoldPrices } from '../services/scraper.service.js';
import { pricesRateLimiter } from '../middleware/rate-limit.middleware.js';

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
 *                       properties:
 *                         gram:
 *                           $ref: '#/components/schemas/GoldPrice'
 *                         ceyrek:
 *                           $ref: '#/components/schemas/GoldPrice'
 *                         yarim:
 *                           $ref: '#/components/schemas/GoldPrice'
 *                         cumhuriyet:
 *                           $ref: '#/components/schemas/GoldPrice'
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
 *           type: string
 *           enum: [gram, ceyrek, yarim, cumhuriyet]
 *         description: Type of gold
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
    const { goldType } = req.params;
    const validTypes = ['gram', 'ceyrek', 'yarim', 'cumhuriyet'];

    if (!goldType || !validTypes.includes(goldType)) {
      res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: `Geçersiz altın türü. Şunlardan biri olmalıdır: ${validTypes.join(', ')}`,
      });
      return;
    }

    const prices = await getGoldPrices();
    const price = prices.prices[goldType as keyof typeof prices.prices];

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
