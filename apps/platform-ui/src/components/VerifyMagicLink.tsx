import { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useAuth } from '../lib/auth';
import type { ApiResponse, MagicLinkVerifyResponse } from '@wedding-bestie/shared';
import { MAGIC_LINK_INVALID } from '@wedding-bestie/shared';

/**
 * Magic link verification page.
 * Handles the callback when user clicks the magic link from email.
 */
export function VerifyMagicLink() {
  const { token } = useSearch({ from: '/auth/verify' });
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('No sign-in link found. Please request a new one.');
      setIsVerifying(false);
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch('/api/auth/verify-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data: ApiResponse<MagicLinkVerifyResponse> = await response.json();

        if (data.ok) {
          login(data.data);
          navigate({ to: '/' });
        } else if (data.error === MAGIC_LINK_INVALID) {
          setError('This sign-in link has expired or was already used. Please request a new one.');
        } else {
          setError('Something went wrong. Please request a new sign-in link.');
        }
      } catch {
        setError('Something went wrong. Please try again in a moment.');
      } finally {
        setIsVerifying(false);
      }
    };

    verify();
  }, [token, login, navigate]);

  if (isVerifying) {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <div className="space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary-100 flex items-center justify-center">
            <LoadingSpinner className="w-8 h-8 text-primary-500" />
          </div>
          <h1 className="text-2xl text-neutral-800">Signing you in...</h1>
          <p className="text-neutral-500">Just a moment while we verify your sign-in link.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <div className="space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-neutral-100 flex items-center justify-center">
            <ExclamationIcon className="w-8 h-8 text-neutral-500" />
          </div>
          <h1 className="text-2xl text-neutral-800">Couldn't sign you in</h1>
          <p className="text-neutral-500">{error}</p>
          <button
            onClick={() => navigate({ to: '/login' })}
            className="btn-primary"
          >
            Request new sign-in link
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function ExclamationIcon({ className }: { className?: string }) {
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
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      />
    </svg>
  );
}
