import { useState, useEffect } from 'react';
import { getAuthToken } from '../lib/auth';
import type {
  ApiResponse,
  Wedding,
  RenderConfig,
  LanguageOption,
} from '../types';

interface LanguageSettingsProps {
  wedding: Wedding;
  onBack: () => void;
  onLanguageChanged?: () => void;
}

/**
 * Language settings for wedding sites.
 * PRD: "Admin can set site language"
 */
export function LanguageSettings({
  wedding,
  onBack,
  onLanguageChanged,
}: LanguageSettingsProps) {
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState(wedding.language ?? 'en');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hasChanges = selectedLanguage !== (wedding.language ?? 'en');

  // Fetch available languages on mount
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await fetch('/api/weddings/languages/list');
        const data: ApiResponse<{ languages: LanguageOption[]; defaultLanguage: string }> = await response.json();

        if (data.ok) {
          setLanguages(data.data.languages);
        } else {
          setError('Unable to load available languages.');
        }
      } catch {
        setError('Unable to load available languages.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLanguages();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/language`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          language: selectedLanguage,
        }),
      });

      const data: ApiResponse<{ wedding: Wedding; renderConfig: RenderConfig }> = await response.json();

      if (data.ok) {
        const selectedLang = languages.find((l) => l.code === selectedLanguage);
        setSuccessMessage(
          `Site language changed to ${selectedLang?.name ?? selectedLanguage}. Your changes are saved as a draft.`
        );
        onLanguageChanged?.();
        setTimeout(() => {
          onBack();
        }, 1500);
      } else {
        setError('Unable to update language. Please try again.');
      }
    } catch {
      setError('Unable to update language. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentLanguage = languages.find((l) => l.code === (wedding.language ?? 'en'));

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
        <h1 className="text-2xl text-neutral-800">Site language</h1>
        <p className="text-neutral-500 mt-1">
          Choose the language for your wedding site. All text on your site will be displayed in
          the selected language.
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

      <div className="space-y-6 mb-8">
        {/* Current Language Display */}
        {currentLanguage && (
          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="flex items-center gap-3">
              <GlobeIcon className="w-5 h-5 text-neutral-500" />
              <div>
                <span className="text-sm text-neutral-500">Current language:</span>
                <span className="ml-2 font-medium text-neutral-800">
                  {currentLanguage.name} ({currentLanguage.nativeName})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Language Selection */}
        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
          <label className="block text-sm font-medium text-neutral-700 mb-3">
            Select language
          </label>

          {isLoading ? (
            <div className="text-neutral-500">Loading available languages...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setSelectedLanguage(lang.code);
                    setSuccessMessage(null);
                    setError(null);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    selectedLanguage === lang.code
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedLanguage === lang.code
                        ? 'border-primary-500'
                        : 'border-neutral-300'
                    }`}
                  >
                    {selectedLanguage === lang.code && (
                      <div className="w-2 h-2 rounded-full bg-primary-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{lang.name}</div>
                    <div className="text-sm text-neutral-500">{lang.nativeName}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-3">
            <InfoIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">About site language</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Changes the language of built-in text (buttons, labels, etc.)</li>
                <li>Your custom content (names, messages) stays unchanged</li>
                <li>Changes are saved as a draft until you publish</li>
                <li>Guests will see your site in the selected language</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges || isLoading}
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

function GlobeIcon({ className }: { className?: string }) {
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
        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
      />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
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
        d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
      />
    </svg>
  );
}
