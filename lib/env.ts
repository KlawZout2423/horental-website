/**
 * Environment Variable Validation Module
 * Validates required server and client environment variables at runtime/build.
 */

export interface EnvConfig {
  DATABASE_URL?: string;
  JWT_SECRET?: string;
  NEXT_PUBLIC_API_URL?: string;
  PAYSTACK_SECRET_KEY?: string;
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY?: string;
}

export function validateEnv(): EnvConfig {
  const env = {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
  };


  const missing: string[] = [];

  // Warn or log missing server-side variables in development
  if (process.env.NODE_ENV === 'production') {
    if (!env.DATABASE_URL) missing.push('DATABASE_URL');
    if (!env.JWT_SECRET) missing.push('JWT_SECRET');

    if (missing.length > 0) {
      console.warn(`[WARN] Missing critical production environment variables: ${missing.join(', ')}`);
    }
  }

  return env;
}

export const env = validateEnv();

/**
 * Returns the configured JWT_SECRET.
 * Enforces requirement in production mode; falls back safely in development.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing in production!');
    }
    return 'horentals-super-secret-jwt-key-2026';
  }
  return secret;
}

