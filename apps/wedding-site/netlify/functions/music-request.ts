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

interface MusicRequestBody {
  songTitle: string;
  artistName: string;
  requesterName?: string;
}

// Max field lengths
const MAX_TITLE_LENGTH = 200;
const MAX_ARTIST_LENGTH = 200;
const MAX_NAME_LENGTH = 100;

/**
 * POST /music-request?slug=...
 *
 * Submit a song request for the wedding playlist
 * Public endpoint - no authentication required
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
  const body = await parseJsonBody<MusicRequestBody>(request);

  if (!body || !body.songTitle || !body.artistName) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 400);
  }

  // Validate lengths
  if (body.songTitle.length > MAX_TITLE_LENGTH) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 400);
  }

  if (body.artistName.length > MAX_ARTIST_LENGTH) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 400);
  }

  if (body.requesterName && body.requesterName.length > MAX_NAME_LENGTH) {
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

    // Check if music requests feature is enabled
    if (!wedding.features?.MUSIC_REQUESTS) {
      return errorResponse('MUSIC_REQUESTS_DISABLED', 403);
    }

    // Create song request
    const { data: songRequest, error: requestError } = await supabase
      .from('song_requests')
      .insert({
        wedding_id: wedding.id,
        song_title: body.songTitle.trim(),
        artist_name: body.artistName.trim(),
        requester_name: body.requesterName?.trim() || null,
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating song request:', requestError);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
    }

    return successResponse({
      ok: true,
      message: 'Song request submitted successfully',
      songRequest: {
        id: songRequest.id,
        weddingId: songRequest.wedding_id,
        songTitle: songRequest.song_title,
        artistName: songRequest.artist_name,
        requesterName: songRequest.requester_name,
        createdAt: songRequest.created_at,
      },
    });
  } catch (error) {
    console.error('Error submitting song request:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
  }
}
