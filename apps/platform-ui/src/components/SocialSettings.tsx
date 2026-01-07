import { useState, useEffect, useRef } from 'react';
import { getAuthToken } from '../lib/auth';
import type { Wedding, ApiResponse, SocialConfig, UpdateSocialConfigResponse } from '../types';

interface SocialSettingsProps {
  wedding: Wedding;
  onBack: () => void;
  onSocialConfigChanged: () => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Admin settings component for customizing social sharing / OG image
 * PRD: "Admin can customize share image"
 */
export function SocialSettings({
  wedding,
  onBack,
  onSocialConfigChanged,
}: SocialSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Current social config from wedding
  const [socialConfig, setSocialConfig] = useState<SocialConfig>(wedding.socialConfig || {});

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current social config
  useEffect(() => {
    fetchSocialConfig();
  }, [wedding.id]);

  const fetchSocialConfig = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/social-config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<SocialConfig> = await response.json();

      if (data.ok) {
        setSocialConfig(data.data);
      }
    } catch {
      // Use existing config from wedding
      setSocialConfig(wedding.socialConfig || {});
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please select a JPEG, PNG, or WebP image.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('Image must be less than 5MB.');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const token = getAuthToken();

      // Convert file to base64 data URL
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      // Update social config with the image
      // For now, we'll use a data URL. In production, this would go through
      // a proper signed URL upload flow similar to gallery photos.
      const updatedConfig: SocialConfig = {
        ogImageUrl: dataUrl,
        ogImageFileName: selectedFile.name,
        ogImageContentType: selectedFile.type,
        ogImageUploadedAt: new Date().toISOString(),
      };

      const response = await fetch(`/api/weddings/${wedding.id}/social-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ socialConfig: updatedConfig }),
      });

      const data: ApiResponse<UpdateSocialConfigResponse> = await response.json();

      if (data.ok) {
        setSocialConfig(updatedConfig);
        setSelectedFile(null);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
        setSaveSuccess(true);
        onSocialConfigChanged();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError('error' in data ? data.error : 'Failed to upload image');
      }
    } catch {
      setError('Failed to upload image');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    setError(null);

    try {
      const token = getAuthToken();

      const response = await fetch(`/api/weddings/${wedding.id}/social-config/og-image`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<UpdateSocialConfigResponse> = await response.json();

      if (data.ok) {
        setSocialConfig({});
        onSocialConfigChanged();
      } else {
        setError('error' in data ? data.error : 'Failed to remove image');
      }
    } catch {
      setError('Failed to remove image');
    } finally {
      setIsRemoving(false);
    }
  };

  const cancelSelection = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-500">Loading social settings...</p>
      </div>
    );
  }

  const hasCurrentImage = !!socialConfig.ogImageUrl;
  const displayImageUrl = previewUrl || socialConfig.ogImageUrl;

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
        <h1 className="text-2xl text-neutral-800">Social sharing image</h1>
        <p className="text-neutral-500 mt-1">
          Customize the image that appears when your wedding site is shared on social media.
        </p>
      </div>

      <div className="max-w-xl space-y-6">
        {/* Current or Preview Image */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-3">
            {selectedFile ? 'Preview' : hasCurrentImage ? 'Current image' : 'No image set'}
          </label>

          {displayImageUrl ? (
            <div className="relative">
              <div className="aspect-[1.91/1] w-full rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100">
                <img
                  src={displayImageUrl}
                  alt="Social sharing preview"
                  className="w-full h-full object-cover"
                />
              </div>
              {hasCurrentImage && !selectedFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-neutral-500">
                  <span>{socialConfig.ogImageFileName}</span>
                  {socialConfig.ogImageUploadedAt && (
                    <>
                      <span>-</span>
                      <span>
                        Uploaded {new Date(socialConfig.ogImageUploadedAt).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-[1.91/1] w-full rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center">
              <div className="text-center">
                <ImageIcon className="w-12 h-12 text-neutral-400 mx-auto mb-2" />
                <p className="text-neutral-500">No custom image</p>
                <p className="text-sm text-neutral-400 mt-1">
                  A default image will be used
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Recommended dimensions */}
        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
          <p className="text-sm text-neutral-600">
            <strong>Recommended:</strong> 1200 x 630 pixels (1.91:1 ratio).
            This is the optimal size for Facebook, Twitter, and LinkedIn previews.
          </p>
        </div>

        {/* File Input */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            id="og-image-input"
          />

          {selectedFile ? (
            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={isSaving}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Uploading...' : 'Save image'}
              </button>
              <button
                onClick={cancelSelection}
                disabled={isSaving}
                className="px-4 py-2 text-neutral-600 hover:text-neutral-800"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <label
                htmlFor="og-image-input"
                className="btn-primary cursor-pointer inline-block"
              >
                {hasCurrentImage ? 'Change image' : 'Upload image'}
              </label>
              {hasCurrentImage && (
                <button
                  onClick={handleRemove}
                  disabled={isRemoving}
                  className="px-4 py-2 text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  {isRemoving ? 'Removing...' : 'Remove image'}
                </button>
              )}
            </div>
          )}

          <p className="text-sm text-neutral-500 mt-2">
            JPEG, PNG, or WebP. Max 5MB.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Success message */}
        {saveSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            Social sharing image saved successfully
          </div>
        )}
      </div>
    </div>
  );
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

function ImageIcon({ className }: { className?: string }) {
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
        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  );
}
