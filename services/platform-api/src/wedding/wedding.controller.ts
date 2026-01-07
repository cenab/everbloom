import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Headers,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { WeddingService } from './wedding.service';
import { AuthService } from '../auth/auth.service';
import type {
  ApiResponse,
  Wedding,
  RenderConfig,
  Template,
  ChangeTemplateRequest,
  UpdateFeaturesRequest,
  UpdateFeaturesResponse,
  UpdateAnnouncementRequest,
  UpdateAnnouncementResponse,
  UpdateEventDetailsRequest,
  UpdateEventDetailsResponse,
  UpdateFaqRequest,
  UpdateFaqResponse,
  UpdatePasscodeRequest,
  UpdatePasscodeResponse,
  UpdateHeroContentRequest,
  UpdateHeroContentResponse,
  UpdateMealOptionsRequest,
  UpdateMealOptionsResponse,
  UpdateRegistryRequest,
  UpdateRegistryResponse,
  UpdateAccommodationsRequest,
  UpdateAccommodationsResponse,
  UpdateEmailTemplatesRequest,
  UpdateEmailTemplatesResponse,
} from '../types';
import { TEMPLATE_NOT_FOUND, FEATURE_DISABLED, WEDDING_NOT_FOUND, VALIDATION_ERROR, UNAUTHORIZED, NOT_FOUND } from '../types';

