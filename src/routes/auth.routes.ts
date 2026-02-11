import { Router, Request, Response, NextFunction } from 'express';
import passport from '../config/passport.js';
import { generateToken } from '../middleware/auth.middleware.js';
import { env } from '../config/env.js';
import type { User } from '@prisma/client';
import type { JWTPayload } from '../types/index.js';
import { createRateLimiter, authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const frontendBaseUrl = env.FRONTEND_URL.split(',')[0]!.trim();

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
 *     description: Handles the OAuth callback from Google and issues JWT
 *     responses:
 *       302:
 *         description: Redirect to frontend with token
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

    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
    };

    const token = generateToken(payload);

    // Redirect to frontend with token in URL fragment (avoids leaking token via referrer)
    res.redirect(`${frontendBaseUrl}/auth/callback#token=${encodeURIComponent(token)}`);
  }
);

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
