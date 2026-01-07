import { useState, useEffect } from 'react';
import { getAuthToken } from '../lib/auth';
import type {
  Wedding,
  ApiResponse,
  EmailTemplateContent,
  EmailTemplatesConfig,
  UpdateEmailTemplatesResponse,
} from '../types';

interface EmailTemplateSettingsProps {
  wedding: Wedding;
  onBack: () => void;
  onTemplatesChanged?: () => void;
}

type TemplateType = 'invitation' | 'reminder' | 'saveTheDate' | 'thankYouAttended' | 'thankYouNotAttended';

const TEMPLATE_INFO: Record<TemplateType, { title: string; description: string }> = {
  invitation: {
    title: 'Invitation email',
    description: 'Sent when you invite guests to RSVP',
  },
  reminder: {
    title: 'Reminder email',
    description: 'Sent as a follow-up to guests who haven\'t responded',
  },
  saveTheDate: {
    title: 'Save-the-date email',
    description: 'Sent to announce your wedding date',
  },
  thankYouAttended: {
    title: 'Thank-you (attended)',
    description: 'Sent to guests who attended your celebration',
  },
  thankYouNotAttended: {
    title: 'Thank-you (couldn\'t attend)',
    description: 'Sent to guests who couldn\'t make it',
  },
};

const MERGE_FIELDS = [
  { field: '{{guest_name}}', description: 'Guest\'s name' },
  { field: '{{partner_names}}', description: 'Your names (e.g., "Emma & James")' },
  { field: '{{wedding_date}}', description: 'Wedding date' },
  { field: '{{wedding_venue}}', description: 'Venue name' },
  { field: '{{wedding_city}}', description: 'Venue city' },
  { field: '{{rsvp_link}}', description: 'RSVP link (invitation email only)' },
];

const DEFAULT_TEMPLATES: Record<TemplateType, EmailTemplateContent> = {
  invitation: {
    subject: 'You\'re Invited: {{partner_names}} Wedding',
    greeting: 'Dear {{guest_name}},',
    bodyText: 'We would be honored to have you join us as we celebrate our wedding on {{wedding_date}} at {{wedding_venue}} in {{wedding_city}}.\n\nPlease let us know if you can attend by clicking the link below.',
    closing: 'With love,\n{{partner_names}}',
  },
  reminder: {
    subject: 'Reminder: RSVP for {{partner_names}} Wedding',
    greeting: 'Dear {{guest_name}},',
    bodyText: 'We noticed we haven\'t received your RSVP yet for our wedding on {{wedding_date}}. We would love to know if you can celebrate with us!\n\nPlease take a moment to respond.',
    closing: 'Looking forward to hearing from you,\n{{partner_names}}',
  },
  saveTheDate: {
    subject: 'Save the Date: {{partner_names}} Wedding',
    greeting: 'Dear {{guest_name}},',
    bodyText: 'We are excited to announce that we\'re getting married! Please save the date:\n\n{{wedding_date}}\n{{wedding_venue}}\n{{wedding_city}}\n\nFormal invitation to follow.',
    closing: 'With love,\n{{partner_names}}',
  },
  thankYouAttended: {
    subject: 'Thank You for Celebrating With Us',
    greeting: 'Dear {{guest_name}},',
    bodyText: 'Thank you so much for being part of our special day. Your presence made our celebration truly memorable.\n\nWe are so grateful to have you in our lives.',
    closing: 'With heartfelt thanks,\n{{partner_names}}',
  },
  thankYouNotAttended: {
    subject: 'Thank You for Your Kind Wishes',
    greeting: 'Dear {{guest_name}},',
    bodyText: 'Although we missed having you at our wedding, we wanted to thank you for your kind wishes. We thought of you on our special day.\n\nWe hope to see you soon.',
    closing: 'With gratitude,\n{{partner_names}}',
  },
};

/**
 * Email template customization settings.
 * PRD: "Admin can customize invitation email content"
 */
