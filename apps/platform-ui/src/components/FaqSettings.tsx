import { useEffect, useState } from 'react';
import { getAuthToken } from '../lib/auth';
import type {
  FaqItem,
  FaqConfig,
  ApiResponse,
  RenderConfig,
  UpdateFaqResponse,
  Wedding,
} from '../types';

interface FaqSettingsProps {
  wedding: Wedding;
  onFaqChanged?: () => void;
}

const DEFAULT_FAQ: FaqConfig = {
  items: [],
};

/**
 * FAQ settings for a wedding.
 * PRD: "Admin can add FAQ items", "Admin can edit and reorder FAQ items"
 */
export function FaqSettings({
  wedding,
  onFaqChanged,
}: FaqSettingsProps) {
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [initialFaqItems, setInitialFaqItems] = useState<FaqItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Track changes by comparing stringified arrays
  const hasChanges = JSON.stringify(faqItems) !== JSON.stringify(initialFaqItems);

  useEffect(() => {
    const fetchFaq = async () => {
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
          const currentFaq = data.data.faq ?? DEFAULT_FAQ;
          // Sort by order for display
          const sortedItems = [...currentFaq.items].sort((a, b) => a.order - b.order);
          setFaqItems(sortedItems);
          setInitialFaqItems(sortedItems);
        } else {
          setFaqItems([]);
          setInitialFaqItems([]);
        }
      } catch {
        setFaqItems([]);
        setInitialFaqItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFaq();
  }, [wedding.id]);

  const handleAddItem = () => {
    const newItem: FaqItem = {
      id: `faq-${Date.now()}`,
      question: '',
      answer: '',
      order: faqItems.length,
    };
    setFaqItems([...faqItems, newItem]);
    setSuccessMessage(null);
  };

  const handleUpdateItem = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...faqItems];
    updated[index] = { ...updated[index], [field]: value };
    setFaqItems(updated);
    setSuccessMessage(null);
  };

  const handleDeleteItem = (index: number) => {
    const updated = faqItems.filter((_, i) => i !== index);
    // Re-order remaining items
    const reordered = updated.map((item, i) => ({ ...item, order: i }));
    setFaqItems(reordered);
    setSuccessMessage(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...faqItems];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    // Update order values
    const reordered = updated.map((item, i) => ({ ...item, order: i }));
    setFaqItems(reordered);
    setSuccessMessage(null);
  };

  const handleMoveDown = (index: number) => {
    if (index === faqItems.length - 1) return;
    const updated = [...faqItems];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    // Update order values
    const reordered = updated.map((item, i) => ({ ...item, order: i }));
    setFaqItems(reordered);
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    if (!wedding.features.FAQ_SECTION) {
      setError('Enable the FAQ section in Site features to update it here.');
      return;
    }

    // Validate items
    for (const item of faqItems) {
      if (!item.question.trim()) {
        setError('Each FAQ item needs a question.');
        return;
      }
      if (!item.answer.trim()) {
        setError('Each FAQ item needs an answer.');
        return;
      }
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/faq`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          faq: {
            items: faqItems.map((item, index) => ({
              id: item.id,
              question: item.question.trim(),
              answer: item.answer.trim(),
              order: index,
            })),
          },
        }),
      });

      const data: ApiResponse<UpdateFaqResponse> = await response.json();

      if (data.ok) {
        setSuccessMessage('FAQ updated successfully.');
        setInitialFaqItems(faqItems);
        onFaqChanged?.();
      } else {
        setError('Unable to update the FAQ. Please try again.');
      }
    } catch {
      setError('Unable to update the FAQ. Please try again.');
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
        <h1 className="text-2xl text-neutral-800">Frequently asked questions</h1>
        <p className="text-neutral-500 mt-1">
          Answer common questions your guests might have about your celebration.
        </p>
      </div>

      {!wedding.features.FAQ_SECTION && (
        <div className="mb-6 p-4 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-600">
          The FAQ section is currently disabled for your site. Enable it in Site features
          to share answers to common questions.
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
        {faqItems.length === 0 ? (
          <div className="text-center py-8 bg-neutral-50 border border-neutral-200 rounded-lg">
            <QuestionIcon className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
            <p className="text-neutral-600 mb-4">No questions yet</p>
            <button
              onClick={handleAddItem}
              disabled={!wedding.features.FAQ_SECTION}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add your first question
            </button>
          </div>
        ) : (
          <>
            {faqItems.map((item, index) => (
              <div
                key={item.id}
                className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <span className="text-sm text-neutral-500 font-medium">
                    Question {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || !wedding.features.FAQ_SECTION}
                      className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ChevronUpIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === faqItems.length - 1 || !wedding.features.FAQ_SECTION}
                      className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ChevronDownIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(index)}
                      disabled={!wedding.features.FAQ_SECTION}
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
                      Question
                    </label>
                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) => handleUpdateItem(index, 'question', e.target.value)}
                      placeholder="What should I wear?"
                      disabled={!wedding.features.FAQ_SECTION}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Answer
                    </label>
                    <textarea
                      value={item.answer}
                      onChange={(e) => handleUpdateItem(index, 'answer', e.target.value)}
                      placeholder="We're going for semi-formal attire. Think cocktail dresses and suits."
                      rows={3}
                      disabled={!wedding.features.FAQ_SECTION}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={handleAddItem}
              disabled={!wedding.features.FAQ_SECTION}
              className="w-full p-4 border-2 border-dashed border-neutral-300 rounded-lg text-neutral-600 hover:border-primary-400 hover:text-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-neutral-300 disabled:hover:text-neutral-600"
            >
              <PlusIcon className="w-5 h-5 inline-block mr-2" />
              Add another question
            </button>
          </>
        )}
      </div>

      <div className="flex justify-end gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges || !wedding.features.FAQ_SECTION}
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

function QuestionIcon({ className }: { className?: string }) {
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
        d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
      />
    </svg>
  );
}
