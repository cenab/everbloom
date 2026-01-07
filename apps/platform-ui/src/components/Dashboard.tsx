import { useState, useEffect, useCallback } from 'react';
import { CreateWedding } from './CreateWedding';
import { Guests } from './Guests';
import { RsvpDashboard } from './RsvpDashboard';
import { TemplateSelector } from './TemplateSelector';
import { FeatureSettings } from './FeatureSettings';
import { AnnouncementSettings } from './AnnouncementSettings';
import { EventSettings } from './EventSettings';
import { FaqSettings } from './FaqSettings';
import { PasscodeSettings } from './PasscodeSettings';
import { HeroSettings } from './HeroSettings';
import { MealSettings } from './MealSettings';
import { RegistrySettings } from './RegistrySettings';
import { AccommodationsSettings } from './AccommodationsSettings';
import { EmailStatisticsDashboard } from './EmailStatistics';
import { PhotoStatsDashboard } from './PhotoStatsDashboard';
import { getAuthToken } from '../lib/auth';
import type { Wedding, ApiResponse, RenderConfig } from '../types';

type View = 'dashboard' | 'create-wedding' | 'guests' | 'rsvp' | 'template' | 'features' | 'announcement' | 'event-details' | 'faq' | 'passcode' | 'hero' | 'meal-options' | 'registry' | 'accommodations' | 'email-stats' | 'photo-stats';

/**
 * Admin Dashboard component.
 * Shows empty state when no wedding is selected.
 * PRD: "Admin dashboard loads with no wedding selected"
 */
