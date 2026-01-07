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
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { GuestService } from './guest.service';
import { WeddingService } from '../wedding/wedding.service';
import { AuthService } from '../auth/auth.service';
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
} from '../types';
import { GUEST_NOT_FOUND, GUEST_ALREADY_EXISTS, CSV_IMPORT_VALIDATION_ERROR, UNAUTHORIZED, WEDDING_NOT_FOUND, FEATURE_DISABLED } from '../types';

@Controller('weddings/:weddingId/guests')
export class GuestController {
  constructor(
    private readonly guestService: GuestService,
    private readonly weddingService: WeddingService,
    private readonly authService: AuthService,
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
    await this.requireWeddingOwner(authHeader, weddingId);

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

    const results = await this.guestService.importGuestsFromCsv(
      weddingId,
      body.guests,
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
    await this.requireWeddingOwner(authHeader, weddingId);

    try {
      // createGuest returns { guest, rawToken }
      // We discard rawToken here - it will be regenerated when sending invitations
      const { guest } = await this.guestService.createGuest(weddingId, body);
      return { ok: true, data: guest };
    } catch (error) {
      if (error instanceof Error && error.message === 'GUEST_ALREADY_EXISTS') {
        throw new ConflictException({
          ok: false,
          error: GUEST_ALREADY_EXISTS,
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
   * Validate auth token and verify user owns the wedding
   */
  private async requireWeddingOwner(
    authHeader: string | undefined,
    weddingId: string,
  ) {
    const token = this.extractBearerToken(authHeader);
    if (!token) {
      throw new UnauthorizedException({ ok: false, error: UNAUTHORIZED });
    }

    const user = await this.authService.validateSession(token);
    if (!user) {
      throw new UnauthorizedException({ ok: false, error: UNAUTHORIZED });
    }

    const wedding = this.weddingService.getWedding(weddingId);
    if (!wedding || wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    return { user, wedding };
  }

  /**
   * Extract Bearer token from Authorization header
   */
  private extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}
