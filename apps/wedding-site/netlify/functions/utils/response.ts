import type { Context } from '@netlify/functions';

/**
 * Standard API response types
 */
export interface ApiSuccess<T = unknown> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

/**
 * Standard error codes
 */
export const ErrorCodes = {
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_PASSCODE: 'INVALID_PASSCODE',
  WEDDING_NOT_FOUND: 'WEDDING_NOT_FOUND',
} as const;

/**
 * Create a JSON response with proper headers
 */
export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * Create a success response
 */
export function successResponse<T>(data: T, status = 200): Response {
  return jsonResponse<ApiSuccess<T>>({ ok: true, data }, status);
}

/**
 * Create an error response
 */
export function errorResponse(error: string, status = 400): Response {
  return jsonResponse<ApiError>({ ok: false, error }, status);
}

/**
 * Handle CORS preflight requests
 */
export function handleCors(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  return null;
}

/**
 * Parse JSON body safely
 */
export async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json() as T;
  } catch {
    return null;
  }
}

/**
 * Get query parameter from URL
 */
export function getQueryParam(request: Request, param: string): string | null {
  const url = new URL(request.url);
  return url.searchParams.get(param);
}
