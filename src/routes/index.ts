import { Router } from 'express';
import authRoutes from './auth.routes.js';
import pricesRoutes from './prices.routes.js';
import transactionsRoutes from './transactions.routes.js';
import portfolioRoutes from './portfolio.routes.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  });
});

export { authRoutes, pricesRoutes, transactionsRoutes, portfolioRoutes };
export default router;
