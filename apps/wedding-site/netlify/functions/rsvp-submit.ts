import type { Context } from '@netlify/functions';
import {
  handleCors,
  parseJsonBody,
  successResponse,
  errorResponse,
  ErrorCodes,
} from './utils/response';
import { apiPost, getStatusFromResponse } from './utils/platform-api';

interface RsvpSubmitRequest {
  token: string;
  rsvpStatus: 'pending' | 'attending' | 'not_attending';
  partySize: number;
  dietaryNotes?: string;
  plusOneGuests?: Array<{
    name: string;
    dietaryNotes?: string;
    mealOptionId?: string;
  }>;
  mealOptionId?: string;
  eventRsvps?: Record<string, {
    eventId: string;
    rsvpStatus: 'pending' | 'attending' | 'not_attending';
    dietaryNotes?: string;
    mealOptionId?: string;
  }>;
  photoOptOut?: boolean;
}

interface RsvpSubmitResponse {
  message: string;
  guest: {
    id: string;
    name: string;
    email: string;
    partySize: number;
    rsvpStatus: string;
    dietaryNotes: string | null;
    plusOneAllowance: number;
    plusOneGuests: Array<{
      name: string;
      dietaryNotes?: string;
      mealOptionId?: string;
    }>;
    mealOptionId: string | null;
    photoOptOut: boolean;
  };
}

/**
 * POST /rsvp-submit
 *
 * Submit an RSVP response
 * Proxies to Platform API which validates token, updates guest record, enforces plus-one limits
 */
export default async function handler(request: Request, _context: Context): Promise<Response> {
  // Handle CORS
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  // Only allow POST
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  // Parse request body
  const body = await parseJsonBody<RsvpSubmitRequest>(request);

  if (!body || !body.token) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 400);
  }

  // Validate required fields
  if (!body.rsvpStatus || typeof body.partySize !== 'number') {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 400);
  }

  try {
    // Call Platform API to submit RSVP
    const response = await apiPost<RsvpSubmitResponse>('/rsvp/submit', {
      token: body.token,
      rsvpStatus: body.rsvpStatus,
      partySize: body.partySize,
      dietaryNotes: body.dietaryNotes,
      plusOneGuests: body.plusOneGuests,
      mealOptionId: body.mealOptionId,
      eventRsvps: body.eventRsvps,
      photoOptOut: body.photoOptOut,
    });

    if (!response.ok) {
      const status = getStatusFromResponse(response);
      return errorResponse(response.error || ErrorCodes.INTERNAL_ERROR, status);
    }

    return successResponse(response.data);
  } catch (error) {
    console.error('Error submitting RSVP:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
  }
}
