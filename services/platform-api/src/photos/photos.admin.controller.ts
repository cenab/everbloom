import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type {
  ApiResponse,
  PhotoListResponse,
  PhotoSummaryResponse,
  UpdatePhotoModerationResponse,
  ModeratePhotoResponse,
  PhotoModerationStatus,
} from '../types';
import {
  FEATURE_DISABLED,
  WEDDING_NOT_FOUND,
  PHOTO_NOT_FOUND,
  VALIDATION_ERROR,
} from '../types';
import { AdminAuthService } from '../auth/admin-auth.service';
import { WeddingService } from '../wedding/wedding.service';
import { PhotosService } from './photos.service';

@Controller('weddings')
export class PhotosAdminController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly weddingService: WeddingService,
    private readonly photosService: PhotosService,
  ) {}

  /**
   * List uploaded photos for a wedding
   * GET /api/weddings/:weddingId/photos?status=pending|approved|rejected
   * Filter by moderation status to support admin moderation queue
   */
  @Get(':weddingId/photos')
  async listPhotos(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Query('status') statusFilter?: PhotoModerationStatus,
  ): Promise<ApiResponse<PhotoListResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(weddingId);

    if (!wedding || wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (!wedding.features.PHOTO_UPLOAD) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    // Validate status filter if provided
    if (statusFilter && !['pending', 'approved', 'rejected'].includes(statusFilter)) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    const photos = this.photosService.listPhotos(weddingId, statusFilter);
    return { ok: true, data: { photos } };
  }

  /**
   * Get photo upload summary statistics for dashboard
   * GET /api/weddings/:weddingId/photos/summary
   * PRD: "Dashboard shows photo upload count"
   */
  @Get(':weddingId/photos/summary')
  async getPhotoSummary(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
  ): Promise<ApiResponse<PhotoSummaryResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(weddingId);

    if (!wedding || wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (!wedding.features.PHOTO_UPLOAD) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    const summary = this.photosService.getPhotoSummary(weddingId);
    return { ok: true, data: { summary } };
  }

  /**
   * Update photo moderation settings for a wedding
   * PUT /api/weddings/:weddingId/photos/moderation
   * PRD: "Admin can enable photo moderation"
   */
  @Put(':weddingId/photos/moderation')
  async updatePhotoModeration(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Body() body: { moderationRequired: boolean },
  ): Promise<ApiResponse<UpdatePhotoModerationResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(weddingId);

    if (!wedding || wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (!wedding.features.PHOTO_UPLOAD) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    if (typeof body?.moderationRequired !== 'boolean') {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    const result = await this.weddingService.updatePhotoModeration(
      weddingId,
      body.moderationRequired,
    );

    if (!result) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    return { ok: true, data: result };
  }

  /**
   * Moderate a photo (approve or reject)
   * POST /api/weddings/:weddingId/photos/:photoId/moderate
   * PRD: "Admin can approve or reject guest photos"
   */
  @Post(':weddingId/photos/:photoId/moderate')
  async moderatePhoto(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Param('photoId') photoId: string,
    @Body() body: { status: 'approved' | 'rejected' },
  ): Promise<ApiResponse<ModeratePhotoResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(weddingId);

    if (!wedding || wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (!wedding.features.PHOTO_UPLOAD) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    if (!body?.status || !['approved', 'rejected'].includes(body.status)) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    const photo = this.photosService.moderatePhoto(weddingId, photoId, body.status);

    if (!photo) {
      throw new NotFoundException({ ok: false, error: PHOTO_NOT_FOUND });
    }

    return { ok: true, data: { photo } };
  }

  /**
   * Remove a photo (for admin to remove previously approved photos)
   * DELETE /api/weddings/:weddingId/photos/:photoId
   * PRD: "Admin can remove previously approved photos"
   */
  @Delete(':weddingId/photos/:photoId')
  async removePhoto(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Param('photoId') photoId: string,
  ): Promise<ApiResponse<{ removed: boolean }>> {
    const user = await this.requireAuth(authHeader);
    const wedding = await this.weddingService.getWedding(weddingId);

    if (!wedding || wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (!wedding.features.PHOTO_UPLOAD) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    const removed = this.photosService.removePhoto(weddingId, photoId);

    if (!removed) {
      throw new NotFoundException({ ok: false, error: PHOTO_NOT_FOUND });
    }

    return { ok: true, data: { removed: true } };
  }

  /**
   * Extract and validate auth token
   */
  private async requireAuth(authHeader: string | undefined) {
    return this.adminAuthService.requireUser(authHeader);
  }
}
