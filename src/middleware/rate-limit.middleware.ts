import type { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string; // Custom error message
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting
const stores: Map<string, RateLimitStore> = new Map();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  stores.forEach((store) => {
    Object.keys(store).forEach((key) => {
      const entry = store[key];
      if (entry && entry.resetTime < now) {
        delete store[key];
      }
    });
  });
}, 60000); // Clean up every minute

/**
 * Creates a rate limiting middleware
 */
export const createRateLimiter = (config: RateLimitConfig) => {
  const { windowMs, maxRequests, message = 'Çok fazla istek gönderdiniz. Lütfen bekleyin.' } = config;

  // Create a unique store for this limiter
  const storeKey = `${windowMs}-${maxRequests}`;
  if (!stores.has(storeKey)) {
    stores.set(storeKey, {});
  }
  const store = stores.get(storeKey)!;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Use IP address as identifier, fallback to a default for development
    const identifier = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Get or create entry for this identifier
    if (!store[identifier] || store[identifier].resetTime < now) {
      store[identifier] = {
        count: 1,
        resetTime: now + windowMs,
      };
      next();
      return;
    }

    // Increment count
    store[identifier].count++;

    // Check if over limit
    if (store[identifier].count > maxRequests) {
      const retryAfter = Math.ceil((store[identifier].resetTime - now) / 1000);

      res.set('Retry-After', String(retryAfter));
      res.status(429).json({
        success: false,
        error: 'TooManyRequests',
        message,
        retryAfter,
      });
      return;
    }

    next();
  };
};

// Pre-configured rate limiters
export const pricesRateLimiter = createRateLimiter({
  windowMs: 10 * 1000, // 10 seconds
  maxRequests: 3, // 3 requests per 10 seconds
  message: 'Fiyat yenileme limiti aşıldı. Lütfen 10 saniye bekleyin.',
});

export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
  message: 'Çok fazla kimlik doğrulama isteği. Lütfen 1 dakika bekleyin.',
});

export const transactionsRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute
  message: 'İşlem limiti aşıldı. Lütfen 1 dakika bekleyin.',
});
