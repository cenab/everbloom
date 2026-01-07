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
  ConflictException,
} from '@nestjs/common';
import { GuestService } from './guest.service';
import { WeddingService } from '../wedding/wedding.service';
import { AuthService } from '../auth/auth.service';
import type {
  ApiResponse,
  Guest,
  GuestListResponse,
  CreateGuestRequest,
  UpdateGuestRequest,
  RsvpSummaryResponse,
} from '@wedding-bestie/shared';
import { GUEST_NOT_FOUND, GUEST_ALREADY_EXISTS } from '@wedding-bestie/shared';

@Controller('weddings/:weddingId/guests')
export class GuestController {
  constructor(
    private readonly guestService: GuestService,
    private readonly weddingService: WeddingService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Get all guests for a wedding
   */
  @Get()
  async listGuests(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
  ): Promise<ApiResponse<GuestListResponse>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const guests = this.guestService.getGuestsForWedding(weddingId);
    return {
      ok: true,
      data: {
        guests,
        total: guests.length,
      },
    };
  }

  /**
   * Get RSVP summary for a wedding
   * PRD: "Admin can view RSVP summary"
   */
  @Get('summary')
  async getRsvpSummary(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
  ): Promise<ApiResponse<RsvpSummaryResponse>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const summary = this.guestService.getGuestSummary(weddingId);
    const guests = this.guestService.getGuestsForWedding(weddingId);

    return {
      ok: true,
      data: {
        summary,
        guests,
      },
    };
  }

  /**
   * Create a new guest
   */
  @Post()
  async createGuest(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Body() body: CreateGuestRequest,
  ): Promise<ApiResponse<Guest>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    try {
      const guest = await this.guestService.createGuest(weddingId, body);
      return { ok: true, data: guest };
    } catch (error) {
      if (error instanceof Error && error.message === 'GUEST_ALREADY_EXISTS') {
        throw new ConflictException({
          ok: false,
          error: GUEST_ALREADY_EXISTS,
          message: 'A guest with this email already exists for this wedding',
        });
      }
      throw error;
    }
  }

  /**
   * Get a specific guest
   */
  @Get(':guestId')
  async getGuest(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Param('guestId') guestId: string,
  ): Promise<ApiResponse<Guest>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const guest = this.guestService.getGuest(guestId);

    if (!guest || guest.weddingId !== weddingId) {
      throw new NotFoundException({
        ok: false,
        error: GUEST_NOT_FOUND,
        message: 'Guest not found',
      });
    }

    return { ok: true, data: guest };
  }

  /**
   * Update a guest
   */
  @Put(':guestId')
  async updateGuest(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Param('guestId') guestId: string,
    @Body() body: UpdateGuestRequest,
  ): Promise<ApiResponse<Guest>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const guest = this.guestService.getGuest(guestId);
    if (!guest || guest.weddingId !== weddingId) {
      throw new NotFoundException({
        ok: false,
        error: GUEST_NOT_FOUND,
        message: 'Guest not found',
      });
    }

    const updated = await this.guestService.updateGuest(guestId, body);
    if (!updated) {
      throw new NotFoundException({
        ok: false,
        error: GUEST_NOT_FOUND,
        message: 'Guest not found',
      });
    }

    return { ok: true, data: updated };
  }

  /**
   * Delete a guest
   */
  @Delete(':guestId')
  async deleteGuest(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Param('guestId') guestId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const guest = this.guestService.getGuest(guestId);
    if (!guest || guest.weddingId !== weddingId) {
      throw new NotFoundException({
        ok: false,
        error: GUEST_NOT_FOUND,
        message: 'Guest not found',
      });
    }

    await this.guestService.deleteGuest(guestId);
    return { ok: true, data: { deleted: true } };
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
