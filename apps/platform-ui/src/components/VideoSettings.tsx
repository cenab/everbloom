import { useEffect, useState } from 'react';
import { getAuthToken } from '../lib/auth';
import type {
  VideoEmbed,
  VideoConfig,
  ApiResponse,
  RenderConfig,
  UpdateVideoResponse,
  Wedding,
} from '../types';

interface VideoSettingsProps {
  wedding: Wedding;
  onVideoChanged?: () => void;
}

const DEFAULT_VIDEO: VideoConfig = {
  videos: [],
};

/**
 * Video settings for admin-curated video embeds.
 * PRD: "Admin can embed videos"
 */
export function VideoSettings({
  wedding,
  onVideoChanged,
}: VideoSettingsProps) {
  const [videos, setVideos] = useState<VideoEmbed[]>([]);
  const [initialVideos, setInitialVideos] = useState<VideoEmbed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');

  // Track changes by comparing stringified arrays
  const hasChanges = JSON.stringify(videos) !== JSON.stringify(initialVideos);

  // Check if VIDEO_EMBED feature is enabled
  const featureEnabled = wedding.features.VIDEO_EMBED;

  useEffect(() => {
    const fetchVideos = async () => {
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
          const currentVideo = data.data.video ?? DEFAULT_VIDEO;
          // Sort by order for display
          const sortedVideos = [...currentVideo.videos].sort((a, b) => a.order - b.order);
          setVideos(sortedVideos);
          setInitialVideos(sortedVideos);
        } else {
          setVideos([]);
          setInitialVideos([]);
        }
      } catch {
        setVideos([]);
        setInitialVideos([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, [wedding.id]);

  const handleAddVideo = async () => {
    if (!newVideoUrl.trim()) {
      setError('Please enter a YouTube or Vimeo URL.');
      return;
    }

    setIsAdding(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/video/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: newVideoUrl.trim(),
          title: newVideoTitle.trim() || undefined,
        }),
      });

      const data: ApiResponse<UpdateVideoResponse & { video: VideoEmbed }> = await response.json();

      if (data.ok) {
        const updatedVideos = [...videos, data.data.video].sort((a, b) => a.order - b.order);
        setVideos(updatedVideos);
        setInitialVideos(updatedVideos);
        setNewVideoUrl('');
        setNewVideoTitle('');
        setSuccessMessage('Video added successfully.');
        onVideoChanged?.();
      } else {
        if (data.error === 'VIDEO_URL_INVALID') {
          setError('Invalid video URL. Please enter a valid YouTube or Vimeo link.');
        } else if (data.error === 'FEATURE_DISABLED') {
          setError('Video embed feature is not enabled for your plan.');
        } else {
          setError('Unable to add video. Please try again.');
        }
      }
    } catch {
      setError('Unable to add video. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateTitle = (index: number, title: string) => {
    const updated = [...videos];
    updated[index] = { ...updated[index], title };
    setVideos(updated);
    setSuccessMessage(null);
  };

  const handleDeleteVideo = (index: number) => {
    const updated = videos.filter((_, i) => i !== index);
    // Re-order remaining items
    const reordered = updated.map((video, i) => ({ ...video, order: i }));
    setVideos(reordered);
    setSuccessMessage(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...videos];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    // Update order values
    const reordered = updated.map((video, i) => ({ ...video, order: i }));
    setVideos(reordered);
    setSuccessMessage(null);
  };

  const handleMoveDown = (index: number) => {
    if (index === videos.length - 1) return;
    const updated = [...videos];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    // Update order values
    const reordered = updated.map((video, i) => ({ ...video, order: i }));
    setVideos(reordered);
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/video`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          video: {
            videos: videos.map((video, index) => ({
              id: video.id,
              platform: video.platform,
              videoId: video.videoId,
              url: video.url,
              title: video.title?.trim() || undefined,
              order: index,
              addedAt: video.addedAt,
            })),
          },
        }),
      });

      const data: ApiResponse<UpdateVideoResponse> = await response.json();

      if (data.ok) {
        setSuccessMessage('Videos updated successfully.');
        setInitialVideos(videos);
        onVideoChanged?.();
      } else {
        setError('Unable to update videos. Please try again.');
      }
    } catch {
      setError('Unable to update videos. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getVideoThumbnail = (video: VideoEmbed): string => {
    if (video.platform === 'youtube') {
      return `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;
    } else if (video.platform === 'vimeo') {
      // Vimeo thumbnails require API call, using placeholder
      return '';
    }
    return '';
  };

  const getPlatformLabel = (platform: string): string => {
    if (platform === 'youtube') return 'YouTube';
    if (platform === 'vimeo') return 'Vimeo';
    return platform;
  };

  if (!featureEnabled) {
    return (
      <div>
        <div className="text-center py-16">
          <VideoIcon className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
          <h2 className="text-xl text-neutral-700 mb-2">Video embeds</h2>
          <p className="text-neutral-500 max-w-md mx-auto">
            Video embed is a premium feature. Upgrade your plan to add engagement videos, proposal videos, and more to your wedding site.
          </p>
        </div>
      </div>
    );
  }

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
        <h1 className="text-2xl text-neutral-800">Video embeds</h1>
        <p className="text-neutral-500 mt-1">
          Add YouTube or Vimeo videos to showcase on your wedding site.
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

      {/* Add new video form */}
      <div className="mb-8 p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
        <h2 className="text-lg font-medium text-neutral-800 mb-4">Add a video</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Video URL
            </label>
            <input
              type="url"
              value={newVideoUrl}
              onChange={(e) => setNewVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-neutral-400 mt-1">
              Paste a YouTube or Vimeo video URL
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Title (optional)
            </label>
            <input
              type="text"
              value={newVideoTitle}
              onChange={(e) => setNewVideoTitle(e.target.value)}
              placeholder="Our engagement video"
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleAddVideo}
            disabled={isAdding || !newVideoUrl.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? 'Adding...' : 'Add video'}
          </button>
        </div>
      </div>

      {/* Video list */}
      <div className="space-y-4 mb-8">
        {videos.length === 0 ? (
          <div className="text-center py-8 bg-neutral-50 border border-neutral-200 rounded-lg">
            <VideoIcon className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
            <p className="text-neutral-600">No videos yet</p>
            <p className="text-neutral-400 text-sm mt-1">
              Add your first video using the form above
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {videos.map((video, index) => (
              <div
                key={video.id}
                className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-32 h-24 rounded-lg overflow-hidden bg-neutral-200 flex-shrink-0">
                    {getVideoThumbnail(video) ? (
                      <img
                        src={getVideoThumbnail(video)}
                        alt={video.title || 'Video thumbnail'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <VideoIcon className="w-8 h-8 text-neutral-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-700">
                      {video.title || 'Untitled video'}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {getPlatformLabel(video.platform)} • {video.videoId}
                    </p>
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:text-primary-700 mt-1 inline-block"
                    >
                      Open in new tab →
                    </a>
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
                      disabled={index === videos.length - 1}
                      className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ChevronDownIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteVideo(index)}
                      className="p-1 text-neutral-400 hover:text-red-500"
                      title="Delete"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Video title
                  </label>
                  <input
                    type="text"
                    value={video.title || ''}
                    onChange={(e) => handleUpdateTitle(index, e.target.value)}
                    placeholder="Add a title for this video"
                    className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {videos.length > 0 && hasChanges && (
      <div className="flex justify-end gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      )}
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

function VideoIcon({ className }: { className?: string }) {
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
        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}
