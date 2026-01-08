import { useState } from 'react';
import { useAuth } from '../lib/auth';

/**
 * Login page with Supabase magic link authentication.
 * Human, calm language per design system microcopy rules.
 */
export function Login() {
  const { signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await signInWithMagicLink(email);

      if (error) {
        setError('Unable to send sign-in link. Please try again.');
      } else {
        setSent(true);
      }
    } catch {
      setError('Something went wrong. Please try again in a moment.');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <div className="space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent-100 flex items-center justify-center">
            <MailIcon className="w-8 h-8 text-accent-600" />
          </div>

          <h1 className="text-2xl text-neutral-800">Check your email</h1>

          <p className="text-neutral-500">
            We've sent a sign-in link to <span className="font-medium text-neutral-700">{email}</span>.
            Click the link to access your dashboard.
          </p>

          <p className="text-sm text-neutral-400">
            The link will expire in 1 hour. If you don't see it, check your spam folder.
          </p>

          <button
            onClick={() => {
              setSent(false);
              setEmail('');
            }}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="text-center space-y-6">
        <h1 className="text-2xl text-neutral-800">Sign in to Everbloom</h1>
        <p className="text-neutral-500">
          Enter your email and we'll send you a sign-in link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            autoFocus
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       placeholder:text-neutral-400"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={isLoading || !email}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Sending...' : 'Send sign-in link'}
        </button>
      </form>
    </div>
  );
}

function MailIcon({ className }: { className?: string }) {
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
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  );
}
