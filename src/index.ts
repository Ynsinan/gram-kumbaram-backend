import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { swaggerSpec } from './config/swagger.js';
import passport from './config/passport.js';

// Import routes
import { authRoutes, pricesRoutes, transactionsRoutes, portfolioRoutes } from './routes/index.js';

const app = express();

// Middleware
app.use(cors({
  origin: env.NODE_ENV === 'production' 
    ? [env.FRONTEND_URL, 'https://api.gramkumbaram.com']
    : '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
app.use(passport.initialize());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Gold Portfolio API Docs',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/prices', pricesRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/portfolio', portfolioRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'NotFound',
    message: 'Sayfa bulunamadı',
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'InternalServerError',
    message: env.NODE_ENV === 'development' ? err.message : 'Beklenmeyen bir hata oluştu',
  });
});

// Server startup
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();

    // Start server - bind to 0.0.0.0 for Docker
    const port = parseInt(env.PORT, 10);
    const host = '0.0.0.0';
    app.listen(port, host, () => {
      console.log(`Server running on ${host}:${port}`);
      console.log(`API Docs: http://localhost:${port}/api-docs`);
      console.log(`Health: http://localhost:${port}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (): Promise<void> => {
  console.log('Shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the server
startServer();

export default app;
