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
} from '../types';
import { TEMPLATE_NOT_FOUND, FEATURE_DISABLED, CALENDAR_INVITE_DISABLED } from '../types';

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
      throw new NotFoundException('Wedding not found');
    }

    // Ensure user owns this wedding
    if (wedding.userId !== user.id) {
      throw new NotFoundException('Wedding not found');
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
      throw new NotFoundException('Wedding not found');
    }

    // Ensure user owns this wedding
    if (wedding.userId !== user.id) {
      throw new NotFoundException('Wedding not found');
    }

    const renderConfig = this.weddingService.getRenderConfig(id);

    if (!renderConfig) {
      throw new NotFoundException('Render config not found');
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
      throw new NotFoundException('Wedding not found');
    }

    // Ensure user owns this wedding
    if (wedding.userId !== user.id) {
      throw new NotFoundException('Wedding not found');
    }

    if (!body.features || typeof body.features !== 'object') {
      throw new BadRequestException('Features object is required');
    }

    const result = this.weddingService.updateFeatures(id, body.features);

    if (!result) {
      throw new NotFoundException('Failed to update features');
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
      throw new NotFoundException('Wedding not found');
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException('Wedding not found');
    }

    if (!wedding.features.ANNOUNCEMENT_BANNER) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    if (!body.announcement) {
      throw new BadRequestException('Announcement data is required');
    }

    const title = body.announcement.title?.trim();
    const message = body.announcement.message?.trim();
    const enabled = Boolean(body.announcement.enabled);

    if (enabled && (!title || !message)) {
      throw new BadRequestException('Title and message are required when enabled');
    }

    const announcement = {
      enabled,
      title: title ?? '',
      message: message ?? '',
    };

    const result = this.weddingService.updateAnnouncement(id, announcement);

    if (!result) {
      throw new NotFoundException('Failed to update announcement');
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
      throw new NotFoundException('Wedding not found');
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException('Wedding not found');
    }

    if (!wedding.features.FAQ_SECTION) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    if (!body.faq) {
      throw new BadRequestException('FAQ data is required');
    }

    // Validate FAQ items
    const items = body.faq.items || [];
    for (const item of items) {
      if (!item.question?.trim() || !item.answer?.trim()) {
        throw new BadRequestException('Each FAQ item must have a question and answer');
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
      throw new NotFoundException('Failed to update FAQ');
    }

    return { ok: true, data: result };
  }

  /**
   * Update event details for a wedding
   * Required for calendar invites to work properly
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
      throw new NotFoundException('Wedding not found');
    }

    if (wedding.userId !== user.id) {
      throw new NotFoundException('Wedding not found');
    }

    // Event details can be set regardless of CALENDAR_INVITE feature status
    // (the feature flag controls display of calendar buttons, not storage of event data)

    if (!body.eventDetails) {
      throw new BadRequestException('Event details are required');
    }

    const { date, startTime, endTime, venue, address, city } = body.eventDetails;

    if (!date || !startTime || !endTime || !venue || !address || !city) {
      throw new BadRequestException(
        'All event details fields are required: date, startTime, endTime, venue, address, city',
      );
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Date must be in YYYY-MM-DD format');
    }

    // Validate time format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      throw new BadRequestException('Times must be in HH:MM format');
    }

    const result = this.weddingService.updateEventDetails(id, body.eventDetails);

    if (!result) {
      throw new NotFoundException('Failed to update event details');
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
      throw new NotFoundException('Wedding not found');
    }

    // Ensure user owns this wedding
    if (wedding.userId !== user.id) {
      throw new NotFoundException('Wedding not found');
    }

    if (!body.templateId) {
      throw new BadRequestException('Template ID is required');
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
      throw new NotFoundException('Failed to update template');
    }

    return { ok: true, data: renderConfig };
  }

  /**
   * Extract and validate auth token
   */
  private async requireAuth(authHeader: string | undefined) {
    const token = this.extractBearerToken(authHeader);
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const user = await this.authService.validateSession(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired session');
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