export function Dashboard() {
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [selectedWedding, setSelectedWedding] = useState<Wedding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>('dashboard');

  const fetchWeddings = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch('/api/weddings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<Wedding[]> = await response.json();

      if (data.ok) {
        setWeddings(data.data);
        // Auto-select first wedding if only one exists
        if (data.data.length === 1) {
          setSelectedWedding(data.data[0]);
        }
      }
    } catch {
      // Silent fail, show empty state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeddings();
  }, [fetchWeddings]);

  const hasWeddings = weddings.length > 0;

  if (view === 'create-wedding') {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <CreateWedding onCancel={() => setView('dashboard')} />
      </div>
    );
  }

  if (view === 'guests' && selectedWedding) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <Guests
          weddingId={selectedWedding.id}
          onBack={() => setView('dashboard')}
        />
      </div>
    );
  }

  if (view === 'rsvp' && selectedWedding) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <RsvpDashboard
          weddingId={selectedWedding.id}
          onBack={() => setView('dashboard')}
        />
      </div>
    );
  }

  if (view === 'template' && selectedWedding) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <TemplateSelectorWrapper
          wedding={selectedWedding}
          onBack={() => setView('dashboard')}
        />
      </div>
    );
  }

  if (view === 'features' && selectedWedding) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <FeatureSettings
          wedding={selectedWedding}
          onBack={() => setView('dashboard')}
          onFeaturesChanged={fetchWeddings}
        />
      </div>
    );
  }

  if (view === 'announcement' && selectedWedding) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <AnnouncementSettings
          wedding={selectedWedding}
          onBack={() => setView('dashboard')}
          onAnnouncementChanged={fetchWeddings}
        />
      </div>
    );
  }

  if (view === 'event-details' && selectedWedding) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <EventSettings
          wedding={selectedWedding}
          onBack={() => setView('dashboard')}
          onEventDetailsChanged={fetchWeddings}
        />
      </div>
    );
  }

  if (view === 'faq' && selectedWedding) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <FaqSettings
          wedding={selectedWedding}
          onBack={() => setView('dashboard')}
          onFaqChanged={fetchWeddings}
        />
      </div>
    );
  }

  if (view === 'registry' && selectedWedding) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <RegistrySettings
          wedding={selectedWedding}
          onBack={() => setView('dashboard')}
          onRegistryChanged={fetchWeddings}
        />
      </div>
    );
  }

  if (view === 'accommodations' && selectedWedding) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <AccommodationsSettings
          wedding={selectedWedding}
          onBack={() => setView('dashboard')}
          onAccommodationsChanged={fetchWeddings}
        />
      </div>
    );
  }

  if (view === 'passcode' && selectedWedding) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <PasscodeSettings
          wedding={selectedWedding}
          onBack={() => setView('dashboard')}
          onPasscodeChanged={fetchWeddings}
        />
      </div>
    );
  }

  if (view === 'hero' && selectedWedding) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <HeroSettings
          wedding={selectedWedding}
          onBack={() => setView('dashboard')}
          onHeroChanged={fetchWeddings}
        />
      </div>
    );
  }

  if (view === 'meal-options' && selectedWedding) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <MealSettings
          wedding={selectedWedding}
          onBack={() => setView('dashboard')}
          onMealConfigChanged={fetchWeddings}
        />
      </div>
    );
  }

  if (view === 'email-stats' && selectedWedding) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <EmailStatisticsDashboard
          weddingId={selectedWedding.id}
          onBack={() => setView('dashboard')}
        />
      </div>
    );
  }

  if (view === 'photo-stats' && selectedWedding) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <PhotoStatsDashboard
          weddingId={selectedWedding.id}
          onBack={() => setView('dashboard')}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {!selectedWedding ? (
        <EmptyState
          hasWeddings={hasWeddings}
          weddings={weddings}
          onCreateWedding={() => setView('create-wedding')}
          onSelectWedding={setSelectedWedding}
        />
      ) : (
        <WeddingDashboard
          wedding={selectedWedding}
          onNavigateToGuests={() => setView('guests')}
          onNavigateToRsvp={() => setView('rsvp')}
          onNavigateToTemplate={() => setView('template')}
          onNavigateToFeatures={() => setView('features')}
          onNavigateToAnnouncement={() => setView('announcement')}
          onNavigateToEventDetails={() => setView('event-details')}
          onNavigateToFaq={() => setView('faq')}
          onNavigateToRegistry={() => setView('registry')}
          onNavigateToAccommodations={() => setView('accommodations')}
          onNavigateToPasscode={() => setView('passcode')}
          onNavigateToHero={() => setView('hero')}
          onNavigateToMealOptions={() => setView('meal-options')}
          onNavigateToEmailStats={() => setView('email-stats')}
          onNavigateToPhotoStats={() => setView('photo-stats')}
          onBack={weddings.length > 1 ? () => setSelectedWedding(null) : undefined}
        />
      )}
    </div>
  );
}

interface EmptyStateProps {
  hasWeddings: boolean;
  weddings: Wedding[];
  onCreateWedding: () => void;
  onSelectWedding: (wedding: Wedding) => void;
}

/**
 * Empty state shown when no wedding is selected.
 * Uses calm, human language per design system microcopy rules.
 */
