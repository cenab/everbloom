import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

/**
 * Success page shown after completing Stripe checkout.
 * Displays a confirmation and redirects to dashboard.
 */
export function BillingSuccess() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) {
      navigate({ to: '/' });
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className="space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-accent-100 flex items-center justify-center">
          <CheckIcon className="w-8 h-8 text-accent-600" />
        </div>

        <h1 className="text-2xl text-neutral-800">
          Your wedding site is being created
        </h1>

        <p className="text-neutral-500">
          Thank you for choosing Everbloom. Your wedding site will be ready in just a moment.
        </p>

        <p className="text-sm text-neutral-400">
          Redirecting to your dashboard in {countdown}...
        </p>

        <button
          onClick={() => navigate({ to: '/' })}
          className="btn-primary"
        >
          Go to dashboard now
        </button>
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
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
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}
