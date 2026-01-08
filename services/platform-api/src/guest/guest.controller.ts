import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Headers,
  Res,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { GuestService } from './guest.service';
import { WeddingService } from '../wedding/wedding.service';
import { AdminAuthService } from '../auth/admin-auth.service';
import type {
  ApiResponse,
  Guest,
  GuestListResponse,
  CreateGuestRequest,
  UpdateGuestRequest,
  RsvpSummaryResponse,
  CsvImportRequest,
  CsvImportResponse,
  MealSummaryResponse,
  AssignGuestsToEventsRequest,
  RemoveGuestsFromEventsRequest,
  EventAssignmentsResponse,
  RsvpSummary,
} from '../types';
import { GUEST_NOT_FOUND, GUEST_ALREADY_EXISTS, CSV_IMPORT_VALIDATION_ERROR, WEDDING_NOT_FOUND, FEATURE_DISABLED, EVENT_NOT_FOUND } from '../types';

@Controller('weddings/:weddingId/guests')
export class GuestController {
  constructor(
    private readonly guestService: GuestService,
    private readonly weddingService: WeddingService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  /**
   * Get all guests for a wedding
   */
  @Get()
  async listGuests(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
  ): Promise<ApiResponse<GuestListResponse>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const guests = this.guestService.getGuestsForWedding(weddingId);
    return {
      ok: true,
      data: {
        guests,
        total: guests.length,
      },
    };
  }

  /**
   * Get RSVP summary for a wedding
   * PRD: "Admin can view RSVP summary"
   */
  @Get('summary')
  async getRsvpSummary(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
  ): Promise<ApiResponse<RsvpSummaryResponse>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const summary = this.guestService.getGuestSummary(weddingId);
    const guests = this.guestService.getGuestsForWedding(weddingId);

