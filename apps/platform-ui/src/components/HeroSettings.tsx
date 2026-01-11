import { useState, useEffect } from 'react';
import { getAuthToken } from '../lib/auth';
import type { Wedding, HeroContentData, ApiResponse, RenderConfig, UpdateHeroContentResponse } from '../types';

interface HeroSettingsProps {
  wedding: Wedding;
  onHeroChanged: () => void;
}

const INVITATION_STYLE_OPTIONS = [
  { value: 'classic', label: 'Classic' },
  { value: 'modern', label: 'Modern' },
  { value: 'minimal', label: 'Minimal' },
];

/**
 * Admin settings component for editing invitation content
 * Allows editing the invitation text and selecting a style
 */
export function HeroSettings({
  wedding,
  onHeroChanged,
}: HeroSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [headline, setHeadline] = useState(`${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`);
  const [subheadline, setSubheadline] = useState('');
  const [invitationStyle, setInvitationStyle] = useState('classic');
  const [invitationMessage, setInvitationMessage] = useState('');
  const [showDate, setShowDate] = useState(true);

  // Track initial values for change detection
  const [initialHeadline, setInitialHeadline] = useState('');
  const [initialSubheadline, setInitialSubheadline] = useState('');
  const [initialInvitationStyle, setInitialInvitationStyle] = useState('classic');
  const [initialInvitationMessage, setInitialInvitationMessage] = useState('');
  const [initialShowDate, setInitialShowDate] = useState(true);

  // Fetch current hero content from render_config
  useEffect(() => {
    fetchHeroContent();
  }, [wedding.id]);

  const fetchHeroContent = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/render-config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<RenderConfig> = await response.json();

      if (data.ok) {
        // Find the hero section
        const heroSection = data.data.sections.find(s => s.type === 'hero');
        if (heroSection) {
          const heroData = heroSection.data as {
            headline?: string;
            subheadline?: string;
            invitationStyle?: string;
            invitationMessage?: string;
            showDate?: boolean;
          };
          const h = heroData.headline || `${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`;
          const s = heroData.subheadline || '';
          const style = INVITATION_STYLE_OPTIONS.some((option) => option.value === heroData.invitationStyle)
            ? (heroData.invitationStyle as string)
            : 'classic';
          const message = heroData.invitationMessage || '';
          const messageTrimmed = message.trim();
          const dateVisibility = heroData.showDate !== false;

          setHeadline(h);
          setSubheadline(s);
          setInvitationStyle(style);
          setInvitationMessage(message);
          setShowDate(dateVisibility);
          setInitialHeadline(h);
          setInitialSubheadline(s);
          setInitialInvitationStyle(style);
          setInitialInvitationMessage(messageTrimmed);
          setInitialShowDate(dateVisibility);
        }
      }
    } catch {
      // Use defaults from wedding data
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const token = getAuthToken();

      const trimmedHeadline = headline.trim();
      const trimmedSubheadline = subheadline.trim();
      const trimmedInvitationMessage = invitationMessage.trim();

      const safeInvitationStyle = INVITATION_STYLE_OPTIONS.some((option) => option.value === invitationStyle)
        ? invitationStyle
        : 'classic';

      const heroContent: HeroContentData = {
        headline: trimmedHeadline,
        subheadline: trimmedSubheadline,
        invitationStyle: safeInvitationStyle,
        invitationMessage: trimmedInvitationMessage,
        showDate,
      };

      const response = await fetch(`/api/weddings/${wedding.id}/hero`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ heroContent }),
      });

      const data: ApiResponse<UpdateHeroContentResponse> = await response.json();

      if (data.ok) {
        setSaveSuccess(true);
        setInitialHeadline(trimmedHeadline);
        setInitialSubheadline(trimmedSubheadline);
        setInitialInvitationStyle(safeInvitationStyle);
        setInitialInvitationMessage(trimmedInvitationMessage);
        setInitialShowDate(showDate);
        onHeroChanged();
        // Clear success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError('error' in data ? data.error : 'Failed to save invitation');
      }
    } catch {
      setError('Failed to save invitation');
    } finally {
      setIsSaving(false);
    }
  };

  const normalizedHeadline = headline.trim();
  const normalizedSubheadline = subheadline.trim();
  const normalizedInvitationMessage = invitationMessage.trim();
  const hasChanges = normalizedHeadline !== initialHeadline
    || normalizedSubheadline !== initialSubheadline
    || invitationStyle !== initialInvitationStyle
    || normalizedInvitationMessage !== initialInvitationMessage
    || showDate !== initialShowDate;
  const isValid = normalizedHeadline.length > 0;

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-500">Loading invitation content...</p>
      </div>
    );
  }

  const previewDate = (() => {
    if (!showDate || !wedding.eventDetails?.date) return '';
    const date = new Date(wedding.eventDetails.date);
    if (Number.isNaN(date.getTime())) return wedding.eventDetails.date;
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  })();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl text-neutral-800">Your invitation</h1>
        <p className="text-neutral-500 mt-1">
          Choose an invitation style and customize the text shown on your site.
        </p>
      </div>

      <div className="space-y-6">
        {/* Invitation Style */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Invitation style
          </label>
          <select
            value={invitationStyle}
            onChange={(e) => setInvitationStyle(e.target.value)}
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {INVITATION_STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-sm text-neutral-500 mt-1">
            We will add visual designs for these styles soon.
          </p>
        </div>

        {/* Headline */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Invitation headline
          </label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder={`${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`}
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="text-sm text-neutral-500 mt-1">
            This is the main line of your invitation.
          </p>
        </div>

        {/* Subheadline (optional) */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Invitation subheadline (optional)
          </label>
          <input
            type="text"
            value={subheadline}
            onChange={(e) => setSubheadline(e.target.value)}
            placeholder="We're getting married!"
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="text-sm text-neutral-500 mt-1">
            An optional second line below the headline.
          </p>
        </div>

        {/* Invitation message */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Invitation message (optional)
          </label>
          <input
            type="text"
            value={invitationMessage}
            onChange={(e) => setInvitationMessage(e.target.value)}
            placeholder="Together with their families"
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="text-sm text-neutral-500 mt-1">
            A short line displayed above the headline.
          </p>
        </div>

        {/* Show date toggle */}
        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-neutral-800 font-medium">Show wedding date</h3>
              <p className="text-sm text-neutral-500 mt-1">
                Display the date in your invitation if it has been set.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDate((prev) => !prev)}
              className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                ${showDate ? 'bg-primary-500' : 'bg-neutral-300'}
              `}
              role="switch"
              aria-checked={showDate}
            >
              <span
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-neutral-50 shadow ring-0
                  transition duration-200 ease-in-out
                  ${showDate ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg">
          <p className="text-xs text-neutral-500 uppercase tracking-wide mb-3">Preview</p>
          <div className="text-center">
            {invitationMessage && (
              <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2">
                {invitationMessage}
              </p>
            )}
            <h2 className="text-2xl text-neutral-800 font-serif">
              {headline || `${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`}
            </h2>
            {subheadline && (
              <p className="text-neutral-600 mt-2">{subheadline}</p>
            )}
            {previewDate && (
              <p className="text-neutral-500 mt-3">{previewDate}</p>
            )}
          </div>
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
            Invitation saved successfully
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving || !isValid || !hasChanges}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
        </div>

        {!hasChanges && !saveSuccess && (
          <p className="text-sm text-neutral-500">
            No changes to save
          </p>
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
