import { useNavigate } from '@tanstack/react-router';

/**
 * Cancel page shown when user cancels Stripe checkout.
 * Offers to return to the creation flow or dashboard.
 */
export function BillingCancel() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className="space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-neutral-100 flex items-center justify-center">
          <ArrowLeftIcon className="w-8 h-8 text-neutral-500" />
        </div>

        <h1 className="text-2xl text-neutral-800">
          Checkout cancelled
        </h1>

        <p className="text-neutral-500">
          No worries - your information has been saved. You can return to checkout whenever you are ready.
        </p>

        <div className="flex gap-4 pt-4">
          <button
            onClick={() => navigate({ to: '/' })}
            className="btn-secondary flex-1"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
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
        d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
      />
    </svg>
  );
}
