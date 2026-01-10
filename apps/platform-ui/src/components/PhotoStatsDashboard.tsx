import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../lib/auth';
import type { ApiResponse, PhotoSummary, PhotoSummaryResponse, PhotoMetadata } from '../types';

interface PhotoStatsDashboardProps {
  weddingId: string;
  onBack: () => void;
}

/**
 * Photo statistics dashboard component.
 * Shows total photo count and recent uploads.
 * PRD: "Dashboard shows photo upload count"
 */
export function PhotoStatsDashboard({ weddingId, onBack }: PhotoStatsDashboardProps) {
  const [summary, setSummary] = useState<PhotoSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/photos/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<PhotoSummaryResponse> = await response.json();

      if (data.ok) {
        setSummary(data.data.summary);
      } else {
        setError('Unable to load photo statistics');
      }
    } catch {
      setError('Unable to load photo statistics');
    } finally {
      setIsLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-500">Loading photo statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="text-center py-16">
          <p className="text-neutral-500">{error}</p>
          <button
            onClick={fetchSummary}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl text-neutral-800">Photo uploads</h1>
        <p className="text-neutral-500 mt-1">
          Photos shared by your guests
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Total photos"
          value={summary?.totalPhotos ?? 0}
          icon={<CameraIcon className="w-5 h-5" />}
          color="primary"
        />
        <StatCard
          label="Total size"
          value={formatFileSize(summary?.totalSizeBytes ?? 0)}
          icon={<FolderIcon className="w-5 h-5" />}
          color="accent"
        />
        <StatCard
          label="Last upload"
          value={summary?.lastUploadedAt ? formatRelativeTime(summary.lastUploadedAt) : 'No uploads yet'}
          icon={<ClockIcon className="w-5 h-5" />}
          color="neutral"
        />
      </div>

      {/* Recent Uploads */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
        <h2 className="text-lg text-neutral-800 font-medium mb-4">Recent uploads</h2>
        {summary?.recentUploads && summary.recentUploads.length > 0 ? (
          <div className="space-y-3">
            {summary.recentUploads.map((photo) => (
              <PhotoRow key={photo.id} photo={photo} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto rounded-full bg-neutral-200 flex items-center justify-center mb-3">
              <CameraIcon className="w-6 h-6 text-neutral-400" />
            </div>
            <p className="text-neutral-500">No photos uploaded yet</p>
            <p className="text-sm text-neutral-400 mt-1">
              Photos shared by guests will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'primary' | 'accent' | 'neutral';
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    primary: 'bg-primary-100 text-primary-600',
    accent: 'bg-accent-100 text-accent-600',
    neutral: 'bg-neutral-200 text-neutral-600',
  };

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-neutral-500">{label}</p>
          <p className="text-xl font-medium text-neutral-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

interface PhotoRowProps {
  photo: PhotoMetadata;
}

function PhotoRow({ photo }: PhotoRowProps) {
  return (
    <div className="flex items-center gap-4 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
      <div className="w-10 h-10 rounded bg-neutral-200 flex items-center justify-center flex-shrink-0">
        <ImageIcon className="w-5 h-5 text-neutral-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-800 truncate">{photo.fileName}</p>
        <p className="text-xs text-neutral-500">
          {formatFileSize(photo.fileSize)} • {formatRelativeTime(photo.uploadedAt)}
        </p>
      </div>
    </div>
  );
}

/**
 * Format bytes into human-readable size
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Format ISO timestamp into relative time
 */
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
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
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
      />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
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
        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
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
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
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
