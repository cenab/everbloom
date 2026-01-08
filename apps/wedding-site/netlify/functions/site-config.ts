import type { Context } from '@netlify/functions';
import {
  handleCors,
  getQueryParam,
  jsonResponse,
  errorResponse,
  ErrorCodes,
} from './utils/response';
import { apiGet, getStatusFromResponse } from './utils/platform-api';

/**
 * GET /site-config?slug=...
 *
 * Fetch render_config for a wedding site by slug
 * Proxies to Platform API: GET /api/site-config/:slug
 */
export default async function handler(request: Request, _context: Context): Promise<Response> {
  // Handle CORS
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  // Only allow GET
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  // Get slug from query params
  const slug = getQueryParam(request, 'slug');

  if (!slug) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 400);
  }

  try {
    // Call Platform API
    const response = await apiGet(`/site-config/${slug}`);

    return jsonResponse(response, getStatusFromResponse(response));
  } catch (error) {
    console.error('Error fetching site config:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
  }
}
