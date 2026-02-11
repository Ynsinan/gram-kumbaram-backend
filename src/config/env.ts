/**
 * Environment Configuration
 * Centralized environment variable management with Zod validation
 */

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Helper function to parse boolean values from environment variables
 */
const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  return undefined;
};

/**
 * Environment variables schema with validation rules
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  GOOGLE_CALLBACK_URL: z.string().url('GOOGLE_CALLBACK_URL must be a valid URL'),

  // Server Configuration
  PORT: z.string().default('4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Frontend URL (CORS and redirects)
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  // Swagger Documentation
  ENABLE_SWAGGER: z.preprocess(parseBoolean, z.boolean().default(false)),
  SWAGGER_BASIC_AUTH_USER: z.string().optional(),
  SWAGGER_BASIC_AUTH_PASS: z.string().optional(),

  // Feature Flags
  ENABLE_DEBUG: z.preprocess(parseBoolean, z.boolean().default(false)),
  ENABLE_RATE_LIMITING: z.preprocess(parseBoolean, z.boolean().default(true)),

  // API Configuration
  API_TIMEOUT: z.string().default('30000'),
  MAX_REQUEST_SIZE: z.string().default('100kb'),
});

/**
 * Parse and validate environment variables
 */
const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Environment validation failed:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();

/**
 * Environment type
 */
export type Environment = 'development' | 'production' | 'test';

/**
 * Check if running in development environment
 */
export const isDevelopment = (): boolean => env.NODE_ENV === 'development';

/**
 * Check if running in production environment
 */
export const isProduction = (): boolean => env.NODE_ENV === 'production';

/**
 * Check if running in test environment
 */
export const isTest = (): boolean => env.NODE_ENV === 'test';

/**
 * Log environment configuration (only in development)
 */
export const logEnvConfig = (): void => {
  if (!isDevelopment()) return;

  console.log('🌍 Environment Configuration:');
  console.log(`  - Environment: ${env.NODE_ENV}`);
  console.log(`  - Port: ${env.PORT}`);
  console.log(`  - Frontend URL: ${env.FRONTEND_URL}`);
  console.log(`  - Database: ${env.DATABASE_URL.split('@')[1] || 'configured'}`);
  console.log(`  - Swagger: ${env.ENABLE_SWAGGER ? 'enabled' : 'disabled'}`);
  console.log(`  - Debug Mode: ${env.ENABLE_DEBUG}`);
  console.log(`  - Rate Limiting: ${env.ENABLE_RATE_LIMITING}`);
};
