import type { Context } from '@netlify/functions';
import {
  handleCors,
  getQueryParam,
  successResponse,
  errorResponse,
  ErrorCodes,
} from './utils/response';
import { getSupabaseClient } from './utils/supabase';

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

  try {
    const supabase = getSupabaseClient();

    // Look up wedding by custom domain
    // Only return if domain is verified and active
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('slug')
      .eq('status', 'active')
      .filter('custom_domain->domain', 'eq', domain)
      .filter('custom_domain->status', 'eq', 'active')
      .single();

    if (weddingError || !wedding) {
      return errorResponse('DOMAIN_NOT_FOUND', 404);
    }

    // Get default domain URL from environment or construct it
    const defaultDomainBase = process.env.DEFAULT_DOMAIN_URL || 'https://everbloom.wedding';
    const defaultUrl = `${defaultDomainBase}/w/${wedding.slug}`;

    return successResponse({
      slug: wedding.slug,
      defaultUrl,
    });
  } catch (error) {
    console.error('Error looking up domain:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
  }
}
