import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Headers,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { GuestbookService } from './guestbook.service';
import { WeddingService } from '../wedding/wedding.service';
import { AuthService } from '../auth/auth.service';
import type {
  ApiResponse,
  GuestbookMessage,
  GuestbookMessagesResponse,
  SubmitGuestbookMessageRequest,
  SubmitGuestbookMessageResponse,
  ModerateGuestbookMessageRequest,
} from '../types';
import {
  FEATURE_DISABLED,
  GUESTBOOK_MESSAGE_NOT_FOUND,
  UNAUTHORIZED,
  VALIDATION_ERROR,
  WEDDING_NOT_FOUND,
} from '../types';

/**
 * Admin controller for guestbook management
 * All endpoints require authentication
 */
@Controller('weddings/:weddingId/guestbook')
export class GuestbookAdminController {
  constructor(
    private readonly guestbookService: GuestbookService,
    private readonly weddingService: WeddingService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Get all guestbook messages for a wedding (admin view - all statuses)
   * PRD: "Admin can moderate guestbook messages"
   */
  @Get('messages')
  async getMessages(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
  ): Promise<ApiResponse<GuestbookMessagesResponse>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const messages = this.guestbookService.getMessagesForWedding(weddingId);
    return { ok: true, data: { messages } };
  }

  /**
   * Get message counts summary for dashboard
   */
  @Get('summary')
  async getSummary(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
  ): Promise<
    ApiResponse<{
      total: number;
      pending: number;
      approved: number;
      rejected: number;
    }>
  > {
    await this.requireWeddingOwner(authHeader, weddingId);

    const counts = this.guestbookService.getMessageCounts(weddingId);
    return { ok: true, data: counts };
  }

  /**
   * Moderate a guestbook message (approve or reject)
   * PRD: "Admin can moderate guestbook messages"
   */
  @Put('messages/:messageId/moderate')
  async moderateMessage(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Param('messageId') messageId: string,
    @Body() body: ModerateGuestbookMessageRequest,
  ): Promise<ApiResponse<{ message: GuestbookMessage }>> {
    const { wedding } = await this.requireWeddingOwner(authHeader, weddingId);

    // Check if guestbook feature is enabled
    if (!wedding.features?.GUESTBOOK) {
      throw new BadRequestException({ ok: false, error: FEATURE_DISABLED });
    }

    // Validate status
    if (!body.status || !['approved', 'rejected'].includes(body.status)) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    // Verify message belongs to this wedding
    const existingMessage = this.guestbookService.getMessage(messageId);
    if (!existingMessage || existingMessage.weddingId !== weddingId) {
      throw new NotFoundException({ ok: false, error: GUESTBOOK_MESSAGE_NOT_FOUND });
    }

    const message = await this.guestbookService.moderateMessage(messageId, body.status);
    if (!message) {
      throw new NotFoundException({ ok: false, error: GUESTBOOK_MESSAGE_NOT_FOUND });
    }

    // Update render_config with new approved messages
    const guestbookConfig = this.guestbookService.getGuestbookConfig(weddingId);
    await this.weddingService.updateGuestbookConfig(weddingId, guestbookConfig);

    return { ok: true, data: { message } };
  }

  /**
   * Delete a guestbook message
   */
  @Delete('messages/:messageId')
  async deleteMessage(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Param('messageId') messageId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    // Verify message belongs to this wedding
    const existingMessage = this.guestbookService.getMessage(messageId);
    if (!existingMessage || existingMessage.weddingId !== weddingId) {
      throw new NotFoundException({ ok: false, error: GUESTBOOK_MESSAGE_NOT_FOUND });
    }

    const deleted = await this.guestbookService.deleteMessage(messageId);

    // Update render_config
    const guestbookConfig = this.guestbookService.getGuestbookConfig(weddingId);
    await this.weddingService.updateGuestbookConfig(weddingId, guestbookConfig);

    return { ok: true, data: { deleted } };
  }

  /**
   * Validate auth token and verify user owns the wedding
   */
  private async requireWeddingOwner(authHeader: string | undefined, weddingId: string) {
    const token = this.extractBearerToken(authHeader);
    if (!token) {
      throw new UnauthorizedException({ ok: false, error: UNAUTHORIZED });
    }

    const user = await this.authService.validateSession(token);
    if (!user) {
      throw new UnauthorizedException({ ok: false, error: UNAUTHORIZED });
    }

    const wedding = await this.weddingService.getWedding(weddingId);
    if (!wedding || wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    return { user, wedding };
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

/**
 * Public controller for guestbook submissions
 * No authentication required - guests can submit messages
 */
@Controller('guestbook')
export class GuestbookPublicController {
  constructor(
    private readonly guestbookService: GuestbookService,
    private readonly weddingService: WeddingService,
  ) {}

  /**
   * Submit a guestbook message (public endpoint)
   * PRD: "Guest can leave a message for the couple"
   */
  @Post(':slug/submit')
  async submitMessage(
    @Param('slug') slug: string,
    @Body() body: SubmitGuestbookMessageRequest,
  ): Promise<ApiResponse<SubmitGuestbookMessageResponse>> {
    // Find wedding by slug
    const wedding = await this.weddingService.getWeddingBySlug(slug);
    if (!wedding || wedding.status !== 'active') {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Check if guestbook feature is enabled
    if (!wedding.features?.GUESTBOOK) {
      throw new BadRequestException({ ok: false, error: FEATURE_DISABLED });
    }

    // Validate input
    if (!body.guestName || body.guestName.trim().length === 0) {
      throw new BadRequestException({
        ok: false,
        error: VALIDATION_ERROR,
        message: 'Please enter your name',
      } as any);
    }

    if (!body.message || body.message.trim().length === 0) {
      throw new BadRequestException({
        ok: false,
        error: VALIDATION_ERROR,
        message: 'Please enter a message',
      } as any);
    }

    // Limit message length
    if (body.message.length > 1000) {
      throw new BadRequestException({
        ok: false,
        error: VALIDATION_ERROR,
        message: 'Message must be 1000 characters or less',
      } as any);
    }

    const message = await this.guestbookService.submitMessage(
      wedding.id,
      body.guestName.trim(),
      body.message.trim(),
    );

    return { ok: true, data: { message } };
  }

  /**
   * Get approved guestbook messages for display (public endpoint)
   * PRD: "Guestbook messages display on public site"
   */
  @Get(':slug/messages')
  async getApprovedMessages(
    @Param('slug') slug: string,
  ): Promise<ApiResponse<GuestbookMessagesResponse>> {
    // Find wedding by slug
    const wedding = await this.weddingService.getWeddingBySlug(slug);
    if (!wedding || wedding.status !== 'active') {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Check if guestbook feature is enabled
    if (!wedding.features?.GUESTBOOK) {
      throw new BadRequestException({ ok: false, error: FEATURE_DISABLED });
    }

    const messages = this.guestbookService.getApprovedMessages(wedding.id);
    return { ok: true, data: { messages } };
  }
}
