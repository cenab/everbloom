import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../lib/auth';
import type { ApiResponse, PreviewStatus, PublishDraftResponse, DiscardDraftResponse } from '../types';

interface PreviewBannerProps {
  weddingId: string;
  weddingSlug: string;
}

/**
 * Preview banner component that shows when there are unpublished draft changes.
 * PRD: "Admin can preview site before publishing"
 * PRD: "Admin can publish or discard changes"
 */
export function PreviewBanner({ weddingId, weddingSlug }: PreviewBannerProps) {
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchPreviewStatus = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/preview/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<PreviewStatus> = await response.json();

      if (data.ok) {
        setPreviewStatus(data.data);
      }
    } catch {
      // Silent fail - banner just won't show
    } finally {
      setIsLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    fetchPreviewStatus();
  }, [fetchPreviewStatus]);

  // Auto-refresh status every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchPreviewStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchPreviewStatus]);

  const handlePublish = async () => {
    setIsPublishing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/preview/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data: ApiResponse<PublishDraftResponse> = await response.json();

      if (data.ok) {
        setSuccessMessage('Changes published successfully');
        setPreviewStatus({ hasDraftChanges: false });
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError('Failed to publish changes');
      }
    } catch {
      setError('Failed to publish changes');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDiscard = async () => {
    if (!confirm('Are you sure you want to discard all unpublished changes? This cannot be undone.')) {
      return;
    }

    setIsDiscarding(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/preview/discard`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data: ApiResponse<DiscardDraftResponse> = await response.json();

      if (data.ok) {
        setSuccessMessage('Changes discarded');
        setPreviewStatus({ hasDraftChanges: false });
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError('Failed to discard changes');
      }
    } catch {
      setError('Failed to discard changes');
    } finally {
      setIsDiscarding(false);
    }
  };

  const handlePreview = () => {
    // Open preview in a new tab with a preview query param
    window.open(`/w/${weddingSlug}?preview=true`, '_blank');
  };

  // Don't show anything while loading or if no draft changes
  if (isLoading || !previewStatus?.hasDraftChanges) {
    // Show success message even when no draft changes (after publish/discard)
    if (successMessage) {
      return (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <CheckIcon className="w-5 h-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <PencilIcon className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-amber-800">
              You have unpublished changes
            </h3>
            <p className="text-sm text-amber-600 mt-0.5">
              Preview your changes before publishing them to your live site.
              {previewStatus.draftUpdatedAt && (
                <span className="block text-amber-500 text-xs mt-1">
                  Last edited {formatRelativeTime(previewStatus.draftUpdatedAt)}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:flex-shrink-0">
          <button
            onClick={handlePreview}
            className="px-3 py-1.5 text-sm border border-amber-300 text-amber-700 rounded-md hover:bg-amber-100 transition-colors"
          >
            Preview
          </button>
          <button
            onClick={handleDiscard}
            disabled={isDiscarding || isPublishing}
            className="px-3 py-1.5 text-sm border border-neutral-300 text-neutral-600 rounded-md hover:bg-neutral-100 transition-colors disabled:opacity-50"
          >
            {isDiscarding ? 'Discarding...' : 'Discard'}
          </button>
          <button
            onClick={handlePublish}
            disabled={isPublishing || isDiscarding}
            className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {isPublishing ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mt-3 text-sm text-green-600 flex items-center gap-1">
          <CheckIcon className="w-4 h-4" />
          {successMessage}
        </div>
      )}
    </div>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

/**
 * Format a date string as a relative time (e.g., "5 minutes ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}
