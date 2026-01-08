import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';

/**
 * Legacy magic link verification page.
 * Now redirects to login since we use Supabase Auth with /auth/callback.
 * @deprecated Use /auth/callback route instead
 */
export function VerifyMagicLink() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login - this route is deprecated
    navigate({ to: '/login' });
  }, [navigate]);

  return (
    <div className="max-w-md mx-auto px-6 py-16 text-center">
      <p className="text-neutral-500">Redirecting...</p>
    </div>
  );
}
