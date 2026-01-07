import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../lib/auth';
import type {
  Guest,
  ApiResponse,
  SendSaveTheDateResponse,
  SendThankYouResponse,
} from '../types';

interface CommunicationsProps {
  weddingId: string;
  onBack: () => void;
}

/**
 * Communications component for sending various email types.
 * PRD: "Admin can send save-the-date emails"
 * PRD: "Admin can send thank-you emails"
 */
export function Communications({ weddingId, onBack }: CommunicationsProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingType, setSendingType] = useState<'save_the_date' | 'thank_you' | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);

  const fetchGuests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
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
      } else {
        setError('Unable to load guests');
      }
    } catch {
      setError('Unable to load guests');
    } finally {
      setIsLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

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

  const handleInitiateSend = (type: 'save_the_date' | 'thank_you') => {
    if (selectedGuestIds.size === 0) {
      setError('Please select at least one guest');
      return;
    }
    setSendingType(type);
    setShowConfirmDialog(true);
  };

  const handleSend = async () => {
    if (!sendingType || selectedGuestIds.size === 0) return;

    setError(null);
    try {
      const token = getAuthToken();
      const endpoint = sendingType === 'save_the_date'
        ? `/api/weddings/${weddingId}/invitations/save-the-date`
        : `/api/weddings/${weddingId}/invitations/thank-you`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ guestIds: Array.from(selectedGuestIds) }),
      });

      const data: ApiResponse<SendSaveTheDateResponse | SendThankYouResponse> = await response.json();

      if (data.ok) {
        setSendResult({ sent: data.data.sent, failed: data.data.failed });
        setSelectedGuestIds(new Set());
      } else {
        setError('Failed to send emails. Please try again.');
      }
    } catch {
      setError('Failed to send emails. Please try again.');
    } finally {
      setShowConfirmDialog(false);
    }
  };

  const handleCloseResult = () => {
    setSendResult(null);
    setSendingType(null);
  };

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-500">Loading guests...</p>
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
        <h2 className="text-2xl font-serif text-neutral-800">Communications</h2>
        <p className="text-neutral-500 mt-1">Send save-the-dates and thank-you messages to your guests.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {sendResult && (
        <div className="mb-6 p-4 bg-accent-50 border border-accent-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-accent-800">
                {sendResult.sent} email{sendResult.sent !== 1 ? 's' : ''} sent successfully
                {sendResult.failed > 0 && `, ${sendResult.failed} failed`}
              </p>
              <p className="text-sm text-accent-700 mt-1">
                {sendingType === 'save_the_date' ? 'Save-the-date' : 'Thank-you'} messages have been sent.
              </p>
            </div>
            <button
              onClick={handleCloseResult}
              className="text-accent-600 hover:text-accent-700"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-200">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
              <CalendarIcon className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-neutral-800">Save-the-Date</h3>
              <p className="text-sm text-neutral-500 mt-1">
                Let your guests know the date is set. No RSVP link included.
              </p>
              <button
                onClick={() => handleInitiateSend('save_the_date')}
                disabled={selectedGuestIds.size === 0}
                className="mt-4 px-4 py-2 bg-primary-600 text-neutral-50 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Send Save-the-Date
              </button>
            </div>
          </div>
        </div>

        <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-200">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center flex-shrink-0">
              <HeartIcon className="w-5 h-5 text-accent-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-neutral-800">Thank-You</h3>
              <p className="text-sm text-neutral-500 mt-1">
                Express your gratitude after the celebration. Personalized by attendance.
              </p>
              <button
                onClick={() => handleInitiateSend('thank_you')}
                disabled={selectedGuestIds.size === 0}
                className="mt-4 px-4 py-2 bg-accent-600 text-neutral-50 rounded-lg hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Send Thank-You
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Selection */}
      <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-neutral-800">Select Recipients</h3>
          <button
            onClick={handleSelectAll}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {selectedGuestIds.size === guests.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        {guests.length === 0 ? (
          <p className="text-neutral-500 text-center py-8">
            No guests have been added yet. Add guests first to send communications.
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {guests.map((guest) => (
              <label
                key={guest.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedGuestIds.has(guest.id)}
                  onChange={() => handleToggleGuest(guest.id)}
                  className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <div className="flex-1">
                  <p className="text-neutral-800">{guest.name}</p>
                  <p className="text-sm text-neutral-500">{guest.email}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    guest.rsvpStatus === 'attending'
                      ? 'bg-accent-100 text-accent-700'
                      : guest.rsvpStatus === 'not_attending'
                        ? 'bg-neutral-200 text-neutral-600'
                        : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {guest.rsvpStatus === 'attending'
                    ? 'Attending'
                    : guest.rsvpStatus === 'not_attending'
                      ? 'Not attending'
                      : 'Pending'}
                </span>
              </label>
            ))}
          </div>
        )}

        {selectedGuestIds.size > 0 && (
          <p className="mt-4 text-sm text-neutral-600">
            {selectedGuestIds.size} guest{selectedGuestIds.size !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center z-50">
          <div className="bg-neutral-50 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-medium text-neutral-800 mb-4">
              Confirm Send
            </h3>
            <p className="text-neutral-600 mb-6">
              Send {sendingType === 'save_the_date' ? 'save-the-date' : 'thank-you'} emails to{' '}
              <strong>{selectedGuestIds.size} guest{selectedGuestIds.size !== 1 ? 's' : ''}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-neutral-600 hover:text-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                className="px-4 py-2 bg-primary-600 text-neutral-50 rounded-lg hover:bg-primary-700"
              >
                Send
              </button>
            </div>
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

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
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
