import { useEffect, useState } from 'react';
import { getAuthToken } from '../lib/auth';
import type {
  Announcement,
  ApiResponse,
  RenderConfig,
  UpdateAnnouncementResponse,
  Wedding,
} from '../types';

interface AnnouncementSettingsProps {
  wedding: Wedding;
  onBack: () => void;
  onAnnouncementChanged?: () => void;
}

const DEFAULT_ANNOUNCEMENT: Announcement = {
  enabled: false,
  title: '',
  message: '',
};

/**
 * Announcement banner settings for a wedding.
 * PRD: "Admin can create announcement banner"
 */
export function AnnouncementSettings({
  wedding,
  onBack,
  onAnnouncementChanged,
}: AnnouncementSettingsProps) {
  const [announcement, setAnnouncement] = useState<Announcement>(DEFAULT_ANNOUNCEMENT);
  const [initialAnnouncement, setInitialAnnouncement] = useState<Announcement>(DEFAULT_ANNOUNCEMENT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hasChanges =
    announcement.enabled !== initialAnnouncement.enabled ||
    announcement.title !== initialAnnouncement.title ||
    announcement.message !== initialAnnouncement.message;

  useEffect(() => {
    const fetchAnnouncement = async () => {
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
          const currentAnnouncement = data.data.announcement ?? DEFAULT_ANNOUNCEMENT;
          setAnnouncement(currentAnnouncement);
          setInitialAnnouncement(currentAnnouncement);
        } else {
          setAnnouncement(DEFAULT_ANNOUNCEMENT);
          setInitialAnnouncement(DEFAULT_ANNOUNCEMENT);
        }
      } catch {
        setAnnouncement(DEFAULT_ANNOUNCEMENT);
        setInitialAnnouncement(DEFAULT_ANNOUNCEMENT);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnouncement();
  }, [wedding.id]);

  const handleSave = async () => {
    if (!wedding.features.ANNOUNCEMENT_BANNER) {
      setError('Enable the announcement banner in Site features to update it here.');
      return;
    }

    if (announcement.enabled) {
      if (!announcement.title.trim()) {
        setError('Add a short title for your announcement.');
        return;
      }

      if (!announcement.message.trim()) {
        setError('Add a brief message for your announcement.');
        return;
      }
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/announcement`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          announcement: {
            enabled: announcement.enabled,
            title: announcement.title.trim(),
            message: announcement.message.trim(),
          },
        }),
      });

      const data: ApiResponse<UpdateAnnouncementResponse> = await response.json();

      if (data.ok) {
        setSuccessMessage('Announcement updated successfully.');
        setInitialAnnouncement(announcement);
        onAnnouncementChanged?.();
        setTimeout(() => {
          onBack();
        }, 1000);
      } else {
        setError('Unable to update the announcement. Please try again.');
      }
    } catch {
      setError('Unable to update the announcement. Please try again.');
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
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-neutral-600 hover:text-neutral-800 mb-6"
      >
        <ChevronLeftIcon className="w-4 h-4" />
        Back to dashboard
      </button>

      <div className="mb-8">
        <h1 className="text-2xl text-neutral-800">Announcement banner</h1>
        <p className="text-neutral-500 mt-1">
          Share a short update at the top of your wedding site.
        </p>
      </div>

      {!wedding.features.ANNOUNCEMENT_BANNER && (
        <div className="mb-6 p-4 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-600">
          Announcement banners are currently disabled for your site. Enable them in Site features
          to share an update.
        </div>
      )}

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

      <div className="space-y-6 mb-8">
        <div className="p-4 rounded-lg border border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <div>
            <h3 className="text-neutral-800 font-medium">Show announcement</h3>
            <p className="text-sm text-neutral-500">
              Display your message in a calm banner at the top of your site.
            </p>
          </div>
          <button
            onClick={() => {
              setAnnouncement((prev) => ({ ...prev, enabled: !prev.enabled }));
              setSuccessMessage(null);
            }}
            disabled={!wedding.features.ANNOUNCEMENT_BANNER}
            className={`
              relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
              transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              ${!wedding.features.ANNOUNCEMENT_BANNER ? 'cursor-not-allowed opacity-60' : ''}
              ${announcement.enabled && wedding.features.ANNOUNCEMENT_BANNER ? 'bg-primary-500' : 'bg-neutral-300'}
            `}
            role="switch"
            aria-checked={announcement.enabled}
          >
            <span
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-neutral-50 shadow ring-0
                transition duration-200 ease-in-out
                ${announcement.enabled ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>

        <div>
          <label htmlFor="announcementTitle" className="block text-sm font-medium text-neutral-700 mb-1">
            Title
          </label>
          <input
            id="announcementTitle"
            type="text"
            value={announcement.title}
            onChange={(event) => {
              setAnnouncement((prev) => ({ ...prev, title: event.target.value }));
              setSuccessMessage(null);
            }}
            placeholder="Weekend update"
            disabled={!wedding.features.ANNOUNCEMENT_BANNER}
            className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100"
          />
        </div>

        <div>
          <label htmlFor="announcementMessage" className="block text-sm font-medium text-neutral-700 mb-1">
            Message
          </label>
          <textarea
            id="announcementMessage"
            value={announcement.message}
            onChange={(event) => {
              setAnnouncement((prev) => ({ ...prev, message: event.target.value }));
              setSuccessMessage(null);
            }}
            placeholder="We will share final ceremony details here a week before."
            rows={4}
            disabled={!wedding.features.ANNOUNCEMENT_BANNER}
            className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges || !wedding.features.ANNOUNCEMENT_BANNER}
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
