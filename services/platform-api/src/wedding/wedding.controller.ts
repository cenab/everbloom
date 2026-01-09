import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Headers,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { WeddingService } from './wedding.service';
import { AdminAuthService } from '../auth/admin-auth.service';
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
  UpdateGalleryRequest,
  UpdateGalleryResponse,
  GalleryConfig,
  GalleryPhoto,
  UpdateVideoRequest,
  UpdateVideoResponse,
  VideoConfig,
  VideoEmbed,
  UpdateSocialConfigRequest,
  UpdateSocialConfigResponse,
  SocialConfig,
  PreviewStatus,
  PublishDraftRequest,
  PublishDraftResponse,
  DiscardDraftResponse,
  DraftRenderConfigResponse,
} from '../types';
import {
  TEMPLATE_NOT_FOUND,
  FEATURE_DISABLED,
  WEDDING_NOT_FOUND,
  VALIDATION_ERROR,
  NOT_FOUND,
  GALLERY_PHOTO_NOT_FOUND,
  VIDEO_URL_INVALID,
  VIDEO_NOT_FOUND,
  NO_DRAFT_EXISTS,
  NO_CHANGES_TO_PUBLISH,
  INVALID_LANGUAGE,
  CUSTOM_DOMAIN_ALREADY_EXISTS,
  CUSTOM_DOMAIN_NOT_CONFIGURED,
  INVALID_DOMAIN_FORMAT,
} from '../types';
import type {
  AddCustomDomainRequest,
  AddCustomDomainResponse,
  VerifyCustomDomainResponse,
  RemoveCustomDomainResponse,
  GetCustomDomainResponse,
} from '../types';

