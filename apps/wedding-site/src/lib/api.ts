import type { RenderConfig, ApiResponse } from '@wedding-bestie/shared';

/**
 * Platform API base URL
 * In production, this would be the deployed platform-api URL
 */
const API_BASE_URL = import.meta.env.PUBLIC_PLATFORM_API_URL || 'http://localhost:3001/api';

/**
 * Fetch render_config for a wedding site by slug
 * This is the only data fetch needed for rendering - no joins, no multiple queries
 */
export async function fetchSiteConfig(slug: string): Promise<RenderConfig | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/site-config/${slug}`);

    if (!response.ok) {
      console.error(`Failed to fetch site config for ${slug}: ${response.status}`);
      return null;
    }

    const result: ApiResponse<RenderConfig> = await response.json();

    if (!result.ok) {
      console.error(`API error for ${slug}: ${result.error}`);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error(`Error fetching site config for ${slug}:`, error);
    return null;
  }
}
