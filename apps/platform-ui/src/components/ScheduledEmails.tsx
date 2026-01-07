import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../lib/auth';
import type {
  Guest,
  ApiResponse,
  ScheduledEmail,
  ScheduledEmailsListResponse,
  ScheduleEmailResponse,
  CancelScheduledEmailResponse,
  EmailType,
} from '../types';

interface ScheduledEmailsProps {
  weddingId: string;
  onBack: () => void;
}

/**
 * ScheduledEmails component for managing scheduled email sends.
 * PRD: "Admin can schedule emails for future send"
 * PRD: "Admin can view and cancel scheduled emails"
 */
export function ScheduledEmails({ weddingId, onBack }: ScheduledEmailsProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Schedule form state
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleEmailType, setScheduleEmailType] = useState<EmailType>('invitation');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  // Cancel confirmation state
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchGuests = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/guests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<Guest[]> = await response.json();

      if (data.ok) {
        setGuests(data.data);
      }
    } catch {
      // Ignore - we'll show empty guest list
    }
  }, [weddingId]);

  const fetchScheduledEmails = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/invitations/scheduled`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<ScheduledEmailsListResponse> = await response.json();

      if (data.ok) {
        setScheduledEmails(data.data.scheduledEmails);
      }
    } catch {
      // Ignore - we'll show empty list
    }
  }, [weddingId]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await Promise.all([fetchGuests(), fetchScheduledEmails()]);
    setIsLoading(false);
  }, [fetchGuests, fetchScheduledEmails]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleGuest = (guestId: string) => {
    setSelectedGuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(guestId)) {
        next.delete(guestId);
      } else {
        next.add(guestId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedGuestIds.size === guests.length) {
      setSelectedGuestIds(new Set());
    } else {
      setSelectedGuestIds(new Set(guests.map((g) => g.id)));
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGuestIds.size === 0) {
      setError('Please select at least one guest');
      return;
    }

    if (!scheduleDate || !scheduleTime) {
      setError('Please select a date and time');
      return;
    }

    // Combine date and time into ISO string
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();

    // Validate it's in the future
    if (new Date(scheduledAt).getTime() <= Date.now()) {
      setError('Scheduled time must be in the future');
      return;
    }

    setIsScheduling(true);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/invitations/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          guestIds: Array.from(selectedGuestIds),
          emailType: scheduleEmailType,
          scheduledAt,
        }),
      });

      const data: ApiResponse<ScheduleEmailResponse> = await response.json();

      if (data.ok) {
        setSuccessMessage(
          `Scheduled ${getEmailTypeLabel(scheduleEmailType)} for ${selectedGuestIds.size} guest${selectedGuestIds.size !== 1 ? 's' : ''}`
        );
        setSelectedGuestIds(new Set());
        setShowScheduleForm(false);
        setScheduleDate('');
        setScheduleTime('');
        await fetchScheduledEmails();
      } else {
        setError('Failed to schedule email. Please try again.');
      }
    } catch {
      setError('Failed to schedule email. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCancelScheduledEmail = async (scheduledEmailId: string) => {
    setCancellingId(scheduledEmailId);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch(
        `/api/weddings/${weddingId}/invitations/scheduled/${scheduledEmailId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data: ApiResponse<CancelScheduledEmailResponse> = await response.json();

      if (data.ok) {
        setSuccessMessage('Scheduled email cancelled');
        await fetchScheduledEmails();
      } else {
        setError('Failed to cancel scheduled email');
      }
    } catch {
      setError('Failed to cancel scheduled email');
    } finally {
      setCancellingId(null);
    }
  };

  const getEmailTypeLabel = (type: EmailType): string => {
    switch (type) {
      case 'invitation':
        return 'Invitation';
      case 'reminder':
        return 'Reminder';
      case 'save_the_date':
        return 'Save-the-Date';
      case 'thank_you':
        return 'Thank-You';
      default:
        return type;
    }
  };

  const getStatusColor = (status: ScheduledEmail['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-accent-100 text-accent-700';
      case 'cancelled':
        return 'bg-neutral-200 text-neutral-600';
      default:
        return 'bg-neutral-100 text-neutral-500';
    }
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  // Get minimum date for the date picker (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-neutral-600 hover:text-neutral-800 mb-6"
      >
        <ChevronLeftIcon className="w-4 h-4" />
        Back
      </button>

      <div className="mb-8">
        <h2 className="text-2xl font-serif text-neutral-800">Scheduled Emails</h2>
        <p className="text-neutral-500 mt-1">
          Schedule emails to be sent at a specific time in the future.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right text-red-600 hover:text-red-800"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-accent-50 border border-accent-200 rounded-lg text-accent-800">
          {successMessage}
          <button
            onClick={() => setSuccessMessage(null)}
            className="float-right text-accent-600 hover:text-accent-800"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Scheduled Emails List */}
      <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-200 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-neutral-800">Pending Scheduled Emails</h3>
          <button
            onClick={() => setShowScheduleForm(true)}
            className="px-4 py-2 bg-primary-600 text-neutral-50 rounded-lg hover:bg-primary-700 text-sm"
          >
            Schedule New Email
          </button>
        </div>

        {scheduledEmails.filter((e) => e.status === 'pending').length === 0 ? (
          <p className="text-neutral-500 text-center py-8">
            No scheduled emails. Click "Schedule New Email" to create one.
          </p>
        ) : (
          <div className="space-y-4">
            {scheduledEmails
              .filter((e) => e.status === 'pending')
              .map((email) => (
                <div
                  key={email.id}
                  className="flex items-center justify-between p-4 bg-neutral-100 rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-800">
                        {getEmailTypeLabel(email.emailType)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(
                          email.status
                        )}`}
                      >
                        {email.status}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-500 mt-1">
                      {email.guestIds.length} recipient{email.guestIds.length !== 1 ? 's' : ''} •
                      Scheduled for {formatDateTime(email.scheduledAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancelScheduledEmail(email.id)}
                    disabled={cancellingId === email.id}
                    className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  >
                    {cancellingId === email.id ? 'Cancelling...' : 'Cancel'}
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Past Scheduled Emails (Completed/Cancelled) */}
      {scheduledEmails.filter((e) => e.status !== 'pending').length > 0 && (
        <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-200 mb-8">
          <h3 className="font-medium text-neutral-800 mb-4">Past Scheduled Emails</h3>
          <div className="space-y-4">
            {scheduledEmails
              .filter((e) => e.status !== 'pending')
              .map((email) => (
                <div
                  key={email.id}
                  className="flex items-center justify-between p-4 bg-neutral-100 rounded-lg opacity-75"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-800">
                        {getEmailTypeLabel(email.emailType)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(
                          email.status
                        )}`}
                      >
                        {email.status}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-500 mt-1">
                      {email.guestIds.length} recipient{email.guestIds.length !== 1 ? 's' : ''}
                      {email.results && (
                        <span>
                          {' '}
                          • {email.results.sent} sent, {email.results.failed} failed
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Schedule Form Modal */}
      {showScheduleForm && (
        <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center z-50">
          <div className="bg-neutral-50 rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-neutral-800">Schedule Email</h3>
              <button
                onClick={() => setShowScheduleForm(false)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit}>
              {/* Email Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Email Type
                </label>
                <select
                  value={scheduleEmailType}
                  onChange={(e) => setScheduleEmailType(e.target.value as EmailType)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-neutral-50"
                >
                  <option value="invitation">Invitation</option>
                  <option value="reminder">Reminder</option>
                  <option value="save_the_date">Save-the-Date</option>
                  <option value="thank_you">Thank-You</option>
                </select>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={getMinDate()}
                    required
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-neutral-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-neutral-50"
                  />
                </div>
              </div>

              {/* Guest Selection */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-neutral-700">
                    Select Recipients
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    {selectedGuestIds.size === guests.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                {guests.length === 0 ? (
                  <p className="text-neutral-500 text-center py-4">
                    No guests have been added yet.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto border border-neutral-200 rounded-lg p-2">
                    {guests.map((guest) => (
                      <label
                        key={guest.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-neutral-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGuestIds.has(guest.id)}
                          onChange={() => handleToggleGuest(guest.id)}
                          className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-neutral-800 truncate">{guest.name}</p>
                          <p className="text-xs text-neutral-500 truncate">{guest.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {selectedGuestIds.size > 0 && (
                  <p className="mt-2 text-sm text-neutral-600">
                    {selectedGuestIds.size} guest{selectedGuestIds.size !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowScheduleForm(false)}
                  className="px-4 py-2 text-neutral-600 hover:text-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isScheduling || selectedGuestIds.size === 0}
                  className="px-4 py-2 bg-primary-600 text-neutral-50 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isScheduling ? 'Scheduling...' : 'Schedule Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
