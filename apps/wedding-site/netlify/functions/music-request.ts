import type { Context } from '@netlify/functions';
import {
  handleCors,
  parseJsonBody,
  successResponse,
  errorResponse,
  ErrorCodes,
  getQueryParam,
} from './utils/response';
import { apiPost, getStatusFromResponse } from './utils/platform-api';

interface MusicRequestBody {
  songTitle: string;
  artistName: string;
  requesterName?: string;
}

interface SongRequestResponse {
  songRequest: {
    id: string;
    weddingId: string;
    songTitle: string;
    artistName: string;
    requesterName: string | null;
    createdAt: string;
  };
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
    // Call Platform API to create the song request
    const response = await apiPost<SongRequestResponse>(`/music/${slug}/request`, {
      songTitle: body.songTitle.trim(),
      artistName: body.artistName.trim(),
      requesterName: body.requesterName?.trim() || null,
    });

    if (!response.ok) {
      const status = getStatusFromResponse(response);
      return errorResponse(response.error || ErrorCodes.INTERNAL_ERROR, status);
    }

    return successResponse({
      ok: true,
      message: 'Song request submitted successfully',
      songRequest: response.data?.songRequest,
    });
  } catch (error) {
    console.error('Error submitting song request:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
  }
}