@Controller('weddings')
export class WeddingController {
  constructor(
    private readonly weddingService: WeddingService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  /**
   * Get all weddings for the authenticated user
   */
  @Get()
  async listWeddings(
    @Headers('authorization') authHeader: string,
  ): Promise<ApiResponse<Wedding[]>> {
    const user = await this.requireAuth(authHeader);
    const weddings = await this.weddingService.getWeddingsForUser(user.id);
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
    const wedding = await this.weddingService.getWedding(id);

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
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Ensure user owns this wedding
    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    const renderConfig = await this.weddingService.getRenderConfig(id);

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
    const templates = await this.weddingService.getTemplates();
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
    const wedding = await this.weddingService.getWedding(id);

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

    const result = await this.weddingService.updateFeatures(id, body.features);

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
    const wedding = await this.weddingService.getWedding(id);

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

    const result = await this.weddingService.updateAnnouncement(id, announcement);

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
    const wedding = await this.weddingService.getWedding(id);

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

    const result = await this.weddingService.updateFaq(id, normalizedFaq);

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
    const wedding = await this.weddingService.getWedding(id);

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

    const result = await this.weddingService.updateHeroContent(id, heroContent);

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
    const wedding = await this.weddingService.getWedding(id);

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

    const result = await this.weddingService.updateEventDetails(id, body.eventDetails);

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
    const wedding = await this.weddingService.getWedding(id);

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
    const wedding = await this.weddingService.getWedding(id);

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

    const result = await this.weddingService.updateMealConfig(id, normalizedConfig);

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
    const wedding = await this.weddingService.getWedding(id);

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

    const result = await this.weddingService.updateRegistry(id, normalizedRegistry);

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
    const wedding = await this.weddingService.getWedding(id);

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

    const result = await this.weddingService.updateAccommodations(id, normalizedAccommodations);

    if (!result) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  /**
   * Get gallery configuration for a wedding
   * PRD: "Admin can upload curated photos"
   */
  @Get(':id/gallery')
  async getGallery(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<GalleryConfig>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    const gallery = await this.weddingService.getGallery(id);

    if (!gallery) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: gallery };
  }

  /**
   * Update gallery configuration for a wedding
   * Allows admin to add/remove/reorder photos and update captions
   * PRD: "Admin can upload curated photos"
   */
  @Put(':id/gallery')
  async updateGallery(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: UpdateGalleryRequest,
  ): Promise<ApiResponse<UpdateGalleryResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Gallery is not feature-gated; it's available to all plans
    // (engagement photos are a core wedding site feature)

    if (!body.gallery) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    // Validate photo entries
    const photos = body.gallery.photos || [];
    for (const photo of photos) {
      if (!photo.id?.trim() || !photo.fileName?.trim()) {
        throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
      }
    }

    // Normalize the gallery photos
    const normalizedGallery: GalleryConfig = {
      photos: photos.map((photo, index) => ({
        id: photo.id,
        fileName: photo.fileName.trim(),
        contentType: photo.contentType || 'image/jpeg',
        fileSize: photo.fileSize || 0,
        caption: photo.caption?.trim() || undefined,
        order: photo.order ?? index,
        url: photo.url,
        uploadedAt: photo.uploadedAt || new Date().toISOString(),
      })),
    };

    const result = await this.weddingService.updateGallery(id, normalizedGallery);

    if (!result) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  /**
   * Add a single photo to the gallery
   * PRD: "Admin can upload curated photos"
   */
  @Post(':id/gallery/photos')
  async addGalleryPhoto(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: GalleryPhoto,
  ): Promise<ApiResponse<UpdateGalleryResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (!body.id || !body.fileName) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    const photo: GalleryPhoto = {
      id: body.id,
      fileName: body.fileName,
      contentType: body.contentType || 'image/jpeg',
      fileSize: body.fileSize || 0,
      caption: body.caption?.trim() || undefined,
      order: body.order ?? 0,
      url: body.url,
      uploadedAt: body.uploadedAt || new Date().toISOString(),
    };

    const result = await this.weddingService.addGalleryPhoto(id, photo);

    if (!result) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  /**
   * Update a specific photo in the gallery (caption, order)
   * PRD: "Add captions to photos", "Reorder photos"
   */
  @Put(':id/gallery/photos/:photoId')
  async updateGalleryPhoto(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Body() body: { caption?: string; order?: number },
  ): Promise<ApiResponse<UpdateGalleryResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    const result = await this.weddingService.updateGalleryPhoto(id, photoId, body);

    if (!result) {
      throw new NotFoundException({ ok: false, error: GALLERY_PHOTO_NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  /**
   * Remove a photo from the gallery
   * PRD: "Admin can upload curated photos" (implies ability to remove)
   */
  @Delete(':id/gallery/photos/:photoId')
  async removeGalleryPhoto(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ): Promise<ApiResponse<UpdateGalleryResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    const result = await this.weddingService.removeGalleryPhoto(id, photoId);

    if (!result) {
      throw new NotFoundException({ ok: false, error: GALLERY_PHOTO_NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  // ============================================================================
  // Video Embed Endpoints
  // ============================================================================

  /**
   * Get video configuration for a wedding
   * PRD: "Admin can embed videos"
   */
  @Get(':id/video')
  async getVideo(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<VideoConfig>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Check if VIDEO_EMBED feature is enabled
    if (!wedding.features.VIDEO_EMBED) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    const video = await this.weddingService.getVideo(id);

    if (!video) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: video };
  }

  /**
   * Update video configuration for a wedding
   * Allows admin to add/remove/reorder videos and update titles
   * PRD: "Admin can embed videos"
   */
  @Put(':id/video')
  async updateVideo(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: UpdateVideoRequest,
  ): Promise<ApiResponse<UpdateVideoResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Check if VIDEO_EMBED feature is enabled
    if (!wedding.features.VIDEO_EMBED) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    if (!body.video) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    // Validate video entries
    const videos = body.video.videos || [];
    for (const video of videos) {
      if (!video.id?.trim() || !video.videoId?.trim() || !video.platform) {
        throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
      }
      if (video.platform !== 'youtube' && video.platform !== 'vimeo') {
        throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
      }
    }

    // Normalize the video config
    const normalizedVideo: VideoConfig = {
      videos: videos.map((video, index) => ({
        id: video.id,
        platform: video.platform,
        videoId: video.videoId,
        url: video.url,
        title: video.title?.trim() || undefined,
        order: video.order ?? index,
        addedAt: video.addedAt || new Date().toISOString(),
      })),
    };

    const result = await this.weddingService.updateVideo(id, normalizedVideo);

    if (!result) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  /**
   * Add a single video embed to the wedding
   * Parses and validates the YouTube/Vimeo URL
   * PRD: "Admin can embed videos"
   */
  @Post(':id/video/videos')
  async addVideo(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: { url: string; title?: string },
  ): Promise<ApiResponse<UpdateVideoResponse & { video: VideoEmbed }>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Check if VIDEO_EMBED feature is enabled
    if (!wedding.features.VIDEO_EMBED) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    if (!body.url?.trim()) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    // Validate and parse the URL
    const parsed = this.weddingService.parseVideoUrl(body.url);
    if (!parsed) {
      throw new BadRequestException({
        ok: false,
        error: VIDEO_URL_INVALID,
      });
    }

    // Get existing video config to calculate order
    const existingVideos = await this.weddingService.getVideo(id);
    const nextOrder = existingVideos?.videos?.length ?? 0;

    // Construct the VideoEmbed object
    const video: VideoEmbed = {
      id: require('crypto').randomUUID(),
      platform: parsed.platform,
      videoId: parsed.videoId,
      url: body.url,
      title: body.title?.trim(),
      order: nextOrder,
      addedAt: new Date().toISOString(),
    };

    const result = await this.weddingService.addVideo(id, video);

    if (!result) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: { ...result, video } };
  }

  /**
   * Update a specific video (title, order)
   * PRD: "Set video title"
   */
  @Put(':id/video/videos/:videoId')
  async updateVideoEmbed(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Param('videoId') videoId: string,
    @Body() body: { title?: string; order?: number },
  ): Promise<ApiResponse<UpdateVideoResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Check if VIDEO_EMBED feature is enabled
    if (!wedding.features.VIDEO_EMBED) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    const result = await this.weddingService.updateVideoEmbed(id, videoId, body);

    if (!result) {
      throw new NotFoundException({ ok: false, error: VIDEO_NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  /**
   * Remove a video from the wedding
   * PRD: "Admin can embed videos" (implies ability to remove)
   */
  @Delete(':id/video/videos/:videoId')
  async removeVideo(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Param('videoId') videoId: string,
  ): Promise<ApiResponse<UpdateVideoResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Check if VIDEO_EMBED feature is enabled
    if (!wedding.features.VIDEO_EMBED) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    const result = await this.weddingService.removeVideo(id, videoId);

    if (!result) {
      throw new NotFoundException({ ok: false, error: VIDEO_NOT_FOUND });
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
    const wedding = await this.weddingService.getWedding(id);

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
    const template = await this.weddingService.getTemplate(body.templateId);
    if (!template) {
      throw new BadRequestException({
        ok: false,
        error: TEMPLATE_NOT_FOUND,
      });
    }

    const renderConfig = await this.weddingService.changeTemplate(id, body.templateId);

    if (!renderConfig) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: renderConfig };
  }

  // ============================================================================
  // Social Config / OG Image Endpoints
  // ============================================================================

  /**
   * Get social sharing configuration for a wedding
   * PRD: "Admin can customize share image"
   */
  @Get(':id/social-config')
  async getSocialConfig(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<SocialConfig>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    const socialConfig = await this.weddingService.getSocialConfig(id);

    if (!socialConfig) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: socialConfig };
  }

  /**
   * Update social sharing configuration for a wedding
   * PRD: "Admin can customize share image"
   */
  @Put(':id/social-config')
  async updateSocialConfig(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: UpdateSocialConfigRequest,
  ): Promise<ApiResponse<UpdateSocialConfigResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (!body.socialConfig) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    // Validate OG image URL if provided
    if (body.socialConfig.ogImageUrl) {
      try {
        new URL(body.socialConfig.ogImageUrl);
      } catch {
        throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
      }
    }

    const result = await this.weddingService.updateSocialConfig(id, body.socialConfig);

    if (!result) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  /**
   * Remove custom OG image from a wedding
   * PRD: "Admin can customize share image" (implies ability to remove)
   */
  @Delete(':id/social-config/og-image')
  async removeSocialOgImage(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<UpdateSocialConfigResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    const result = await this.weddingService.removeSocialOgImage(id);

    if (!result) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: result };
  }

// ============================================================================
  // Language / i18n Endpoints
  // PRD: "Admin can set site language"
  // ============================================================================

  /**
   * Get list of supported languages
   * Public endpoint - languages list doesn't require auth
   */
  @Get('languages/list')
  async listLanguages(): Promise<ApiResponse<{ languages: { code: string; name: string; nativeName: string }[]; defaultLanguage: string }>> {
    const languages = await this.weddingService.getSupportedLanguages();
    return {
      ok: true,
      data: {
        languages,
        defaultLanguage: 'en',
      },
    };
  }

  /**
   * Update site language for a wedding
   * PRD: "Admin can set site language"
   */
  @Put(':id/language')
  async updateLanguage(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: { language: string },
  ): Promise<ApiResponse<{ wedding: Wedding; renderConfig: RenderConfig }>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (!body.language) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    // Validate language code
    if (!this.weddingService.isValidLanguage(body.language)) {
      throw new BadRequestException({ ok: false, error: INVALID_LANGUAGE });
    }

    const result = await this.weddingService.updateLanguage(id, body.language);

    if (!result) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  // ============================================================================
  // Preview / Draft Workflow Endpoints
  // PRD: "Admin can preview site before publishing"
  // PRD: "Admin can publish or discard changes"
  // ============================================================================

  /**
   * Get the preview status for a wedding
   * Returns whether there are unpublished draft changes
   */
  @Get(':id/preview/status')
  async getPreviewStatus(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<PreviewStatus>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    const status = await this.weddingService.getPreviewStatus(id);

    if (!status) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: status };
  }

  /**
   * Get the draft render_config for preview
   * Returns both draft and published configs for comparison
   */
  @Get(':id/preview/draft')
  async getDraftRenderConfig(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<DraftRenderConfigResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    const draftConfig = await this.weddingService.getDraftRenderConfig(id);
    const publishedConfig = await this.weddingService.getPublishedRenderConfig(id);

    if (!draftConfig || !publishedConfig) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    const hasDraftChanges = await this.weddingService.hasDraftChanges(id);

    return {
      ok: true,
      data: {
        draftConfig,
        publishedConfig,
        hasDraftChanges,
      },
    };
  }

  /**
   * Publish draft changes to the live site
   * Copies draft config to published config
   */
  @Post(':id/preview/publish')
  async publishDraft(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: PublishDraftRequest,
  ): Promise<ApiResponse<PublishDraftResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Check if there are changes to publish
    if (!(await this.weddingService.hasDraftChanges(id))) {
      throw new BadRequestException({ ok: false, error: NO_CHANGES_TO_PUBLISH });
    }

    const result = await this.weddingService.publishDraft(id);

    if (!result) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return {
      ok: true,
      data: {
        wedding: result.wedding,
        renderConfig: result.renderConfig,
        message: 'Changes published successfully',
      },
    };
  }

  /**
   * Discard draft changes and revert to published state
   */
  @Post(':id/preview/discard')
  async discardDraft(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<DiscardDraftResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Check if there's a draft to discard
    if (!(await this.weddingService.hasDraftChanges(id))) {
      throw new BadRequestException({ ok: false, error: NO_DRAFT_EXISTS });
    }

    const result = await this.weddingService.discardDraft(id);

    if (!result) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return {
      ok: true,
      data: {
        wedding: result.wedding,
        renderConfig: result.renderConfig,
        message: 'Draft changes discarded',
      },
    };
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
    const wedding = await this.weddingService.getWedding(id);

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

    const result = await this.weddingService.updateEmailTemplates(id, body.emailTemplates);

    if (!result) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  // ============================================================================
  // Custom Domain Endpoints
  // PRD: "Admin can connect custom domain"
  // PRD: "SSL certificate is provisioned for custom domain"
  // PRD: "Site works on both default and custom domain"
  // ============================================================================

  /**
   * Get custom domain configuration for a wedding
   */
  @Get(':id/custom-domain')
  async getCustomDomain(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<GetCustomDomainResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    const result = await this.weddingService.getCustomDomain(id);

    if (!result) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  /**
   * Add a custom domain to a wedding
   * PRD: "Admin can connect custom domain"
   */
  @Post(':id/custom-domain')
  async addCustomDomain(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: AddCustomDomainRequest,
  ): Promise<ApiResponse<AddCustomDomainResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (!body.domain?.trim()) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    const result = await this.weddingService.addCustomDomain(id, body.domain.trim());

    if (!result) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  /**
   * Verify DNS configuration for a custom domain
   * PRD: "Admin can connect custom domain"
   */
  @Post(':id/custom-domain/verify')
  async verifyCustomDomain(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<VerifyCustomDomainResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    const result = await this.weddingService.verifyCustomDomain(id);

    if (!result) {
      throw new BadRequestException({ ok: false, error: CUSTOM_DOMAIN_NOT_CONFIGURED });
    }

    return { ok: true, data: result };
  }

  /**
   * Remove a custom domain from a wedding
   * PRD: "Admin can connect custom domain" (includes ability to disconnect)
   */
  @Delete(':id/custom-domain')
  async removeCustomDomain(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<RemoveCustomDomainResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(id);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    const result = await this.weddingService.removeCustomDomain(id);

    if ('error' in result) {
      if (result.error === 'CUSTOM_DOMAIN_NOT_CONFIGURED') {
        throw new BadRequestException({ ok: false, error: CUSTOM_DOMAIN_NOT_CONFIGURED });
      }
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  /**
   * Extract and validate auth token
   */
  private async requireAuth(authHeader: string | undefined) {
    return this.adminAuthService.requireUser(authHeader);
  }
}
