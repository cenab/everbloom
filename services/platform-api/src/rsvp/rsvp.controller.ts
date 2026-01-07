import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { GuestService } from '../guest/guest.service';
import { WeddingService } from '../wedding/wedding.service';
import { SeatingService } from '../seating/seating.service';
import { EmailService } from '../invitation/email.service';
import type {
  ApiResponse,
  RsvpViewData,
  RsvpSubmitRequest,
  RsvpSubmitResponse,
  RsvpGuestView,
  WeddingEvent,
  GuestDataExportRequest,
  GuestDataExportResponse,
  GuestDataExport,
} from '../types';
import {
  INVALID_TOKEN,
  FEATURE_DISABLED,
  WEDDING_NOT_FOUND,
  PLUS_ONE_LIMIT_EXCEEDED,
  INVALID_MEAL_OPTION,
  GUEST_NOT_INVITED_TO_EVENT,
  DATA_EXPORT_FAILED,
} from '../types';

/**
 * Public controller for guest RSVP operations
 * No authentication required - RSVP token provides access
 *
 * PRD: "Rate limits prevent abuse" - RSVP endpoints have strict limits
 * PRD: "Guest list is hidden from other guests" - only individual table assignment shown
 */
@Controller('rsvp')
export class RsvpController {
  constructor(
    private readonly guestService: GuestService,
    private readonly weddingService: WeddingService,
    private readonly seatingService: SeatingService,
    private readonly emailService: EmailService,
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

    // Get table assignment if seating chart is enabled
    const tableAssignment = wedding.features.SEATING_CHART
      ? this.seatingService.getGuestTableAssignment(guest.id)
      : null;

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
      eventRsvps: guest.eventRsvps,
      invitedEventIds: guest.invitedEventIds,
      tableAssignment: tableAssignment || undefined,
      photoOptOut: guest.photoOptOut,
    };

