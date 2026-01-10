import { useEffect, useState } from 'react';
import { getAuthToken } from '../lib/auth';
import type {
  Hotel,
  TravelInfo,
  AccommodationsConfig,
  ApiResponse,
  RenderConfig,
  UpdateAccommodationsResponse,
  Wedding,
} from '../types';

interface AccommodationsSettingsProps {
  wedding: Wedding;
  onBack: () => void;
  onAccommodationsChanged?: () => void;
}

const DEFAULT_ACCOMMODATIONS: AccommodationsConfig = {
  hotels: [],
  travelInfo: {},
};

/**
 * Accommodations settings for a wedding.
 * PRD: "Admin can add hotel recommendations"
 */
export function AccommodationsSettings({
  wedding,
  onBack,
  onAccommodationsChanged,
}: AccommodationsSettingsProps) {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [travelInfo, setTravelInfo] = useState<TravelInfo>({});
  const [initialHotels, setInitialHotels] = useState<Hotel[]>([]);
  const [initialTravelInfo, setInitialTravelInfo] = useState<TravelInfo>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Track changes by comparing stringified values
  const hasChanges =
    JSON.stringify(hotels) !== JSON.stringify(initialHotels) ||
    JSON.stringify(travelInfo) !== JSON.stringify(initialTravelInfo);

  useEffect(() => {
    const fetchAccommodations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = getAuthToken();
        const response = await fetch(`/api/weddings/${wedding.id}/render-config`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data: ApiResponse<RenderConfig> = await response.json();

        if (data.ok) {
          const currentAccommodations = data.data.accommodations ?? DEFAULT_ACCOMMODATIONS;
          // Sort hotels by order for display
          const sortedHotels = [...currentAccommodations.hotels].sort((a, b) => a.order - b.order);
          setHotels(sortedHotels);
          setInitialHotels(sortedHotels);
          setTravelInfo(currentAccommodations.travelInfo ?? {});
          setInitialTravelInfo(currentAccommodations.travelInfo ?? {});
        } else {
          setHotels([]);
          setInitialHotels([]);
          setTravelInfo({});
          setInitialTravelInfo({});
        }
      } catch {
        setHotels([]);
        setInitialHotels([]);
        setTravelInfo({});
        setInitialTravelInfo({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccommodations();
  }, [wedding.id]);

  const handleAddHotel = () => {
    const newHotel: Hotel = {
      id: `hotel-${Date.now()}`,
      name: '',
      address: '',
      order: hotels.length,
    };
    setHotels([...hotels, newHotel]);
    setSuccessMessage(null);
  };

  const handleUpdateHotel = (
    index: number,
    field: keyof Hotel,
    value: string,
  ) => {
    const updated = [...hotels];
    updated[index] = { ...updated[index], [field]: value };
    setHotels(updated);
    setSuccessMessage(null);
  };

  const handleDeleteHotel = (index: number) => {
    const updated = hotels.filter((_, i) => i !== index);
    // Re-order remaining items
    const reordered = updated.map((hotel, i) => ({ ...hotel, order: i }));
    setHotels(reordered);
    setSuccessMessage(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...hotels];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    // Update order values
    const reordered = updated.map((hotel, i) => ({ ...hotel, order: i }));
    setHotels(reordered);
    setSuccessMessage(null);
  };

  const handleMoveDown = (index: number) => {
    if (index === hotels.length - 1) return;
    const updated = [...hotels];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    // Update order values
    const reordered = updated.map((hotel, i) => ({ ...hotel, order: i }));
    setHotels(reordered);
    setSuccessMessage(null);
  };

  const handleUpdateTravelInfo = (field: keyof TravelInfo, value: string) => {
    setTravelInfo({ ...travelInfo, [field]: value || undefined });
    setSuccessMessage(null);
  };

  const isValidUrl = (url: string): boolean => {
    if (!url.trim()) return true; // Empty URLs are allowed
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!wedding.features.ACCOMMODATIONS) {
      setError('Enable accommodations in Site features to update them here.');
      return;
    }

    // Validate hotels
    for (const hotel of hotels) {
      if (!hotel.name.trim()) {
        setError('Each hotel needs a name.');
        return;
      }
      if (!hotel.address.trim()) {
        setError('Each hotel needs an address.');
        return;
      }
      if (hotel.bookingUrl?.trim() && !isValidUrl(hotel.bookingUrl.trim())) {
        setError(`Invalid booking URL for ${hotel.name}: please enter a valid URL starting with https://`);
        return;
      }
    }

    // Validate travel info map URL
    if (travelInfo.mapUrl?.trim() && !isValidUrl(travelInfo.mapUrl.trim())) {
      setError('Invalid map URL: please enter a valid URL starting with https://');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/accommodations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accommodations: {
            hotels: hotels.map((hotel, index) => ({
              id: hotel.id,
              name: hotel.name.trim(),
              address: hotel.address.trim(),
              bookingUrl: hotel.bookingUrl?.trim() || undefined,
              roomBlockCode: hotel.roomBlockCode?.trim() || undefined,
              notes: hotel.notes?.trim() || undefined,
              order: index,
            })),
            travelInfo: {
              airportDirections: travelInfo.airportDirections?.trim() || undefined,
              parkingInfo: travelInfo.parkingInfo?.trim() || undefined,
              mapUrl: travelInfo.mapUrl?.trim() || undefined,
            },
          },
        }),
      });

      const data: ApiResponse<UpdateAccommodationsResponse> = await response.json();

      if (data.ok) {
        setSuccessMessage('Accommodations updated successfully.');
        setInitialHotels(hotels);
        setInitialTravelInfo(travelInfo);
        onAccommodationsChanged?.();
        setTimeout(() => {
          onBack();
        }, 1000);
      } else {
        setError('Unable to update accommodations. Please try again.');
      }
    } catch {
      setError('Unable to update accommodations. Please try again.');
    } finally {
      setIsSaving(false);
    }
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
      <div className="mb-8">
        <h1 className="text-2xl text-neutral-800">Accommodations & travel</h1>
        <p className="text-neutral-500 mt-1">
          Help your guests find places to stay and travel information for your celebration.
        </p>
      </div>

      {!wedding.features.ACCOMMODATIONS && (
        <div className="mb-6 p-4 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-600">
          Accommodations are currently disabled for your site. Enable them in Site features
          to share hotel and travel information with guests.
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {successMessage}
        </div>
      )}

      {/* Hotels Section */}
      <div className="mb-10">
        <h2 className="text-lg font-medium text-neutral-800 mb-4">Hotel recommendations</h2>

        <div className="space-y-4 mb-4">
          {hotels.length === 0 ? (
            <div className="text-center py-8 bg-neutral-50 border border-neutral-200 rounded-lg">
              <BuildingIcon className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
              <p className="text-neutral-600 mb-4">No hotel recommendations yet</p>
              <button
                onClick={handleAddHotel}
                disabled={!wedding.features.ACCOMMODATIONS}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add your first hotel
              </button>
            </div>
          ) : (
            <>
              {hotels.map((hotel, index) => (
                <div
                  key={hotel.id}
                  className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <span className="text-sm text-neutral-500 font-medium">
                      Hotel {index + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0 || !wedding.features.ACCOMMODATIONS}
                        className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ChevronUpIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === hotels.length - 1 || !wedding.features.ACCOMMODATIONS}
                        className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ChevronDownIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteHotel(index)}
                        disabled={!wedding.features.ACCOMMODATIONS}
                        className="p-1 text-neutral-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Hotel name *
                        </label>
                        <input
                          type="text"
                          value={hotel.name}
                          onChange={(e) => handleUpdateHotel(index, 'name', e.target.value)}
                          placeholder="The Grand Hotel"
                          disabled={!wedding.features.ACCOMMODATIONS}
                          className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Room block code
                        </label>
                        <input
                          type="text"
                          value={hotel.roomBlockCode || ''}
                          onChange={(e) => handleUpdateHotel(index, 'roomBlockCode', e.target.value)}
                          placeholder="SMITH2025"
                          disabled={!wedding.features.ACCOMMODATIONS}
                          className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Address *
                      </label>
                      <input
                        type="text"
                        value={hotel.address}
                        onChange={(e) => handleUpdateHotel(index, 'address', e.target.value)}
                        placeholder="123 Main Street, City, State 12345"
                        disabled={!wedding.features.ACCOMMODATIONS}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Booking URL
                      </label>
                      <input
                        type="url"
                        value={hotel.bookingUrl || ''}
                        onChange={(e) => handleUpdateHotel(index, 'bookingUrl', e.target.value)}
                        placeholder="https://www.hotel.com/book"
                        disabled={!wedding.features.ACCOMMODATIONS}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        value={hotel.notes || ''}
                        onChange={(e) => handleUpdateHotel(index, 'notes', e.target.value)}
                        placeholder="Special rate available until March 1st. Mention 'Smith Wedding' when booking."
                        disabled={!wedding.features.ACCOMMODATIONS}
                        rows={2}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100 resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddHotel}
                disabled={!wedding.features.ACCOMMODATIONS}
                className="w-full p-4 border-2 border-dashed border-neutral-300 rounded-lg text-neutral-600 hover:border-primary-400 hover:text-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-neutral-300 disabled:hover:text-neutral-600"
              >
                <PlusIcon className="w-5 h-5 inline-block mr-2" />
                Add another hotel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Travel Information Section */}
      <div className="mb-10">
        <h2 className="text-lg font-medium text-neutral-800 mb-4">Travel information</h2>

        <div className="space-y-4 p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Airport directions
            </label>
            <textarea
              value={travelInfo.airportDirections || ''}
              onChange={(e) => handleUpdateTravelInfo('airportDirections', e.target.value)}
              placeholder="The nearest airport is XYZ International (30 minutes away). We recommend renting a car or using rideshare services."
              disabled={!wedding.features.ACCOMMODATIONS}
              rows={3}
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Parking information
            </label>
            <textarea
              value={travelInfo.parkingInfo || ''}
              onChange={(e) => handleUpdateTravelInfo('parkingInfo', e.target.value)}
              placeholder="Free parking is available at the venue. Valet service will also be provided."
              disabled={!wedding.features.ACCOMMODATIONS}
              rows={2}
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Map URL
            </label>
            <input
              type="url"
              value={travelInfo.mapUrl || ''}
              onChange={(e) => handleUpdateTravelInfo('mapUrl', e.target.value)}
              placeholder="https://maps.google.com/..."
              disabled={!wedding.features.ACCOMMODATIONS}
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100"
            />
            <p className="text-sm text-neutral-500 mt-1">
              Link to a Google Maps or custom map showing the venue and nearby hotels.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges || !wedding.features.ACCOMMODATIONS}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save changes'}
        </button>
        <button onClick={onBack} className="btn-secondary">
          Cancel
        </button>
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
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
        d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
      />
    </svg>
  );
}
