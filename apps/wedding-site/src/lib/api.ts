import type {
  RenderConfig,
  ApiResponse,
  RsvpViewData,
  RsvpSubmitRequest,
  RsvpSubmitResponse,
  SubmitGuestbookMessageRequest,
  SubmitGuestbookMessageResponse,
} from '../types';

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

/**
 * Fetch RSVP view data by token
 * Returns guest info and wedding details for the RSVP form
 */
export async function fetchRsvpView(token: string): Promise<{
  data: RsvpViewData | null;
  error: string | null;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/rsvp/view?token=${encodeURIComponent(token)}`);

    const result: ApiResponse<RsvpViewData> = await response.json();

    if (!result.ok) {
      return { data: null, error: result.error };
    }

    return { data: result.data, error: null };
  } catch (error) {
    console.error('Error fetching RSVP view:', error);
    return { data: null, error: 'NETWORK_ERROR' };
  }
}

/**
 * Submit RSVP response
 */
export async function submitRsvp(request: RsvpSubmitRequest): Promise<{
  data: RsvpSubmitResponse | null;
  error: string | null;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/rsvp/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const result: ApiResponse<RsvpSubmitResponse> = await response.json();

    if (!result.ok) {
      return { data: null, error: result.error };
    }

    return { data: result.data, error: null };
  } catch (error) {
    console.error('Error submitting RSVP:', error);
    return { data: null, error: 'NETWORK_ERROR' };
  }
}

/**
 * Submit a guestbook message
 * Public endpoint - no auth required
 */
export async function submitGuestbookMessage(
  slug: string,
  request: SubmitGuestbookMessageRequest,
): Promise<{
  data: SubmitGuestbookMessageResponse | null;
  error: string | null;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/guestbook/${slug}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const result: ApiResponse<SubmitGuestbookMessageResponse> = await response.json();

    if (!result.ok) {
      return { data: null, error: result.error };
    }

    return { data: result.data, error: null };
  } catch (error) {
    console.error('Error submitting guestbook message:', error);
    return { data: null, error: 'NETWORK_ERROR' };
  }
}
