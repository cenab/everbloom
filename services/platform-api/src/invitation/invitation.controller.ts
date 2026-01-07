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
} from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { WeddingService } from '../wedding/wedding.service';
import { AuthService } from '../auth/auth.service';
import type {
  SendInvitationsRequest,
  SendInvitationsResponse,
  EmailOutbox,
  ApiResponse,
} from '@wedding-bestie/shared';
import { NO_GUESTS_SELECTED } from '@wedding-bestie/shared';

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
   * Validate auth token and verify user owns the wedding
   */
  private async requireWeddingOwner(
    authHeader: string | undefined,
    weddingId: string,
  ) {
    const token = this.extractBearerToken(authHeader);
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const user = await this.authService.validateSession(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const wedding = this.weddingService.getWedding(weddingId);
    if (!wedding || wedding.userId !== user.id) {
      throw new NotFoundException('Wedding not found');
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
