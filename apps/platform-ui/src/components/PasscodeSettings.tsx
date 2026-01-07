import { useState } from 'react';
import { getAuthToken } from '../lib/auth';
import type {
  ApiResponse,
  UpdatePasscodeResponse,
  Wedding,
} from '../types';

interface PasscodeSettingsProps {
  wedding: Wedding;
  onBack: () => void;
  onPasscodeChanged?: () => void;
}

/**
 * Passcode settings for protecting a wedding site.
 * PRD: "Admin can set site passcode"
 */
export function PasscodeSettings({
  wedding,
  onBack,
  onPasscodeChanged,
}: PasscodeSettingsProps) {
  // Check if passcode is currently enabled and set
  const hasExistingPasscode = wedding.passcodeConfig?.enabled && wedding.passcodeConfig?.hasPasscode;

  const [enabled, setEnabled] = useState(wedding.passcodeConfig?.enabled ?? false);
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hasChanges =
    enabled !== (wedding.passcodeConfig?.enabled ?? false) ||
    passcode.length > 0;

  const handleSave = async () => {
    if (!wedding.features.PASSCODE_SITE) {
      setError('Enable passcode protection in Site features first.');
      return;
    }

    // Validate if enabling
    if (enabled && !hasExistingPasscode && !passcode) {
      setError('Please enter a passcode to protect your site.');
      return;
    }

    if (passcode) {
      if (passcode.length < 4) {
        setError('Passcode must be at least 4 characters.');
        return;
      }

      if (passcode !== confirmPasscode) {
        setError('Passcodes do not match.');
        return;
      }
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/passcode`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled,
          passcode: passcode || undefined,
        }),
      });

      const data: ApiResponse<UpdatePasscodeResponse> = await response.json();

      if (data.ok) {
        setSuccessMessage(
          enabled
            ? 'Site protection enabled. Guests will need the passcode to view your site.'
            : 'Site protection disabled. Your site is now publicly accessible.'
        );
        setPasscode('');
        setConfirmPasscode('');
        onPasscodeChanged?.();
        setTimeout(() => {
          onBack();
        }, 1500);
      } else {
        setError('Unable to update passcode settings. Please try again.');
      }
    } catch {
      setError('Unable to update passcode settings. Please try again.');
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
        <h1 className="text-2xl text-neutral-800">Site protection</h1>
        <p className="text-neutral-500 mt-1">
          Keep your wedding site private with a passcode that guests will need to enter.
        </p>
      </div>

      {!wedding.features.PASSCODE_SITE && (
        <div className="mb-6 p-4 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-600">
          Site protection is not available on your current plan. Upgrade to Premium to
          enable passcode protection.
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
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
          <div>
            <h3 className="font-medium text-neutral-800">Require passcode</h3>
            <p className="text-sm text-neutral-500 mt-0.5">
              {enabled
                ? 'Guests must enter the passcode to view your site'
                : 'Your site is publicly accessible'}
            </p>
          </div>
          <button
            onClick={() => {
              setEnabled(!enabled);
              setSuccessMessage(null);
            }}
            disabled={!wedding.features.PASSCODE_SITE}
            className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              enabled ? 'bg-primary-500' : 'bg-neutral-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-neutral-50 rounded-full transition-transform shadow-sm ${
                enabled ? 'translate-x-6' : ''
              }`}
            />
          </button>
        </div>

        {/* Passcode Input (only shown when enabled) */}
        {enabled && (
          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-4">
            {hasExistingPasscode && (
              <div className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
                <LockIcon className="w-4 h-4" />
                A passcode is currently set. Enter a new one below to change it.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {hasExistingPasscode ? 'New passcode' : 'Passcode'}
              </label>
              <div className="relative">
                <input
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setSuccessMessage(null);
                    setError(null);
                  }}
                  placeholder={hasExistingPasscode ? 'Leave blank to keep current' : 'Enter a passcode'}
                  disabled={!wedding.features.PASSCODE_SITE}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPasscode ? (
                    <EyeOffIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                At least 4 characters. Share this with your guests so they can access your site.
              </p>
            </div>

            {passcode && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Confirm passcode
                </label>
                <input
                  type={showPasscode ? 'text' : 'password'}
                  value={confirmPasscode}
                  onChange={(e) => {
                    setConfirmPasscode(e.target.value);
                    setSuccessMessage(null);
                    setError(null);
                  }}
                  placeholder="Re-enter your passcode"
                  disabled={!wedding.features.PASSCODE_SITE}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100"
                />
              </div>
            )}
          </div>
        )}

        {/* Info box */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-3">
            <InfoIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How it works</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Guests will see a passcode screen before viewing your site</li>
                <li>Once entered correctly, they can browse freely</li>
                <li>Their access is remembered so they won&apos;t need to re-enter it</li>
                <li>Share the passcode with your guests via email or invitation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges || !wedding.features.PASSCODE_SITE}
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

function LockIcon({ className }: { className?: string }) {
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
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
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
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
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
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
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
