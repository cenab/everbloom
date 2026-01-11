import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../lib/auth';
import type { EmailStatistics, ApiResponse, EmailStatisticsResponse } from '../types';

interface EmailStatisticsProps {
  weddingId: string;
}

/**
 * Email delivery statistics dashboard component.
 * PRD: "Dashboard shows email delivery statistics"
 * Shows total sent, delivered, failed counts and breakdown by email type.
 */
export function EmailStatisticsDashboard({ weddingId }: EmailStatisticsProps) {
  const [statistics, setStatistics] = useState<EmailStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/invitations/statistics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<EmailStatisticsResponse> = await response.json();

      if (data.ok) {
        setStatistics(data.data.statistics);
      } else {
        setError('Unable to load email statistics');
      }
    } catch {
      setError('Unable to load email statistics');
    } finally {
      setIsLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-500">Loading statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="text-center py-16">
          <p className="text-neutral-500">{error}</p>
          <button
            onClick={fetchStatistics}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return null;
  }

  // Calculate delivery rate
  const deliveryRate = statistics.totalSent > 0
    ? Math.round((statistics.delivered / statistics.totalSent) * 100)
    : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl text-neutral-800">Email delivery statistics</h1>
        <p className="text-neutral-500 mt-1">
          Track how your invitations and reminders are being delivered
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total sent"
          value={statistics.totalSent}
          icon={<EnvelopeIcon className="w-5 h-5" />}
          color="neutral"
        />
        <StatCard
          label="Delivered"
          value={statistics.delivered}
          icon={<CheckCircleIcon className="w-5 h-5" />}
          color="accent"
        />
        <StatCard
          label="Failed"
          value={statistics.failed}
          icon={<ExclamationCircleIcon className="w-5 h-5" />}
          color="primary"
        />
        <StatCard
          label="Pending"
          value={statistics.pending}
          icon={<ClockIcon className="w-5 h-5" />}
          color="neutral"
        />
      </div>

      {/* Delivery rate */}
      {statistics.totalSent > 0 && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-neutral-600">Delivery rate</span>
            <span className="text-2xl font-medium text-neutral-800">{deliveryRate}%</span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2">
            <div
              className="bg-accent-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${deliveryRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Breakdown by type */}
      <div className="space-y-6">
        <h2 className="text-lg text-neutral-800">Breakdown by email type</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TypeBreakdownCard
            title="Invitations"
            stats={statistics.byType.invitation}
          />
          <TypeBreakdownCard
            title="Reminders"
            stats={statistics.byType.reminder}
          />
        </div>
      </div>

      {/* Empty state */}
      {statistics.totalSent === 0 && (
        <div className="text-center py-12 bg-neutral-50 border border-neutral-200 rounded-lg mt-8">
          <EnvelopeIcon className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg text-neutral-700 mb-2">No emails sent yet</h3>
          <p className="text-neutral-500">
            Start by adding guests and sending invitations from your guest list.
          </p>
        </div>
      )}

      {/* Refresh button */}
      <div className="mt-8">
        <button
          onClick={fetchStatistics}
          className="text-sm text-neutral-500 hover:text-neutral-700 flex items-center gap-2"
        >
          <RefreshIcon className="w-4 h-4" />
          Refresh statistics
        </button>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'neutral' | 'accent' | 'primary';
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    neutral: 'bg-neutral-100 text-neutral-600',
    accent: 'bg-accent-100 text-accent-600',
    primary: 'bg-primary-100 text-primary-600',
  };

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
      <div className={`w-10 h-10 rounded-full ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-medium text-neutral-800">{value}</p>
      <p className="text-sm text-neutral-500">{label}</p>
    </div>
  );
}

interface TypeBreakdownCardProps {
  title: string;
  stats: { sent: number; delivered: number; failed: number };
}

function TypeBreakdownCard({ title, stats }: TypeBreakdownCardProps) {
  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
      <h3 className="text-neutral-700 font-medium mb-4">{title}</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-neutral-500">Sent</span>
          <span className="text-neutral-800">{stats.sent}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-neutral-500">Delivered</span>
          <span className="text-accent-600">{stats.delivered}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-neutral-500">Failed</span>
          <span className="text-primary-600">{stats.failed}</span>
        </div>
      </div>
    </div>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function EnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ExclamationCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}
