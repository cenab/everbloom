// API client for wedding site

import type { RenderConfig, RsvpViewData, ApiResponse } from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchSiteConfig(slug: string): Promise<RenderConfig | null> {
  try {
    const response = await fetchJson<ApiResponse<RenderConfig>>(
      `${API_BASE}/site-config?slug=${encodeURIComponent(slug)}`
    );
    if (response.ok) {
      return response.data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchRsvpView(token: string): Promise<RsvpViewData | null> {
  try {
    const response = await fetchJson<ApiResponse<RsvpViewData>>(
      `${API_BASE}/rsvp-view?token=${encodeURIComponent(token)}`
    );
    if (response.ok) {
      return response.data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function submitRsvp(data: {
  token: string;
  rsvpStatus: string;
  partySize: number;
  dietaryNotes?: string;
  plusOneGuests?: { name: string; dietaryNotes?: string }[];
  mealOptionId?: string;
  photoOptOut?: boolean;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetchJson<ApiResponse<{ message: string }>>(
      `${API_BASE}/rsvp-submit`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return { success: response.ok, message: response.ok ? response.data.message : undefined };
  } catch {
    return { success: false };
  }
}

export async function submitGuestbookMessage(
  slug: string,
  guestName: string,
  message: string
): Promise<{ success: boolean }> {
  try {
    const response = await fetchJson<ApiResponse<unknown>>(
      `${API_BASE}/guestbook-submit`,
      {
        method: 'POST',
        body: JSON.stringify({ slug, guestName, message }),
      }
    );
    return { success: response.ok };
  } catch {
    return { success: false };
  }
}

export async function submitMusicRequest(
  slug: string,
  songTitle: string,
  artistName: string,
  requesterName?: string
): Promise<{ success: boolean }> {
  try {
    const response = await fetchJson<ApiResponse<unknown>>(
      `${API_BASE}/music-request`,
      {
        method: 'POST',
        body: JSON.stringify({ slug, songTitle, artistName, requesterName }),
      }
    );
    return { success: response.ok };
  } catch {
    return { success: false };
  }
}

export async function requestPhotoUploadToken(data: {
  slug: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}): Promise<{ uploadId: string; uploadUrl: string; expiresAt: string } | null> {
  try {
    const response = await fetchJson<ApiResponse<{ uploadId: string; uploadUrl: string; expiresAt: string }>>(
      `${API_BASE}/photo-upload-token`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    if (response.ok) {
      return response.data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function completePhotoUpload(data: {
  uploadId: string;
  uploaderName?: string;
  uploaderEmail?: string;
}): Promise<{ id: string; fileName: string; moderationStatus: string; uploadedAt: string } | null> {
  try {
    const response = await fetchJson<
      ApiResponse<{ id: string; fileName: string; moderationStatus: string; uploadedAt: string }>
    >(`${API_BASE}/photo-metadata`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.ok) {
      return response.data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function verifyPasscode(
  slug: string,
  passcode: string
): Promise<{ valid: boolean; sessionToken?: string }> {
  try {
    const response = await fetchJson<ApiResponse<{ valid: boolean; sessionToken?: string }>>(
      `${API_BASE}/passcode-verify`,
      {
        method: 'POST',
        body: JSON.stringify({ slug, passcode }),
      }
    );
    if (response.ok) {
      return response.data;
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}
