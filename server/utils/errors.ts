/**
 * @fileoverview Standardized error handling with error codes
 * @description Provides consistent error responses across all endpoints
 * @module errors
 */

import { Response } from 'express';

/**
 * Standard error codes for consistent error handling
 * @enum {string}
 */
export enum ErrorCode {
    // Authentication Errors
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    INVALID_TOKEN = 'INVALID_TOKEN',
    UNAUTHORIZED = 'UNAUTHORIZED',
    INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

    // User Errors
    USER_NOT_FOUND = 'USER_NOT_FOUND',
    EMAIL_ALREADY_REGISTERED = 'EMAIL_ALREADY_REGISTERED',
    ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
    PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',

    // Resource Errors
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
    TEAM_NOT_FOUND = 'TEAM_NOT_FOUND',
    PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
    ISSUE_NOT_FOUND = 'ISSUE_NOT_FOUND',
    COMMENT_NOT_FOUND = 'COMMENT_NOT_FOUND',

    // Validation Errors
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INVALID_REQUEST_BODY = 'INVALID_REQUEST_BODY',
    INVALID_QUERY_PARAMS = 'INVALID_QUERY_PARAMS',

    // Rate Limiting Errors
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

    // CSRF Errors
    CSRF_TOKEN_INVALID = 'CSRF_TOKEN_INVALID',
    CSRF_TOKEN_MISSING = 'CSRF_TOKEN_MISSING',

    // 2FA Errors
    TWO_FACTOR_REQUIRED = 'TWO_FACTOR_REQUIRED',
    TWO_FACTOR_NOT_ENABLED = 'TWO_FACTOR_NOT_ENABLED',
    TWO_FACTOR_INVALID = 'TWO_FACTOR_INVALID',

    // Server Errors
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
    DATABASE_ERROR = 'DATABASE_ERROR',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * Standard HTTP status codes
 * @enum {number}
 */
export enum HttpStatusCode {
    OK = 200,
    CREATED = 201,
    NO_CONTENT = 204,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    UNPROCESSABLE_ENTITY = 422,
    TOO_MANY_REQUESTS = 429,
    INTERNAL_SERVER_ERROR = 500,
    SERVICE_UNAVAILABLE = 503,
}

/**
 * Error response interface
 * @interface ErrorResponse
 */
export interface ErrorResponse {
    error: string;
    code: ErrorCode;
    statusCode: HttpStatusCode;
    details?: any;
    requestId?: string;
}

/**
 * Custom API Error class
 * @class ApiError
 * @extends Error
 */
export class ApiError extends Error {
    public readonly code: ErrorCode;
    public readonly statusCode: HttpStatusCode;
    public readonly details?: any;
    public readonly requestId?: string;

    constructor(
        message: string,
        code: ErrorCode,
        statusCode: HttpStatusCode = HttpStatusCode.BAD_REQUEST,
        details?: any,
        requestId?: string
    ) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.requestId = requestId;

        // Maintains proper stack trace for where our error was thrown
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Convert error to response object
     */
    toJSON(): ErrorResponse {
        const response: ErrorResponse = {
            error: this.message,
            code: this.code,
            statusCode: this.statusCode,
        };

        if (this.details) {
            response.details = this.details;
        }

        if (this.requestId) {
            response.requestId = this.requestId;
        }

        return response;
    }

