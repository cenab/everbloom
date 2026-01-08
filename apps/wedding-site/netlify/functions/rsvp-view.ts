import type { Context } from '@netlify/functions';
import {
  handleCors,
  getQueryParam,
  successResponse,
  errorResponse,
  ErrorCodes,
} from './utils/response';
import {
  getSupabaseClient,
  hashToken,
} from './utils/supabase';

/**
 * GET /rsvp-view?token=...
 *
 * Fetch RSVP form data for a guest using their unique token
 * Returns guest info, wedding details, theme, and meal options
 * Token is hashed before lookup for security
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
    const supabase = getSupabaseClient();

    // Hash the token for lookup
    const tokenHash = hashToken(token);

    // Find guest by token hash
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('*')
      .eq('rsvp_token_hash', tokenHash)
      .single();

    if (guestError || !guest) {
      return errorResponse(ErrorCodes.INVALID_TOKEN, 401);
    }

    // Get wedding details
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select(`
        id,
        slug,
        partner_names,
        features,
        meal_config,
        event_details
      `)
      .eq('id', guest.wedding_id)
      .single();

    if (weddingError || !wedding) {
      return errorResponse(ErrorCodes.WEDDING_NOT_FOUND, 404);
    }

    // Check if RSVP feature is enabled
    if (!wedding.features?.RSVP) {
      return errorResponse(ErrorCodes.FEATURE_DISABLED, 403);
    }

    // Get render_config for theme
    const { data: site, error: siteError } = await supabase
      .from('wedding_sites')
      .select('render_config')
      .eq('wedding_id', wedding.id)
      .single();

    if (siteError || !site) {
      return errorResponse(ErrorCodes.NOT_FOUND, 404);
    }

    // Get table assignment if seating chart is enabled
    let tableAssignment = null;
    if (wedding.features?.SEATING_CHART) {
      const { data: assignment } = await supabase
        .from('seating_assignments')
        .select('table_id, seat_number')
        .eq('guest_id', guest.id)
        .single();

      if (assignment) {
        const { data: table } = await supabase
          .from('seating_tables')
          .select('name, notes')
          .eq('id', assignment.table_id)
          .single();

        if (table) {
          tableAssignment = {
            tableName: table.name,
            tableId: assignment.table_id,
            seatNumber: assignment.seat_number,
            tableNotes: table.notes,
          };
        }
      }
    }

    // Get events if multi-event support
    const events = wedding.event_details?.events || [];

    // Build response
    const rsvpViewData = {
      guest: {
        id: guest.id,
        name: guest.name,
        email: guest.email,
        partySize: guest.party_size,
        rsvpStatus: guest.rsvp_status,
        dietaryNotes: guest.dietary_notes,
        plusOneAllowance: guest.plus_one_allowance || 0,
        plusOneGuests: guest.plus_one_guests || [],
        mealOptionId: guest.meal_option_id,
        eventRsvps: guest.event_rsvps || {},
        invitedEventIds: guest.invited_event_ids,
        tableAssignment,
        photoOptOut: guest.photo_opt_out || false,
      },
      wedding: {
        slug: wedding.slug,
        partnerNames: wedding.partner_names,
        date: wedding.event_details?.date,
        venue: wedding.event_details?.venue,
        city: wedding.event_details?.city,
      },
      theme: site.render_config.theme,
      mealConfig: wedding.meal_config,
      events: events.length > 0 ? events : undefined,
    };

    return successResponse(rsvpViewData);
  } catch (error) {
    console.error('Error fetching RSVP view:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
  }
}
