import { useState, useEffect } from 'react';
import { getAuthToken } from '../lib/auth';
import type { Wedding, EventDetailsData, WeddingEvent, WeddingEventType, ApiResponse, RenderConfig } from '../types';

interface EventSettingsProps {
  wedding: Wedding;
  onBack: () => void;
  onEventDetailsChanged: () => void;
}

interface UpdateEventDetailsResponse {
  wedding: Wedding;
  renderConfig: RenderConfig;
}

interface EventFormData {
  id: string;
  type: WeddingEventType;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  address: string;
  city: string;
  timezone: string;
}

const DEFAULT_EVENT: Omit<EventFormData, 'id'> = {
  type: 'ceremony',
  name: 'Ceremony',
  date: '',
  startTime: '',
  endTime: '',
  venue: '',
  address: '',
  city: '',
  timezone: '',
};

function createEmptyEvent(type: WeddingEventType): EventFormData {
  return {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    name: type === 'ceremony' ? 'Ceremony' : type === 'reception' ? 'Reception' : 'Event',
    date: '',
    startTime: '',
    endTime: '',
    venue: '',
    address: '',
    city: '',
    timezone: '',
  };
}

/**
 * Admin settings component for configuring event details (date, time, venue)
 * Supports multiple events (ceremony + reception)
 * Required for calendar invites to work
 */
