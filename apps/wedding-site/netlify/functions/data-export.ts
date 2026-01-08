import type { Context } from '@netlify/functions';
import {
  handleCors,
  parseJsonBody,
  successResponse,
  errorResponse,
  ErrorCodes,
} from './utils/response';
import { getSupabaseClient, hashToken } from './utils/supabase';

interface DataExportRequest {
  token: string;
}

/**
 * POST /data-export
 *
 * Export personal data for a guest (GDPR compliance)
 * Guest identifies themselves via their RSVP token
 * Returns all data associated with the guest
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
  const body = await parseJsonBody<DataExportRequest>(request);

  if (!body || !body.token) {
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

    // Get wedding details
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('partner_names, event_details')
      .eq('id', guest.wedding_id)
      .single();

    if (weddingError || !wedding) {
      return errorResponse(ErrorCodes.WEDDING_NOT_FOUND, 404);
    }

    // Get table assignment if any
    let tableAssignment = null;
    const { data: assignment } = await supabase
      .from('seating_assignments')
      .select('table_id, seat_number')
      .eq('guest_id', guest.id)
      .single();

    if (assignment) {
      const { data: table } = await supabase
        .from('seating_tables')
        .select('name')
        .eq('id', assignment.table_id)
        .single();

      if (table) {
        tableAssignment = {
          tableName: table.name,
          seatNumber: assignment.seat_number,
        };
      }
    }

    // Get event RSVPs if any
    let eventRsvps = undefined;
    if (guest.event_rsvps && wedding.event_details?.events) {
      eventRsvps = Object.entries(guest.event_rsvps).map(([eventId, rsvpData]: [string, any]) => {
        const event = wedding.event_details.events.find((e: any) => e.id === eventId);
        return {
          eventName: event?.name || 'Unknown Event',
          eventDate: event?.date || '',
          rsvpStatus: rsvpData.rsvpStatus,
        };
      });
    }

    // Build export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      guest: {
        name: guest.name,
        email: guest.email,
        partySize: guest.party_size,
        rsvpStatus: guest.rsvp_status,
        dietaryNotes: guest.dietary_notes,
        plusOneGuests: guest.plus_one_guests,
        mealOptionId: guest.meal_option_id,
        photoOptOut: guest.photo_opt_out,
        inviteSentAt: guest.invite_sent_at,
        rsvpSubmittedAt: guest.rsvp_submitted_at,
        createdAt: guest.created_at,
      },
      wedding: {
        partnerNames: wedding.partner_names,
        date: wedding.event_details?.date,
        venue: wedding.event_details?.venue,
        city: wedding.event_details?.city,
      },
      tableAssignment,
      eventRsvps,
    };

    return successResponse(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
  }
}