    // Get events the guest is invited to (for multi-event weddings)
    let invitedEvents: WeddingEvent[] | undefined;
    if (wedding.eventDetails?.events && wedding.eventDetails.events.length > 0) {
      // Filter events to only those the guest is invited to
      if (guest.invitedEventIds && guest.invitedEventIds.length > 0) {
        invitedEvents = wedding.eventDetails.events.filter((e) =>
          guest.invitedEventIds!.includes(e.id),
        );
      } else {
        // Guest is invited to all events
        invitedEvents = wedding.eventDetails.events;
      }
      // Sort by date and time
      invitedEvents.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });
    }

    const rsvpViewData: RsvpViewData = {
      guest: guestView,
      wedding: {
        slug: wedding.slug,
        partnerNames: wedding.partnerNames,
        date: wedding.eventDetails?.date,
        venue: wedding.eventDetails?.venue,
        city: wedding.eventDetails?.city,
      },
      theme: renderConfig?.theme || {
        primary: '#c9826b',
        accent: '#8fac8b',
        neutralLight: '#faf8f5',
        neutralDark: '#2d2d2d',
      },
      // Include meal config if enabled
      mealConfig: wedding.mealConfig?.enabled ? wedding.mealConfig : undefined,
      // Include events for multi-event RSVP
      events: invitedEvents,
    };

    return { ok: true, data: rsvpViewData };
  }

  /**
   * Submit RSVP response
   * POST /api/rsvp/submit
   * Allows guest to submit or update their RSVP, including plus-one details and meal selection
   * Supports both single-event (legacy) and multi-event RSVP
   *
   * PRD: "Rate limits prevent abuse" - Strict limit: 10 requests per minute
   * PRD: "Guest can RSVP to specific events"
   */
  @Throttle({ strict: { ttl: 60000, limit: 10 } })
  @Post('submit')
  async submitRsvp(
    @Body() body: RsvpSubmitRequest,
  ): Promise<ApiResponse<RsvpSubmitResponse>> {
    const { token, rsvpStatus, partySize, dietaryNotes, plusOneGuests, mealOptionId, eventRsvps, photoOptOut } = body;

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

    // Validate event RSVPs if provided (multi-event flow)
    if (eventRsvps && Object.keys(eventRsvps).length > 0) {
      const weddingEvents = wedding.eventDetails?.events || [];
      const weddingEventIds = weddingEvents.map((e) => e.id);

      for (const eventId of Object.keys(eventRsvps)) {
        // Validate event exists
        if (!weddingEventIds.includes(eventId)) {
          throw new BadRequestException({
            ok: false,
            error: GUEST_NOT_INVITED_TO_EVENT,
          });
        }

        // Validate guest is invited to this event
        if (!this.guestService.isGuestInvitedToEvent(guest.id, eventId)) {
          throw new ForbiddenException({
            ok: false,
            error: GUEST_NOT_INVITED_TO_EVENT,
          });
        }
      }
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

    let updatedGuest;

    // Handle multi-event RSVP
    if (eventRsvps && Object.keys(eventRsvps).length > 0) {
      try {
        updatedGuest = await this.guestService.updateEventRsvp(guest.id, eventRsvps);
      } catch (error) {
        throw error;
      }
    } else {
      // Handle single-event RSVP (legacy flow)
      try {
        updatedGuest = await this.guestService.updateRsvpStatus(
          guest.id,
          rsvpStatus,
          partySize,
          dietaryNotes,
          plusOneGuests,
          mealOptionId,
          photoOptOut,
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
    }

    if (!updatedGuest) {
      throw new NotFoundException({
        ok: false,
        error: INVALID_TOKEN,
      });
    }

    // Get table assignment if seating chart is enabled
    const submitTableAssignment = wedding.features.SEATING_CHART
      ? this.seatingService.getGuestTableAssignment(updatedGuest.id)
      : null;

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
      eventRsvps: updatedGuest.eventRsvps,
      invitedEventIds: updatedGuest.invitedEventIds,
      tableAssignment: submitTableAssignment || undefined,
      photoOptOut: updatedGuest.photoOptOut,
    };

    // Build appropriate message based on submission type
    let message: string;
    if (eventRsvps && Object.keys(eventRsvps).length > 0) {
      // Multi-event submission
      const eventResponses = Object.values(eventRsvps);
      const anyAttending = eventResponses.some((r) => r.rsvpStatus === 'attending');
      message = anyAttending
        ? "Thank you! We've received your responses for each event."
        : "Thank you for letting us know. We'll miss you!";
    } else {
      // Single-event submission
      message =
        rsvpStatus === 'attending'
          ? "Thank you! We can't wait to celebrate with you."
          : "Thank you for letting us know. We'll miss you!";
    }

    return {
      ok: true,
      data: {
        message,
        guest: guestView,
      },
    };
  }

  /**
   * Request a data export for a guest
   * POST /api/rsvp/data-export
   * Allows guest to request all their stored data (sent via email)
   *
   * PRD: "Guest can request their data"
   * PRD: "Request data export"
   * PRD: "Verify email with data is sent"
   * PRD: "Verify export contains all guest data"
   *
   * Rate limit: 3 requests per hour to prevent abuse
   */
  @Throttle({ strict: { ttl: 3600000, limit: 3 } })
  @Post('data-export')
  async requestDataExport(
    @Body() body: GuestDataExportRequest,
  ): Promise<ApiResponse<GuestDataExportResponse>> {
    const { token } = body;

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

    // Get render config for theme
    const renderConfig = this.weddingService.getRenderConfig(wedding.id);

    // Get table assignment if seating chart is enabled
    const tableAssignment = wedding.features.SEATING_CHART
      ? this.seatingService.getGuestTableAssignment(guest.id)
      : null;

    // Build event RSVPs if applicable
    let eventRsvps: GuestDataExport['eventRsvps'];
    if (guest.eventRsvps && wedding.eventDetails?.events) {
      eventRsvps = Object.entries(guest.eventRsvps).map(([eventId, rsvpData]) => {
        const event = wedding.eventDetails?.events?.find(e => e.id === eventId);
        return {
          eventName: event?.name || eventId,
          eventDate: event?.date || 'Unknown',
          rsvpStatus: rsvpData.rsvpStatus,
        };
      });
    }

    // Build the data export
    const dataExport: GuestDataExport = {
      exportedAt: new Date().toISOString(),
      guest: {
        name: guest.name,
        email: guest.email,
        partySize: guest.partySize,
        rsvpStatus: guest.rsvpStatus,
        dietaryNotes: guest.dietaryNotes,
        plusOneGuests: guest.plusOneGuests,
        mealOptionId: guest.mealOptionId,
        photoOptOut: guest.photoOptOut,
        inviteSentAt: guest.inviteSentAt,
        rsvpSubmittedAt: guest.rsvpSubmittedAt,
        createdAt: guest.createdAt,
      },
      wedding: {
        partnerNames: wedding.partnerNames,
        date: wedding.eventDetails?.date,
        venue: wedding.eventDetails?.venue,
        city: wedding.eventDetails?.city,
      },
      tableAssignment: tableAssignment ? {
        tableName: tableAssignment.tableName,
        seatNumber: tableAssignment.seatNumber,
      } : undefined,
      eventRsvps,
    };

    // Build and send the email
    const emailContent = this.emailService.buildDataExportEmail(
      guest,
      dataExport,
      renderConfig?.theme,
    );

    const result = await this.emailService.sendEmail(emailContent);

    if (!result.success) {
      throw new InternalServerErrorException({
        ok: false,
        error: DATA_EXPORT_FAILED,
      });
    }

    // Mask email for privacy in response
    const maskedEmail = guest.email.replace(
      /^(.{2})(.*)(@.*)$/,
      (_, first, middle, domain) => first + '*'.repeat(Math.min(middle.length, 5)) + domain,
    );

    return {
      ok: true,
      data: {
        message: 'Your data export has been sent to your email address.',
        sentTo: maskedEmail,
      },
    };
  }
}