    return {
      ok: true,
      data: {
        summary,
        guests,
      },
    };
  }

  /**
   * Get meal selection summary for a wedding
   * PRD: "Admin can export meal counts"
   */
  @Get('meal-summary')
  async getMealSummary(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
  ): Promise<ApiResponse<MealSummaryResponse>> {
    const { wedding } = await this.requireWeddingOwner(authHeader, weddingId);

    // Check if meal options are enabled for this wedding
    if (!wedding.mealConfig?.enabled) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    const summary = this.guestService.getMealSummary(weddingId);

    return {
      ok: true,
      data: {
        summary,
      },
    };
  }

  /**
   * Export RSVP data for caterer
   * PRD: "Admin can export RSVPs for caterer"
   * Exports attending guests with meal selections, dietary restrictions, and headcount
   */
  @Get('export-caterer')
  async exportForCaterer(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { wedding } = await this.requireWeddingOwner(authHeader, weddingId);

    const guests = this.guestService.getGuestsForWedding(weddingId);
    const attendingGuests = guests.filter((g) => g.rsvpStatus === 'attending');

    // Get meal options mapping for readable names
    const mealOptions = wedding.mealConfig?.options || [];
    const mealOptionMap = new Map<string, string>();
    for (const option of mealOptions) {
      mealOptionMap.set(option.id, option.name);
    }

    // Build CSV content for caterer
    const headers = ['Guest Name', 'Meal Selection', 'Dietary Restrictions', 'Party Size', 'Is Plus-One'];
    const rows: string[][] = [];

    // Add primary guests and their plus-ones
    for (const guest of attendingGuests) {
      // Primary guest row
      const mealName = guest.mealOptionId
        ? mealOptionMap.get(guest.mealOptionId) || guest.mealOptionId
        : 'No selection';

      rows.push([
        this.escapeCsvField(guest.name),
        this.escapeCsvField(mealName),
        this.escapeCsvField(guest.dietaryNotes || ''),
        '1', // Primary guest counts as 1
        'No',
      ]);

      // Plus-one guests
      if (guest.plusOneGuests && guest.plusOneGuests.length > 0) {
        for (const plusOne of guest.plusOneGuests) {
          const plusOneMealName = plusOne.mealOptionId
            ? mealOptionMap.get(plusOne.mealOptionId) || plusOne.mealOptionId
            : 'No selection';

          rows.push([
            this.escapeCsvField(`${plusOne.name} (guest of ${guest.name})`),
            this.escapeCsvField(plusOneMealName),
            this.escapeCsvField(plusOne.dietaryNotes || ''),
            '1',
            'Yes',
          ]);
        }
      }
    }

    // Calculate totals for summary
    const totalHeadcount = rows.length;
    const mealCounts: Record<string, number> = {};
    for (const row of rows) {
      const meal = row[1]; // Meal Selection column
      mealCounts[meal] = (mealCounts[meal] || 0) + 1;
    }

    // Add summary section at the end
    rows.push([]); // Empty row
    rows.push(['--- SUMMARY ---', '', '', '', '']);
    rows.push(['Total Headcount', totalHeadcount.toString(), '', '', '']);
    rows.push([]); // Empty row
    rows.push(['Meal Selection', 'Count', '', '', '']);
    for (const [meal, count] of Object.entries(mealCounts).sort()) {
      rows.push([meal, count.toString(), '', '', '']);
    }

    // Add dietary restrictions summary
    const dietaryNotes = rows
      .filter((r) => r[2] && r[2].trim() !== '' && r[0] !== '--- SUMMARY ---')
      .map((r) => ({ name: r[0], notes: r[2] }));

    if (dietaryNotes.length > 0) {
      rows.push([]); // Empty row
      rows.push(['--- DIETARY RESTRICTIONS ---', '', '', '', '']);
      for (const { name, notes } of dietaryNotes) {
        rows.push([name, notes, '', '', '']);
      }
    }

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="catering-export.csv"');
    res.send(csv);
  }

  /**
   * Export email addresses for mail merge
   * PRD: "Admin can export email addresses for mailing"
   * Exports just email addresses in a format suitable for mail merge
   */
  @Get('export-emails')
  async exportEmails(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const guests = this.guestService.getGuestsForWedding(weddingId);

    // Build CSV content - simple format for mail merge
    const headers = ['Name', 'Email'];
    const rows = guests.map((guest) => [
      this.escapeCsvField(guest.name),
      this.escapeCsvField(guest.email),
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="email-list.csv"');
    res.send(csv);
  }

  /**
   * Export guest list to CSV
   * PRD: "Admin can export guest list to CSV"
   */
  @Get('export')
  async exportGuests(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const guests = this.guestService.getGuestsForWedding(weddingId);

    // Build CSV content
    const headers = ['Name', 'Email', 'RSVP Status', 'Party Size', 'Dietary Notes', 'Invite Sent', 'RSVP Date'];
    const rows = guests.map((guest) => [
      this.escapeCsvField(guest.name),
      this.escapeCsvField(guest.email),
      guest.rsvpStatus,
      guest.partySize.toString(),
      this.escapeCsvField(guest.dietaryNotes || ''),
      guest.inviteSentAt ? new Date(guest.inviteSentAt).toLocaleDateString() : '',
      guest.rsvpSubmittedAt ? new Date(guest.rsvpSubmittedAt).toLocaleDateString() : '',
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="guest-list.csv"');
    res.send(csv);
  }

  /**
   * Export all guest data as JSON (full data export for privacy compliance)
   * PRD: "Admin can export all guest data"
   * This endpoint returns ALL guest data in a comprehensive JSON format
   * suitable for GDPR data export requests or data backup purposes.
   */
  @Get('export-full')
  async exportFullGuestData(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { wedding } = await this.requireWeddingOwner(authHeader, weddingId);

    const guests = this.guestService.getGuestsForWedding(weddingId);

    // Build comprehensive export data
    // Exclude sensitive fields like rsvpTokenHash but include all guest-relevant data
    const exportData = {
      exportedAt: new Date().toISOString(),
      weddingId: wedding.id,
      weddingName: wedding.name,
      totalGuests: guests.length,
      guests: guests.map((guest) => ({
        id: guest.id,
        name: guest.name,
        email: guest.email,
        partySize: guest.partySize,
        rsvpStatus: guest.rsvpStatus,
        dietaryNotes: guest.dietaryNotes || null,
        plusOneAllowance: guest.plusOneAllowance ?? 0,
        plusOneGuests: guest.plusOneGuests || [],
        mealOptionId: guest.mealOptionId || null,
        tagIds: guest.tagIds || [],
        inviteSentAt: guest.inviteSentAt || null,
        rsvpSubmittedAt: guest.rsvpSubmittedAt || null,
        createdAt: guest.createdAt,
        updatedAt: guest.updatedAt,
      })),
    };

    // Set headers for JSON file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="guest-data-export.json"');
    res.send(JSON.stringify(exportData, null, 2));
  }

  /**
   * Escape a field for CSV output (handle commas, quotes, newlines)
   */
  private escapeCsvField(value: string): string {
    if (!value) return '';
    // If field contains comma, quote, or newline, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Import guests from CSV data
   * PRD: "Admin can import invitees via CSV"
   */
  @Post('import')
  async importGuests(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Body() body: CsvImportRequest,
  ): Promise<ApiResponse<CsvImportResponse>> {
    const { wedding } = await this.requireWeddingOwner(authHeader, weddingId);

    // Validate request
    if (!body.guests || !Array.isArray(body.guests) || body.guests.length === 0) {
      throw new ConflictException({
        ok: false,
        error: CSV_IMPORT_VALIDATION_ERROR,
      });
    }

    // Limit import size
    const maxImportSize = 500;
    if (body.guests.length > maxImportSize) {
      throw new ConflictException({
        ok: false,
        error: CSV_IMPORT_VALIDATION_ERROR,
      });
    }

    // Pass event date for token expiry capping
    const eventDate = wedding.eventDetails?.date;
    const results = await this.guestService.importGuestsFromCsv(
      weddingId,
      body.guests,
      eventDate,
    );

    const imported = results.filter((r) => r.success).length;
    const skipped = results.filter((r) => !r.success).length;

    return {
      ok: true,
      data: {
        imported,
        skipped,
        total: results.length,
        results,
      },
    };
  }

  /**
   * Create a new guest
   * Note: The raw RSVP token is discarded after creation.
   * It will be regenerated when sending invitations.
   */
  @Post()
  async createGuest(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Body() body: CreateGuestRequest,
  ): Promise<ApiResponse<Guest>> {
    const { wedding } = await this.requireWeddingOwner(authHeader, weddingId);

    try {
      // createGuest returns { guest, rawToken }
      // We discard rawToken here - it will be regenerated when sending invitations
      // Pass event date for token expiry capping
      const eventDate = wedding.eventDetails?.date;
      const { guest } = await this.guestService.createGuest(weddingId, body, eventDate);
      return { ok: true, data: guest };
    } catch (error) {
      if (error instanceof Error && error.message === 'GUEST_ALREADY_EXISTS') {
        throw new ConflictException({
          ok: false,
          error: GUEST_ALREADY_EXISTS,
        });
      }
      if (error instanceof Error && error.message === 'EVENT_EXPIRED') {
        throw new BadRequestException({
          ok: false,
          error: 'EVENT_EXPIRED',
          message: 'Cannot create guests for past events',
        });
      }
      throw error;
    }
  }

  /**
   * Get a specific guest
   */
  @Get(':guestId')
  async getGuest(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Param('guestId') guestId: string,
  ): Promise<ApiResponse<Guest>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const guest = this.guestService.getGuest(guestId);

    if (!guest || guest.weddingId !== weddingId) {
      throw new NotFoundException({
        ok: false,
        error: GUEST_NOT_FOUND,
      });
    }

    return { ok: true, data: guest };
  }

  /**
   * Update a guest
   */
  @Put(':guestId')
  async updateGuest(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Param('guestId') guestId: string,
    @Body() body: UpdateGuestRequest,
  ): Promise<ApiResponse<Guest>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const guest = this.guestService.getGuest(guestId);
    if (!guest || guest.weddingId !== weddingId) {
      throw new NotFoundException({
        ok: false,
        error: GUEST_NOT_FOUND,
      });
    }

    const updated = await this.guestService.updateGuest(guestId, body);
    if (!updated) {
      throw new NotFoundException({
        ok: false,
        error: GUEST_NOT_FOUND,
      });
    }

    return { ok: true, data: updated };
  }

  /**
   * Delete a guest
   */
  @Delete(':guestId')
  async deleteGuest(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Param('guestId') guestId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const guest = this.guestService.getGuest(guestId);
    if (!guest || guest.weddingId !== weddingId) {
      throw new NotFoundException({
        ok: false,
        error: GUEST_NOT_FOUND,
      });
    }

    await this.guestService.deleteGuest(guestId);
    return { ok: true, data: { deleted: true } };
  }

  /**
   * Assign guests to specific events
   * POST /api/weddings/:weddingId/guests/events/assign
   * PRD: "Admin can assign guests to specific events"
   */
  @Post('events/assign')
  async assignGuestsToEvents(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Body() body: AssignGuestsToEventsRequest,
  ): Promise<ApiResponse<EventAssignmentsResponse>> {
    const { wedding } = await this.requireWeddingOwner(authHeader, weddingId);

    // Validate that wedding has events configured
    if (!wedding.eventDetails?.events || wedding.eventDetails.events.length === 0) {
      throw new NotFoundException({
        ok: false,
        error: EVENT_NOT_FOUND,
      });
    }

    // Validate event IDs exist in the wedding
    const weddingEventIds = wedding.eventDetails.events.map((e) => e.id);
    for (const eventId of body.eventIds) {
      if (!weddingEventIds.includes(eventId)) {
        throw new NotFoundException({
          ok: false,
          error: EVENT_NOT_FOUND,
        });
      }
    }

    // Validate guest IDs belong to this wedding
    for (const guestId of body.guestIds) {
      const guest = this.guestService.getGuest(guestId);
      if (!guest || guest.weddingId !== weddingId) {
        throw new NotFoundException({
          ok: false,
          error: GUEST_NOT_FOUND,
        });
      }
    }

    const assignments = await this.guestService.assignGuestsToEvents(
      weddingId,
      body.guestIds,
      body.eventIds,
    );

    // Calculate event counts from assignments
    const eventCounts: Record<string, number> = {};
    for (const assignment of assignments) {
      eventCounts[assignment.eventId] = (eventCounts[assignment.eventId] || 0) + 1;
    }

    return {
      ok: true,
      data: { assignments, eventCounts },
    };
  }

  /**
   * Remove guests from specific events
   * POST /api/weddings/:weddingId/guests/events/unassign
   * PRD: "Admin can remove guests from events"
   */
  @Post('events/unassign')
  async removeGuestsFromEvents(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Body() body: RemoveGuestsFromEventsRequest,
  ): Promise<ApiResponse<{ removed: boolean }>> {
    const { wedding } = await this.requireWeddingOwner(authHeader, weddingId);

    // Validate that wedding has events configured
    if (!wedding.eventDetails?.events || wedding.eventDetails.events.length === 0) {
      throw new NotFoundException({
        ok: false,
        error: EVENT_NOT_FOUND,
      });
    }

    // Validate event IDs exist in the wedding
    const weddingEventIds = wedding.eventDetails.events.map((e) => e.id);
    for (const eventId of body.eventIds) {
      if (!weddingEventIds.includes(eventId)) {
        throw new NotFoundException({
          ok: false,
          error: EVENT_NOT_FOUND,
        });
      }
    }

    // Validate guest IDs belong to this wedding
    for (const guestId of body.guestIds) {
      const guest = this.guestService.getGuest(guestId);
      if (!guest || guest.weddingId !== weddingId) {
        throw new NotFoundException({
          ok: false,
          error: GUEST_NOT_FOUND,
        });
      }
    }

    await this.guestService.removeGuestsFromEvents(
      weddingId,
      body.guestIds,
      body.eventIds,
    );

    return {
      ok: true,
      data: { removed: true },
    };
  }

  /**
   * Get event assignments for all guests
   * GET /api/weddings/:weddingId/guests/events
   * PRD: "Admin can view guest event assignments"
   */
  @Get('events')
  async getEventAssignments(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
  ): Promise<ApiResponse<EventAssignmentsResponse>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const assignments = this.guestService.getEventAssignments(weddingId);

    // Calculate event counts from assignments
    const eventCounts: Record<string, number> = {};
    for (const assignment of assignments) {
      eventCounts[assignment.eventId] = (eventCounts[assignment.eventId] || 0) + 1;
    }

    return {
      ok: true,
      data: { assignments, eventCounts },
    };
  }

  /**
   * Get RSVP summary for a specific event
   * GET /api/weddings/:weddingId/guests/events/:eventId/summary
   * PRD: "Admin can view per-event RSVP summary"
   */
  @Get('events/:eventId/summary')
  async getEventRsvpSummary(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Param('eventId') eventId: string,
  ): Promise<ApiResponse<RsvpSummary>> {
    const { wedding } = await this.requireWeddingOwner(authHeader, weddingId);

    // Validate that wedding has events configured
    if (!wedding.eventDetails?.events || wedding.eventDetails.events.length === 0) {
      throw new NotFoundException({
        ok: false,
        error: EVENT_NOT_FOUND,
      });
    }

    // Validate event ID exists in the wedding
    const weddingEventIds = wedding.eventDetails.events.map((e) => e.id);
    if (!weddingEventIds.includes(eventId)) {
      throw new NotFoundException({
        ok: false,
        error: EVENT_NOT_FOUND,
      });
    }

    const summary = this.guestService.getEventRsvpSummary(weddingId, eventId);

    return {
      ok: true,
      data: summary,
    };
  }

  /**
   * Get guests for a specific event
   * GET /api/weddings/:weddingId/guests/events/:eventId/guests
   * PRD: "Admin can view guest list for each event"
   */
  @Get('events/:eventId/guests')
  async getGuestsForEvent(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Param('eventId') eventId: string,
  ): Promise<ApiResponse<GuestListResponse>> {
    const { wedding } = await this.requireWeddingOwner(authHeader, weddingId);

    // Validate that wedding has events configured
    if (!wedding.eventDetails?.events || wedding.eventDetails.events.length === 0) {
      throw new NotFoundException({
        ok: false,
        error: EVENT_NOT_FOUND,
      });
    }

    // Validate event ID exists in the wedding
    const weddingEventIds = wedding.eventDetails.events.map((e) => e.id);
    if (!weddingEventIds.includes(eventId)) {
      throw new NotFoundException({
        ok: false,
        error: EVENT_NOT_FOUND,
      });
    }

    const guests = this.guestService.getGuestsForEvent(weddingId, eventId);

    return {
      ok: true,
      data: {
        guests,
        total: guests.length,
      },
    };
  }

  /**
   * Validate auth token and verify user owns the wedding
   */
  private async requireWeddingOwner(
    authHeader: string | undefined,
    weddingId: string,
  ) {
    const user = await this.adminAuthService.requireAdmin(authHeader);

    const wedding = await this.weddingService.getWedding(weddingId);
    if (!wedding || wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    return { user, wedding };
  }
}
