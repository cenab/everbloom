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
} from '@wedding-bestie/shared';
import { TEMPLATE_NOT_FOUND, FEATURE_DISABLED } from '@wedding-bestie/shared';

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
