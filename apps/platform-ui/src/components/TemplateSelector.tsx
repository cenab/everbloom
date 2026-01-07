import { useState, useEffect } from 'react';
import { getAuthToken } from '../lib/auth';
import type {
  Template,
  TemplateCategory,
  RenderConfig,
  ApiResponse,
} from '../types';

interface TemplateSelectorProps {
  weddingId: string;
  currentTemplateId: string;
  onBack: () => void;
  onTemplateChanged?: () => void;
}

const CATEGORY_ORDER: TemplateCategory[] = [
  'minimal',
  'classic',
  'modern',
  'destination',
  'cultural',
];

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  minimal: 'Minimal',
  classic: 'Classic',
  modern: 'Modern',
  destination: 'Destination',
  cultural: 'Cultural',
};

/**
 * Template selection component for admin dashboard.
 * Allows admins to change their wedding's template while preserving content.
 * PRD: "Template can be switched without losing content"
 */
export function TemplateSelector({
  weddingId,
  currentTemplateId,
  onBack,
  onTemplateChanged,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(currentTemplateId);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/weddings/templates/list');
      const data: ApiResponse<Template[]> = await response.json();

      if (data.ok) {
        setTemplates(data.data);
      } else {
        setError('Unable to load templates');
      }
    } catch {
      setError('Unable to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (selectedTemplateId === currentTemplateId) {
      onBack();
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/template`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ templateId: selectedTemplateId }),
      });

      const data: ApiResponse<RenderConfig> = await response.json();

      if (data.ok) {
        setSuccessMessage('Template updated successfully');
        onTemplateChanged?.();
        // Wait a moment so user sees the success message
        setTimeout(() => {
          onBack();
        }, 1000);
      } else {
        setError('Unable to update template. Please try again.');
      }
    } catch {
      setError('Unable to update template. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-500">Loading templates...</p>
      </div>
    );
  }

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const groupedTemplates = CATEGORY_ORDER
    .map((category) => ({
      category,
      templates: templates.filter((template) => template.category === category),
    }))
    .filter((group) => group.templates.length > 0);

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
        <h1 className="text-2xl text-neutral-800">Choose your template</h1>
        <p className="text-neutral-500 mt-1">
          Select a visual style for your wedding site. Your content will be preserved.
        </p>
      </div>

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

      {groupedTemplates.map((group) => (
        <div key={group.category} className="mb-8 last:mb-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg text-neutral-800">
              {CATEGORY_LABELS[group.category]}
            </h2>
            <span className="text-xs text-neutral-500">
              {group.templates.length} option{group.templates.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={template.id === selectedTemplateId}
                isCurrent={template.id === currentTemplateId}
                onSelect={() => setSelectedTemplateId(template.id)}
              />
            ))}
          </div>
        </div>
      ))}

      {selectedTemplate && selectedTemplate.id !== currentTemplateId && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg text-neutral-800 font-medium mb-2">
            Preview: {selectedTemplate.name}
          </h2>
          <p className="text-neutral-600 mb-4">{selectedTemplate.description}</p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-500">Theme colors:</span>
            <div className="flex gap-2">
              <ColorSwatch color={selectedTemplate.defaultTheme.primary} label="Primary" />
              <ColorSwatch color={selectedTemplate.defaultTheme.accent} label="Accent" />
              <ColorSwatch color={selectedTemplate.defaultTheme.neutralLight} label="Light" />
              <ColorSwatch color={selectedTemplate.defaultTheme.neutralDark} label="Dark" />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving || selectedTemplateId === currentTemplateId}
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

interface TemplateCardProps {
  template: Template;
  isSelected: boolean;
  isCurrent: boolean;
  onSelect: () => void;
}

function TemplateCard({ template, isSelected, isCurrent, onSelect }: TemplateCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`
        p-5 rounded-lg text-left transition-all
        ${isSelected
          ? 'border-2 border-primary-500 bg-primary-50'
          : 'border border-neutral-200 bg-neutral-50 hover:border-primary-300 hover:bg-primary-50/50'
        }
      `}
    >
      {/* Template preview using theme colors */}
      <div
        className="h-24 rounded-md mb-4 relative overflow-hidden"
        style={{ backgroundColor: template.defaultTheme.neutralLight }}
      >
        <div
          className="absolute bottom-0 left-0 right-0 h-8"
          style={{ backgroundColor: template.defaultTheme.primary, opacity: 0.9 }}
        />
        <div
          className="absolute top-3 left-3 w-6 h-6 rounded-full"
          style={{ backgroundColor: template.defaultTheme.accent }}
        />
      <div
          className="absolute top-3 right-3 text-xs font-medium px-2 py-1 rounded"
          style={{
            backgroundColor: template.defaultTheme.neutralDark,
            color: template.defaultTheme.neutralLight,
          }}
        >
          {CATEGORY_LABELS[template.category]}
        </div>
      </div>

      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg text-neutral-800 font-medium">{template.name}</h3>
        {isCurrent && (
          <span className="text-xs text-primary-600 bg-primary-100 px-2 py-1 rounded">
            Current
          </span>
        )}
      </div>
      <p className="text-sm text-neutral-500 line-clamp-2">{template.description}</p>
    </button>
  );
}

interface ColorSwatchProps {
  color: string;
  label: string;
}

function ColorSwatch({ color, label }: ColorSwatchProps) {
  return (
    <div className="flex items-center gap-1">
      <div
        className="w-5 h-5 rounded-full border border-neutral-300"
        style={{ backgroundColor: color }}
        title={label}
      />
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
