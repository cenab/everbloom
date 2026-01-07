import { useState, useEffect, useCallback } from 'react';
import { CreateWedding } from './CreateWedding';
import { Guests } from './Guests';
import { getAuthToken } from '../lib/auth';
import type { Wedding, ApiResponse } from '@wedding-bestie/shared';

type View = 'dashboard' | 'create-wedding' | 'guests';

/**
 * Admin Dashboard component.
 * Shows empty state when no wedding is selected.
 * PRD: "Admin dashboard loads with no wedding selected"
 */
export function Dashboard() {
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [selectedWedding, setSelectedWedding] = useState<Wedding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>('dashboard');

  const fetchWeddings = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch('/api/weddings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<Wedding[]> = await response.json();

      if (data.ok) {
        setWeddings(data.data);
        // Auto-select first wedding if only one exists
        if (data.data.length === 1) {
          setSelectedWedding(data.data[0]);
        }
      }
    } catch {
      // Silent fail, show empty state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeddings();
  }, [fetchWeddings]);

  const hasWeddings = weddings.length > 0;

  if (view === 'create-wedding') {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <CreateWedding onCancel={() => setView('dashboard')} />
      </div>
    );
  }

  if (view === 'guests' && selectedWedding) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <Guests
          weddingId={selectedWedding.id}
          onBack={() => setView('dashboard')}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {!selectedWedding ? (
        <EmptyState
          hasWeddings={hasWeddings}
          weddings={weddings}
          onCreateWedding={() => setView('create-wedding')}
          onSelectWedding={setSelectedWedding}
        />
      ) : (
        <WeddingDashboard
          wedding={selectedWedding}
          onNavigateToGuests={() => setView('guests')}
          onBack={weddings.length > 1 ? () => setSelectedWedding(null) : undefined}
        />
      )}
    </div>
  );
}

interface EmptyStateProps {
  hasWeddings: boolean;
  weddings: Wedding[];
  onCreateWedding: () => void;
  onSelectWedding: (wedding: Wedding) => void;
}

/**
 * Empty state shown when no wedding is selected.
 * Uses calm, human language per design system microcopy rules.
 */
function EmptyState({ hasWeddings, weddings, onCreateWedding, onSelectWedding }: EmptyStateProps) {
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

        {hasWeddings && weddings.length > 0 && (
          <div className="space-y-2 pt-4">
            {weddings.map((wedding) => (
              <button
                key={wedding.id}
                onClick={() => onSelectWedding(wedding)}
                className="w-full px-4 py-3 border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 text-left transition-colors"
              >
                <span className="text-neutral-800 font-medium">{wedding.name}</span>
                <span className="text-sm text-neutral-500 block">
                  {wedding.partnerNames[0]} & {wedding.partnerNames[1]}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="pt-4">
          <button className="btn-primary" onClick={onCreateWedding}>
            {hasWeddings ? 'Create another wedding' : 'Create your wedding site'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface WeddingDashboardProps {
  wedding: Wedding;
  onNavigateToGuests: () => void;
  onBack?: () => void;
}

/**
 * Dashboard view when a wedding is selected.
 * Shows quick actions for the wedding including navigation to guests.
 */
function WeddingDashboard({ wedding, onNavigateToGuests, onBack }: WeddingDashboardProps) {
  return (
    <div>
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-neutral-600 hover:text-neutral-800 mb-6"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back to weddings
        </button>
      )}

      <div className="mb-8">
        <h1 className="text-2xl text-neutral-800">{wedding.name}</h1>
        <p className="text-neutral-500 mt-1">
          {wedding.partnerNames[0]} & {wedding.partnerNames[1]}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardCard
          title="Your guests"
          description="Add and manage your guest list"
          icon={<UsersIcon className="w-6 h-6" />}
          onClick={onNavigateToGuests}
        />
        <DashboardCard
          title="Your site"
          description="View your wedding website"
          icon={<GlobeIcon className="w-6 h-6" />}
          href={`/w/${wedding.slug}`}
          external
        />
      </div>
    </div>
  );
}

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  external?: boolean;
}

function DashboardCard({ title, description, icon, onClick, href, external }: DashboardCardProps) {
  const content = (
    <>
      <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mb-4">
        {icon}
      </div>
      <h3 className="text-lg text-neutral-800 font-medium mb-1">{title}</h3>
      <p className="text-sm text-neutral-500">{description}</p>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left block"
      >
        {content}
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left w-full"
    >
      {content}
    </button>
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

function UsersIcon({ className }: { className?: string }) {
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
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
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
