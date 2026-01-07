/**
 * Admin Dashboard component.
 * Shows empty state when no wedding is selected.
 * PRD: "Admin dashboard loads with no wedding selected"
 */
export function Dashboard() {
  // TODO: Fetch weddings from API and check if any exist
  const hasWeddings = false;
  const selectedWedding = null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {!selectedWedding && (
        <EmptyState hasWeddings={hasWeddings} />
      )}
    </div>
  );
}

interface EmptyStateProps {
  hasWeddings: boolean;
}

/**
 * Empty state shown when no wedding is selected.
 * Uses calm, human language per design system microcopy rules.
 */
function EmptyState({ hasWeddings }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <div className="max-w-md mx-auto space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary-100 flex items-center justify-center">
          <HeartIcon className="w-8 h-8 text-primary-500" />
        </div>

        <h1 className="text-2xl text-neutral-800">
          {hasWeddings
            ? 'Select a wedding to get started'
            : 'Welcome to Everbloom'
          }
        </h1>

        <p className="text-neutral-500">
          {hasWeddings
            ? 'Choose one of your weddings from the list, or create a new one.'
            : 'Create your first wedding site to begin sharing your special day with loved ones.'
          }
        </p>

        <div className="pt-4">
          <button className="btn-primary">
            Create your wedding site
          </button>
        </div>

        {hasWeddings && (
          <p className="text-sm text-neutral-400 pt-2">
            or select an existing wedding above
          </p>
        )}
      </div>
    </div>
  );
}

function HeartIcon({ className }: { className?: string }) {
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
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}
