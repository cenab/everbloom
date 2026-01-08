import type { Context } from '@netlify/functions';
import {
  handleCors,
  parseJsonBody,
  successResponse,
  errorResponse,
  ErrorCodes,
  getQueryParam,
} from './utils/response';
import { getSupabaseClient } from './utils/supabase';

interface GuestbookSubmitRequest {
  guestName: string;
  message: string;
}

// Max message length
const MAX_MESSAGE_LENGTH = 1000;
const MAX_NAME_LENGTH = 100;

/**
 * POST /guestbook-submit?slug=...
 *
 * Submit a guestbook message
 * Public endpoint - no authentication required
 * Messages may require moderation based on wedding settings
 */
export default async function handler(request: Request, _context: Context): Promise<Response> {
  // Handle CORS
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  // Only allow POST
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  // Get slug from query params
  const slug = getQueryParam(request, 'slug');

  if (!slug) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 400);
  }

  // Parse request body
  const body = await parseJsonBody<GuestbookSubmitRequest>(request);

  if (!body || !body.guestName || !body.message) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 400);
  }

  // Validate lengths
  if (body.guestName.length > MAX_NAME_LENGTH) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 400);
  }

  if (body.message.length > MAX_MESSAGE_LENGTH) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 400);
  }

  try {
    const supabase = getSupabaseClient();

    // Get wedding by slug
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('id, features')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (weddingError || !wedding) {
      return errorResponse(ErrorCodes.WEDDING_NOT_FOUND, 404);
    }

    // Check if guestbook feature is enabled
    if (!wedding.features?.GUESTBOOK) {
      return errorResponse(ErrorCodes.FEATURE_DISABLED, 403);
    }

    // Create guestbook message (pending by default for moderation)
    const { data: message, error: messageError } = await supabase
      .from('guestbook_messages')
      .insert({
        wedding_id: wedding.id,
        guest_name: body.guestName.trim(),
        message: body.message.trim(),
        status: 'pending',
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error creating guestbook message:', messageError);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
    }

    return successResponse({
      message: {
        id: message.id,
        weddingId: message.wedding_id,
        guestName: message.guest_name,
        message: message.message,
        status: message.status,
        createdAt: message.created_at,
      },
    });
  } catch (error) {
    console.error('Error submitting guestbook message:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
  }
}