export function EventSettings({
  wedding,
  onBack,
  onEventDetailsChanged,
}: EventSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-event form state
  const [events, setEvents] = useState<EventFormData[]>([]);

  // Fetch current event details from render_config
  useEffect(() => {
    fetchEventDetails();
  }, [wedding.id]);

  const fetchEventDetails = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/render-config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<RenderConfig> = await response.json();

      if (data.ok && data.data.eventDetails) {
        const ed = data.data.eventDetails;

        // Check if we have multi-event data
        if (ed.events && ed.events.length > 0) {
          setEvents(ed.events.map((e) => ({
            id: e.id,
            type: e.type,
            name: e.name,
            date: e.date,
            startTime: e.startTime,
            endTime: e.endTime,
            venue: e.venue,
            address: e.address,
            city: e.city,
            timezone: e.timezone || '',
          })));
        } else {
          // Convert legacy single-event to multi-event format
          setEvents([{
            id: 'ceremony-legacy',
            type: 'ceremony',
            name: 'Ceremony',
            date: ed.date,
            startTime: ed.startTime,
            endTime: ed.endTime,
            venue: ed.venue,
            address: ed.address,
            city: ed.city,
            timezone: ed.timezone || '',
          }]);
        }
      } else {
        // No event details yet - start with ceremony
        setEvents([createEmptyEvent('ceremony')]);
      }
    } catch {
      // Start with empty ceremony
      setEvents([createEmptyEvent('ceremony')]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEventChange = (index: number, field: keyof EventFormData, value: string) => {
    setEvents((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addReception = () => {
    if (!events.some((e) => e.type === 'reception')) {
      // Copy date and timezone from ceremony if available
      const ceremony = events.find((e) => e.type === 'ceremony');
      const reception = createEmptyEvent('reception');
      if (ceremony) {
        reception.date = ceremony.date;
        reception.timezone = ceremony.timezone;
      }
      setEvents((prev) => [...prev, reception]);
    }
  };

  const removeEvent = (index: number) => {
    // Don't allow removing the last event
    if (events.length > 1) {
      setEvents((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const token = getAuthToken();

      // Convert form data to WeddingEvent format
      const weddingEvents: WeddingEvent[] = events.map((e) => ({
        id: e.id,
        type: e.type,
        name: e.name,
        date: e.date,
        startTime: e.startTime,
        endTime: e.endTime,
        venue: e.venue,
        address: e.address,
        city: e.city,
        ...(e.timezone && { timezone: e.timezone }),
      }));

      // Use first event for top-level fields (backwards compatibility)
      const primaryEvent = weddingEvents[0];
      const eventDetails: EventDetailsData = {
        date: primaryEvent.date,
        startTime: primaryEvent.startTime,
        endTime: primaryEvent.endTime,
        venue: primaryEvent.venue,
        address: primaryEvent.address,
        city: primaryEvent.city,
        ...(primaryEvent.timezone && { timezone: primaryEvent.timezone }),
        events: weddingEvents,
      };

      const response = await fetch(`/api/weddings/${wedding.id}/event-details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ eventDetails }),
      });

      const data: ApiResponse<UpdateEventDetailsResponse> = await response.json();

      if (data.ok) {
        setSaveSuccess(true);
        onEventDetailsChanged();
        // Clear success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError('error' in data ? data.error : 'Failed to save event details');
      }
    } catch {
      setError('Failed to save event details');
    } finally {
      setIsSaving(false);
    }
  };

  const isEventValid = (event: EventFormData) =>
    event.date && event.startTime && event.endTime && event.venue && event.address && event.city;

  const isValid = events.length > 0 && events.every(isEventValid);

  const hasReception = events.some((e) => e.type === 'reception');

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-500">Loading event details...</p>
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
        Back to dashboard
      </button>

      <div className="mb-8">
        <h1 className="text-2xl text-neutral-800">Event details</h1>
        <p className="text-neutral-500 mt-1">
          Configure the date, time, and venue for your ceremony and reception.
          This information is displayed on your wedding site and used for calendar invites.
        </p>
      </div>

      <div className="max-w-2xl space-y-8">
        {events.map((event, index) => (
          <EventCard
            key={event.id}
            event={event}
            index={index}
            canRemove={events.length > 1}
            onRemove={() => removeEvent(index)}
            onChange={(field, value) => handleEventChange(index, field, value)}
          />
        ))}

        {/* Add Reception button */}
        {!hasReception && (
          <button
            onClick={addReception}
            className="w-full py-4 border-2 border-dashed border-neutral-300 rounded-lg text-neutral-600 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add reception details
          </button>
        )}

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Success message */}
        {saveSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            Event details saved successfully
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving || !isValid}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save event details'}
          </button>
          <button
            onClick={onBack}
            className="px-4 py-2 text-neutral-600 hover:text-neutral-800"
          >
            Cancel
          </button>
        </div>

        {!isValid && (
          <p className="text-sm text-neutral-500">
            All fields except timezone are required for each event
          </p>
        )}
      </div>
    </div>
  );
}

interface EventCardProps {
  event: EventFormData;
  index: number;
  canRemove: boolean;
  onRemove: () => void;
  onChange: (field: keyof EventFormData, value: string) => void;
}

function EventCard({ event, index, canRemove, onRemove, onChange }: EventCardProps) {
  const typeLabel = event.type === 'ceremony' ? 'Ceremony' : event.type === 'reception' ? 'Reception' : 'Event';

  return (
    <div className="border border-neutral-200 rounded-lg p-6 bg-neutral-50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-lg font-medium text-neutral-800">{typeLabel}</span>
          <span className="px-2 py-0.5 text-xs bg-neutral-200 text-neutral-600 rounded">
            {event.type}
          </span>
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            className="text-neutral-400 hover:text-red-500 transition-colors"
            title={`Remove ${typeLabel.toLowerCase()}`}
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Event name */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Event name
          </label>
          <input
            type="text"
            value={event.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder={typeLabel}
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-neutral-50"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Date
          </label>
          <input
            type="date"
            value={event.date}
            onChange={(e) => onChange('date', e.target.value)}
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-neutral-50"
          />
        </div>

        {/* Times */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Start time
            </label>
            <input
              type="time"
              value={event.startTime}
              onChange={(e) => onChange('startTime', e.target.value)}
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-neutral-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              End time
            </label>
            <input
              type="time"
              value={event.endTime}
              onChange={(e) => onChange('endTime', e.target.value)}
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-neutral-50"
            />
          </div>
        </div>

        {/* Venue */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Venue name
          </label>
          <input
            type="text"
            value={event.venue}
            onChange={(e) => onChange('venue', e.target.value)}
            placeholder="The Grand Ballroom"
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-neutral-50"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Full address
          </label>
          <input
            type="text"
            value={event.address}
            onChange={(e) => onChange('address', e.target.value)}
            placeholder="123 Wedding Lane, Suite 100"
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-neutral-50"
          />
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            City
          </label>
          <input
            type="text"
            value={event.city}
            onChange={(e) => onChange('city', e.target.value)}
            placeholder="San Francisco, CA"
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-neutral-50"
          />
        </div>

        {/* Timezone (optional) */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Timezone (optional)
          </label>
          <select
            value={event.timezone}
            onChange={(e) => onChange('timezone', e.target.value)}
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-neutral-50"
          >
            <option value="">Select timezone...</option>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="America/Phoenix">Arizona Time</option>
            <option value="America/Anchorage">Alaska Time</option>
            <option value="Pacific/Honolulu">Hawaii Time</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Paris">Paris (CET)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
            <option value="Australia/Sydney">Sydney (AEST)</option>
          </select>
          <p className="text-sm text-neutral-500 mt-1">
            Used for calendar invite timezone display
          </p>
        </div>
      </div>
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

function PlusIcon({ className }: { className?: string }) {
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
        d="M12 4.5v15m7.5-7.5h-15"
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
      strokeWidth={2}
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
