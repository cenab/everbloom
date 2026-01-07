import { useState, useEffect } from 'react';
import { getAuthToken } from '../lib/auth';
import type { Wedding, EventDetailsData, ApiResponse, RenderConfig } from '../types';

interface EventSettingsProps {
  wedding: Wedding;
  onBack: () => void;
  onEventDetailsChanged: () => void;
}

interface UpdateEventDetailsResponse {
  wedding: Wedding;
  renderConfig: RenderConfig;
}

/**
 * Admin settings component for configuring event details (date, time, venue)
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

  // Form state
  const [date, setDate] = useState(wedding.eventDetails?.date || '');
  const [startTime, setStartTime] = useState(wedding.eventDetails?.startTime || '');
  const [endTime, setEndTime] = useState(wedding.eventDetails?.endTime || '');
  const [venue, setVenue] = useState(wedding.eventDetails?.venue || '');
  const [address, setAddress] = useState(wedding.eventDetails?.address || '');
  const [city, setCity] = useState(wedding.eventDetails?.city || '');
  const [timezone, setTimezone] = useState(wedding.eventDetails?.timezone || '');

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
        setDate(ed.date);
        setStartTime(ed.startTime);
        setEndTime(ed.endTime);
        setVenue(ed.venue);
        setAddress(ed.address);
        setCity(ed.city);
        setTimezone(ed.timezone || '');
      }
    } catch {
      // Use wedding data if available
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const token = getAuthToken();

      const eventDetails: EventDetailsData = {
        date,
        startTime,
        endTime,
        venue,
        address,
        city,
        ...(timezone && { timezone }),
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

  const isValid = date && startTime && endTime && venue && address && city;

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
          Configure the date, time, and venue for your wedding. This information
          is used for calendar invites.
        </p>
      </div>

      <div className="max-w-xl space-y-6">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Wedding date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              End time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="The Grand Ballroom"
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Full address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Wedding Lane, Suite 100"
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            City
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="San Francisco, CA"
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Timezone (optional) */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Timezone (optional)
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
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
            All fields except timezone are required
          </p>
        )}
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
