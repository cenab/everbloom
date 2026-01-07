import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { GuestService } from '../guest/guest.service';
import { WeddingService } from '../wedding/wedding.service';
import type {
  ApiResponse,
  RsvpViewData,
  RsvpSubmitRequest,
  RsvpSubmitResponse,
  RsvpGuestView,
} from '@wedding-bestie/shared';
import {
  INVALID_TOKEN,
  FEATURE_DISABLED,
  WEDDING_NOT_FOUND,
} from '@wedding-bestie/shared';

/**
 * Public controller for guest RSVP operations
 * No authentication required - RSVP token provides access
 */
@Controller('rsvp')
export class RsvpController {
  constructor(
    private readonly guestService: GuestService,
    private readonly weddingService: WeddingService,
  ) {}

  /**
   * View RSVP form data by token
   * GET /api/rsvp/view?token=...
   * Returns guest info and wedding details for RSVP form
   */
  @Get('view')
  async viewRsvp(
    @Query('token') token: string,
  ): Promise<ApiResponse<RsvpViewData>> {
    if (!token) {
      throw new BadRequestException({
        ok: false,
        error: INVALID_TOKEN,
      });
    }

    // Find guest by token
    const guest = this.guestService.getGuestByRsvpToken(token);

    if (!guest) {
      throw new NotFoundException({
        ok: false,
        error: INVALID_TOKEN,
      });
    }

    // Get the wedding
    const wedding = this.weddingService.getWedding(guest.weddingId);

    if (!wedding) {
      throw new NotFoundException({
        ok: false,
        error: WEDDING_NOT_FOUND,
      });
    }

    // Check if wedding is active
    if (wedding.status !== 'active') {
      throw new NotFoundException({
        ok: false,
        error: WEDDING_NOT_FOUND,
      });
    }

    // Check if RSVP feature is enabled
    if (!wedding.features.RSVP) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    // Get render config for theme
    const renderConfig = this.weddingService.getRenderConfig(wedding.id);

    // Build response with only what's needed for RSVP view
    const guestView: RsvpGuestView = {
      id: guest.id,
      name: guest.name,
      email: guest.email,
      partySize: guest.partySize,
      rsvpStatus: guest.rsvpStatus,
      dietaryNotes: guest.dietaryNotes,
    };

    const rsvpViewData: RsvpViewData = {
      guest: guestView,
      wedding: {
        slug: wedding.slug,
        partnerNames: wedding.partnerNames,
        // TODO: Add date/venue when wedding has these fields
      },
      theme: renderConfig?.theme || {
        primary: '#c9826b',
        accent: '#8fac8b',
        neutralLight: '#faf8f5',
        neutralDark: '#2d2d2d',
      },
    };

    return { ok: true, data: rsvpViewData };
  }

  /**
   * Submit RSVP response
   * POST /api/rsvp/submit
   * Allows guest to submit or update their RSVP
   */
  @Post('submit')
  async submitRsvp(
    @Body() body: RsvpSubmitRequest,
  ): Promise<ApiResponse<RsvpSubmitResponse>> {
    const { token, rsvpStatus, partySize, dietaryNotes } = body;

    if (!token) {
      throw new BadRequestException({
        ok: false,
        error: INVALID_TOKEN,
      });
    }

    // Find guest by token
    const guest = this.guestService.getGuestByRsvpToken(token);

    if (!guest) {
      throw new NotFoundException({
        ok: false,
        error: INVALID_TOKEN,
      });
    }

    // Get the wedding
    const wedding = this.weddingService.getWedding(guest.weddingId);

    if (!wedding) {
      throw new NotFoundException({
        ok: false,
        error: WEDDING_NOT_FOUND,
      });
    }

    // Check if wedding is active
    if (wedding.status !== 'active') {
      throw new NotFoundException({
        ok: false,
        error: WEDDING_NOT_FOUND,
      });
    }

    // Check if RSVP feature is enabled
    if (!wedding.features.RSVP) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    // Update guest RSVP
    const updatedGuest = await this.guestService.updateRsvpStatus(
      guest.id,
      rsvpStatus,
      partySize,
      dietaryNotes,
    );

    if (!updatedGuest) {
      throw new NotFoundException({
        ok: false,
        error: INVALID_TOKEN,
      });
    }

    // Build response
    const guestView: RsvpGuestView = {
      id: updatedGuest.id,
      name: updatedGuest.name,
      email: updatedGuest.email,
      partySize: updatedGuest.partySize,
      rsvpStatus: updatedGuest.rsvpStatus,
      dietaryNotes: updatedGuest.dietaryNotes,
    };

    const message =
      rsvpStatus === 'attending'
        ? "Thank you! We can't wait to celebrate with you."
        : "Thank you for letting us know. We'll miss you!";

    return {
      ok: true,
      data: {
        message,
        guest: guestView,
      },
    };
  }
}
