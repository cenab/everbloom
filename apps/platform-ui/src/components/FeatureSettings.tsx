import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../lib/auth';
import type {
  FeatureFlag,
  Wedding,
  UpdateFeaturesResponse,
  ApiResponse,
  PhotoMetadata,
  PhotoListResponse,
} from '@wedding-bestie/shared';

interface FeatureSettingsProps {
  wedding: Wedding;
  onBack: () => void;
  onFeaturesChanged?: () => void;
}

/**
 * Feature human-readable descriptions
 */
const FEATURE_INFO: Record<FeatureFlag, { label: string; description: string }> = {
  RSVP: {
    label: 'RSVP',
    description: 'Allow guests to respond to your invitation online',
  },
  CALENDAR_INVITE: {
    label: 'Calendar invites',
    description: 'Let guests add your wedding to their calendar',
  },
  PHOTO_UPLOAD: {
    label: 'Photo sharing',
    description: 'Allow guests to upload photos from your celebration',
  },
  ANNOUNCEMENT_BANNER: {
    label: 'Announcement banner',
    description: 'Display important messages at the top of your site',
  },
  FAQ_SECTION: {
    label: 'FAQ section',
    description: 'Answer common questions for your guests',
  },
  PASSCODE_SITE: {
    label: 'Site passcode',
    description: 'Require a passcode to view your wedding site',
  },
};

/**
 * Features available by plan tier
 */
const PLAN_AVAILABLE_FEATURES: Record<string, FeatureFlag[]> = {
  starter: ['RSVP', 'CALENDAR_INVITE'],
  premium: [
    'RSVP',
    'CALENDAR_INVITE',
    'PHOTO_UPLOAD',
    'ANNOUNCEMENT_BANNER',
    'FAQ_SECTION',
    'PASSCODE_SITE',
  ],
};

/**
 * Feature settings component for admin dashboard.
 * Allows admins to enable/disable features for their wedding.
 * PRD: "Disabling RSVP hides RSVP on public site"
 */
