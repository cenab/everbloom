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
import { GuestbookManager } from './GuestbookManager';
import { MusicRequests } from './MusicRequests';
import { SeatingManager } from './SeatingManager';
import { Communications } from './Communications';
import { EmailTemplateSettings } from './EmailTemplateSettings';
import { GallerySettings } from './GallerySettings';
import { PhotoModerationSettings } from './PhotoModerationSettings';
import { VideoSettings } from './VideoSettings';
import { SocialSettings } from './SocialSettings';
import { LanguageSettings } from './LanguageSettings';
import { PreviewBanner } from './PreviewBanner';
import { DomainSettings } from './DomainSettings';
import { getAuthToken } from '../lib/auth';
import { getWeddingSiteUrl } from '../lib/urls';
import type { Wedding, ApiResponse, RenderConfig } from '../types';

type View = 'dashboard' | 'create-wedding' | 'guests' | 'rsvp' | 'template' | 'features' | 'announcement' | 'event-details' | 'faq' | 'passcode' | 'hero' | 'meal-options' | 'registry' | 'accommodations' | 'email-stats' | 'photo-stats' | 'guestbook' | 'music' | 'seating' | 'communications' | 'email-templates' | 'gallery' | 'photo-moderation' | 'video' | 'social' | 'language' | 'domain';

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
  const handleSelectWedding = (wedding: Wedding) => {
    setSelectedWedding(wedding);
    setView('dashboard');
  };
  const handleBackToWeddings = () => {
    setSelectedWedding(null);
    setView('dashboard');
  };

  if (view === 'create-wedding') {
    return (
      <div className="bg-neutral-50">
        <div className="max-w-7xl mx-auto px-6 pt-12 pb-8">
          <CreateWedding onCancel={() => setView('dashboard')} />
        </div>
      </div>
    );
  }

  const renderWeddingContent = () => {
    if (!selectedWedding) {
      return null;
    }

    switch (view) {
      case 'dashboard':
        return (
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
            onNavigateToGuestbook={() => setView('guestbook')}
            onNavigateToMusic={() => setView('music')}
            onNavigateToSeating={() => setView('seating')}
            onNavigateToCommunications={() => setView('communications')}
            onNavigateToEmailTemplates={() => setView('email-templates')}
            onNavigateToGallery={() => setView('gallery')}
            onNavigateToPhotoModeration={() => setView('photo-moderation')}
            onNavigateToVideo={() => setView('video')}
            onNavigateToSocial={() => setView('social')}
            onNavigateToLanguage={() => setView('language')}
            onNavigateToDomain={() => setView('domain')}
            onBack={weddings.length > 1 ? handleBackToWeddings : undefined}
          />
        );
      case 'guests':
        return (
          <Guests
            weddingId={selectedWedding.id}
            onBack={() => setView('dashboard')}
          />
        );
      case 'rsvp':
        return (
          <RsvpDashboard
            weddingId={selectedWedding.id}
            onBack={() => setView('dashboard')}
          />
        );
      case 'template':
        return (
          <TemplateSelectorWrapper
            wedding={selectedWedding}
            onBack={() => setView('dashboard')}
          />
        );
      case 'features':
        return (
          <FeatureSettings
            wedding={selectedWedding}
            onBack={() => setView('dashboard')}
            onFeaturesChanged={fetchWeddings}
          />
        );
      case 'announcement':
        return (
          <AnnouncementSettings
            wedding={selectedWedding}
            onBack={() => setView('dashboard')}
            onAnnouncementChanged={fetchWeddings}
          />
        );
      case 'event-details':
        return (
          <EventSettings
            wedding={selectedWedding}
            onBack={() => setView('dashboard')}
            onEventDetailsChanged={fetchWeddings}
          />
        );
      case 'faq':
        return (
          <FaqSettings
            wedding={selectedWedding}
            onBack={() => setView('dashboard')}
            onFaqChanged={fetchWeddings}
          />
        );
      case 'registry':
        return (
          <RegistrySettings
            wedding={selectedWedding}
            onBack={() => setView('dashboard')}
            onRegistryChanged={fetchWeddings}
          />
        );
      case 'accommodations':
        return (
          <AccommodationsSettings
            wedding={selectedWedding}
            onBack={() => setView('dashboard')}
            onAccommodationsChanged={fetchWeddings}
          />
        );
      case 'passcode':
        return (
          <PasscodeSettings
            wedding={selectedWedding}
            onBack={() => setView('dashboard')}
            onPasscodeChanged={fetchWeddings}
          />
        );
      case 'hero':
        return (
          <HeroSettings
            wedding={selectedWedding}
            onBack={() => setView('dashboard')}
            onHeroChanged={fetchWeddings}
          />
        );
      case 'meal-options':
        return (
          <MealSettings
            wedding={selectedWedding}
            onBack={() => setView('dashboard')}
            onMealConfigChanged={fetchWeddings}
          />
        );
      case 'email-stats':
        return (
          <EmailStatisticsDashboard
            weddingId={selectedWedding.id}
            onBack={() => setView('dashboard')}
          />
        );
      case 'photo-stats':
        return (
          <PhotoStatsDashboard
            weddingId={selectedWedding.id}
            onBack={() => setView('dashboard')}
          />
        );
      case 'guestbook':
        return (
          <GuestbookManager
            weddingId={selectedWedding.id}
            onBack={() => setView('dashboard')}
          />
        );
      case 'music':
        return (
          <MusicRequests
            weddingId={selectedWedding.id}
            wedding={selectedWedding}
            onBack={() => setView('dashboard')}
          />
        );
      case 'seating':
        return (
          <SeatingManager
            weddingId={selectedWedding.id}
            onBack={() => setView('dashboard')}
          />
        );
      case 'communications':
        return (
          <Communications
            weddingId={selectedWedding.id}
            onBack={() => setView('dashboard')}
          />
        );
      case 'email-templates':
        return (
          <EmailTemplateSettings
            wedding={selectedWedding}
            onBack={() => setView('dashboard')}
            onTemplatesChanged={fetchWeddings}
          />
        );
      case 'gallery':
        return (
          <GallerySettings
            wedding={selectedWedding}
            onBack={() => setView('dashboard')}
            onGalleryChanged={fetchWeddings}
          />
        );
      case 'photo-moderation':
        return (
          <PhotoModerationSettings
            wedding={selectedWedding}
            onBack={() => setView('dashboard')}
            onWeddingChanged={fetchWeddings}
          />
        );
      case 'video':
        return (
          <VideoSettings
            wedding={selectedWedding}
            onBack={() => setView('dashboard')}
            onVideoChanged={fetchWeddings}
          />
        );
      case 'social':
        return (
          <SocialSettings
            wedding={selectedWedding}
            onBack={() => setView('dashboard')}
            onSocialConfigChanged={fetchWeddings}
          />
        );
      case 'language':
        return (
          <LanguageSettings
            wedding={selectedWedding}
            onBack={() => setView('dashboard')}
            onLanguageChanged={fetchWeddings}
          />
        );
      case 'domain':
        return (
          <DomainSettings
            wedding={selectedWedding}
            onBack={() => setView('dashboard')}
          />
        );
      default:
        return (
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
            onNavigateToGuestbook={() => setView('guestbook')}
            onNavigateToMusic={() => setView('music')}
            onNavigateToSeating={() => setView('seating')}
            onNavigateToCommunications={() => setView('communications')}
            onNavigateToEmailTemplates={() => setView('email-templates')}
            onNavigateToGallery={() => setView('gallery')}
            onNavigateToPhotoModeration={() => setView('photo-moderation')}
            onNavigateToVideo={() => setView('video')}
            onNavigateToSocial={() => setView('social')}
            onNavigateToLanguage={() => setView('language')}
            onNavigateToDomain={() => setView('domain')}
            onBack={weddings.length > 1 ? handleBackToWeddings : undefined}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-neutral-50">
        <div className="max-w-7xl mx-auto px-6 pt-12 pb-8">
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-neutral-500">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedWedding) {
    return (
      <div className="bg-neutral-50">
        <div className="max-w-7xl mx-auto px-6 pt-12 pb-8">
          <EmptyState
            hasWeddings={hasWeddings}
            weddings={weddings}
            onCreateWedding={() => setView('create-wedding')}
            onSelectWedding={handleSelectWedding}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <WeddingSidebar
            wedding={selectedWedding}
            activeView={view}
            onNavigateToDashboard={() => setView('dashboard')}
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
            onNavigateToGuestbook={() => setView('guestbook')}
            onNavigateToMusic={() => setView('music')}
            onNavigateToSeating={() => setView('seating')}
            onNavigateToCommunications={() => setView('communications')}
            onNavigateToEmailTemplates={() => setView('email-templates')}
            onNavigateToGallery={() => setView('gallery')}
            onNavigateToPhotoModeration={() => setView('photo-moderation')}
            onNavigateToVideo={() => setView('video')}
            onNavigateToSocial={() => setView('social')}
            onNavigateToLanguage={() => setView('language')}
            onNavigateToDomain={() => setView('domain')}
            onBack={weddings.length > 1 ? handleBackToWeddings : undefined}
          />
          <div className="flex-1 min-w-0 bg-white border border-neutral-200 rounded-xl p-6">
            {renderWeddingContent()}
          </div>
        </div>
      </div>
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
  onNavigateToGuestbook: () => void;
  onNavigateToMusic: () => void;
  onNavigateToSeating: () => void;
  onNavigateToCommunications: () => void;
  onNavigateToEmailTemplates: () => void;
  onNavigateToGallery: () => void;
  onNavigateToPhotoModeration: () => void;
  onNavigateToVideo: () => void;
  onNavigateToSocial: () => void;
  onNavigateToLanguage: () => void;
  onNavigateToDomain: () => void;
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
  onNavigateToGuestbook,
  onNavigateToMusic,
  onNavigateToSeating,
  onNavigateToCommunications,
  onNavigateToEmailTemplates,
  onNavigateToGallery,
  onNavigateToPhotoModeration,
  onNavigateToVideo,
  onNavigateToSocial,
  onNavigateToLanguage,
  onNavigateToDomain,
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

      {/* Preview banner shows when there are unpublished changes */}
      <PreviewBanner weddingId={wedding.id} weddingSlug={wedding.slug} />

      <div className="mb-8">
        <h1 className="text-2xl text-neutral-800">{wedding.name}</h1>
        <p className="text-neutral-500 mt-1">
          {wedding.partnerNames[0]} & {wedding.partnerNames[1]}
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg text-neutral-800 font-medium">Quick actions</h2>
              <p className="text-sm text-neutral-500">Jump into the most-used edits.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <DashboardCard
              title="Hero section"
              description="Edit your site's headline"
              icon={<SparklesIcon className="w-6 h-6" />}
              onClick={onNavigateToHero}
            />
            <DashboardCard
              title="Event details"
              description="Set date, time, and venue"
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
              title="Your site"
              description="View your wedding website"
              icon={<GlobeIcon className="w-6 h-6" />}
              href={getWeddingSiteUrl(wedding.slug)}
              external
            />
          </div>
        </section>
        <section className="bg-white border border-neutral-200 rounded-xl p-6">
          <h2 className="text-lg text-neutral-800 font-medium">Explore your workspace</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Use the sidebar to jump between site edits, guest tools, and communications. We keep your
            progress as you move.
          </p>
        </section>
      </div>
    </div>
  );
}

interface WeddingSidebarProps {
  wedding: Wedding;
  activeView: View;
  onNavigateToDashboard: () => void;
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
  onNavigateToGuestbook: () => void;
  onNavigateToMusic: () => void;
  onNavigateToSeating: () => void;
  onNavigateToCommunications: () => void;
  onNavigateToEmailTemplates: () => void;
  onNavigateToGallery: () => void;
  onNavigateToPhotoModeration: () => void;
  onNavigateToVideo: () => void;
  onNavigateToSocial: () => void;
  onNavigateToLanguage: () => void;
  onNavigateToDomain: () => void;
  onBack?: () => void;
}

interface SidebarNavItemConfig {
  label: string;
  icon: React.ReactNode;
  view?: View;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  visible?: boolean;
}

function WeddingSidebar({
  wedding,
  activeView,
  onNavigateToDashboard,
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
  onNavigateToGuestbook,
  onNavigateToMusic,
  onNavigateToSeating,
  onNavigateToCommunications,
  onNavigateToEmailTemplates,
  onNavigateToGallery,
  onNavigateToPhotoModeration,
  onNavigateToVideo,
  onNavigateToSocial,
  onNavigateToLanguage,
  onNavigateToDomain,
  onBack,
}: WeddingSidebarProps) {
  const weddingSiteUrl = getWeddingSiteUrl(wedding.slug);
  const sections: { title: string; items: SidebarNavItemConfig[] }[] = [
    {
      title: 'Overview',
      items: [
        {
          label: 'Dashboard',
          icon: <HeartIcon className="w-4 h-4" />,
          view: 'dashboard',
          onClick: onNavigateToDashboard,
        },
        {
          label: 'Your site',
          icon: <GlobeIcon className="w-4 h-4" />,
          href: weddingSiteUrl,
          external: true,
        },
      ],
    },
    {
      title: 'Site',
      items: [
        {
          label: 'Hero section',
          icon: <SparklesIcon className="w-4 h-4" />,
          view: 'hero',
          onClick: onNavigateToHero,
        },
        {
          label: 'Event details',
          icon: <CalendarIcon className="w-4 h-4" />,
          view: 'event-details',
          onClick: onNavigateToEventDetails,
        },
        {
          label: 'Photo gallery',
          icon: <ImageIcon className="w-4 h-4" />,
          view: 'gallery',
          onClick: onNavigateToGallery,
        },
        {
          label: 'Video embeds',
          icon: <VideoIcon className="w-4 h-4" />,
          view: 'video',
          onClick: onNavigateToVideo,
          visible: wedding.features.VIDEO_EMBED,
        },
        {
          label: 'Announcement banner',
          icon: <BellIcon className="w-4 h-4" />,
          view: 'announcement',
          onClick: onNavigateToAnnouncement,
          visible: wedding.features.ANNOUNCEMENT_BANNER,
        },
        {
          label: 'FAQ',
          icon: <QuestionMarkIcon className="w-4 h-4" />,
          view: 'faq',
          onClick: onNavigateToFaq,
          visible: wedding.features.FAQ_SECTION,
        },
        {
          label: 'Gift registry',
          icon: <GiftIcon className="w-4 h-4" />,
          view: 'registry',
          onClick: onNavigateToRegistry,
          visible: wedding.features.REGISTRY,
        },
        {
          label: 'Accommodations',
          icon: <BuildingIcon className="w-4 h-4" />,
          view: 'accommodations',
          onClick: onNavigateToAccommodations,
          visible: wedding.features.ACCOMMODATIONS,
        },
        {
          label: 'Site template',
          icon: <PaletteIcon className="w-4 h-4" />,
          view: 'template',
          onClick: onNavigateToTemplate,
        },
        {
          label: 'Site features',
          icon: <ToggleIcon className="w-4 h-4" />,
          view: 'features',
          onClick: onNavigateToFeatures,
        },
        {
          label: 'Site protection',
          icon: <LockIcon className="w-4 h-4" />,
          view: 'passcode',
          onClick: onNavigateToPasscode,
          visible: wedding.features.PASSCODE_SITE,
        },
        {
          label: 'Social sharing',
          icon: <ShareIcon className="w-4 h-4" />,
          view: 'social',
          onClick: onNavigateToSocial,
        },
        {
          label: 'Site language',
          icon: <LanguageIcon className="w-4 h-4" />,
          view: 'language',
          onClick: onNavigateToLanguage,
        },
        {
          label: 'Custom domain',
          icon: <LinkIcon className="w-4 h-4" />,
          view: 'domain',
          onClick: onNavigateToDomain,
        },
      ],
    },
    {
      title: 'Guests',
      items: [
        {
          label: 'Your guests',
          icon: <UsersIcon className="w-4 h-4" />,
          view: 'guests',
          onClick: onNavigateToGuests,
        },
        {
          label: 'RSVP responses',
          icon: <ClipboardIcon className="w-4 h-4" />,
          view: 'rsvp',
          onClick: onNavigateToRsvp,
          visible: wedding.features.RSVP,
        },
        {
          label: 'Meal options',
          icon: <ForkKnifeIcon className="w-4 h-4" />,
          view: 'meal-options',
          onClick: onNavigateToMealOptions,
          visible: wedding.features.RSVP,
        },
        {
          label: 'Seating chart',
          icon: <TableIcon className="w-4 h-4" />,
          view: 'seating',
          onClick: onNavigateToSeating,
          visible: wedding.features.SEATING_CHART,
        },
        {
          label: 'Guestbook',
          icon: <MessageSquareIcon className="w-4 h-4" />,
          view: 'guestbook',
          onClick: onNavigateToGuestbook,
          visible: wedding.features.GUESTBOOK,
        },
        {
          label: 'Song requests',
          icon: <MusicNoteIcon className="w-4 h-4" />,
          view: 'music',
          onClick: onNavigateToMusic,
          visible: wedding.features.MUSIC_REQUESTS,
        },
      ],
    },
    {
      title: 'Communications',
      items: [
        {
          label: 'Email statistics',
          icon: <EnvelopeIcon className="w-4 h-4" />,
          view: 'email-stats',
          onClick: onNavigateToEmailStats,
        },
        {
          label: 'Communications',
          icon: <PaperAirplaneIcon className="w-4 h-4" />,
          view: 'communications',
          onClick: onNavigateToCommunications,
        },
        {
          label: 'Email templates',
          icon: <DocumentTextIcon className="w-4 h-4" />,
          view: 'email-templates',
          onClick: onNavigateToEmailTemplates,
        },
        {
          label: 'Photo uploads',
          icon: <CameraIcon className="w-4 h-4" />,
          view: 'photo-stats',
          onClick: onNavigateToPhotoStats,
          visible: wedding.features.PHOTO_UPLOAD,
        },
        {
          label: 'Photo moderation',
          icon: <ShieldCheckIcon className="w-4 h-4" />,
          view: 'photo-moderation',
          onClick: onNavigateToPhotoModeration,
          visible: wedding.features.PHOTO_UPLOAD,
        },
      ],
    },
  ];

  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.visible !== false),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className="w-full lg:w-72 bg-white border border-neutral-200 rounded-xl p-4">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Wedding</p>
        <h2 className="text-sm font-medium text-neutral-800">{wedding.name}</h2>
        <p className="text-xs text-neutral-500">
          {wedding.partnerNames[0]} &amp; {wedding.partnerNames[1]}
        </p>
      </div>

      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-800 mb-4"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          All weddings
        </button>
      )}

      <nav className="space-y-6">
        {visibleSections.map((section) => (
          <div key={section.title}>
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              {section.title}
            </p>
            <div className="mt-2 space-y-1">
              {section.items.map((item) => (
                <SidebarNavItem
                  key={item.label}
                  item={item}
                  active={item.view === activeView}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

interface SidebarNavItemProps {
  item: SidebarNavItemConfig;
  active: boolean;
}

function SidebarNavItem({ item, active }: SidebarNavItemProps) {
  const baseClass =
    'flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors';
  const stateClass = active
    ? 'bg-primary-50 text-primary-700'
    : 'text-neutral-700 hover:bg-primary-50 hover:text-primary-700';
  const className = `${baseClass} ${stateClass}`;

  if (item.href) {
    return (
      <a
        href={item.href}
        target={item.external ? '_blank' : undefined}
        rel={item.external ? 'noopener noreferrer' : undefined}
        className={className}
      >
        {item.icon}
        <span>{item.label}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={item.onClick}
      aria-current={active ? 'page' : undefined}
      className={className}
    >
      {item.icon}
      <span>{item.label}</span>
    </button>
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

function MessageSquareIcon({ className }: { className?: string }) {
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
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    </svg>
  );
}

function MusicNoteIcon({ className }: { className?: string }) {
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
        d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
      />
    </svg>
  );
}

function TableIcon({ className }: { className?: string }) {
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
        d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25-3.75h7.5M3.375 12c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m7.5-3.75v1.5c0 .621.504 1.125 1.125 1.125m0 0c.621 0 1.125.504 1.125 1.125M12 13.875v1.5c0 .621-.504 1.125-1.125 1.125M12 13.875c0 .621.504 1.125 1.125 1.125m0 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25-3.75h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m7.5-3.75v1.5c0 .621.504 1.125 1.125 1.125"
      />
    </svg>
  );
}

function PaperAirplaneIcon({ className }: { className?: string }) {
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
        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
      />
    </svg>
  );
}

function DocumentTextIcon({ className }: { className?: string }) {
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
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
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
        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
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
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
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
        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
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
        d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
      />
    </svg>
  );
}

function LanguageIcon({ className }: { className?: string }) {
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
        d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802"
      />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
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
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
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
