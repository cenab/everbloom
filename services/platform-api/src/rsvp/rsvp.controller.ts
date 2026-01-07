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
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { GuestService } from '../guest/guest.service';
import { WeddingService } from '../wedding/wedding.service';
import type {
  ApiResponse,
  RsvpViewData,
  RsvpSubmitRequest,
  RsvpSubmitResponse,
  RsvpGuestView,
} from '../types';
import {
  INVALID_TOKEN,
  FEATURE_DISABLED,
  WEDDING_NOT_FOUND,
  PLUS_ONE_LIMIT_EXCEEDED,
  INVALID_MEAL_OPTION,
} from '../types';

/**
 * Public controller for guest RSVP operations
 * No authentication required - RSVP token provides access
 *
 * PRD: "Rate limits prevent abuse" - RSVP endpoints have strict limits
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
      plusOneAllowance: guest.plusOneAllowance,
      plusOneGuests: guest.plusOneGuests,
      mealOptionId: guest.mealOptionId,
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
      // Include meal config if enabled
      mealConfig: wedding.mealConfig?.enabled ? wedding.mealConfig : undefined,
    };

    return { ok: true, data: rsvpViewData };
  }

  /**
   * Submit RSVP response
   * POST /api/rsvp/submit
   * Allows guest to submit or update their RSVP, including plus-one details and meal selection
   *
   * PRD: "Rate limits prevent abuse" - Strict limit: 10 requests per minute
   */
  @Throttle({ strict: { ttl: 60000, limit: 10 } })
  @Post('submit')
  async submitRsvp(
    @Body() body: RsvpSubmitRequest,
  ): Promise<ApiResponse<RsvpSubmitResponse>> {
    const { token, rsvpStatus, partySize, dietaryNotes, plusOneGuests, mealOptionId } = body;

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

    // Validate meal option if meal selection is enabled and guest is attending
    if (wedding.mealConfig?.enabled && rsvpStatus === 'attending') {
      // Validate primary guest's meal option if provided
      if (mealOptionId) {
        const validOptionIds = wedding.mealConfig.options.map((o) => o.id);
        if (!validOptionIds.includes(mealOptionId)) {
          throw new BadRequestException({
            ok: false,
            error: INVALID_MEAL_OPTION,
          });
        }
      }

      // Validate plus-one meal options if provided
      if (plusOneGuests) {
        const validOptionIds = wedding.mealConfig.options.map((o) => o.id);
        for (const plusOne of plusOneGuests) {
          if (plusOne.mealOptionId && !validOptionIds.includes(plusOne.mealOptionId)) {
            throw new BadRequestException({
              ok: false,
              error: INVALID_MEAL_OPTION,
            });
          }
        }
      }
    }

    // Update guest RSVP with plus-one guests and meal options
    let updatedGuest;
    try {
      updatedGuest = await this.guestService.updateRsvpStatus(
        guest.id,
        rsvpStatus,
        partySize,
        dietaryNotes,
        plusOneGuests,
        mealOptionId,
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'PLUS_ONE_LIMIT_EXCEEDED') {
        throw new BadRequestException({
          ok: false,
          error: PLUS_ONE_LIMIT_EXCEEDED,
        });
      }
      throw error;
    }

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
      plusOneAllowance: updatedGuest.plusOneAllowance,
      plusOneGuests: updatedGuest.plusOneGuests,
      mealOptionId: updatedGuest.mealOptionId,
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
