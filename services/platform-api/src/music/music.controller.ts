import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  Res,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { MusicService } from './music.service';
import { WeddingService } from '../wedding/wedding.service';
import { AdminAuthService } from '../auth/admin-auth.service';
import {
  SubmitSongRequestRequest,
  SongRequestListResponse,
  FEATURE_DISABLED,
  VALIDATION_ERROR,
  WEDDING_NOT_FOUND,
} from '../types';

/**
 * Admin controller for music request management.
 * All endpoints require authentication.
 */
@Controller('weddings/:weddingId/music')
export class MusicAdminController {
  private readonly logger = new Logger(MusicAdminController.name);

  constructor(
    private readonly musicService: MusicService,
    private readonly weddingService: WeddingService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  /**
   * Admin lists all song requests for a wedding.
   * GET /api/weddings/:weddingId/music/requests
   */
  @Get('requests')
  async listSongRequests(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
  ): Promise<SongRequestListResponse> {
    const { wedding } = await this.requireWeddingOwner(authHeader, weddingId);

    // Check if music requests feature is enabled
    if (!wedding.features.MUSIC_REQUESTS) {
      throw new BadRequestException({ ok: false, error: FEATURE_DISABLED });
    }

    const songRequests = this.musicService.getSongRequestsForWedding(weddingId);

    return {
      songRequests,
      total: songRequests.length,
    };
  }

  /**
   * Admin deletes a song request.
   * DELETE /api/weddings/:weddingId/music/requests/:requestId
   */
  @Delete('requests/:requestId')
  async deleteSongRequest(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Param('requestId') requestId: string,
  ) {
    await this.requireWeddingOwner(authHeader, weddingId);

    // Verify the song request exists and belongs to this wedding
    const songRequest = this.musicService.getSongRequest(requestId);
    if (!songRequest || songRequest.weddingId !== weddingId) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    this.musicService.deleteSongRequest(requestId);

    return { ok: true };
  }

  /**
   * Admin exports song requests as CSV or text file for DJ.
   * GET /api/weddings/:weddingId/music/export
   */
  @Get('export')
  async exportPlaylist(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Query('format') format: string = 'csv',
    @Res() res: Response,
  ) {
    const { wedding } = await this.requireWeddingOwner(authHeader, weddingId);

    // Check if music requests feature is enabled
    if (!wedding.features.MUSIC_REQUESTS) {
      throw new BadRequestException({ ok: false, error: FEATURE_DISABLED });
    }

    // Export based on format
    const result = format === 'txt'
      ? this.musicService.exportPlaylistAsText(weddingId)
      : this.musicService.exportPlaylistAsCsv(weddingId);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  }

  /**
   * Get music request count for dashboard summary.
   * GET /api/weddings/:weddingId/music/summary
   */
  @Get('summary')
  async getMusicSummary(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
  ) {
    const { wedding } = await this.requireWeddingOwner(authHeader, weddingId);

    // Check if music requests feature is enabled
    if (!wedding.features.MUSIC_REQUESTS) {
      throw new BadRequestException({ ok: false, error: FEATURE_DISABLED });
    }

    const count = this.musicService.getSongRequestCount(weddingId);
    const recentRequests = this.musicService.getSongRequestsForWedding(weddingId).slice(0, 5);

    return {
      ok: true,
      total: count,
      recentRequests,
    };
  }

  /**
   * Validate auth token and verify user owns the wedding
   */
  private async requireWeddingOwner(authHeader: string | undefined, weddingId: string) {
    const user = await this.adminAuthService.requireUser(authHeader);

    const wedding = await this.weddingService.getWedding(weddingId);
    if (!wedding || wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    return { user, wedding };
  }
}

/**
 * Public controller for music/song request submissions.
 * No authentication required - guests can submit song requests.
 */
@Controller('music')
export class MusicPublicController {
  private readonly logger = new Logger(MusicPublicController.name);

  constructor(
    private readonly musicService: MusicService,
    private readonly weddingService: WeddingService,
  ) {}

  /**
   * Guest submits a song request (public endpoint).
   * POST /api/music/:slug/request
   */
  @Post(':slug/request')
  async submitSongRequest(
    @Param('slug') slug: string,
    @Body() body: SubmitSongRequestRequest,
  ) {
    // Find wedding by slug
    const wedding = await this.weddingService.getWeddingBySlug(slug);
    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Check if wedding is active
    if (wedding.status !== 'active') {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Check if music requests feature is enabled
    if (!wedding.features.MUSIC_REQUESTS) {
      throw new BadRequestException({ ok: false, error: FEATURE_DISABLED });
    }

    // Validate request
    if (!body.songTitle?.trim()) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR, message: 'Song title is required' });
    }
    if (!body.artistName?.trim()) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR, message: 'Artist name is required' });
    }

    // Submit the song request
    const songRequest = this.musicService.submitSongRequest(
      wedding.id,
      body.songTitle.trim(),
      body.artistName.trim(),
      body.requesterName?.trim(),
    );

    return {
      ok: true,
      message: 'Song request submitted successfully!',
      songRequest,
    };
  }
}
