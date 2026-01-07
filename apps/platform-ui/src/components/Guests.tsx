import { useState, useEffect, useCallback } from 'react';
import type {
  Guest,
  CreateGuestRequest,
  GuestListResponse,
  ApiResponse,
} from '@wedding-bestie/shared';
import { getAuthToken } from '../lib/auth';

interface GuestsProps {
  weddingId: string;
  onBack: () => void;
}

/**
 * Guests page component for managing wedding invitees.
 * PRD: "Admin can add invitees manually"
 */
export function Guests({ weddingId, onBack }: GuestsProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

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

      const data: ApiResponse<GuestListResponse> = await response.json();

      if (data.ok) {
        setGuests(data.data.guests);
      } else {
        setError('Unable to load your guest list');
      }
    } catch {
      setError('Unable to load your guest list');
    } finally {
      setIsLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  const handleGuestAdded = (newGuest: Guest) => {
    setGuests((prev) => [...prev, newGuest].sort((a, b) => a.name.localeCompare(b.name)));
    setShowAddForm(false);
  };

  const handleGuestDeleted = (guestId: string) => {
    setGuests((prev) => prev.filter((g) => g.id !== guestId));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-neutral-600 hover:text-neutral-800 mb-4"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back to dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl text-neutral-800">Your guests</h1>
            <p className="text-neutral-500 mt-1">
              Manage your wedding guest list
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary"
            disabled={showAddForm}
          >
            Add guest
          </button>
        </div>
      </div>

      {showAddForm && (
        <AddGuestForm
          weddingId={weddingId}
          onSuccess={handleGuestAdded}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {error && (
        <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg text-primary-800 mb-6">
          {error}
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : guests.length === 0 ? (
        <EmptyState onAddGuest={() => setShowAddForm(true)} />
      ) : (
        <GuestList
          guests={guests}
          weddingId={weddingId}
          onDelete={handleGuestDeleted}
        />
      )}
    </div>
  );
}

interface AddGuestFormProps {
  weddingId: string;
  onSuccess: (guest: Guest) => void;
  onCancel: () => void;
}

function AddGuestForm({ weddingId, onSuccess, onCancel }: AddGuestFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim() && email.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = getAuthToken();
      const body: CreateGuestRequest = {
        name: name.trim(),
        email: email.trim(),
      };

      const response = await fetch(`/api/weddings/${weddingId}/guests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data: ApiResponse<Guest> = await response.json();

      if (data.ok) {
        onSuccess(data.data);
      } else {
        if ('error' in data && data.error === 'GUEST_ALREADY_EXISTS') {
          setError('A guest with this email already exists');
        } else {
          setError('Unable to add guest. Please try again.');
        }
      }
    } catch {
      setError('Unable to add guest. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6 mb-6">
      <h3 className="text-lg text-neutral-800 mb-4">Add a new guest</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="guestName"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Name
            </label>
            <input
              id="guestName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div>
            <label
              htmlFor="guestEmail"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Email
            </label>
            <input
              id="guestEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg text-primary-800 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add guest'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface GuestListProps {
  guests: Guest[];
  weddingId: string;
  onDelete: (guestId: string) => void;
}

function GuestList({ guests, weddingId, onDelete }: GuestListProps) {
  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-100">
        <span className="text-sm text-neutral-600">
          {guests.length} {guests.length === 1 ? 'guest' : 'guests'}
        </span>
      </div>
      <ul className="divide-y divide-neutral-200">
        {guests.map((guest) => (
          <GuestRow
            key={guest.id}
            guest={guest}
            weddingId={weddingId}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </div>
  );
}

interface GuestRowProps {
  guest: Guest;
  weddingId: string;
  onDelete: (guestId: string) => void;
}

function GuestRow({ guest, weddingId, onDelete }: GuestRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove this guest?')) return;

    setIsDeleting(true);
    try {
      const token = getAuthToken();
      const response = await fetch(
        `/api/weddings/${weddingId}/guests/${guest.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        onDelete(guest.id);
      }
    } catch {
      // Silently fail, guest remains in list
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <li className="px-4 py-4 flex items-center justify-between">
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
      <div className="flex items-center gap-4">
        <RsvpStatusBadge status={guest.rsvpStatus} />
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-neutral-400 hover:text-primary-600 p-2 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50"
          title="Remove guest"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </li>
  );
}

function RsvpStatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-neutral-100 text-neutral-600',
    attending: 'bg-accent-100 text-accent-700',
    not_attending: 'bg-primary-100 text-primary-700',
  };

  const labels = {
    pending: 'No response',
    attending: 'Attending',
    not_attending: 'Not attending',
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}
    >
      {labels[status as keyof typeof labels] || 'No response'}
    </span>
  );
}

interface EmptyStateProps {
  onAddGuest: () => void;
}

function EmptyState({ onAddGuest }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-6 bg-neutral-50 border border-neutral-200 rounded-lg">
      <div className="w-14 h-14 mx-auto rounded-full bg-primary-100 flex items-center justify-center mb-4">
        <UsersIcon className="w-7 h-7 text-primary-500" />
      </div>
      <h3 className="text-lg text-neutral-800 mb-2">No guests yet</h3>
      <p className="text-neutral-500 mb-6 max-w-sm mx-auto">
        Start building your guest list by adding your first invitee
      </p>
      <button onClick={onAddGuest} className="btn-primary">
        Add your first guest
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="text-center py-12">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-neutral-500">Loading guests...</p>
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

function TrashIcon({ className }: { className?: string }) {
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
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}