    /**
     * Send error as HTTP response
     */
    send(res: Response): void {
        res.status(this.statusCode).json(this.toJSON());
    }
}

/**
 * Predefined error constructors for common errors
 */
export class BadRequestError extends ApiError {
    constructor(message: string, details?: any, requestId?: string) {
        super(message, ErrorCode.VALIDATION_ERROR, HttpStatusCode.BAD_REQUEST, details, requestId);
        this.name = 'BadRequestError';
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message: string = 'Unauthorized', requestId?: string) {
        super(message, ErrorCode.UNAUTHORIZED, HttpStatusCode.UNAUTHORIZED, undefined, requestId);
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends ApiError {
    constructor(message: string = 'Forbidden', requestId?: string) {
        super(message, ErrorCode.INSUFFICIENT_PERMISSIONS, HttpStatusCode.FORBIDDEN, undefined, requestId);
        this.name = 'ForbiddenError';
    }
}

export class NotFoundError extends ApiError {
    constructor(resource: string = 'Resource', requestId?: string) {
        super(`${resource} not found`, ErrorCode.RESOURCE_NOT_FOUND, HttpStatusCode.NOT_FOUND, undefined, requestId);
        this.name = 'NotFoundError';
    }
}

export class ConflictError extends ApiError {
    constructor(message: string, details?: any, requestId?: string) {
        super(message, ErrorCode.EMAIL_ALREADY_REGISTERED, HttpStatusCode.CONFLICT, details, requestId);
        this.name = 'ConflictError';
    }
}

export class RateLimitError extends ApiError {
    constructor(message: string = 'Rate limit exceeded', requestId?: string) {
        super(message, ErrorCode.RATE_LIMIT_EXCEEDED, HttpStatusCode.TOO_MANY_REQUESTS, undefined, requestId);
        this.name = 'RateLimitError';
    }
}

export class InternalServerError extends ApiError {
    constructor(message: string = 'Internal server error', details?: any, requestId?: string) {
        super(message, ErrorCode.INTERNAL_SERVER_ERROR, HttpStatusCode.INTERNAL_SERVER_ERROR, details, requestId);
        this.name = 'InternalServerError';
    }
}

/**
 * Error code to HTTP status mapping
 */
export const errorCodeToStatus: Record<ErrorCode, HttpStatusCode> = {
    [ErrorCode.INVALID_CREDENTIALS]: HttpStatusCode.UNAUTHORIZED,
    [ErrorCode.TOKEN_EXPIRED]: HttpStatusCode.UNAUTHORIZED,
    [ErrorCode.INVALID_TOKEN]: HttpStatusCode.UNAUTHORIZED,
    [ErrorCode.UNAUTHORIZED]: HttpStatusCode.UNAUTHORIZED,
    [ErrorCode.INSUFFICIENT_PERMISSIONS]: HttpStatusCode.FORBIDDEN,
    [ErrorCode.USER_NOT_FOUND]: HttpStatusCode.NOT_FOUND,
    [ErrorCode.EMAIL_ALREADY_REGISTERED]: HttpStatusCode.CONFLICT,
    [ErrorCode.ACCOUNT_LOCKED]: HttpStatusCode.FORBIDDEN,
    [ErrorCode.PASSWORD_TOO_WEAK]: HttpStatusCode.BAD_REQUEST,
    [ErrorCode.RESOURCE_NOT_FOUND]: HttpStatusCode.NOT_FOUND,
    [ErrorCode.TEAM_NOT_FOUND]: HttpStatusCode.NOT_FOUND,
    [ErrorCode.PROJECT_NOT_FOUND]: HttpStatusCode.NOT_FOUND,
    [ErrorCode.ISSUE_NOT_FOUND]: HttpStatusCode.NOT_FOUND,
    [ErrorCode.COMMENT_NOT_FOUND]: HttpStatusCode.NOT_FOUND,
    [ErrorCode.VALIDATION_ERROR]: HttpStatusCode.BAD_REQUEST,
    [ErrorCode.INVALID_REQUEST_BODY]: HttpStatusCode.BAD_REQUEST,
    [ErrorCode.INVALID_QUERY_PARAMS]: HttpStatusCode.BAD_REQUEST,
    [ErrorCode.RATE_LIMIT_EXCEEDED]: HttpStatusCode.TOO_MANY_REQUESTS,
    [ErrorCode.CSRF_TOKEN_INVALID]: HttpStatusCode.FORBIDDEN,
    [ErrorCode.CSRF_TOKEN_MISSING]: HttpStatusCode.FORBIDDEN,
    [ErrorCode.TWO_FACTOR_REQUIRED]: HttpStatusCode.FORBIDDEN,
    [ErrorCode.TWO_FACTOR_NOT_ENABLED]: HttpStatusCode.BAD_REQUEST,
    [ErrorCode.TWO_FACTOR_INVALID]: HttpStatusCode.BAD_REQUEST,
    [ErrorCode.INTERNAL_SERVER_ERROR]: HttpStatusCode.INTERNAL_SERVER_ERROR,
    [ErrorCode.DATABASE_ERROR]: HttpStatusCode.INTERNAL_SERVER_ERROR,
    [ErrorCode.SERVICE_UNAVAILABLE]: HttpStatusCode.SERVICE_UNAVAILABLE,
};

/**
 * Get HTTP status code from error code
 */
export function getStatusFromErrorCode(code: ErrorCode): HttpStatusCode {
    return errorCodeToStatus[code] || HttpStatusCode.INTERNAL_SERVER_ERROR;
}

/**
 * Create error response object
 */
export function createErrorResponse(
    message: string,
    code: ErrorCode,
    statusCode?: HttpStatusCode,
    details?: any,
    requestId?: string
): ErrorResponse {
    const status = statusCode || getStatusFromErrorCode(code);
    return {
        error: message,
        code,
        statusCode: status,
        ...(details && { details }),
        ...(requestId && { requestId }),
    };
}
