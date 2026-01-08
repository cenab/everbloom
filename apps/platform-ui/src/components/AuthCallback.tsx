import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '../lib/supabase';

/**
 * Auth callback page that handles Supabase magic link verification.
 * Supabase Auth automatically extracts the session from URL hash.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase automatically handles the session from the URL
    // We just need to wait for it and redirect
    const handleCallback = async () => {
      try {
        // Check for error in URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const errorDescription = hashParams.get('error_description');

        if (errorDescription) {
          setError(errorDescription);
          return;
        }

        // Get the session (Supabase should have set it automatically)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          setError('Failed to verify sign-in link. Please try again.');
          return;
        }

        if (session) {
          // Successfully authenticated, redirect to dashboard
          navigate({ to: '/' });
        } else {
          // No session yet, the URL might have the tokens
          // Supabase handles this automatically via onAuthStateChange
          // Wait a moment and check again
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
              navigate({ to: '/' });
            } else {
              setError('Sign-in link has expired or is invalid. Please request a new one.');
            }
          }, 1000);
        }
      } catch {
        setError('Something went wrong. Please try again.');
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <div className="space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-2xl text-neutral-800">Sign-in failed</h1>
          <p className="text-neutral-500">{error}</p>
          <button
            onClick={() => navigate({ to: '/login' })}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16 text-center">
      <div className="space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-accent-100 flex items-center justify-center animate-pulse">
          <svg className="w-8 h-8 text-accent-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h1 className="text-2xl text-neutral-800">Signing you in...</h1>
        <p className="text-neutral-500">Please wait while we verify your sign-in link.</p>
      </div>
    </div>
  );
}
