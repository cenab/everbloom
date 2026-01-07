import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { WeddingService } from '../wedding/wedding.service';
import { AuthService } from '../auth/auth.service';
import type {
  SendInvitationsRequest,
  SendInvitationsResponse,
  SendRemindersRequest,
  SendRemindersResponse,
  EmailOutbox,
  UpdateOutboxStatusRequest,
  ApiResponse,
} from '../types';
import {
  FEATURE_DISABLED,
  NO_GUESTS_SELECTED,
  REMINDER_QUEUE_FAILED,
  UNAUTHORIZED,
  WEDDING_NOT_FOUND,
} from '../types';

@Controller('weddings/:weddingId/invitations')
export class InvitationController {
  constructor(
    private readonly invitationService: InvitationService,
    private readonly weddingService: WeddingService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Send invitations to selected guests
   * PRD: "Admin can send invitation emails"
   */
  @Post('send')
  async sendInvitations(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Body() body: SendInvitationsRequest,
  ): Promise<ApiResponse<SendInvitationsResponse>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    if (!body.guestIds || body.guestIds.length === 0) {
      throw new HttpException(
        { ok: false, error: NO_GUESTS_SELECTED, message: 'Please select at least one guest' },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.invitationService.sendInvitations(
        weddingId,
        body.guestIds,
      );
      return { ok: true, data: result };
    } catch (error) {
      if (error instanceof Error && error.message === 'WEDDING_NOT_FOUND') {
        throw new NotFoundException({
          ok: false,
          error: 'WEDDING_NOT_FOUND',
          message: 'Wedding not found',
        });
      }
      throw error;
    }
  }

  /**
   * Enqueue RSVP reminder emails for pending guests
   * PRD: "Reminder emails are sent via worker queue"
   */
  @Post('reminders')
  async sendReminders(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Body() body: SendRemindersRequest,
  ): Promise<ApiResponse<SendRemindersResponse>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const guestIds = body?.guestIds;

    if (guestIds && guestIds.length === 0) {
      throw new HttpException(
        { ok: false, error: NO_GUESTS_SELECTED, message: 'Please select at least one guest' },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.invitationService.enqueueReminders(
        weddingId,
        guestIds,
      );
      return { ok: true, data: result };
    } catch (error) {
      if (error instanceof Error && error.message === 'WEDDING_NOT_FOUND') {
        throw new NotFoundException({
          ok: false,
          error: 'WEDDING_NOT_FOUND',
          message: 'Wedding not found',
        });
      }
      if (error instanceof Error && error.message === 'FEATURE_DISABLED') {
        throw new BadRequestException({
          ok: false,
          error: FEATURE_DISABLED,
          message: 'RSVP reminders are not enabled for this wedding.',
        });
      }
      if (error instanceof Error && error.message === REMINDER_QUEUE_FAILED) {
        throw new HttpException(
          { ok: false, error: REMINDER_QUEUE_FAILED, message: 'Failed to enqueue reminders.' },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw error;
    }
  }

  /**
   * Get email outbox for a wedding (sent/pending/failed emails)
   */
  @Get('outbox')
  async getOutbox(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
  ): Promise<ApiResponse<{ emails: EmailOutbox[] }>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const emails = this.invitationService.getOutboxForWedding(weddingId);
    return { ok: true, data: { emails } };
  }

  /**
   * Update outbox status (worker -> platform API)
   */
  @Post('outbox/:outboxId/status')
  async updateOutboxStatus(
    @Headers('x-worker-token') workerToken: string | undefined,
    @Param('weddingId') weddingId: string,
    @Param('outboxId') outboxId: string,
    @Body() body: UpdateOutboxStatusRequest,
  ): Promise<ApiResponse<{ updated: boolean }>> {
    this.requireWorkerToken(workerToken);

    if (!body.status || (body.status !== 'sent' && body.status !== 'failed')) {
      throw new BadRequestException({
        ok: false,
        error: 'INVALID_STATUS',
        message: 'Status must be sent or failed.',
      });
    }

    const updated = this.invitationService.updateOutboxRecord(
      weddingId,
      outboxId,
      body.status,
      body.errorMessage,
    );

    if (!updated) {
      throw new NotFoundException({
        ok: false,
        error: 'OUTBOX_NOT_FOUND',
        message: 'Outbox record not found',
      });
    }

    return { ok: true, data: { updated } };
  }

  /**
   * Validate auth token and verify user owns the wedding
   */
  private async requireWeddingOwner(
    authHeader: string | undefined,
    weddingId: string,
  ) {
    const token = this.extractBearerToken(authHeader);
    if (!token) {
      throw new UnauthorizedException({ ok: false, error: UNAUTHORIZED });
    }

    const user = await this.authService.validateSession(token);
    if (!user) {
      throw new UnauthorizedException({ ok: false, error: UNAUTHORIZED });
    }

    const wedding = this.weddingService.getWedding(weddingId);
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

  /**
   * Validate worker token for internal endpoints
   */
  private requireWorkerToken(workerToken: string | undefined) {
    const expected = process.env.WORKER_TOKEN;
    if (!expected) {
      return;
    }

    if (!workerToken || workerToken !== expected) {
      throw new UnauthorizedException({ ok: false, error: UNAUTHORIZED });
    }
  }
}