function EmptyState({ hasWeddings, weddings, onCreateWedding, onSelectWedding }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <div className="max-w-md mx-auto space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary-100 flex items-center justify-center">
          <HeartIcon className="w-8 h-8 text-primary-500" />
        </div>

        <h1 className="text-2xl text-neutral-800">
          {hasWeddings
            ? 'Select a wedding to get started'
            : 'Welcome to Everbloom'
          }
        </h1>

        <p className="text-neutral-500">
          {hasWeddings
            ? 'Choose one of your weddings from the list, or create a new one.'
            : 'Create your first wedding site to begin sharing your special day with loved ones.'
          }
        </p>

        {hasWeddings && weddings.length > 0 && (
          <div className="space-y-2 pt-4">
            {weddings.map((wedding) => (
              <button
                key={wedding.id}
                onClick={() => onSelectWedding(wedding)}
                className="w-full px-4 py-3 border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 text-left transition-colors"
              >
                <span className="text-neutral-800 font-medium">{wedding.name}</span>
                <span className="text-sm text-neutral-500 block">
                  {wedding.partnerNames[0]} & {wedding.partnerNames[1]}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="pt-4">
          <button className="btn-primary" onClick={onCreateWedding}>
            {hasWeddings ? 'Create another wedding' : 'Create your wedding site'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface WeddingDashboardProps {
  wedding: Wedding;
  onNavigateToGuests: () => void;
  onNavigateToRsvp: () => void;
  onNavigateToTemplate: () => void;
  onNavigateToFeatures: () => void;
  onNavigateToAnnouncement: () => void;
  onNavigateToEventDetails: () => void;
  onNavigateToFaq: () => void;
  onNavigateToRegistry: () => void;
  onNavigateToAccommodations: () => void;
  onNavigateToPasscode: () => void;
  onNavigateToHero: () => void;
  onNavigateToMealOptions: () => void;
  onNavigateToEmailStats: () => void;
  onNavigateToPhotoStats: () => void;
  onBack?: () => void;
}

/**
 * Dashboard view when a wedding is selected.
 * Shows quick actions for the wedding including navigation to guests.
 */
function WeddingDashboard({
  wedding,
  onNavigateToGuests,
  onNavigateToRsvp,
  onNavigateToTemplate,
  onNavigateToFeatures,
  onNavigateToAnnouncement,
  onNavigateToEventDetails,
  onNavigateToFaq,
  onNavigateToRegistry,
  onNavigateToAccommodations,
  onNavigateToPasscode,
  onNavigateToHero,
  onNavigateToMealOptions,
  onNavigateToEmailStats,
  onNavigateToPhotoStats,
  onBack,
}: WeddingDashboardProps) {
  return (
    <div>
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-neutral-600 hover:text-neutral-800 mb-6"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back to weddings
        </button>
      )}

      <div className="mb-8">
        <h1 className="text-2xl text-neutral-800">{wedding.name}</h1>
        <p className="text-neutral-500 mt-1">
          {wedding.partnerNames[0]} & {wedding.partnerNames[1]}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardCard
          title="Hero section"
          description="Edit your site's headline"
          icon={<SparklesIcon className="w-6 h-6" />}
          onClick={onNavigateToHero}
        />
        <DashboardCard
          title="Your guests"
          description="Add and manage your guest list"
          icon={<UsersIcon className="w-6 h-6" />}
          onClick={onNavigateToGuests}
        />
        {wedding.features.RSVP && (
          <DashboardCard
            title="RSVP responses"
            description="Track who's coming to your celebration"
            icon={<ClipboardIcon className="w-6 h-6" />}
            onClick={onNavigateToRsvp}
          />
        )}
        {wedding.features.RSVP && (
          <DashboardCard
            title="Meal options"
            description="Configure meal choices for your guests"
            icon={<ForkKnifeIcon className="w-6 h-6" />}
            onClick={onNavigateToMealOptions}
          />
        )}
        <DashboardCard
          title="Event details"
          description="Set date, time, and venue for calendar invites"
          icon={<CalendarIcon className="w-6 h-6" />}
          onClick={onNavigateToEventDetails}
        />
        <DashboardCard
          title="Site template"
          description="Choose your visual style"
          icon={<PaletteIcon className="w-6 h-6" />}
          onClick={onNavigateToTemplate}
        />
        <DashboardCard
          title="Site features"
          description="Enable or disable features"
          icon={<ToggleIcon className="w-6 h-6" />}
          onClick={onNavigateToFeatures}
        />
        {wedding.features.ANNOUNCEMENT_BANNER && (
          <DashboardCard
            title="Announcement banner"
            description="Share an update at the top of your site"
            icon={<BellIcon className="w-6 h-6" />}
            onClick={onNavigateToAnnouncement}
          />
        )}
        {wedding.features.FAQ_SECTION && (
          <DashboardCard
            title="FAQ"
            description="Answer common questions for your guests"
            icon={<QuestionMarkIcon className="w-6 h-6" />}
            onClick={onNavigateToFaq}
          />
        )}
        {wedding.features.REGISTRY && (
          <DashboardCard
            title="Gift registry"
            description="Add links to your registries"
            icon={<GiftIcon className="w-6 h-6" />}
            onClick={onNavigateToRegistry}
          />
        )}
        {wedding.features.ACCOMMODATIONS && (
          <DashboardCard
            title="Accommodations"
            description="Add hotel and travel information"
            icon={<BuildingIcon className="w-6 h-6" />}
            onClick={onNavigateToAccommodations}
          />
        )}
        {wedding.features.PASSCODE_SITE && (
          <DashboardCard
            title="Site protection"
            description="Protect your site with a passcode"
            icon={<LockIcon className="w-6 h-6" />}
            onClick={onNavigateToPasscode}
          />
        )}
        <DashboardCard
          title="Email statistics"
          description="Track invitation and reminder delivery"
          icon={<EnvelopeIcon className="w-6 h-6" />}
          onClick={onNavigateToEmailStats}
        />
        {wedding.features.PHOTO_UPLOAD && (
          <DashboardCard
            title="Photo uploads"
            description="View photos shared by your guests"
            icon={<CameraIcon className="w-6 h-6" />}
            onClick={onNavigateToPhotoStats}
          />
        )}
        <DashboardCard
          title="Your site"
          description="View your wedding website"
          icon={<GlobeIcon className="w-6 h-6" />}
          href={`/w/${wedding.slug}`}
          external
        />
      </div>
    </div>
  );
}

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  external?: boolean;
}

function DashboardCard({ title, description, icon, onClick, href, external }: DashboardCardProps) {
  const content = (
    <>
      <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mb-4">
        {icon}
      </div>
      <h3 className="text-lg text-neutral-800 font-medium mb-1">{title}</h3>
      <p className="text-sm text-neutral-500">{description}</p>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left block"
      >
        {content}
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left w-full"
    >
      {content}
    </button>
  );
}

function HeartIcon({ className }: { className?: string }) {
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
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
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

function GlobeIcon({ className }: { className?: string }) {
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
        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
      />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
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
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
      />
    </svg>
  );
}

function PaletteIcon({ className }: { className?: string }) {
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
        d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z"
      />
    </svg>
  );
}

function ToggleIcon({ className }: { className?: string }) {
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
        d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
      />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
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
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9a6 6 0 00-12 0v.75a8.967 8.967 0 01-2.312 6.022 23.848 23.848 0 005.455 1.31m5.714 0a3 3 0 11-5.714 0"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
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
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
  );
}

function QuestionMarkIcon({ className }: { className?: string }) {
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

function LockIcon({ className }: { className?: string }) {
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
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function EnvelopeIcon({ className }: { className?: string }) {
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
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
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
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}

function CameraIcon({ className }: { className?: string }) {
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
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
      />
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

/**
 * Wrapper component for TemplateSelector that fetches the current template
 */
interface TemplateSelectorWrapperProps {
  wedding: Wedding;
  onBack: () => void;
}

function TemplateSelectorWrapper({ wedding, onBack }: TemplateSelectorWrapperProps) {
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRenderConfig();
  }, [wedding.id]);

  const fetchRenderConfig = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/render-config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<RenderConfig> = await response.json();

      if (data.ok) {
        setCurrentTemplateId(data.data.templateId);
      }
    } catch {
      // Fallback to default template
      setCurrentTemplateId('minimal-001');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !currentTemplateId) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  return (
    <TemplateSelector
      weddingId={wedding.id}
      currentTemplateId={currentTemplateId}
      onBack={onBack}
      onTemplateChanged={fetchRenderConfig}
    />
  );
}