export function FeatureSettings({
  wedding,
  onBack,
  onFeaturesChanged,
}: FeatureSettingsProps) {
  const [features, setFeatures] = useState<Record<FeatureFlag, boolean>>(wedding.features);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [photosError, setPhotosError] = useState<string | null>(null);
  const [isPhotosLoading, setIsPhotosLoading] = useState(false);

  const availableFeatures = PLAN_AVAILABLE_FEATURES[wedding.planId] || [];
  const showPhotoUploads = availableFeatures.includes('PHOTO_UPLOAD') && wedding.features.PHOTO_UPLOAD;

  // Check if there are unsaved changes
  const hasChanges = Object.keys(features).some(
    (key) => features[key as FeatureFlag] !== wedding.features[key as FeatureFlag]
  );

  useEffect(() => {
    // Reset features if wedding changes
    setFeatures(wedding.features);
    setPhotos([]);
    setPhotosError(null);
    setIsPhotosLoading(false);
  }, [wedding.id]);

  const loadPhotos = useCallback(async () => {
    setIsPhotosLoading(true);
    setPhotosError(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/photos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<PhotoListResponse> = await response.json();

      if (data.ok) {
        setPhotos(data.data.photos);
      } else {
        setPhotosError('Unable to load photo uploads. Please try again.');
      }
    } catch {
      setPhotosError('Unable to load photo uploads. Please try again.');
    } finally {
      setIsPhotosLoading(false);
    }
  }, [wedding.id]);

  useEffect(() => {
    if (showPhotoUploads) {
      loadPhotos();
    }
  }, [showPhotoUploads, loadPhotos]);

  const handleToggle = (flag: FeatureFlag) => {
    setFeatures((prev) => ({
      ...prev,
      [flag]: !prev[flag],
    }));
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    if (!hasChanges) {
      onBack();
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/features`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ features }),
      });

      const data: ApiResponse<UpdateFeaturesResponse> = await response.json();

      if (data.ok) {
        setSuccessMessage('Features updated successfully');
        onFeaturesChanged?.();
        // Wait a moment so user sees the success message
        setTimeout(() => {
          onBack();
        }, 1000);
      } else {
        setError('Unable to update features. Please try again.');
      }
    } catch {
      setError('Unable to update features. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-neutral-600 hover:text-neutral-800 mb-6"
      >
        <ChevronLeftIcon className="w-4 h-4" />
        Back to dashboard
      </button>

      <div className="mb-8">
        <h1 className="text-2xl text-neutral-800">Site features</h1>
        <p className="text-neutral-500 mt-1">
          Choose which features to enable on your wedding site.
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

      <div className="space-y-4 mb-8">
        {(Object.keys(FEATURE_INFO) as FeatureFlag[]).map((flag) => {
          const info = FEATURE_INFO[flag];
          const isAvailable = availableFeatures.includes(flag);
          const isEnabled = features[flag];

          return (
            <FeatureToggle
              key={flag}
              label={info.label}
              description={info.description}
              enabled={isEnabled}
              available={isAvailable}
              planRequired={!isAvailable ? 'Premium' : undefined}
              onChange={() => handleToggle(flag)}
            />
          );
        })}
      </div>

      {showPhotoUploads && (
        <PhotoUploadsSection
          photos={photos}
          isLoading={isPhotosLoading}
          error={photosError}
          onRefresh={loadPhotos}
        />
      )}

      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save changes'}
        </button>
        <button onClick={onBack} className="btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}

interface PhotoUploadsSectionProps {
  photos: PhotoMetadata[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function PhotoUploadsSection({
  photos,
  isLoading,
  error,
  onRefresh,
}: PhotoUploadsSectionProps) {
  return (
    <div className="mb-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl text-neutral-800">Photo uploads</h2>
          <p className="text-neutral-500 mt-1">
            See the photos your guests have shared.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="text-sm text-neutral-600 hover:text-neutral-800"
          type="button"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-primary-50 border border-primary-200 rounded-lg text-primary-800">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-neutral-500">Loading photo uploads...</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-10 px-6 bg-neutral-50 border border-neutral-200 rounded-lg">
          <div className="w-12 h-12 mx-auto rounded-full bg-primary-100 flex items-center justify-center mb-4">
            <CameraIcon className="w-6 h-6 text-primary-600" />
          </div>
          <h3 className="text-lg text-neutral-800 mb-2">No photos yet</h3>
          <p className="text-neutral-500 max-w-sm mx-auto">
            Once guests start uploading, their photos will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50 text-sm text-neutral-600">
            {photos.length} uploads
          </div>
          <ul className="divide-y divide-neutral-200">
            {photos.map((photo) => (
              <li key={photo.id} className="px-4 py-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-neutral-800 font-medium">{photo.fileName}</p>
                  <p className="text-sm text-neutral-500">
                    {formatFileSize(photo.fileSize)} | {photo.contentType}
                  </p>
                </div>
                <span className="text-sm text-neutral-500">
                  {formatDateTime(photo.uploadedAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface FeatureToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  available: boolean;
  planRequired?: string;
  onChange: () => void;
}

function FeatureToggle({
  label,
  description,
  enabled,
  available,
  planRequired,
  onChange,
}: FeatureToggleProps) {
  return (
    <div
      className={`
        p-4 rounded-lg border transition-colors
        ${available
          ? 'border-neutral-200 bg-neutral-50'
          : 'border-neutral-100 bg-neutral-100/50 opacity-60'
        }
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-neutral-800 font-medium">{label}</h3>
            {!available && planRequired && (
              <span className="text-xs text-neutral-500 bg-neutral-200 px-2 py-0.5 rounded">
                {planRequired} plan
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500 mt-1">{description}</p>
        </div>

        <button
          onClick={onChange}
          disabled={!available}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
            transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
            ${!available ? 'cursor-not-allowed' : ''}
            ${enabled && available ? 'bg-primary-500' : 'bg-neutral-300'}
          `}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-neutral-50 shadow ring-0
              transition duration-200 ease-in-out
              ${enabled ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
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
