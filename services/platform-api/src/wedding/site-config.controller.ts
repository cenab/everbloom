import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { WeddingService } from './wedding.service';
import type { ApiResponse, RenderConfig } from '@wedding-bestie/shared';

/**
 * Public controller for wedding site rendering
 * No authentication required - these endpoints serve the public wedding sites
 */
@Controller('site-config')
export class SiteConfigController {
  constructor(private readonly weddingService: WeddingService) {}

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
      throw new NotFoundException('Wedding not found');
    }

    // Check if the wedding is active
    if (wedding.status !== 'active') {
      throw new NotFoundException('Wedding not found');
    }

    const renderConfig = this.weddingService.getRenderConfig(wedding.id);

    if (!renderConfig) {
      throw new NotFoundException('Site configuration not found');
    }

    return { ok: true, data: renderConfig };
  }
}
