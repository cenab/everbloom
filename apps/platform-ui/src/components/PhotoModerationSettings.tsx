import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../lib/auth';
import type {
  Wedding,
  PhotoMetadata,
  PhotoListResponse,
  PhotoModerationStatus,
  UpdatePhotoModerationResponse,
  ModeratePhotoResponse,
  ApiResponse,
} from '../types';

interface PhotoModerationSettingsProps {
  wedding: Wedding;
  onWeddingChanged?: () => void;
}

/**
 * Photo moderation settings component for admin dashboard.
 * Allows admins to enable/disable moderation and approve/reject photos.
 * PRD: "Admin can enable photo moderation", "Admin can approve or reject guest photos"
 */
export function PhotoModerationSettings({
  wedding,
  onWeddingChanged,
}: PhotoModerationSettingsProps) {
  const [moderationRequired, setModerationRequired] = useState(
    wedding.photoModerationConfig?.moderationRequired ?? false
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PhotoModerationStatus>('pending');
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [moderatingPhotoId, setModeratingPhotoId] = useState<string | null>(null);

  const hasChanges = moderationRequired !== (wedding.photoModerationConfig?.moderationRequired ?? false);

  const loadPhotos = useCallback(async (status: PhotoModerationStatus) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/photos?status=${status}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<PhotoListResponse> = await response.json();

      if (data.ok) {
        setPhotos(data.data.photos);
      } else {
        setError('Unable to load photos. Please try again.');
      }
    } catch {
      setError('Unable to load photos. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [wedding.id]);

  useEffect(() => {
    loadPhotos(activeTab);
  }, [activeTab, loadPhotos]);

  useEffect(() => {
    setModerationRequired(wedding.photoModerationConfig?.moderationRequired ?? false);
  }, [wedding.id]);

  const handleSaveModerationSettings = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/photos/moderation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ moderationRequired }),
      });

      const data: ApiResponse<UpdatePhotoModerationResponse> = await response.json();

      if (data.ok) {
        setSuccessMessage('Moderation settings updated successfully');
        onWeddingChanged?.();
      } else {
        setError('Unable to update moderation settings. Please try again.');
      }
    } catch {
      setError('Unable to update moderation settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleModerate = async (photoId: string, status: 'approved' | 'rejected') => {
    setModeratingPhotoId(photoId);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/photos/${photoId}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data: ApiResponse<ModeratePhotoResponse> = await response.json();

      if (data.ok) {
        // Remove the photo from the current list since it changed status
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      } else {
        setError('Unable to moderate photo. Please try again.');
      }
    } catch {
      setError('Unable to moderate photo. Please try again.');
    } finally {
      setModeratingPhotoId(null);
    }
  };

  const handleRemove = async (photoId: string) => {
    setModeratingPhotoId(photoId);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/photos/${photoId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<{ removed: boolean }> = await response.json();

      if (data.ok) {
        // Remove the photo from the list
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      } else {
        setError('Unable to remove photo. Please try again.');
      }
    } catch {
      setError('Unable to remove photo. Please try again.');
    } finally {
      setModeratingPhotoId(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl text-neutral-800">Photo moderation</h1>
        <p className="text-neutral-500 mt-1">
          Review and manage photos uploaded by your guests.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {successMessage}
        </div>
      )}

      {/* Moderation Settings Toggle */}
      <div className="mb-8 p-4 rounded-lg border border-neutral-200 bg-neutral-50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-neutral-800 font-medium">Require moderation</h3>
            <p className="text-sm text-neutral-500 mt-1">
              When enabled, new photo uploads will require your approval before appearing in the gallery.
            </p>
          </div>

          <button
            onClick={() => setModerationRequired(!moderationRequired)}
            className={`
              relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
              transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              ${moderationRequired ? 'bg-primary-500' : 'bg-neutral-300'}
            `}
            role="switch"
            aria-checked={moderationRequired}
          >
            <span
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-neutral-50 shadow ring-0
                transition duration-200 ease-in-out
                ${moderationRequired ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>

        {hasChanges && (
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={handleSaveModerationSettings}
              disabled={isSaving}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save settings'}
            </button>
            <button
              onClick={() => setModerationRequired(wedding.photoModerationConfig?.moderationRequired ?? false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex border-b border-neutral-200">
          <TabButton
            active={activeTab === 'pending'}
            onClick={() => setActiveTab('pending')}
          >
            Pending review
          </TabButton>
          <TabButton
            active={activeTab === 'approved'}
            onClick={() => setActiveTab('approved')}
          >
            Approved
          </TabButton>
          <TabButton
            active={activeTab === 'rejected'}
            onClick={() => setActiveTab('rejected')}
          >
            Rejected
          </TabButton>
        </div>
      </div>

      {/* Photo List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-neutral-500">Loading photos...</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-10 px-6 bg-neutral-50 border border-neutral-200 rounded-lg">
          <div className="w-12 h-12 mx-auto rounded-full bg-primary-100 flex items-center justify-center mb-4">
            <CameraIcon className="w-6 h-6 text-primary-600" />
          </div>
          <h3 className="text-lg text-neutral-800 mb-2">
            {activeTab === 'pending'
              ? 'No photos pending review'
              : activeTab === 'approved'
              ? 'No approved photos'
              : 'No rejected photos'}
          </h3>
          <p className="text-neutral-500 max-w-sm mx-auto">
            {activeTab === 'pending'
              ? 'New uploads will appear here when moderation is enabled.'
              : activeTab === 'approved'
              ? 'Approved photos will be visible to guests.'
              : 'Rejected photos are hidden from guests.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              status={activeTab}
              isModrating={moderatingPhotoId === photo.id}
              onApprove={() => handleModerate(photo.id, 'approved')}
              onReject={() => handleModerate(photo.id, 'rejected')}
              onRemove={() => handleRemove(photo.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 text-sm font-medium border-b-2 -mb-[2px] transition-colors
        ${active
          ? 'border-primary-500 text-primary-600'
          : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'}
      `}
    >
      {children}
    </button>
  );
}

interface PhotoCardProps {
  photo: PhotoMetadata;
  status: PhotoModerationStatus;
  isModrating: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRemove: () => void;
}

function PhotoCard({ photo, status, isModrating, onApprove, onReject, onRemove }: PhotoCardProps) {
  return (
    <div className="p-4 rounded-lg border border-neutral-200 bg-neutral-50">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-neutral-800 font-medium truncate">{photo.fileName}</p>
          <p className="text-sm text-neutral-500 mt-1">
            {formatFileSize(photo.fileSize)} | {photo.contentType}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Uploaded {formatDateTime(photo.uploadedAt)}
          </p>
          {photo.moderatedAt && (
            <p className="text-xs text-neutral-400">
              Moderated {formatDateTime(photo.moderatedAt)}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {status === 'pending' && (
            <>
              <button
                onClick={onApprove}
                disabled={isModrating}
                className="px-3 py-1.5 text-sm bg-accent-500 text-neutral-50 rounded hover:bg-accent-600 disabled:opacity-50 transition-colors"
              >
                {isModrating ? '...' : 'Approve'}
              </button>
              <button
                onClick={onReject}
                disabled={isModrating}
                className="px-3 py-1.5 text-sm bg-neutral-200 text-neutral-700 rounded hover:bg-neutral-300 disabled:opacity-50 transition-colors"
              >
                {isModrating ? '...' : 'Reject'}
              </button>
            </>
          )}

          {status === 'approved' && (
            <button
              onClick={onRemove}
              disabled={isModrating}
              className="px-3 py-1.5 text-sm bg-primary-500 text-neutral-50 rounded hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {isModrating ? '...' : 'Remove'}
            </button>
          )}

          {status === 'rejected' && (
            <>
              <button
                onClick={onApprove}
                disabled={isModrating}
                className="px-3 py-1.5 text-sm bg-accent-500 text-neutral-50 rounded hover:bg-accent-600 disabled:opacity-50 transition-colors"
              >
                {isModrating ? '...' : 'Approve'}
              </button>
              <button
                onClick={onRemove}
                disabled={isModrating}
                className="px-3 py-1.5 text-sm bg-neutral-200 text-neutral-700 rounded hover:bg-neutral-300 disabled:opacity-50 transition-colors"
              >
                {isModrating ? '...' : 'Delete'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes)) {
    return 'Unknown size';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function ChevronLeftIcon({ className }: { className?: string }) {
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
        d="M15.75 19.5L8.25 12l7.5-7.5"
      />
    </svg>
  );
}

function CameraIcon({ className }: { className?: string }) {
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
        d="M6.75 7.5h10.5M6.75 7.5a2.25 2.25 0 00-2.25 2.25v7.5A2.25 2.25 0 006.75 19.5h10.5A2.25 2.25 0 0019.5 17.25v-7.5A2.25 2.25 0 0017.25 7.5m-10.5 0l1.5-2.25h6l1.5 2.25m-6.75 6a3 3 0 106 0 3 3 0 00-6 0z"
      />
    </svg>
  );
}
