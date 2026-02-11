import { Router, Request, Response, NextFunction } from 'express';
import passport from '../config/passport.js';
import { generateToken } from '../middleware/auth.middleware.js';
import { env } from '../config/env.js';
import type { User } from '@prisma/client';
import type { JWTPayload } from '../types/index.js';
import { createRateLimiter, authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { randomUUID } from 'crypto';

const router = Router();
const frontendBaseUrl = env.FRONTEND_URL.split(',')[0]!.trim();

// In-memory store for authorization codes (use Redis in production)
interface AuthCodeData {
  user: User;
  expiresAt: number;
}

const authCodes = new Map<string, AuthCodeData>();

// Clean up expired codes every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of authCodes.entries()) {
    if (data.expiresAt < now) {
      authCodes.delete(code);
    }
  }
}, 5 * 60 * 1000);

// Custom rate limiter for Google OAuth that redirects instead of returning JSON
const authGoogleRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 dakika
  maxRequests: 10, // 10 istek
  message: 'Çok fazla giriş denemesi. Lütfen 1 dakika bekleyin.',
});

// Google OAuth rate limiter'ı özelleştir - JSON yerine redirect yap
const googleOAuthRateLimiterWithRedirect = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);

  // res.json'ı override et - rate limit hatası gelirse redirect yap
  res.json = function (body: any): Response {
    if (res.statusCode === 429 && body.error === 'TooManyRequests') {
      return res.redirect(`${frontendBaseUrl}/auth/login?error=rate_limit`) as any;
    }
    return originalJson(body);
  };

  authGoogleRateLimiter(req, res, next);
};

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     tags: [Authentication]
 *     description: Redirects to Google for authentication
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth
 *       429:
 *         description: Too many requests - redirects to login with error
 */
router.get(
  '/google',
  googleOAuthRateLimiterWithRedirect,
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Authentication]
 *     description: Handles the OAuth callback from Google and issues authorization code
 *     responses:
 *       302:
 *         description: Redirect to frontend with authorization code
 *       401:
 *         description: Authentication failed
 */
router.get(
  '/google/callback',
  authRateLimiter,
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${frontendBaseUrl}/auth/login?error=auth_failed`,
  }),
  (req: Request, res: Response) => {
    const user = req.user as User;

    if (!user) {
      res.redirect(`${frontendBaseUrl}/auth/login?error=no_user`);
      return;
    }

    // Generate authorization code (valid for 5 minutes)
    const code = randomUUID();
    authCodes.set(code, {
      user,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    // Redirect to frontend with authorization code (NOT the token)
    res.redirect(`${frontendBaseUrl}/auth/callback?code=${code}`);
  }
);

/**
 * @swagger
 * /auth/exchange:
 *   post:
 *     summary: Exchange authorization code for JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Authorization code from OAuth callback
 *     responses:
 *       200:
 *         description: JWT token issued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *       400:
 *         description: Invalid or expired code
 *       401:
 *         description: Unauthorized
 */
router.post('/exchange', authRateLimiter, (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    res.status(400).json({
      success: false,
      error: 'BadRequest',
      message: 'Authorization code gerekli',
    });
    return;
  }

  const authData = authCodes.get(code);

  if (!authData) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Geçersiz veya süresi dolmuş authorization code',
    });
    return;
  }

  // Check if code is expired
  if (authData.expiresAt < Date.now()) {
    authCodes.delete(code);
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authorization code süresi doldu',
    });
    return;
  }

  // Code is valid - delete it (one-time use)
  authCodes.delete(code);

  const payload: JWTPayload = {
    userId: authData.user.id,
    email: authData.user.email,
    name: authData.user.name,
  };

  const token = generateToken(payload);

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.name,
      },
    },
  });
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user info
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authRateLimiter, authMiddleware as any, (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Token bulunamadı',
    });
    return;
  }

  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
});

export default router;
