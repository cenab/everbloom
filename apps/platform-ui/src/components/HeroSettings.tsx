import { useState, useEffect } from 'react';
import { getAuthToken } from '../lib/auth';
import type { Wedding, HeroContentData, ApiResponse, RenderConfig, UpdateHeroContentResponse } from '../types';

interface HeroSettingsProps {
  wedding: Wedding;
  onBack: () => void;
  onHeroChanged: () => void;
}

/**
 * Admin settings component for editing hero section content
 * Allows editing the headline and optional subheadline
 */
export function HeroSettings({
  wedding,
  onBack,
  onHeroChanged,
}: HeroSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [headline, setHeadline] = useState(`${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`);
  const [subheadline, setSubheadline] = useState('');

  // Track initial values for change detection
  const [initialHeadline, setInitialHeadline] = useState('');
  const [initialSubheadline, setInitialSubheadline] = useState('');

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
          const heroData = heroSection.data as { headline?: string; subheadline?: string };
          const h = heroData.headline || `${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`;
          const s = heroData.subheadline || '';
          setHeadline(h);
          setSubheadline(s);
          setInitialHeadline(h);
          setInitialSubheadline(s);
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

      const heroContent: HeroContentData = {
        headline: headline.trim(),
        ...(subheadline.trim() && { subheadline: subheadline.trim() }),
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
        setInitialHeadline(headline.trim());
        setInitialSubheadline(subheadline.trim());
        onHeroChanged();
        // Clear success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError('error' in data ? data.error : 'Failed to save hero content');
      }
    } catch {
      setError('Failed to save hero content');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = headline.trim() !== initialHeadline || subheadline.trim() !== initialSubheadline;
  const isValid = headline.trim().length > 0;

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-500">Loading hero content...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl text-neutral-800">Hero section</h1>
        <p className="text-neutral-500 mt-1">
          Customize the headline that appears at the top of your wedding site.
        </p>
      </div>

      <div className="max-w-xl space-y-6">
        {/* Headline */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Headline
          </label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder={`${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`}
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="text-sm text-neutral-500 mt-1">
            This is the main title displayed on your wedding site.
          </p>
        </div>

        {/* Subheadline (optional) */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Subheadline (optional)
          </label>
          <input
            type="text"
            value={subheadline}
            onChange={(e) => setSubheadline(e.target.value)}
            placeholder="We're getting married!"
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="text-sm text-neutral-500 mt-1">
            An optional tagline that appears below the headline.
          </p>
        </div>

        {/* Preview */}
        <div className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg">
          <p className="text-xs text-neutral-500 uppercase tracking-wide mb-3">Preview</p>
          <div className="text-center">
            <h2 className="text-2xl text-neutral-800 font-serif">
              {headline || `${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`}
            </h2>
            {subheadline && (
              <p className="text-neutral-600 mt-2">{subheadline}</p>
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
            Hero content saved successfully
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
          <button
            onClick={onBack}
            className="px-4 py-2 text-neutral-600 hover:text-neutral-800"
          >
            Cancel
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
