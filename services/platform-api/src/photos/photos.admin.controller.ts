import {
  Controller,
  Get,
  Headers,
  Param,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ApiResponse, PhotoListResponse, PhotoSummaryResponse } from '../types';
import { FEATURE_DISABLED, WEDDING_NOT_FOUND, UNAUTHORIZED } from '../types';
import { AuthService } from '../auth/auth.service';
import { WeddingService } from '../wedding/wedding.service';
import { PhotosService } from './photos.service';

@Controller('weddings')
export class PhotosAdminController {
  constructor(
    private readonly authService: AuthService,
    private readonly weddingService: WeddingService,
    private readonly photosService: PhotosService,
  ) {}

  /**
   * List uploaded photos for a wedding
   * GET /api/weddings/:weddingId/photos
   */
  @Get(':weddingId/photos')
  async listPhotos(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
  ): Promise<ApiResponse<PhotoListResponse>> {
    const user = await this.requireAuth(authHeader);
    const wedding = this.weddingService.getWedding(weddingId);

    if (!wedding || wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    if (!wedding.features.PHOTO_UPLOAD) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    const photos = this.photosService.listPhotos(weddingId);
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
    const wedding = this.weddingService.getWedding(weddingId);

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
