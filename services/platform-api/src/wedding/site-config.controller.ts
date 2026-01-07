import { Controller, Get, Post, Param, Query, Body, NotFoundException, BadRequestException } from '@nestjs/common';
import { WeddingService } from './wedding.service';
import { randomBytes } from 'crypto';
import type { ApiResponse, RenderConfig, VerifyPasscodeRequest, VerifyPasscodeResponse, DomainLookupResponse } from '../types';
import { INVALID_PASSCODE, WEDDING_NOT_FOUND, NOT_FOUND, VALIDATION_ERROR, DOMAIN_NOT_FOUND } from '../types';

/**
 * Public controller for wedding site rendering
 * No authentication required - these endpoints serve the public wedding sites
 */
@Controller('site-config')
export class SiteConfigController {
  constructor(private readonly weddingService: WeddingService) {}

  /**
   * Look up a wedding by custom domain
   * Returns the wedding slug and default URL for redirection
   * This allows wedding sites to route custom domain requests to the correct wedding
   */
  @Get('domain/lookup')
  async lookupByDomain(
    @Query('domain') domain: string,
  ): Promise<ApiResponse<DomainLookupResponse>> {
    if (!domain) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    const wedding = this.weddingService.getWeddingByCustomDomain(domain);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: DOMAIN_NOT_FOUND });
    }

    // Only return domain info if the domain is active/verified
    const domainResult = this.weddingService.getCustomDomain(wedding.id);
    if (!domainResult || !domainResult.customDomain || domainResult.customDomain.status !== 'active') {
      throw new NotFoundException({ ok: false, error: DOMAIN_NOT_FOUND });
    }

    return {
      ok: true,
      data: {
        slug: wedding.slug,
        defaultUrl: domainResult.defaultDomainUrl,
      },
    };
  }

  /**
   * Get render_config for a wedding by slug
   * This is the public endpoint that wedding sites use to fetch their configuration
   * No authentication required - the slug acts as the identifier
   */
  @Get(':slug')
  async getSiteConfig(
    @Param('slug') slug: string,
  ): Promise<ApiResponse<RenderConfig>> {
    const wedding = this.weddingService.getWeddingBySlug(slug);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Check if the wedding is active
    if (wedding.status !== 'active') {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    const renderConfig = this.weddingService.getRenderConfig(wedding.id);

    if (!renderConfig) {
      throw new NotFoundException({ ok: false, error: NOT_FOUND });
    }

    return { ok: true, data: renderConfig };
  }

  /**
   * Verify a passcode for a protected wedding site
   * Returns a session token if successful, which the client stores for persistence
   */
  @Post(':slug/verify-passcode')
  async verifyPasscode(
    @Param('slug') slug: string,
    @Body() body: VerifyPasscodeRequest,
  ): Promise<ApiResponse<VerifyPasscodeResponse>> {
    const wedding = this.weddingService.getWeddingBySlug(slug);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Check if the wedding is active
    if (wedding.status !== 'active') {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Check if passcode is required for this wedding
    if (!this.weddingService.isPasscodeRequired(slug)) {
      // Passcode not required, return valid without needing to check
      return {
        ok: true,
        data: { valid: true },
      };
    }

    if (!body.passcode) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    // Verify the passcode using timing-safe comparison
    const valid = await this.weddingService.verifyWeddingPasscode(slug, body.passcode);

    if (!valid) {
      return {
        ok: false,
        error: INVALID_PASSCODE,
      } as ApiResponse<VerifyPasscodeResponse>;
    }

    // Generate a session token for persistence
    // This token proves the visitor successfully entered the passcode
    const sessionToken = randomBytes(32).toString('hex');

    return {
      ok: true,
      data: {
        valid: true,
        sessionToken,
      },
    };
  }

  /**
   * Check if a wedding requires passcode protection
   */
  @Get(':slug/passcode-required')
  async isPasscodeRequired(
    @Param('slug') slug: string,
  ): Promise<ApiResponse<{ required: boolean }>> {
    const wedding = this.weddingService.getWeddingBySlug(slug);

    if (!wedding) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Check if the wedding is active
    if (wedding.status !== 'active') {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    const required = this.weddingService.isPasscodeRequired(slug);

    return { ok: true, data: { required } };
  }
}
