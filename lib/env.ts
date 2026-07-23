/**
 * Environment Variable Validation Module
 * Validates required server and client environment variables at runtime/build.
 */

export interface EnvConfig {
  DATABASE_URL?: string;
  JWT_SECRET?: string;
  NEXT_PUBLIC_API_URL?: string;
}

export function validateEnv(): EnvConfig {
  const env = {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
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
