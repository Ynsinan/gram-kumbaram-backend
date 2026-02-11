import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { swaggerSpec } from './config/swagger.js';
import passport from './config/passport.js';
import { globalRateLimiter } from './middleware/rate-limit.middleware.js';
import { basicAuthMiddleware } from './middleware/basic-auth.middleware.js';

// Import routes
import { authRoutes, pricesRoutes, transactionsRoutes, portfolioRoutes } from './routes/index.js';

const app = express();

if (env.NODE_ENV === 'production') {
  // Behind Dokploy/Traefik reverse proxy
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');

// Middleware
app.use(
  helmet({
    // Swagger UI uses inline styles; keep CSP off unless you want to tune it
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' },
  })
);

app.use(globalRateLimiter);

const allowedOrigins =
  env.NODE_ENV === 'production'
    ? env.FRONTEND_URL.split(',').map((value) => value.trim()).filter(Boolean)
    : [];

// Block unknown browser origins early with a clear 403
app.use((req, res, next) => {
  if (env.NODE_ENV !== 'production') {
    next();
    return;
  }

  const origin = req.headers.origin;
  if (!origin) {
    next();
    return;
  }

  if (allowedOrigins.includes(origin)) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    error: 'Forbidden',
    message: `CORS blocked origin: ${origin}`,
  });
});

const corsMiddleware = cors({
  origin: env.NODE_ENV === 'production' ? allowedOrigins : true,
  credentials: false, // We use Authorization header (JWT), not cookies
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
});

app.use(corsMiddleware);
app.options('*', corsMiddleware);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Initialize Passport
app.use(passport.initialize());

const shouldEnableSwagger =
  env.ENABLE_SWAGGER || env.NODE_ENV !== 'production';

if (shouldEnableSwagger) {
  const hasSwaggerBasicAuth = Boolean(env.SWAGGER_BASIC_AUTH_USER && env.SWAGGER_BASIC_AUTH_PASS);
  const swaggerGuard = hasSwaggerBasicAuth
    ? basicAuthMiddleware({
        username: env.SWAGGER_BASIC_AUTH_USER!,
        password: env.SWAGGER_BASIC_AUTH_PASS!,
        realm: 'Swagger',
      })
    : (_req: express.Request, _res: express.Response, next: express.NextFunction) => next();

  // Swagger Documentation
  app.use('/api-docs', swaggerGuard, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Gold Portfolio API Docs',
  }));

  // Swagger JSON endpoint
  app.get('/api-docs.json', swaggerGuard, (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

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

  if (err.message.startsWith('CORS blocked origin:')) {
    res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: err.message,
    });
    return;
  }

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
