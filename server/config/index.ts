/**
 * @fileoverview Centralized configuration management
 * @description Loads and validates all environment variables with type safety
 * @module config
 */

// NOTE: dotenv.config() is invoked by server/env.ts, which server/index.ts
// imports as its first statement. By the time this module evaluates,
// process.env is already populated. Do not re-run dotenv.config() here —
// doing so would re-introduce the module-load race fixed in env.ts.

/**
 * Application configuration interface
 * @interface AppConfig
 */
export interface AppConfig {
    // Server Configuration
    port: number;
    nodeEnv: 'development' | 'production' | 'test';
    frontendUrl: string;

    // Database Configuration
    databasePath: string;

    // JWT Configuration
    jwtSecret: string;
    jwtExpiresIn: string;
    refreshTokenExpiresIn: string;

    // Security Configuration
    corsOrigins: string[];
    csrfSecret: string;

    // Rate Limiting Configuration
    authRateLimitWindowMs: number;
    authRateLimitMax: number;
    apiRateLimitWindowMs: number;
    apiRateLimitMax: number;
    readRateLimitWindowMs: number;
    readRateLimitMax: number;

    // Account Lockout Configuration
    accountLockoutMaxAttempts: number;
    accountLockoutWindowMs: number;

    // Email Configuration
    emailEnabled: boolean;
    emailHost?: string;
    emailPort?: number;
    emailUser?: string;
    emailPassword?: string;
    emailFrom?: string;

    // Logging Configuration
    logLevel: 'error' | 'warn' | 'info' | 'debug';

    // File Upload Configuration
    maxFileSize: number;
    uploadDir: string;
}

/**
 * Validates required environment variables
 * @throws {Error} If required environment variable is missing
 */
function validateRequiredEnvVar(name: string, value: string | undefined): string {
    if (!value) {
        throw new Error(`Required environment variable ${name} is not set`);
    }
    return value;
}

/**
 * Parses boolean environment variable
 * @param value - String value to parse
 * @param defaultValue - Default value if parsing fails
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
}

/**
 * Parses number environment variable
 * @param name - Environment variable name
 * @param value - String value to parse
 * @param defaultValue - Default value if parsing fails
 */
function parseNumber(name: string, value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        console.warn(`Invalid value for ${name}, using default: ${defaultValue}`);
        return defaultValue;
    }
    return parsed;
}

/**
 * Application configuration object
 * All configuration is loaded from environment variables with sensible defaults
 */
export const config: AppConfig = {
    // Server Configuration
    port: parseNumber('PORT', process.env.PORT, 3001),
    nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

    // Database Configuration
    databasePath: process.env.DATABASE_PATH || './linear_clone.db',

    // JWT Configuration
    jwtSecret: validateRequiredEnvVar('JWT_SECRET', process.env.JWT_SECRET),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',

    // Security Configuration
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    csrfSecret: process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production',

    // Rate Limiting Configuration
    authRateLimitWindowMs: parseNumber('AUTH_RATE_LIMIT_WINDOW_MS', process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
    authRateLimitMax: parseNumber('AUTH_RATE_LIMIT_MAX', process.env.AUTH_RATE_LIMIT_MAX, 5),
    apiRateLimitWindowMs: parseNumber('API_RATE_LIMIT_WINDOW_MS', process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
    apiRateLimitMax: parseNumber('API_RATE_LIMIT_MAX', process.env.API_RATE_LIMIT_MAX, 100),
    readRateLimitWindowMs: parseNumber('READ_RATE_LIMIT_WINDOW_MS', process.env.READ_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
    readRateLimitMax: parseNumber('READ_RATE_LIMIT_MAX', process.env.READ_RATE_LIMIT_MAX, 200),

    // Account Lockout Configuration
    accountLockoutMaxAttempts: parseNumber('ACCOUNT_LOCKOUT_MAX_ATTEMPTS', process.env.ACCOUNT_LOCKOUT_MAX_ATTEMPTS, 5),
    accountLockoutWindowMs: parseNumber('ACCOUNT_LOCKOUT_WINDOW_MS', process.env.ACCOUNT_LOCKOUT_WINDOW_MS, 15 * 60 * 1000), // 15 minutes

    // Email Configuration
    emailEnabled: parseBoolean(process.env.EMAIL_ENABLED, false),
    emailHost: process.env.EMAIL_HOST,
    emailPort: process.env.EMAIL_PORT ? parseNumber('EMAIL_PORT', process.env.EMAIL_PORT, 587) : undefined,
    emailUser: process.env.EMAIL_USER,
    emailPassword: process.env.EMAIL_PASSWORD,
    emailFrom: process.env.EMAIL_FROM,

    // Logging Configuration
    logLevel: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',

    // File Upload Configuration
    maxFileSize: parseNumber('MAX_FILE_SIZE', process.env.MAX_FILE_SIZE, 10 * 1024 * 1024), // 10MB
    uploadDir: process.env.UPLOAD_DIR || './uploads',
};

/**
 * Validate configuration on startup
 * @throws {Error} If configuration is invalid
 */
export function validateConfig(): void {
    const errors: string[] = [];

    // Validate JWT secret
    if (config.jwtSecret === 'change-this-secret-in-production' || config.jwtSecret.length < 32) {
        errors.push('JWT_SECRET must be at least 32 characters long');
    }

    // Validate CORS origins
    if (config.corsOrigins.length === 0) {
        errors.push('At least one CORS origin must be configured');
    }

    // Validate port
    if (config.port < 1 || config.port > 65535) {
        errors.push('PORT must be between 1 and 65535');
    }

    // Validate rate limits
    if (config.authRateLimitMax < 1) {
        errors.push('AUTH_RATE_LIMIT_MAX must be at least 1');
    }
    if (config.apiRateLimitMax < 1) {
        errors.push('API_RATE_LIMIT_MAX must be at least 1');
    }

    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }

    // Warn in production if using defaults
    if (config.nodeEnv === 'production') {
        if (config.jwtSecret === 'default-jwt-secret-change-in-production') {
            console.warn('⚠️  WARNING: Using default JWT secret in production. Set JWT_SECRET environment variable.');
        }
        if (config.csrfSecret === 'default-csrf-secret-change-in-production') {
            console.warn('⚠️  WARNING: Using default CSRF secret in production. Set CSRF_SECRET environment variable.');
        }
    }
}

// Validate configuration on import
try {
    validateConfig();
} catch (error) {
    console.error('❌ Configuration validation failed:', error);
    process.exit(1);
}

export default config;
