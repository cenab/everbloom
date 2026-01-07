import { useEffect, useState } from 'react';
import { getAuthToken } from '../lib/auth';
import type {
  RegistryLink,
  RegistryConfig,
  ApiResponse,
  RenderConfig,
  UpdateRegistryResponse,
  Wedding,
} from '../types';

interface RegistrySettingsProps {
  wedding: Wedding;
  onBack: () => void;
  onRegistryChanged?: () => void;
}

const DEFAULT_REGISTRY: RegistryConfig = {
  links: [],
};

/**
 * Registry settings for a wedding.
 * PRD: "Admin can add gift registry links"
 */
export function RegistrySettings({
  wedding,
  onBack,
  onRegistryChanged,
}: RegistrySettingsProps) {
  const [registryLinks, setRegistryLinks] = useState<RegistryLink[]>([]);
  const [initialRegistryLinks, setInitialRegistryLinks] = useState<RegistryLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Track changes by comparing stringified arrays
  const hasChanges = JSON.stringify(registryLinks) !== JSON.stringify(initialRegistryLinks);

  useEffect(() => {
    const fetchRegistry = async () => {
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
          const currentRegistry = data.data.registry ?? DEFAULT_REGISTRY;
          // Sort by order for display
          const sortedLinks = [...currentRegistry.links].sort((a, b) => a.order - b.order);
          setRegistryLinks(sortedLinks);
          setInitialRegistryLinks(sortedLinks);
        } else {
          setRegistryLinks([]);
          setInitialRegistryLinks([]);
        }
      } catch {
        setRegistryLinks([]);
        setInitialRegistryLinks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRegistry();
  }, [wedding.id]);

  const handleAddLink = () => {
    const newLink: RegistryLink = {
      id: `registry-${Date.now()}`,
      name: '',
      url: '',
      order: registryLinks.length,
    };
    setRegistryLinks([...registryLinks, newLink]);
    setSuccessMessage(null);
  };

  const handleUpdateLink = (index: number, field: 'name' | 'url', value: string) => {
    const updated = [...registryLinks];
    updated[index] = { ...updated[index], [field]: value };
    setRegistryLinks(updated);
    setSuccessMessage(null);
  };

  const handleDeleteLink = (index: number) => {
    const updated = registryLinks.filter((_, i) => i !== index);
    // Re-order remaining items
    const reordered = updated.map((link, i) => ({ ...link, order: i }));
    setRegistryLinks(reordered);
    setSuccessMessage(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...registryLinks];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    // Update order values
    const reordered = updated.map((link, i) => ({ ...link, order: i }));
    setRegistryLinks(reordered);
    setSuccessMessage(null);
  };

  const handleMoveDown = (index: number) => {
    if (index === registryLinks.length - 1) return;
    const updated = [...registryLinks];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    // Update order values
    const reordered = updated.map((link, i) => ({ ...link, order: i }));
    setRegistryLinks(reordered);
    setSuccessMessage(null);
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!wedding.features.REGISTRY) {
      setError('Enable the registry in Site features to update it here.');
      return;
    }

    // Validate links
    for (const link of registryLinks) {
      if (!link.name.trim()) {
        setError('Each registry link needs a name.');
        return;
      }
      if (!link.url.trim()) {
        setError('Each registry link needs a URL.');
        return;
      }
      if (!isValidUrl(link.url.trim())) {
        setError(`Invalid URL for ${link.name}: please enter a valid URL starting with https://`);
        return;
      }
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/registry`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          registry: {
            links: registryLinks.map((link, index) => ({
              id: link.id,
              name: link.name.trim(),
              url: link.url.trim(),
              order: index,
            })),
          },
        }),
      });

      const data: ApiResponse<UpdateRegistryResponse> = await response.json();

      if (data.ok) {
        setSuccessMessage('Registry updated successfully.');
        setInitialRegistryLinks(registryLinks);
        onRegistryChanged?.();
        setTimeout(() => {
          onBack();
        }, 1000);
      } else {
        setError('Unable to update the registry. Please try again.');
      }
    } catch {
      setError('Unable to update the registry. Please try again.');
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
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-neutral-600 hover:text-neutral-800 mb-6"
      >
        <ChevronLeftIcon className="w-4 h-4" />
        Back to dashboard
      </button>

      <div className="mb-8">
        <h1 className="text-2xl text-neutral-800">Gift registry</h1>
        <p className="text-neutral-500 mt-1">
          Add links to your gift registries so guests can easily find where you're registered.
        </p>
      </div>

      {!wedding.features.REGISTRY && (
        <div className="mb-6 p-4 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-600">
          The gift registry is currently disabled for your site. Enable it in Site features
          to share your registry links with guests.
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

      <div className="space-y-4 mb-8">
        {registryLinks.length === 0 ? (
          <div className="text-center py-8 bg-neutral-50 border border-neutral-200 rounded-lg">
            <GiftIcon className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
            <p className="text-neutral-600 mb-4">No registry links yet</p>
            <button
              onClick={handleAddLink}
              disabled={!wedding.features.REGISTRY}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add your first registry
            </button>
          </div>
        ) : (
          <>
            {registryLinks.map((link, index) => (
              <div
                key={link.id}
                className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <span className="text-sm text-neutral-500 font-medium">
                    Registry {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || !wedding.features.REGISTRY}
                      className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ChevronUpIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === registryLinks.length - 1 || !wedding.features.REGISTRY}
                      className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ChevronDownIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteLink(index)}
                      disabled={!wedding.features.REGISTRY}
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
                      Registry name
                    </label>
                    <input
                      type="text"
                      value={link.name}
                      onChange={(e) => handleUpdateLink(index, 'name', e.target.value)}
                      placeholder="Amazon, Zola, Williams Sonoma, etc."
                      disabled={!wedding.features.REGISTRY}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Registry URL
                    </label>
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => handleUpdateLink(index, 'url', e.target.value)}
                      placeholder="https://www.amazon.com/wedding/registry/..."
                      disabled={!wedding.features.REGISTRY}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={handleAddLink}
              disabled={!wedding.features.REGISTRY}
              className="w-full p-4 border-2 border-dashed border-neutral-300 rounded-lg text-neutral-600 hover:border-primary-400 hover:text-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-neutral-300 disabled:hover:text-neutral-600"
            >
              <PlusIcon className="w-5 h-5 inline-block mr-2" />
              Add another registry
            </button>
          </>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges || !wedding.features.REGISTRY}
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

function GiftIcon({ className }: { className?: string }) {
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
        d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  );
}
