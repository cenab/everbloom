import { useEffect, useState } from 'react';
import { getAuthToken } from '../lib/auth';
import type {
  MealOption,
  MealConfig,
  ApiResponse,
  UpdateMealOptionsResponse,
  Wedding,
} from '../types';

interface MealSettingsProps {
  wedding: Wedding;
  onMealConfigChanged?: () => void;
}

const DEFAULT_MEAL_CONFIG: MealConfig = {
  enabled: false,
  options: [],
};

/**
 * Meal options settings for a wedding.
 * PRD: "Admin can configure meal options"
 */
export function MealSettings({
  wedding,
  onMealConfigChanged,
}: MealSettingsProps) {
  const [enabled, setEnabled] = useState(false);
  const [mealOptions, setMealOptions] = useState<MealOption[]>([]);
  const [initialConfig, setInitialConfig] = useState<MealConfig>(DEFAULT_MEAL_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Track changes
  const currentConfig: MealConfig = { enabled, options: mealOptions };
  const hasChanges = JSON.stringify(currentConfig) !== JSON.stringify(initialConfig);

  useEffect(() => {
    const loadMealConfig = async () => {
      setIsLoading(true);
      setError(null);

      // Use wedding's mealConfig if available
      const config = wedding.mealConfig ?? DEFAULT_MEAL_CONFIG;
      const sortedOptions = [...config.options].sort((a, b) => a.order - b.order);
      setEnabled(config.enabled);
      setMealOptions(sortedOptions);
      setInitialConfig({ enabled: config.enabled, options: sortedOptions });
      setIsLoading(false);
    };

    loadMealConfig();
  }, [wedding.id, wedding.mealConfig]);

  const handleToggleEnabled = () => {
    setEnabled(!enabled);
    setSuccessMessage(null);
  };

  const handleAddOption = () => {
    const newOption: MealOption = {
      id: `meal-${Date.now()}`,
      name: '',
      description: '',
      order: mealOptions.length,
    };
    setMealOptions([...mealOptions, newOption]);
    setSuccessMessage(null);
  };

  const handleUpdateOption = (
    index: number,
    field: 'name' | 'description',
    value: string
  ) => {
    const updated = [...mealOptions];
    updated[index] = { ...updated[index], [field]: value };
    setMealOptions(updated);
    setSuccessMessage(null);
  };

  const handleDeleteOption = (index: number) => {
    const updated = mealOptions.filter((_, i) => i !== index);
    // Re-order remaining items
    const reordered = updated.map((item, i) => ({ ...item, order: i }));
    setMealOptions(reordered);
    setSuccessMessage(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...mealOptions];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    const reordered = updated.map((item, i) => ({ ...item, order: i }));
    setMealOptions(reordered);
    setSuccessMessage(null);
  };

  const handleMoveDown = (index: number) => {
    if (index === mealOptions.length - 1) return;
    const updated = [...mealOptions];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    const reordered = updated.map((item, i) => ({ ...item, order: i }));
    setMealOptions(reordered);
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    // Check if RSVP feature is enabled (meal selection requires RSVP)
    if (!wedding.features.RSVP) {
      setError('Enable RSVP in Site features to configure meal options.');
      return;
    }

    // Validate options if enabled
    if (enabled && mealOptions.length === 0) {
      setError('Add at least one meal option before enabling.');
      return;
    }

    for (const option of mealOptions) {
      if (!option.name.trim()) {
        setError('Each meal option needs a name.');
        return;
      }
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/meal-options`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mealConfig: {
            enabled,
            options: mealOptions.map((option, index) => ({
              id: option.id,
              name: option.name.trim(),
              description: option.description?.trim() || undefined,
              order: index,
            })),
          },
        }),
      });

      const data: ApiResponse<UpdateMealOptionsResponse> = await response.json();

      if (data.ok) {
        setSuccessMessage('Meal options updated successfully.');
        setInitialConfig(currentConfig);
        onMealConfigChanged?.();
      } else {
        setError('Unable to update meal options. Please try again.');
      }
    } catch {
      setError('Unable to update meal options. Please try again.');
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
        <h1 className="text-2xl text-neutral-800">Meal options</h1>
        <p className="text-neutral-500 mt-1">
          Let guests select their meal preference when they RSVP.
        </p>
      </div>

      {!wedding.features.RSVP && (
        <div className="mb-6 p-4 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-600">
          RSVP is currently disabled for your site. Enable it in Site features
          to allow guests to select meal options.
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

      {/* Enable/Disable Toggle */}
      <div className="mb-8 p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-neutral-800 font-medium">Enable meal selection</h3>
            <p className="text-sm text-neutral-500 mt-1">
              Guests will be asked to choose a meal when they RSVP.
            </p>
          </div>
          <button
            onClick={handleToggleEnabled}
            disabled={!wedding.features.RSVP}
            className={`
              relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
              transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              ${!wedding.features.RSVP ? 'cursor-not-allowed opacity-50' : ''}
              ${enabled ? 'bg-primary-500' : 'bg-neutral-300'}
            `}
            role="switch"
            aria-checked={enabled}
          >
            <span
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-neutral-50 shadow ring-0
                transition duration-200 ease-in-out
                ${enabled ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>
      </div>

      {/* Meal Options List */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg text-neutral-800 font-medium">Meal choices</h2>
          <span className="text-sm text-neutral-500">
            {mealOptions.length} option{mealOptions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {mealOptions.length === 0 ? (
          <div className="text-center py-8 bg-neutral-50 border border-neutral-200 rounded-lg">
            <ForkKnifeIcon className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
            <p className="text-neutral-600 mb-4">No meal options yet</p>
            <button
              onClick={handleAddOption}
              disabled={!wedding.features.RSVP}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add your first option
            </button>
          </div>
        ) : (
          <>
            {mealOptions.map((option, index) => (
              <div
                key={option.id}
                className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <span className="text-sm text-neutral-500 font-medium">
                    Option {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || !wedding.features.RSVP}
                      className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ChevronUpIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === mealOptions.length - 1 || !wedding.features.RSVP}
                      className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ChevronDownIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteOption(index)}
                      disabled={!wedding.features.RSVP}
                      className="p-1 text-neutral-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Delete"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={option.name}
                      onChange={(e) => handleUpdateOption(index, 'name', e.target.value)}
                      placeholder="Grilled Salmon"
                      disabled={!wedding.features.RSVP}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={option.description || ''}
                      onChange={(e) => handleUpdateOption(index, 'description', e.target.value)}
                      placeholder="With seasonal vegetables and herb butter"
                      disabled={!wedding.features.RSVP}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={handleAddOption}
              disabled={!wedding.features.RSVP}
              className="w-full p-4 border-2 border-dashed border-neutral-300 rounded-lg text-neutral-600 hover:border-primary-400 hover:text-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-neutral-300 disabled:hover:text-neutral-600"
            >
              <PlusIcon className="w-5 h-5 inline-block mr-2" />
              Add another option
            </button>
          </>
        )}
      </div>

      <div className="flex justify-end gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges || !wedding.features.RSVP}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save changes'}
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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 19.5L8.25 12l7.5-7.5"
      />
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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 15.75l7.5-7.5 7.5 7.5"
      />
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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
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

function ForkKnifeIcon({ className }: { className?: string }) {
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
        d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z"
      />
    </svg>
  );
}