export function EmailTemplateSettings({
  wedding,
  onBack,
  onTemplatesChanged,
}: EmailTemplateSettingsProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('invitation');
  const [templates, setTemplates] = useState<EmailTemplatesConfig>({});
  const [initialTemplates, setInitialTemplates] = useState<EmailTemplatesConfig>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hasChanges = JSON.stringify(templates) !== JSON.stringify(initialTemplates);

  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = getAuthToken();
        const response = await fetch(`/api/weddings/${wedding.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data: ApiResponse<Wedding> = await response.json();

        if (data.ok && data.data.emailTemplates) {
          setTemplates(data.data.emailTemplates);
          setInitialTemplates(data.data.emailTemplates);
        } else {
          // Start with empty templates (will use defaults)
          setTemplates({});
          setInitialTemplates({});
        }
      } catch {
        setTemplates({});
        setInitialTemplates({});
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplates();
  }, [wedding.id]);

  const getCurrentTemplate = (): EmailTemplateContent => {
    return templates[selectedTemplate] ?? DEFAULT_TEMPLATES[selectedTemplate];
  };

  const updateTemplate = (field: keyof EmailTemplateContent, value: string) => {
    const current = getCurrentTemplate();
    const updated: EmailTemplateContent = {
      ...current,
      [field]: value,
    };
    setTemplates({
      ...templates,
      [selectedTemplate]: updated,
    });
    setSuccessMessage(null);
  };

  const resetToDefault = () => {
    const { [selectedTemplate]: removed, ...rest } = templates;
    setTemplates(rest);
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/email-templates`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          emailTemplates: templates,
        }),
      });

      const data: ApiResponse<UpdateEmailTemplatesResponse> = await response.json();

      if (data.ok) {
        setSuccessMessage('Email templates saved successfully.');
        setInitialTemplates(templates);
        onTemplatesChanged?.();
      } else {
        setError('Unable to save email templates. Please try again.');
      }
    } catch {
      setError('Unable to save email templates. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentTemplate = getCurrentTemplate();
  const isCustomized = !!templates[selectedTemplate];

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
        <h1 className="text-2xl text-neutral-800">Email templates</h1>
        <p className="text-neutral-500 mt-1">
          Customize the emails sent to your guests. Use merge fields to personalize each message.
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Template selector sidebar */}
        <div className="lg:col-span-1">
          <h3 className="text-sm font-medium text-neutral-700 mb-3">Email type</h3>
          <div className="space-y-2">
            {(Object.keys(TEMPLATE_INFO) as TemplateType[]).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedTemplate(type)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  selectedTemplate === type
                    ? 'border-primary-300 bg-primary-50 text-primary-800'
                    : 'border-neutral-200 hover:border-primary-200 hover:bg-neutral-50'
                }`}
              >
                <span className="block font-medium text-sm">
                  {TEMPLATE_INFO[type].title}
                </span>
                <span className="block text-xs text-neutral-500 mt-0.5">
                  {TEMPLATE_INFO[type].description}
                </span>
                {templates[type] && (
                  <span className="inline-block mt-1 text-xs text-primary-600">
                    Customized
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Template editor */}
        <div className="lg:col-span-3">
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-neutral-800">
                {TEMPLATE_INFO[selectedTemplate].title}
              </h2>
              {isCustomized && (
                <button
                  onClick={resetToDefault}
                  className="text-sm text-neutral-600 hover:text-neutral-800"
                >
                  Reset to default
                </button>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Subject line
                </label>
                <input
                  type="text"
                  value={currentTemplate.subject}
                  onChange={(e) => updateTemplate('subject', e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Email subject"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Greeting
                </label>
                <input
                  type="text"
                  value={currentTemplate.greeting ?? ''}
                  onChange={(e) => updateTemplate('greeting', e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Dear {{guest_name}},"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Message body
                </label>
                <textarea
                  value={currentTemplate.bodyText}
                  onChange={(e) => updateTemplate('bodyText', e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Your message..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Closing
                </label>
                <textarea
                  value={currentTemplate.closing ?? ''}
                  onChange={(e) => updateTemplate('closing', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="With love,&#10;{{partner_names}}"
                />
              </div>
            </div>

            {/* Merge fields reference */}
            <div className="mt-6 p-4 bg-neutral-100 rounded-lg">
              <h4 className="text-sm font-medium text-neutral-700 mb-2">
                Available merge fields
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MERGE_FIELDS.map(({ field, description }) => (
                  <div key={field} className="text-sm">
                    <code className="text-primary-600 bg-primary-50 px-1 py-0.5 rounded">
                      {field}
                    </code>
                    <span className="text-neutral-500 ml-2">{description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save templates'}
            </button>
            <button onClick={onBack} className="btn-secondary">
              Cancel
            </button>
          </div>
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
