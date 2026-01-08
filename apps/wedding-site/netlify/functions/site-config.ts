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
 * GET /site-config?slug=...
 *
 * Fetch render_config for a wedding site by slug
 * This is the primary endpoint for wedding site rendering
 * Returns the precomputed render_config blob
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
    const supabase = getSupabaseClient();

    // First, get the wedding by slug
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('id, status')
      .eq('slug', slug)
      .single();

    if (weddingError || !wedding) {
      return errorResponse(ErrorCodes.WEDDING_NOT_FOUND, 404);
    }

    // Check if wedding is active
    if (wedding.status !== 'active') {
      return errorResponse(ErrorCodes.WEDDING_NOT_FOUND, 404);
    }

    // Get the render_config from wedding_sites
    const { data: site, error: siteError } = await supabase
      .from('wedding_sites')
      .select('render_config')
      .eq('wedding_id', wedding.id)
      .single();

    if (siteError || !site) {
      return errorResponse(ErrorCodes.NOT_FOUND, 404);
    }

    return successResponse(site.render_config);
  } catch (error) {
    console.error('Error fetching site config:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
  }
}
