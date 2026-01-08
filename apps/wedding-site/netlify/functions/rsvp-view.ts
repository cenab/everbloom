import type { Context } from '@netlify/functions';
import {
  handleCors,
  getQueryParam,
  successResponse,
  errorResponse,
  ErrorCodes,
} from './utils/response';
import { apiGet, getStatusFromResponse } from './utils/platform-api';

/**
 * GET /rsvp-view?token=...
 *
 * Fetch RSVP form data for a guest using their unique token
 * Returns guest info, wedding details, theme, and meal options
 * Proxies to Platform API for data retrieval
 */
export default async function handler(request: Request, _context: Context): Promise<Response> {
  // Handle CORS
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  // Only allow GET
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  // Get token from query params
  const token = getQueryParam(request, 'token');

  if (!token) {
    return errorResponse(ErrorCodes.INVALID_TOKEN, 400);
  }

  try {
    // Call Platform API to get RSVP view data
    const response = await apiGet('/rsvp/view', { token });

    if (!response.ok) {
      const status = getStatusFromResponse(response);
      return errorResponse(response.error || ErrorCodes.INTERNAL_ERROR, status);
    }

    return successResponse(response.data);
  } catch (error) {
    console.error('Error fetching RSVP view:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
  }
}
