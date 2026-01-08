import type { Context } from '@netlify/functions';
import {
  handleCors,
  parseJsonBody,
  successResponse,
  errorResponse,
  ErrorCodes,
} from './utils/response';
import { getSupabaseClient, hashToken } from './utils/supabase';

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

/**
 * POST /rsvp-submit
 *
 * Submit an RSVP response
 * Validates token, updates guest record, enforces plus-one limits
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
    const supabase = getSupabaseClient();

    // Hash the token for lookup
    const tokenHash = hashToken(body.token);

    // Find guest by token hash
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('*')
      .eq('rsvp_token_hash', tokenHash)
      .single();

    if (guestError || !guest) {
      return errorResponse(ErrorCodes.INVALID_TOKEN, 401);
    }

    // Get wedding to check features and validate
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('id, features, meal_config')
      .eq('id', guest.wedding_id)
      .single();

    if (weddingError || !wedding) {
      return errorResponse(ErrorCodes.WEDDING_NOT_FOUND, 404);
    }

    // Check if RSVP feature is enabled
    if (!wedding.features?.RSVP) {
      return errorResponse(ErrorCodes.FEATURE_DISABLED, 403);
    }

    // Validate plus-one limit
    const plusOneCount = body.plusOneGuests?.length || 0;
    if (plusOneCount > (guest.plus_one_allowance || 0)) {
      return errorResponse('PLUS_ONE_LIMIT_EXCEEDED', 400);
    }

    // Validate meal options if meal selection is enabled
    if (wedding.meal_config?.enabled && body.mealOptionId) {
      const validOptionIds = wedding.meal_config.options.map((o: { id: string }) => o.id);
      if (!validOptionIds.includes(body.mealOptionId)) {
        return errorResponse('INVALID_MEAL_OPTION', 400);
      }

      // Validate plus-one meal options
      if (body.plusOneGuests) {
        for (const plusOne of body.plusOneGuests) {
          if (plusOne.mealOptionId && !validOptionIds.includes(plusOne.mealOptionId)) {
            return errorResponse('INVALID_MEAL_OPTION', 400);
          }
        }
      }
    }

    // Update guest record
    const updateData: Record<string, unknown> = {
      rsvp_status: body.rsvpStatus,
      party_size: body.partySize,
      dietary_notes: body.dietaryNotes || null,
      plus_one_guests: body.plusOneGuests || [],
      meal_option_id: body.mealOptionId || null,
      event_rsvps: body.eventRsvps || {},
      photo_opt_out: body.photoOptOut || false,
      rsvp_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: updatedGuest, error: updateError } = await supabase
      .from('guests')
      .update(updateData)
      .eq('id', guest.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating guest:', updateError);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
    }

    // Build response (exclude sensitive fields)
    const responseGuest = {
      id: updatedGuest.id,
      name: updatedGuest.name,
      email: updatedGuest.email,
      partySize: updatedGuest.party_size,
      rsvpStatus: updatedGuest.rsvp_status,
      dietaryNotes: updatedGuest.dietary_notes,
      plusOneAllowance: updatedGuest.plus_one_allowance,
      plusOneGuests: updatedGuest.plus_one_guests,
      mealOptionId: updatedGuest.meal_option_id,
      photoOptOut: updatedGuest.photo_opt_out,
    };

    return successResponse({
      message: 'RSVP submitted successfully',
      guest: responseGuest,
    });
  } catch (error) {
    console.error('Error submitting RSVP:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
  }
}
