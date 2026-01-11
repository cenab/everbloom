import { useState, useEffect, useCallback } from 'react';
import type {
  Guest,
  RsvpSummary,
  RsvpSummaryResponse,
  ApiResponse,
} from '../types';
import { getAuthToken } from '../lib/auth';

const API_BASE = '/api';

interface RsvpDashboardProps {
  weddingId: string;
}

/**
 * RSVP Dashboard component for viewing RSVP summary and guest responses.
 * PRD: "Admin can view RSVP summary"
 */
export function RsvpDashboard({ weddingId }: RsvpDashboardProps) {
  const [summary, setSummary] = useState<RsvpSummary | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Export RSVP data for caterer as CSV
   * PRD: "Admin can export RSVPs for caterer"
   */
  const handleExportForCaterer = useCallback(async () => {
    setIsExporting(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/weddings/${weddingId}/guests/export-caterer`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'catering-export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setError('Unable to export catering data');
    } finally {
      setIsExporting(false);
    }
  }, [weddingId]);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/guests/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<RsvpSummaryResponse> = await response.json();

      if (data.ok) {
        setSummary(data.data.summary);
        setGuests(data.data.guests);
      } else {
        setError('Unable to load RSVP summary');
      }
    } catch {
      setError('Unable to load RSVP summary');
    } finally {
      setIsLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl text-neutral-800">RSVP responses</h1>
            <p className="text-neutral-500 mt-1">
              Track your guest responses
            </p>
          </div>
          {summary && summary.attending > 0 && (
            <button
              onClick={handleExportForCaterer}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-700 hover:bg-neutral-100 hover:border-neutral-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DownloadIcon className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export for caterer'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg text-primary-800 mb-6">
          {error}
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          {summary && <SummaryCards summary={summary} />}
          <GuestResponseList guests={guests} />
        </>
      )}
    </div>
  );
}

interface SummaryCardsProps {
  summary: RsvpSummary;
}

function SummaryCards({ summary }: SummaryCardsProps) {
  // Calculate response rate: (attending + notAttending) / total * 100
  const responded = summary.attending + summary.notAttending;
  const responseRate = summary.total > 0
    ? Math.round((responded / summary.total) * 100)
    : 0;

  return (
    <div className="space-y-6 mb-8">
      {/* Response rate banner */}
      <ResponseRateBanner
        responseRate={responseRate}
        responded={responded}
        total={summary.total}
      />

      {/* Breakdown cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Attending"
          value={summary.attending}
          subtext={`${summary.totalPartySize} guests total`}
          variant="success"
        />
        <SummaryCard
          label="Not attending"
          value={summary.notAttending}
          variant="muted"
        />
        <SummaryCard
          label="Awaiting response"
          value={summary.pending}
          variant="pending"
        />
        <SummaryCard
          label="Total invited"
          value={summary.total}
          variant="neutral"
        />
      </div>
    </div>
  );
}

interface ResponseRateBannerProps {
  responseRate: number;
  responded: number;
  total: number;
}

function ResponseRateBanner({ responseRate, responded, total }: ResponseRateBannerProps) {
  // Determine visual treatment based on response rate
  const getProgressColor = () => {
    if (responseRate >= 80) return 'bg-accent-500';
    if (responseRate >= 50) return 'bg-primary-400';
    return 'bg-primary-300';
  };

  const getMessage = () => {
    if (total === 0) return 'Add guests to start tracking responses';
    if (responseRate === 100) return 'All guests have responded!';
    if (responseRate >= 80) return 'Almost there! Most guests have responded';
    if (responseRate >= 50) return 'Over halfway there';
    if (responseRate > 0) return 'Responses are coming in';
    return 'Waiting for responses';
  };

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-neutral-600">Response rate</h3>
          <p className="text-3xl font-semibold text-neutral-800 mt-1">
            {responseRate}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-neutral-500">
            {responded} of {total} responded
          </p>
          <p className="text-xs text-neutral-400 mt-1">{getMessage()}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getProgressColor()} transition-all duration-500`}
          style={{ width: `${responseRate}%` }}
        />
      </div>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  subtext?: string;
  variant: 'success' | 'muted' | 'pending' | 'neutral';
}

function SummaryCard({ label, value, subtext, variant }: SummaryCardProps) {
  const variants = {
    success: 'bg-accent-50 border-accent-200',
    muted: 'bg-neutral-50 border-neutral-200',
    pending: 'bg-primary-50 border-primary-200',
    neutral: 'bg-neutral-100 border-neutral-300',
  };

  const valueColors = {
    success: 'text-accent-700',
    muted: 'text-neutral-600',
    pending: 'text-primary-700',
    neutral: 'text-neutral-800',
  };

  return (
    <div className={`p-4 rounded-lg border ${variants[variant]}`}>
      <p className="text-sm text-neutral-500 mb-1">{label}</p>
      <p className={`text-3xl font-medium ${valueColors[variant]}`}>{value}</p>
      {subtext && (
        <p className="text-xs text-neutral-400 mt-1">{subtext}</p>
      )}
    </div>
  );
}

interface GuestResponseListProps {
  guests: Guest[];
}

function GuestResponseList({ guests }: GuestResponseListProps) {
  if (guests.length === 0) {
    return (
      <div className="text-center py-12 px-6 bg-neutral-50 border border-neutral-200 rounded-lg">
        <div className="w-14 h-14 mx-auto rounded-full bg-primary-100 flex items-center justify-center mb-4">
          <ClipboardIcon className="w-7 h-7 text-primary-500" />
        </div>
        <h3 className="text-lg text-neutral-800 mb-2">No guests yet</h3>
        <p className="text-neutral-500 max-w-sm mx-auto">
          Add guests to your wedding to start tracking RSVPs
        </p>
      </div>
    );
  }

  // Group guests by RSVP status
  const attending = guests.filter((g) => g.rsvpStatus === 'attending');
  const notAttending = guests.filter((g) => g.rsvpStatus === 'not_attending');
  const pending = guests.filter((g) => g.rsvpStatus === 'pending');

  return (
    <div className="space-y-6">
      {attending.length > 0 && (
        <GuestSection
          title="Attending"
          guests={attending}
          variant="success"
        />
      )}
      {notAttending.length > 0 && (
        <GuestSection
          title="Not attending"
          guests={notAttending}
          variant="muted"
        />
      )}
      {pending.length > 0 && (
        <GuestSection
          title="Awaiting response"
          guests={pending}
          variant="pending"
        />
      )}
    </div>
  );
}

interface GuestSectionProps {
  title: string;
  guests: Guest[];
  variant: 'success' | 'muted' | 'pending';
}

function GuestSection({ title, guests, variant }: GuestSectionProps) {
  const headerColors = {
    success: 'bg-accent-50 border-accent-200',
    muted: 'bg-neutral-50 border-neutral-200',
    pending: 'bg-primary-50 border-primary-200',
  };

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg overflow-hidden">
      <div className={`px-4 py-3 border-b ${headerColors[variant]}`}>
        <span className="text-sm font-medium text-neutral-700">
          {title} ({guests.length})
        </span>
      </div>
      <ul className="divide-y divide-neutral-200">
        {guests.map((guest) => (
          <GuestRow key={guest.id} guest={guest} />
        ))}
      </ul>
    </div>
  );
}

interface GuestRowProps {
  guest: Guest;
}

function GuestRow({ guest }: GuestRowProps) {
  const hasPlusOnes = guest.plusOneGuests && guest.plusOneGuests.length > 0;

  return (
    <li className="px-4 py-4 bg-neutral-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-primary-700 font-medium">
              {guest.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-neutral-800 font-medium">{guest.name}</p>
            <p className="text-sm text-neutral-500">{guest.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          {guest.rsvpStatus === 'attending' && (
            <div>
              <p className="text-sm font-medium text-accent-700">
                Party of {guest.partySize}
              </p>
              {guest.dietaryNotes && (
                <p className="text-xs text-neutral-500 max-w-[200px] truncate">
                  {guest.dietaryNotes}
                </p>
              )}
            </div>
          )}
          {guest.rsvpSubmittedAt && (
            <p className="text-xs text-neutral-400">
              {formatDate(guest.rsvpSubmittedAt)}
            </p>
          )}
        </div>
      </div>

      {/* Plus-one guests display */}
      {hasPlusOnes && guest.rsvpStatus === 'attending' && (
        <div className="mt-3 ml-14 pl-4 border-l-2 border-accent-200">
          <p className="text-xs text-neutral-500 mb-2 font-medium uppercase tracking-wide">
            Additional guests
          </p>
          <ul className="space-y-2">
            {guest.plusOneGuests!.map((plusOne, index) => (
              <li key={index} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent-50 flex items-center justify-center">
                  <span className="text-accent-700 text-xs font-medium">
                    {plusOne.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-neutral-700">{plusOne.name}</span>
                  {plusOne.dietaryNotes && (
                    <span className="text-xs text-neutral-400 ml-2">
                      ({plusOne.dietaryNotes})
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function LoadingState() {
  return (
    <div className="text-center py-12">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-neutral-500">Loading RSVP responses...</p>
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

function ClipboardIcon({ className }: { className?: string }) {
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
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
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
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}
