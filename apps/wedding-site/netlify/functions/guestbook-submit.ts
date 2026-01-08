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

interface GuestbookSubmitRequest {
  guestName: string;
  message: string;
}

interface GuestbookMessageResponse {
  message: {
    id: string;
    weddingId: string;
    guestName: string;
    message: string;
    status: string;
    createdAt: string;
  };
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

  // Call Platform API to submit guestbook message
  const response = await apiPost<GuestbookMessageResponse>(`/guestbook/${slug}/submit`, {
    guestName: body.guestName,
    message: body.message,
  });

  if (!response.ok) {
    const status = getStatusFromResponse(response);
    return errorResponse(response.error || ErrorCodes.INTERNAL_ERROR, status);
  }

  return successResponse(response.data);
}