@Controller('weddings')
export class WeddingController {
  constructor(
    private readonly weddingService: WeddingService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Get all weddings for the authenticated user
   */
  @Get()
  async listWeddings(
    @Headers('authorization') authHeader: string,
  ): Promise<ApiResponse<Wedding[]>> {
    const user = await this.requireAuth(authHeader);
    const weddings = this.weddingService.getWeddingsForUser(user.id);
    return { ok: true, data: weddings };
  }

  /**
   * Get a specific wedding by ID
   */
  @Get(':id')
  async getWedding(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<Wedding>> {
    const user = await this.requireAuth(authHeader);
    const wedding = this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Ensure user owns this wedding
    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    return { ok: true, data: wedding };
  }

  /**
   * Get render_config for a wedding
   * This is the contract that wedding sites render from
   */
  @Get(':id/render-config')
  async getRenderConfig(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<RenderConfig>> {
    const user = await this.requireAuth(authHeader);
    const wedding = this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Ensure user owns this wedding
    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    const renderConfig = this.weddingService.getRenderConfig(id);

    if (!renderConfig) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: renderConfig };
  }

  /**
   * Get available templates
   * Public endpoint - templates don't require auth
   */
  @Get('templates/list')
  async listTemplates(): Promise<ApiResponse<Template[]>> {
    const templates = this.weddingService.getTemplates();
    return { ok: true, data: templates };
  }

  /**
   * Update feature flags for a wedding
   * Allows admin to enable/disable features independently
   */
  @Put(':id/features')
  async updateFeatures(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: UpdateFeaturesRequest,
  ): Promise<ApiResponse<UpdateFeaturesResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Ensure user owns this wedding
    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (!body.features || typeof body.features !== 'object') {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    const result = this.weddingService.updateFeatures(id, body.features);

    if (!result) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  /**
   * Update announcement banner content for a wedding
   */
  @Put(':id/announcement')
  async updateAnnouncement(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: UpdateAnnouncementRequest,
  ): Promise<ApiResponse<UpdateAnnouncementResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (!wedding.features.ANNOUNCEMENT_BANNER) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    if (!body.announcement) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    const title = body.announcement.title?.trim();
    const message = body.announcement.message?.trim();
    const enabled = Boolean(body.announcement.enabled);

    if (enabled && (!title || !message)) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    const announcement = {
      enabled,
      title: title ?? '',
      message: message ?? '',
    };

    const result = this.weddingService.updateAnnouncement(id, announcement);

    if (!result) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  /**
   * Update FAQ items for a wedding
   */
  @Put(':id/faq')
  async updateFaq(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: UpdateFaqRequest,
  ): Promise<ApiResponse<UpdateFaqResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (!wedding.features.FAQ_SECTION) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    if (!body.faq) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    // Validate FAQ items
    const items = body.faq.items || [];
    for (const item of items) {
      if (!item.question?.trim() || !item.answer?.trim()) {
        throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
      }
    }

    // Normalize the FAQ items (trim strings, ensure proper ordering)
    const normalizedFaq = {
      items: items.map((item, index) => ({
        id: item.id || `faq-${Date.now()}-${index}`,
        question: item.question.trim(),
        answer: item.answer.trim(),
        order: item.order ?? index,
      })),
    };

    const result = this.weddingService.updateFaq(id, normalizedFaq);

    if (!result) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  /**
   * Update hero section content for a wedding
   * Allows admin to edit the headline and subheadline
   */
  @Put(':id/hero')
  async updateHeroContent(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: UpdateHeroContentRequest,
  ): Promise<ApiResponse<UpdateHeroContentResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (!body.heroContent) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    const headline = body.heroContent.headline?.trim();
    const subheadline = body.heroContent.subheadline?.trim();

    if (!headline) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    const heroContent = {
      headline,
      ...(subheadline && { subheadline }),
    };

    const result = this.weddingService.updateHeroContent(id, heroContent);

    if (!result) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  /**
   * Update event details for a wedding
   * Required for calendar invites to work properly
   * Supports both single-event (legacy) and multi-event configurations
   */
  @Put(':id/event-details')
  async updateEventDetails(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: UpdateEventDetailsRequest,
  ): Promise<ApiResponse<UpdateEventDetailsResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Event details can be set regardless of CALENDAR_INVITE feature status
    // (the feature flag controls display of calendar buttons, not storage of event data)

    if (!body.eventDetails) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    const { date, startTime, endTime, venue, address, city, events } = body.eventDetails;

    // Validate individual events if provided
    if (events && events.length > 0) {
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (!event.name || !event.type || !event.date || !event.startTime || !event.endTime || !event.venue || !event.address || !event.city) {
          throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
        }
        // Validate event date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
          throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
        }
        // Validate event time format
        if (!/^\d{2}:\d{2}$/.test(event.startTime) || !/^\d{2}:\d{2}$/.test(event.endTime)) {
          throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
        }
      }
    } else {
      // Legacy single-event validation
      if (!date || !startTime || !endTime || !venue || !address || !city) {
        throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
      }

      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
      }

      // Validate time format (HH:MM)
      if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
        throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
      }
    }

    const result = this.weddingService.updateEventDetails(id, body.eventDetails);

    if (!result) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  /**
   * Update passcode settings for a wedding
   * Requires PASSCODE_SITE feature to be enabled
   */
  @Put(':id/passcode')
  async updatePasscode(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: UpdatePasscodeRequest,
  ): Promise<ApiResponse<UpdatePasscodeResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Check if PASSCODE_SITE feature is enabled
    if (!wedding.features.PASSCODE_SITE) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    if (typeof body.enabled !== 'boolean') {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    // If enabling passcode, require the passcode unless already configured
    if (body.enabled && !body.passcode && !wedding.passcodeConfig?.passcodeHash) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    // If providing a passcode, validate length
    if (body.passcode && body.passcode.length < 4) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    const result = await this.weddingService.updatePasscode(id, body.enabled, body.passcode);

    if (!result) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  /**
   * Update meal options configuration for a wedding
   * Allows admin to configure meal choices for RSVP (e.g., Chicken, Fish, Vegetarian)
   */
  @Put(':id/meal-options')
  async updateMealOptions(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: UpdateMealOptionsRequest,
  ): Promise<ApiResponse<UpdateMealOptionsResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Meal options require RSVP feature to be enabled
    if (!wedding.features.RSVP) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    if (!body.mealConfig) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    const { enabled, options } = body.mealConfig;

    if (typeof enabled !== 'boolean') {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    // Validate options if provided
    if (enabled) {
      if (!options || !Array.isArray(options) || options.length === 0) {
        throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
      }

      for (const option of options) {
        if (!option.name?.trim()) {
          throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
        }
      }
    }

    // Normalize the meal options
    const normalizedConfig = {
      enabled,
      options: (options || []).map((option, index) => ({
        id: option.id || `meal-${Date.now()}-${index}`,
        name: option.name.trim(),
        description: option.description?.trim() || undefined,
        order: option.order ?? index,
      })),
    };

    const result = this.weddingService.updateMealConfig(id, normalizedConfig);

    if (!result) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  /**
   * Update gift registry links for a wedding
   * PRD: "Admin can add gift registry links"
   */
  @Put(':id/registry')
  async updateRegistry(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: UpdateRegistryRequest,
  ): Promise<ApiResponse<UpdateRegistryResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (!wedding.features.REGISTRY) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    if (!body.registry) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    // Validate registry links
    const links = body.registry.links || [];
    for (const link of links) {
      if (!link.name?.trim()) {
        throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
      }
      if (!link.url?.trim()) {
        throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
      }
      // Basic URL validation
      try {
        new URL(link.url);
      } catch {
        throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
      }
    }

    // Normalize the registry links
    const normalizedRegistry = {
      links: links.map((link, index) => ({
        id: link.id || `registry-${Date.now()}-${index}`,
        name: link.name.trim(),
        url: link.url.trim(),
        order: link.order ?? index,
      })),
    };

    const result = this.weddingService.updateRegistry(id, normalizedRegistry);

    if (!result) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  /**
   * Update accommodations and travel info for a wedding
   * PRD: "Admin can add hotel recommendations"
   */
  @Put(':id/accommodations')
  async updateAccommodations(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: UpdateAccommodationsRequest,
  ): Promise<ApiResponse<UpdateAccommodationsResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (!wedding.features.ACCOMMODATIONS) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    if (!body.accommodations) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    // Validate hotel entries
    const hotels = body.accommodations.hotels || [];
    for (const hotel of hotels) {
      if (!hotel.name?.trim()) {
        throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
      }
      if (!hotel.address?.trim()) {
        throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
      }
      // Validate booking URL if provided
      if (hotel.bookingUrl?.trim()) {
        try {
          new URL(hotel.bookingUrl);
        } catch {
          throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
        }
      }
    }

    // Validate map URL if provided
    if (body.accommodations.travelInfo?.mapUrl?.trim()) {
      try {
        new URL(body.accommodations.travelInfo.mapUrl);
      } catch {
        throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
      }
    }

    // Normalize the accommodations
    const normalizedAccommodations = {
      hotels: hotels.map((hotel, index) => ({
        id: hotel.id || `hotel-${Date.now()}-${index}`,
        name: hotel.name.trim(),
        address: hotel.address.trim(),
        bookingUrl: hotel.bookingUrl?.trim() || undefined,
        roomBlockCode: hotel.roomBlockCode?.trim() || undefined,
        notes: hotel.notes?.trim() || undefined,
        order: hotel.order ?? index,
      })),
      travelInfo: body.accommodations.travelInfo ? {
        airportDirections: body.accommodations.travelInfo.airportDirections?.trim() || undefined,
        parkingInfo: body.accommodations.travelInfo.parkingInfo?.trim() || undefined,
        mapUrl: body.accommodations.travelInfo.mapUrl?.trim() || undefined,
      } : undefined,
    };

    const result = this.weddingService.updateAccommodations(id, normalizedAccommodations);

    if (!result) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  /**
   * Change a wedding's template
   * Preserves all content (sections data) while updating visual presentation
   */
  @Put(':id/template')
  async changeTemplate(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: ChangeTemplateRequest,
  ): Promise<ApiResponse<RenderConfig>> {
    const user = await this.requireAuth(authHeader);
    const wedding = this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Ensure user owns this wedding
    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (!body.templateId) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    // Check if template exists
    const template = this.weddingService.getTemplate(body.templateId);
    if (!template) {
      throw new BadRequestException({
        ok: false,
        error: TEMPLATE_NOT_FOUND,
      });
    }

    const renderConfig = this.weddingService.changeTemplate(id, body.templateId);

    if (!renderConfig) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: renderConfig };
  }

  /**
   * Update email templates for a wedding
   * PRD: "Admin can customize invitation email content"
   */
  @Put(':id/email-templates')
  async updateEmailTemplates(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: UpdateEmailTemplatesRequest,
  ): Promise<ApiResponse<UpdateEmailTemplatesResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Validate template content if provided
    if (body.emailTemplates) {
      const templates = body.emailTemplates;

      // Validate invitation template
      if (templates.invitation) {
        if (!templates.invitation.subject || !templates.invitation.bodyText) {
          throw new BadRequestException({
            ok: false,
            error: VALIDATION_ERROR,
            message: 'Invitation template requires subject and bodyText'
          });
        }
      }

      // Validate reminder template
      if (templates.reminder) {
        if (!templates.reminder.subject || !templates.reminder.bodyText) {
          throw new BadRequestException({
            ok: false,
            error: VALIDATION_ERROR,
            message: 'Reminder template requires subject and bodyText'
          });
        }
      }

      // Validate save-the-date template
      if (templates.saveTheDate) {
        if (!templates.saveTheDate.subject || !templates.saveTheDate.bodyText) {
          throw new BadRequestException({
            ok: false,
            error: VALIDATION_ERROR,
            message: 'Save-the-date template requires subject and bodyText'
          });
        }
      }

      // Validate thank-you templates
      if (templates.thankYouAttended) {
        if (!templates.thankYouAttended.subject || !templates.thankYouAttended.bodyText) {
          throw new BadRequestException({
            ok: false,
            error: VALIDATION_ERROR,
            message: 'Thank-you (attended) template requires subject and bodyText'
          });
        }
      }

      if (templates.thankYouNotAttended) {
        if (!templates.thankYouNotAttended.subject || !templates.thankYouNotAttended.bodyText) {
          throw new BadRequestException({
            ok: false,
            error: VALIDATION_ERROR,
            message: 'Thank-you (not attended) template requires subject and bodyText'
          });
        }
      }
    }

    const updatedWedding = this.weddingService.updateEmailTemplates(id, body.emailTemplates);

    if (!updatedWedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    return { ok: true, data: { wedding: updatedWedding } };
  }

  /**
   * Extract and validate auth token
   */
  private async requireAuth(authHeader: string | undefined) {
    const token = this.extractBearerToken(authHeader);
    if (!token) {
      throw new UnauthorizedException({ ok: false, error: UNAUTHORIZED });
    }

    const user = await this.authService.validateSession(token);
    if (!user) {
      throw new UnauthorizedException({ ok: false, error: UNAUTHORIZED });
    }

    return user;
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
