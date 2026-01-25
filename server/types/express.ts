/**
 * Unified Request/Response Type Definitions
 *
 * This file provides unified types for the Express/Fastify hybrid setup.
 * The server uses Fastify with @fastify/express compatibility layer,
 * but the routes were written for Express.
 */

import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { UserRole } from '@prisma/client';

/**
 * Unified AuthRequest type that bridges Express and Fastify
 *
 * Uses Express Request interface (with proper params/body/query types)
 * while preserving the auth properties added by our middleware
 */
export interface AuthRequest extends ExpressRequest {
  userId?: string;
  userRole?: UserRole;
  userEmail?: string;

  // Fastify compatibility - these are added by @fastify/express
  code?: number;
  raw?: any;
}

/**
 * Unified Response type that works with both Express and Fastify
 */
export interface AuthResponse extends ExpressResponse {
  code?: (statusCode: number) => AuthResponse;
}

/**
 * Type guard to check if response is Fastify-like
 */
export function isFastifyResponse(res: any): res is { code: (statusCode: number) => any } {
  return typeof res?.code === 'function';
}

/**
 * Helper to send response in either Express or Fastify format
 */
export function sendResponse(res: AuthResponse, statusCode: number, data: any): void {
  if (isFastifyResponse(res)) {
    res.code(statusCode).send(data);
  } else {
    res.status(statusCode).json(data);
  }
}
