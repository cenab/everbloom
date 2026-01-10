import { useEffect, useState } from 'react';
import { getAuthToken } from '../lib/auth';
import type {
  GalleryPhoto,
  GalleryConfig,
  ApiResponse,
  RenderConfig,
  UpdateGalleryResponse,
  Wedding,
} from '../types';

interface GallerySettingsProps {
  wedding: Wedding;
  onBack: () => void;
  onGalleryChanged?: () => void;
}

const DEFAULT_GALLERY: GalleryConfig = {
  photos: [],
};

/**
 * Gallery settings for admin-curated photos.
 * PRD: "Admin can upload curated photos"
 */
export function GallerySettings({
  wedding,
  onBack,
  onGalleryChanged,
}: GallerySettingsProps) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [initialPhotos, setInitialPhotos] = useState<GalleryPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Track changes by comparing stringified arrays
  const hasChanges = JSON.stringify(photos) !== JSON.stringify(initialPhotos);

  useEffect(() => {
    const fetchGallery = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = getAuthToken();
        const response = await fetch(`/api/weddings/${wedding.id}/render-config`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data: ApiResponse<RenderConfig> = await response.json();

        if (data.ok) {
          const currentGallery = data.data.gallery ?? DEFAULT_GALLERY;
          // Sort by order for display
          const sortedPhotos = [...currentGallery.photos].sort((a, b) => a.order - b.order);
          setPhotos(sortedPhotos);
          setInitialPhotos(sortedPhotos);
        } else {
          setPhotos([]);
          setInitialPhotos([]);
        }
      } catch {
        setPhotos([]);
        setInitialPhotos([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGallery();
  }, [wedding.id]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);

    const newPhotos: GalleryPhoto[] = [];

    for (const file of Array.from(files)) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} is not an image file.`);
        continue;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }

      // Create a temporary photo object
      // In production, this would upload to storage and get a real URL
      const newPhoto: GalleryPhoto = {
        id: `gallery-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        caption: '',
        order: photos.length + newPhotos.length,
        url: URL.createObjectURL(file),
        uploadedAt: new Date().toISOString(),
      };

      newPhotos.push(newPhoto);
    }

    if (newPhotos.length > 0) {
      setPhotos([...photos, ...newPhotos]);
      setSuccessMessage(`Added ${newPhotos.length} photo${newPhotos.length > 1 ? 's' : ''}.`);
    }

    setIsUploading(false);
    // Reset the input
    e.target.value = '';
  };

  const handleUpdateCaption = (index: number, caption: string) => {
    const updated = [...photos];
    updated[index] = { ...updated[index], caption };
    setPhotos(updated);
    setSuccessMessage(null);
  };

  const handleDeletePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    // Re-order remaining items
    const reordered = updated.map((photo, i) => ({ ...photo, order: i }));
    setPhotos(reordered);
    setSuccessMessage(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...photos];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    // Update order values
    const reordered = updated.map((photo, i) => ({ ...photo, order: i }));
    setPhotos(reordered);
    setSuccessMessage(null);
  };

  const handleMoveDown = (index: number) => {
    if (index === photos.length - 1) return;
    const updated = [...photos];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    // Update order values
    const reordered = updated.map((photo, i) => ({ ...photo, order: i }));
    setPhotos(reordered);
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/gallery`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gallery: {
            photos: photos.map((photo, index) => ({
              id: photo.id,
              fileName: photo.fileName,
              contentType: photo.contentType,
              fileSize: photo.fileSize,
              caption: photo.caption?.trim() || undefined,
              order: index,
              url: photo.url,
              uploadedAt: photo.uploadedAt,
            })),
          },
        }),
      });

      const data: ApiResponse<UpdateGalleryResponse> = await response.json();

      if (data.ok) {
        setSuccessMessage('Gallery updated successfully.');
        setInitialPhotos(photos);
        onGalleryChanged?.();
        setTimeout(() => {
          onBack();
        }, 1000);
      } else {
        setError('Unable to update the gallery. Please try again.');
      }
    } catch {
      setError('Unable to update the gallery. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl text-neutral-800">Photo gallery</h1>
        <p className="text-neutral-500 mt-1">
          Upload curated photos to showcase on your wedding site.
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
        {photos.length === 0 ? (
          <div className="text-center py-8 bg-neutral-50 border border-neutral-200 rounded-lg">
            <PhotoIcon className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
            <p className="text-neutral-600 mb-4">No photos yet</p>
            <label className="btn-primary cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
              {isUploading ? 'Uploading...' : 'Add your first photos'}
            </label>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-neutral-200 flex-shrink-0">
                      {photo.url ? (
                        <img
                          src={photo.url}
                          alt={photo.caption || photo.fileName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PhotoIcon className="w-8 h-8 text-neutral-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-500 truncate">
                        {photo.fileName}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {formatFileSize(photo.fileSize)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ChevronUpIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === photos.length - 1}
                        className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ChevronDownIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeletePhoto(index)}
                        className="p-1 text-neutral-400 hover:text-red-500"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Caption (optional)
                    </label>
                    <input
                      type="text"
                      value={photo.caption || ''}
                      onChange={(e) => handleUpdateCaption(index, e.target.value)}
                      placeholder="Add a caption for this photo"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ))}
            </div>

            <label className="w-full p-4 border-2 border-dashed border-neutral-300 rounded-lg text-neutral-600 hover:border-primary-400 hover:text-primary-600 transition-colors cursor-pointer flex items-center justify-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
              <PlusIcon className="w-5 h-5 inline-block mr-2" />
              {isUploading ? 'Uploading...' : 'Add more photos'}
            </label>
          </>
        )}
      </div>

      <div className="flex justify-end gap-4">
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
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
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function PhotoIcon({ className }: { className?: string }) {
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
