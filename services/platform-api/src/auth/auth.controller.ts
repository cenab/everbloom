import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type {
  ApiResponse,
  MagicLinkRequestBody,
  MagicLinkRequestResponse,
  MagicLinkVerifyBody,
  MagicLinkVerifyResponse,
  MeResponse,
} from '@wedding-bestie/shared';
import { MAGIC_LINK_INVALID } from '@wedding-bestie/shared';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Request a magic link to be sent to the given email
   */
  @Post('request-link')
  @HttpCode(HttpStatus.OK)
  async requestLink(
    @Body() body: MagicLinkRequestBody,
  ): Promise<ApiResponse<MagicLinkRequestResponse>> {
    if (!body.email || typeof body.email !== 'string') {
      throw new BadRequestException('Email is required');
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      throw new BadRequestException('Invalid email format');
    }

    const result = await this.authService.requestMagicLink(body.email.toLowerCase().trim());
    return { ok: true, data: result };
  }

  /**
   * Verify a magic link token and create a session
   */
  @Post('verify-link')
  @HttpCode(HttpStatus.OK)
  async verifyLink(
    @Body() body: MagicLinkVerifyBody,
  ): Promise<ApiResponse<MagicLinkVerifyResponse>> {
    if (!body.token || typeof body.token !== 'string') {
      throw new BadRequestException('Token is required');
    }

    const session = await this.authService.verifyMagicLink(body.token);

    if (!session) {
      return { ok: false, error: MAGIC_LINK_INVALID };
    }

    return { ok: true, data: session };
  }

  /**
   * Get the current authenticated user
   */
  @Get('me')
  async me(
    @Headers('authorization') authHeader: string,
  ): Promise<ApiResponse<MeResponse>> {
    const token = this.extractBearerToken(authHeader);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const user = await this.authService.validateSession(token);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    return { ok: true, data: user };
  }

  /**
   * Logout - invalidate the current session
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Headers('authorization') authHeader: string,
  ): Promise<ApiResponse<{ message: string }>> {
    const token = this.extractBearerToken(authHeader);

    if (token) {
      await this.authService.logout(token);
    }

    return { ok: true, data: { message: 'Logged out successfully' } };
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
