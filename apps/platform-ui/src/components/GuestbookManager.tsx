import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../lib/auth';
import type {
  GuestbookMessage,
  GuestbookMessagesResponse,
  GuestbookSummaryResponse,
  ApiResponse,
} from '../types';

interface GuestbookManagerProps {
  weddingId: string;
}

/**
 * Guestbook management component for admin dashboard.
 * PRD: "Admin can moderate guestbook messages"
 */
export function GuestbookManager({ weddingId }: GuestbookManagerProps) {
  const [messages, setMessages] = useState<GuestbookMessage[]>([]);
  const [summary, setSummary] = useState<GuestbookSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [moderating, setModerating] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/guestbook/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<GuestbookMessagesResponse> = await response.json();

      if (data.ok) {
        setMessages(data.data.messages);
      } else {
        setError('Unable to load guestbook messages');
      }
    } catch {
      setError('Unable to load guestbook messages');
    }
  }, [weddingId]);

  const fetchSummary = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/guestbook/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<GuestbookSummaryResponse> = await response.json();

      if (data.ok) {
        setSummary(data.data);
      }
    } catch {
      // Summary is optional, don't show error
    }
  }, [weddingId]);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await Promise.all([fetchMessages(), fetchSummary()]);
    setIsLoading(false);
  }, [fetchMessages, fetchSummary]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleModerate = async (messageId: string, status: 'approved' | 'rejected') => {
    setModerating(messageId);
    try {
      const token = getAuthToken();
      const response = await fetch(
        `/api/weddings/${weddingId}/guestbook/messages/${messageId}/moderate`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        },
      );

      const data = await response.json();

      if (data.ok) {
        // Refresh messages and summary
        await fetchAll();
      } else {
        setError('Unable to moderate message');
      }
    } catch {
      setError('Unable to moderate message');
    } finally {
      setModerating(null);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(
        `/api/weddings/${weddingId}/guestbook/messages/${messageId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (data.ok) {
        await fetchAll();
      } else {
        setError('Unable to delete message');
      }
    } catch {
      setError('Unable to delete message');
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (filter === 'all') return true;
    return m.status === filter;
  });

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-500">Loading guestbook...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl text-neutral-800">Guestbook messages</h1>
        <p className="text-neutral-500 mt-1">
          Review and approve messages from your guests
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg text-primary-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 text-primary-600 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            label="Total messages"
            value={summary.total}
            color="neutral"
          />
          <SummaryCard
            label="Pending review"
            value={summary.pending}
            color="amber"
          />
          <SummaryCard
            label="Approved"
            value={summary.approved}
            color="accent"
          />
          <SummaryCard
            label="Rejected"
            value={summary.rejected}
            color="primary"
          />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary-100 text-primary-700'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Messages list */}
      {filteredMessages.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 border border-neutral-200 rounded-lg">
          <MessageIcon className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg text-neutral-700 mb-2">
            {filter === 'all' ? 'No messages yet' : `No ${filter} messages`}
          </h3>
          <p className="text-neutral-500">
            {filter === 'all'
              ? 'Messages from your guests will appear here.'
              : `You don't have any ${filter} messages.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              onApprove={() => handleModerate(message.id, 'approved')}
              onReject={() => handleModerate(message.id, 'rejected')}
              onDelete={() => handleDelete(message.id)}
              isModerating={moderating === message.id}
            />
          ))}
        </div>
      )}

      {/* Refresh button */}
      <div className="mt-8">
        <button
          onClick={fetchAll}
          className="text-sm text-neutral-500 hover:text-neutral-700 flex items-center gap-2"
        >
          <RefreshIcon className="w-4 h-4" />
          Refresh messages
        </button>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  color: 'neutral' | 'amber' | 'accent' | 'primary';
}

function SummaryCard({ label, value, color }: SummaryCardProps) {
  const colorClasses = {
    neutral: 'bg-neutral-100 text-neutral-600',
    amber: 'bg-amber-100 text-amber-600',
    accent: 'bg-accent-100 text-accent-600',
    primary: 'bg-primary-100 text-primary-600',
  };

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
      <div className={`w-10 h-10 rounded-full ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <span className="text-lg font-medium">{value}</span>
      </div>
      <p className="text-sm text-neutral-500">{label}</p>
    </div>
  );
}

interface MessageCardProps {
  message: GuestbookMessage;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  isModerating: boolean;
}

function MessageCard({
  message,
  onApprove,
  onReject,
  onDelete,
  isModerating,
}: MessageCardProps) {
  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-accent-100 text-accent-700',
    rejected: 'bg-primary-100 text-primary-700',
  };

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-neutral-800">{message.guestName}</h3>
          <p className="text-sm text-neutral-500">
            {new Date(message.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm ${statusColors[message.status]}`}>
          {message.status}
        </span>
      </div>

      <p className="text-neutral-700 whitespace-pre-wrap mb-6">{message.message}</p>

      <div className="flex items-center gap-3">
        {message.status !== 'approved' && (
          <button
            onClick={onApprove}
            disabled={isModerating}
            className="px-4 py-2 bg-accent-500 text-neutral-50 rounded-lg text-sm font-medium hover:bg-accent-600 disabled:opacity-50"
          >
            {isModerating ? 'Saving...' : 'Approve'}
          </button>
        )}
        {message.status !== 'rejected' && (
          <button
            onClick={onReject}
            disabled={isModerating}
            className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-300 disabled:opacity-50"
          >
            {isModerating ? 'Saving...' : 'Reject'}
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={isModerating}
          className="px-4 py-2 text-primary-600 hover:text-primary-700 text-sm font-medium disabled:opacity-50"
        >
          Delete
        </button>
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

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
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
