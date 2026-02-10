import { Router, Request, Response } from 'express';
import passport from '../config/passport.js';
import { generateToken } from '../middleware/auth.middleware.js';
import { env } from '../config/env.js';
import type { User } from '@prisma/client';
import type { JWTPayload } from '../types/index.js';

const router = Router();

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
 */
router.get(
  '/google',
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
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${env.FRONTEND_URL}/auth/login?error=auth_failed`,
  }),
  (req: Request, res: Response) => {
    const user = req.user as User;

    if (!user) {
      res.redirect(`${env.FRONTEND_URL}/auth/login?error=no_user`);
      return;
    }

    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
    };

    const token = generateToken(payload);

    // Redirect to frontend with token
    res.redirect(`${env.FRONTEND_URL}/auth/callback?token=${token}`);
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
router.get('/me', (req: Request, res: Response) => {
  // This route requires auth middleware to be applied at the app level
  // or you can import and use it here
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Token bulunamadı',
    });
    return;
  }

  // Import auth verification
  import('../middleware/auth.middleware.js').then(({ verifyToken }) => {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Geçersiz veya süresi dolmuş token',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
      },
    });
  });
});

export default router;
