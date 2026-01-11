/**
 * Platform API client for Netlify Functions
 * All guest-facing operations proxy through the Platform API
 */

function normalizePlatformApiBaseUrl(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.replace(/\/+$/, '');
  if (trimmed.endsWith('/api')) {
    return trimmed.slice(0, -4);
  }
  return trimmed;
}

const PLATFORM_API_URL =
  normalizePlatformApiBaseUrl(process.env.PLATFORM_API_URL) ||
  normalizePlatformApiBaseUrl(process.env.PUBLIC_PLATFORM_API_URL) ||
  normalizePlatformApiBaseUrl(process.env.VITE_API_URL) ||
  'http://localhost:3001';

if (!process.env.PLATFORM_API_URL && !process.env.PUBLIC_PLATFORM_API_URL && !process.env.VITE_API_URL) {
  console.warn(
    'PLATFORM_API_URL is not set; falling back to http://localhost:3001 which will fail in production.'
  );
}

export interface PlatformApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Make a GET request to the Platform API
 */
export async function apiGet<T>(
  endpoint: string,
  params?: Record<string, string>,
): Promise<PlatformApiResponse<T>> {
  const url = new URL(`${PLATFORM_API_URL}/api${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return data as PlatformApiResponse<T>;
  } catch (error) {
    console.error('Platform API GET error:', error);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}

/**
 * Make a POST request to the Platform API
 */
export async function apiPost<T>(
  endpoint: string,
  body?: unknown,
): Promise<PlatformApiResponse<T>> {
  try {
    const response = await fetch(`${PLATFORM_API_URL}/api${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return data as PlatformApiResponse<T>;
  } catch (error) {
    console.error('Platform API POST error:', error);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}

/**
 * Get HTTP status code from Platform API response
 */
export function getStatusFromResponse(response: PlatformApiResponse<unknown>): number {
  if (response.ok) return 200;

  switch (response.error) {
    case 'NOT_FOUND':
    case 'WEDDING_NOT_FOUND':
    case 'INVALID_TOKEN':
    case 'DOMAIN_NOT_FOUND':
    case 'PHOTO_UPLOAD_INVALID':
      return 404;
    case 'FEATURE_DISABLED':
      return 403;
    case 'VALIDATION_ERROR':
    case 'INVALID_PASSCODE':
    case 'PHOTO_UPLOAD_VALIDATION_ERROR':
      return 400;
    case 'RATE_LIMIT_EXCEEDED':
      return 429;
    default:
      return 500;
  }
}
