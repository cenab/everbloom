import {
  Controller,
  Post,
  Get,
  Delete,
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
  SendSaveTheDateRequest,
  SendSaveTheDateResponse,
  SendThankYouRequest,
  SendThankYouResponse,
  EmailOutbox,
  EmailStatisticsResponse,
  UpdateOutboxStatusRequest,
  ScheduleEmailRequest,
  ScheduleEmailResponse,
  ScheduledEmailsListResponse,
  CancelScheduledEmailResponse,
  ApiResponse,
} from '../types';
import {
  FEATURE_DISABLED,
  NO_GUESTS_SELECTED,
  REMINDER_QUEUE_FAILED,
  SCHEDULED_EMAIL_NOT_FOUND,
  SCHEDULED_EMAIL_ALREADY_SENT,
  INVALID_SCHEDULE_TIME,
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
   * Send save-the-date emails to selected guests
   * PRD: "Admin can send save-the-date emails"
   */
  @Post('save-the-date')
  async sendSaveTheDates(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Body() body: SendSaveTheDateRequest,
  ): Promise<ApiResponse<SendSaveTheDateResponse>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    if (!body.guestIds || body.guestIds.length === 0) {
      throw new HttpException(
        { ok: false, error: NO_GUESTS_SELECTED, message: 'Please select at least one guest' },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.invitationService.sendSaveTheDates(
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
   * Send thank-you emails to selected guests
   * PRD: "Admin can send thank-you emails"
   */
  @Post('thank-you')
  async sendThankYous(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Body() body: SendThankYouRequest,
  ): Promise<ApiResponse<SendThankYouResponse>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    if (!body.guestIds || body.guestIds.length === 0) {
      throw new HttpException(
        { ok: false, error: NO_GUESTS_SELECTED, message: 'Please select at least one guest' },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.invitationService.sendThankYous(
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
   * Get email delivery statistics for a wedding
   * PRD: "Dashboard shows email delivery statistics"
   */
  @Get('statistics')
  async getStatistics(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
  ): Promise<ApiResponse<EmailStatisticsResponse>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const statistics = this.invitationService.getEmailStatistics(weddingId);
    return { ok: true, data: { statistics } };
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

    const validStatuses = ['sent', 'failed', 'delivered', 'bounced'];
    if (!body.status || !validStatuses.includes(body.status)) {
      throw new BadRequestException({
        ok: false,
        error: 'INVALID_STATUS',
        message: 'Status must be sent, failed, delivered, or bounced.',
      });
    }

    const updated = this.invitationService.updateOutboxRecord(
      weddingId,
      outboxId,
      body.status,
      {
        errorMessage: body.errorMessage,
        messageId: body.messageId,
        bounceType: body.bounceType,
        bounceReason: body.bounceReason,
      },
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

// ============================================================================
  // Scheduled Email Endpoints
  // PRD: "Admin can schedule emails for future send"
  // ============================================================================

  /**
   * Schedule an email to be sent at a future time
   * PRD: "Admin can schedule emails for future send"
   */
  @Post('schedule')
  async scheduleEmail(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Body() body: ScheduleEmailRequest,
  ): Promise<ApiResponse<ScheduleEmailResponse>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    // Validate request
    if (!body.guestIds || body.guestIds.length === 0) {
      throw new BadRequestException({
        ok: false,
        error: NO_GUESTS_SELECTED,
        message: 'Please select at least one guest',
      });
    }

    if (!body.emailType) {
      throw new BadRequestException({
        ok: false,
        error: 'VALIDATION_ERROR',
        message: 'Email type is required',
      });
    }

    if (!body.scheduledAt) {
      throw new BadRequestException({
        ok: false,
        error: 'VALIDATION_ERROR',
        message: 'Scheduled time is required',
      });
    }

    // Validate scheduled time format
    const scheduledTime = new Date(body.scheduledAt);
    if (isNaN(scheduledTime.getTime())) {
      throw new BadRequestException({
        ok: false,
        error: INVALID_SCHEDULE_TIME,
        message: 'Invalid scheduled time format. Use ISO 8601 format.',
      });
    }

    // Validate email type
    const validEmailTypes = ['invitation', 'reminder', 'save_the_date', 'thank_you'];
    if (!validEmailTypes.includes(body.emailType)) {
      throw new BadRequestException({
        ok: false,
        error: 'VALIDATION_ERROR',
        message: `Email type must be one of: ${validEmailTypes.join(', ')}`,
      });
    }

    try {
      const result = await this.invitationService.scheduleEmail(
        weddingId,
        body.guestIds,
        body.emailType,
        body.scheduledAt,
      );
      return { ok: true, data: result };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'WEDDING_NOT_FOUND') {
          throw new NotFoundException({
            ok: false,
            error: WEDDING_NOT_FOUND,
            message: 'Wedding not found',
          });
        }
        if (error.message === INVALID_SCHEDULE_TIME) {
          throw new BadRequestException({
            ok: false,
            error: INVALID_SCHEDULE_TIME,
            message: 'Scheduled time must be in the future',
          });
        }
        if (error.message === 'GUEST_NOT_FOUND') {
          throw new BadRequestException({
            ok: false,
            error: 'GUEST_NOT_FOUND',
            message: 'One or more guests not found',
          });
        }
      }
      throw error;
    }
  }

  /**
   * Get all scheduled emails for a wedding
   * PRD: "Admin can view and cancel scheduled emails"
   */
  @Get('scheduled')
  async getScheduledEmails(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
  ): Promise<ApiResponse<ScheduledEmailsListResponse>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const scheduledEmails =
      this.invitationService.getScheduledEmailsForWedding(weddingId);
    return { ok: true, data: { scheduledEmails } };
  }

  /**
   * Cancel a scheduled email
   * PRD: "Admin can view and cancel scheduled emails"
   */
  @Delete('scheduled/:scheduledEmailId')
  async cancelScheduledEmail(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Param('scheduledEmailId') scheduledEmailId: string,
  ): Promise<ApiResponse<CancelScheduledEmailResponse>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    try {
      const scheduledEmail = await this.invitationService.cancelScheduledEmail(
        weddingId,
        scheduledEmailId,
      );
      return {
        ok: true,
        data: {
          success: true,
          scheduledEmail,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === SCHEDULED_EMAIL_NOT_FOUND) {
          throw new NotFoundException({
            ok: false,
            error: SCHEDULED_EMAIL_NOT_FOUND,
            message: 'Scheduled email not found',
          });
        }
        if (error.message === SCHEDULED_EMAIL_ALREADY_SENT) {
          throw new BadRequestException({
            ok: false,
            error: SCHEDULED_EMAIL_ALREADY_SENT,
            message: 'This email has already been sent and cannot be cancelled',
          });
        }
      }
      throw error;
    }
  }

  /**
   * Execute a scheduled email (called by worker when scheduled time arrives)
   * PRD: "Scheduled emails send at correct time"
   */
  @Post('execute-scheduled')
  async executeScheduledEmail(
    @Headers('x-worker-token') workerToken: string | undefined,
    @Param('weddingId') weddingId: string,
    @Body()
    body: {
      scheduledEmailId: string;
      guestIds: string[];
      emailType: string;
    },
  ): Promise<ApiResponse<{ sent: number; failed: number; total: number }>> {
    this.requireWorkerToken(workerToken);

    if (!body.scheduledEmailId || !body.guestIds || !body.emailType) {
      throw new BadRequestException({
        ok: false,
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields',
      });
    }

    try {
      const result = await this.invitationService.executeScheduledEmail({
        scheduledEmailId: body.scheduledEmailId,
        weddingId,
        guestIds: body.guestIds,
        emailType: body.emailType as 'invitation' | 'reminder' | 'save_the_date' | 'thank_you' | 'update',
      });
      return { ok: true, data: result };
    } catch (error) {
      if (error instanceof Error && error.message === 'WEDDING_NOT_FOUND') {
        throw new NotFoundException({
          ok: false,
          error: WEDDING_NOT_FOUND,
          message: 'Wedding not found',
        });
      }
      throw error;
    }
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
