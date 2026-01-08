import type { Context } from '@netlify/functions';
import {
  handleCors,
  getQueryParam,
  successResponse,
  errorResponse,
  ErrorCodes,
} from './utils/response';
import { apiGet, getStatusFromResponse } from './utils/platform-api';

interface DomainLookupResponse {
  slug: string;
  defaultUrl: string;
}

/**
 * GET /domain-lookup?domain=...
 *
 * Look up a wedding by custom domain
 * Returns the slug and default URL for the wedding
 * Used for custom domain routing
 */
export default async function handler(request: Request, _context: Context): Promise<Response> {
  // Handle CORS
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  // Only allow GET
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  // Get domain from query params
  const domain = getQueryParam(request, 'domain');

  if (!domain) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 400);
  }

  // Call Platform API to look up domain
  const response = await apiGet<DomainLookupResponse>('/site-config/domain/lookup', { domain });

  if (!response.ok || !response.data) {
    const status = getStatusFromResponse(response);
    return errorResponse(response.error || 'DOMAIN_NOT_FOUND', status);
  }

  return successResponse({
    slug: response.data.slug,
    defaultUrl: response.data.defaultUrl,
  });
}
