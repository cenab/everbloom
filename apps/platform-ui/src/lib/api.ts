import { getAccessToken } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const EXTERNAL_API_BASE = import.meta.env.VITE_API_URL || '';

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function isApiPath(path: string): boolean {
  return path === '/api' || path.startsWith('/api/');
}

export function resolveApiUrl(path: string): string {
  if (!EXTERNAL_API_BASE || !isApiPath(path)) {
    return path;
  }

  const base = normalizeBaseUrl(EXTERNAL_API_BASE);

  if (base.endsWith('/api')) {
    return `${base}${path.slice(4)}`;
  }

  return `${base}${path}`;
}

export function setupApiBaseFetch(): void {
  if (!EXTERNAL_API_BASE || typeof window === 'undefined') {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string') {
      return originalFetch(resolveApiUrl(input), init);
    }

    if (input instanceof URL) {
      return originalFetch(resolveApiUrl(input.toString()), init);
    }

    if (input instanceof Request) {
      const updatedUrl = resolveApiUrl(input.url);
      if (updatedUrl === input.url) {
        return originalFetch(input, init);
      }
      return originalFetch(new Request(updatedUrl, input), init);
    }

    return originalFetch(input, init);
  };
}

/**
 * Authenticated fetch wrapper that automatically attaches the Bearer token.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();

  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
}

/**
 * GET request with auth
 */
export async function apiGet<T>(path: string): Promise<T> {
  const response = await apiFetch(path);
  return response.json();
}

/**
 * POST request with auth
 */
export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await apiFetch(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.json();
}

/**
 * PUT request with auth
 */
export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const response = await apiFetch(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.json();
}

/**
 * DELETE request with auth
 */
export async function apiDelete<T>(path: string): Promise<T> {
  const response = await apiFetch(path, {
    method: 'DELETE',
  });
  return response.json();
}

/**
 * Legacy sync token getter (deprecated, use apiFetch instead).
 * This is kept for backwards compatibility during migration.
 * Returns null since Supabase requires async token retrieval.
 */
export function getAuthTokenSync(): string | null {
  // Check Supabase's localStorage cache directly for synchronous access
  // This is a fallback for components that haven't been migrated yet
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return null;

  const projectRef = supabaseUrl.replace(/https?:\/\//, '').split('.')[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  const storedSession = localStorage.getItem(storageKey);

  if (!storedSession) return null;

  try {
    const session = JSON.parse(storedSession);
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}
