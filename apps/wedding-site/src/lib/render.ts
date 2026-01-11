// Section renderers for wedding site

import type {
  RenderConfig, Section, Theme, FaqConfig, RegistryConfig,
  AccommodationsConfig, GuestbookConfig, GalleryConfig, VideoConfig,
  SeatingConfig, EventDetailsData, Announcement
} from '../types';
import { t, type TranslationStrings } from './i18n';

type SectionData = Section['data'];

type RenderOptions = {
  rsvpUrl?: string;
  showRsvpCta?: boolean;
};

// Escape HTML to prevent XSS
function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Format date for display
function formatDate(dateStr: string, lang: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

const INVITATION_STYLES = new Set(['classic', 'modern', 'minimal']);

function getInvitationStyle(data: SectionData): string {
  const raw = (data.invitationStyle as string | undefined) || '';
  const normalized = raw.trim().toLowerCase();
  return INVITATION_STYLES.has(normalized) ? normalized : 'classic';
}

function buildStrings(lang: string): TranslationStrings {
  return {
    eventDetailsTitle: t('eventDetailsTitle', lang),
    eventDetailsGetDirections: t('eventDetailsGetDirections', lang),
    rsvpTitle: t('rsvpTitle', lang),
    rsvpRespondButton: t('rsvpRespondButton', lang),
    faqTitle: t('faqTitle', lang),
    registryTitle: t('registryTitle', lang),
    accommodationsTitle: t('accommodationsTitle', lang),
    accommodationsBookNow: t('accommodationsBookNow', lang),
    accommodationsRoomBlockCode: t('accommodationsRoomBlockCode', lang),
    accommodationsGettingThere: t('accommodationsGettingThere', lang),
    accommodationsAirportDirections: t('accommodationsAirportDirections', lang),
    accommodationsParking: t('accommodationsParking', lang),
    accommodationsViewMap: t('accommodationsViewMap', lang),
    guestbookTitle: t('guestbookTitle', lang),
    guestbookDescription: t('guestbookDescription', lang),
    guestbookNameLabel: t('guestbookNameLabel', lang),
    guestbookMessageLabel: t('guestbookMessageLabel', lang),
    guestbookSubmitButton: t('guestbookSubmitButton', lang),
    guestbookNoMessages: t('guestbookNoMessages', lang),
    photosTitle: t('photosTitle', lang),
    photosDescription: t('photosDescription', lang),
    photosUploadButton: t('photosUploadButton', lang),
    musicTitle: t('musicTitle', lang),
    musicDescription: t('musicDescription', lang),
    musicSongTitleLabel: t('musicSongTitleLabel', lang),
    musicArtistLabel: t('musicArtistLabel', lang),
    musicYourNameLabel: t('musicYourNameLabel', lang),
    musicSubmitButton: t('musicSubmitButton', lang),
    galleryTitle: t('galleryTitle', lang),
    videoTitle: t('videoTitle', lang),
    seatingTitle: t('seatingTitle', lang),
  } as TranslationStrings;
}

// Render announcement banner
function renderAnnouncement(announcement: Announcement): string {
  if (!announcement.enabled) return '';

  return `
    <div class="announcement-banner" role="status">
      <div class="announcement-content">
        <strong class="announcement-title">${escapeHtml(announcement.title)}</strong>
        <span class="announcement-message">${escapeHtml(announcement.message)}</span>
      </div>
    </div>
  `;
}

// Render hero section
function renderHero(
  data: SectionData,
  config: RenderConfig,
  strings: TranslationStrings,
  options?: RenderOptions
): string {
  const headline = (data.headline as string) || `${config.wedding.partnerNames[0]} & ${config.wedding.partnerNames[1]}`;
  const subheadline = (data.subheadline as string) || '';
  const invitationMessage = (data.invitationMessage as string) || '';
  const showDate = (data.showDate as boolean | undefined) !== false;
  const invitationStyle = getInvitationStyle(data);
  const venueLine = [config.wedding.venue, config.wedding.city].filter(Boolean).join(', ');
  const showDivider = Boolean((showDate && config.wedding.date) || venueLine);
  const showRsvpCta = options?.showRsvpCta === true && config.features.RSVP;
  const rsvpUrl = showRsvpCta ? (options?.rsvpUrl || '/rsvp') : '';

  return `
    <section class="section hero-section invitation-style-${invitationStyle}" id="hero" data-invitation-style="${invitationStyle}">
      <div class="hero-invitation">
        <div class="hero-card">
          <span class="hero-accent" aria-hidden="true"></span>
          ${invitationMessage ? `<p class="hero-message">${escapeHtml(invitationMessage)}</p>` : ''}
          <h1 class="hero-headline">${escapeHtml(headline)}</h1>
          ${subheadline ? `<p class="hero-subheadline">${escapeHtml(subheadline)}</p>` : ''}
          ${showDivider ? `<span class="hero-divider" aria-hidden="true"></span>` : ''}
          ${showDate && config.wedding.date ? `<p class="hero-date">${formatDate(config.wedding.date, config.language || 'en')}</p>` : ''}
          ${venueLine ? `<p class="hero-location">${escapeHtml(venueLine)}</p>` : ''}
        </div>
        ${showRsvpCta ? `<a href="${escapeHtml(rsvpUrl)}" class="btn btn-primary hero-rsvp">${strings.rsvpRespondButton}</a>` : ''}
      </div>
    </section>
  `;
}

// Render event details section
function renderEventDetails(eventDetails: EventDetailsData, strings: TranslationStrings): string {
  const { venue, address, city, date, startTime, endTime } = eventDetails;

  return `
    <section class="section event-details-section" id="event-details">
      <h2 class="section-title">${strings.eventDetailsTitle}</h2>
      <div class="event-card">
        <div class="event-info">
          ${date ? `<p class="event-date">${escapeHtml(date)}</p>` : ''}
          ${startTime ? `<p class="event-time">${escapeHtml(startTime)}${endTime ? ` - ${escapeHtml(endTime)}` : ''}</p>` : ''}
          ${venue ? `<p class="event-venue">${escapeHtml(venue)}</p>` : ''}
          ${address ? `<p class="event-address">${escapeHtml(address)}</p>` : ''}
          ${city ? `<p class="event-city">${escapeHtml(city)}</p>` : ''}
        </div>
        ${address ? `
          <a href="https://maps.google.com/?q=${encodeURIComponent(`${address}, ${city || ''}`)}"
             target="_blank"
             rel="noopener noreferrer"
             class="btn btn-secondary">
            ${strings.eventDetailsGetDirections}
          </a>
        ` : ''}
      </div>
    </section>
  `;
}

// Render RSVP section
function renderRsvp(data: SectionData, _slug: string, strings: TranslationStrings): string {
  const title = (data.title as string) || strings.rsvpTitle;
  const description = (data.description as string) || '';

  return `
    <section class="section rsvp-section" id="rsvp">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      ${description ? `<p class="section-description">${escapeHtml(description)}</p>` : ''}
      <a href="/rsvp" class="btn btn-primary">${strings.rsvpRespondButton}</a>
    </section>
  `;
}

// Render FAQ section
function renderFaq(faq: FaqConfig, strings: TranslationStrings): string {
  if (!faq.items?.length) return '';

  const items = faq.items
    .sort((a, b) => a.order - b.order)
    .map(item => `
      <details class="faq-item">
        <summary class="faq-question">${escapeHtml(item.question)}</summary>
        <div class="faq-answer">${escapeHtml(item.answer)}</div>
      </details>
    `)
    .join('');

  return `
    <section class="section faq-section" id="faq">
      <h2 class="section-title">${strings.faqTitle}</h2>
      <div class="faq-list">${items}</div>
    </section>
  `;
}

// Render registry section
function renderRegistry(registry: RegistryConfig, strings: TranslationStrings): string {
  if (!registry.links?.length) return '';

  const links = registry.links
    .sort((a, b) => a.order - b.order)
    .map(link => `
      <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="registry-link">
        ${escapeHtml(link.name)}
      </a>
    `)
    .join('');

  return `
    <section class="section registry-section" id="registry">
      <h2 class="section-title">${strings.registryTitle}</h2>
      <div class="registry-links">${links}</div>
    </section>
  `;
}

// Render accommodations section
function renderAccommodations(accommodations: AccommodationsConfig, strings: TranslationStrings): string {
  const hotels = accommodations.hotels
    ?.sort((a, b) => a.order - b.order)
    .map(hotel => `
      <div class="hotel-card">
        <h3 class="hotel-name">${escapeHtml(hotel.name)}</h3>
        <p class="hotel-address">${escapeHtml(hotel.address)}</p>
        ${hotel.notes ? `<p class="hotel-notes">${escapeHtml(hotel.notes)}</p>` : ''}
        ${hotel.roomBlockCode ? `<p class="hotel-code">${strings.accommodationsRoomBlockCode}: ${escapeHtml(hotel.roomBlockCode)}</p>` : ''}
        ${hotel.bookingUrl ? `<a href="${escapeHtml(hotel.bookingUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">${strings.accommodationsBookNow}</a>` : ''}
      </div>
    `)
    .join('') || '';

  const travelInfo = accommodations.travelInfo;
  const travel = travelInfo ? `
    <div class="travel-info">
      <h3>${strings.accommodationsGettingThere}</h3>
      ${travelInfo.airportDirections ? `<p><strong>${strings.accommodationsAirportDirections}:</strong> ${escapeHtml(travelInfo.airportDirections)}</p>` : ''}
      ${travelInfo.parkingInfo ? `<p><strong>${strings.accommodationsParking}:</strong> ${escapeHtml(travelInfo.parkingInfo)}</p>` : ''}
      ${travelInfo.mapUrl ? `<a href="${escapeHtml(travelInfo.mapUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">${strings.accommodationsViewMap}</a>` : ''}
    </div>
  ` : '';

  return `
    <section class="section accommodations-section" id="accommodations">
      <h2 class="section-title">${strings.accommodationsTitle}</h2>
      <div class="hotels-grid">${hotels}</div>
      ${travel}
    </section>
  `;
}

// Render guestbook section
function renderGuestbook(guestbook: GuestbookConfig, slug: string, strings: TranslationStrings): string {
  const approvedMessages = guestbook.messages?.filter(m => m.status === 'approved') || [];

  const messages = approvedMessages.length > 0
    ? approvedMessages.map(msg => `
        <div class="guestbook-message">
          <p class="message-text">${escapeHtml(msg.message)}</p>
          <p class="message-author">- ${escapeHtml(msg.guestName)}</p>
        </div>
      `).join('')
    : `<p class="no-messages">${strings.guestbookNoMessages}</p>`;

  return `
    <section class="section guestbook-section" id="guestbook">
      <h2 class="section-title">${strings.guestbookTitle}</h2>
      <p class="section-description">${strings.guestbookDescription}</p>

      <form class="guestbook-form" id="guestbook-form" data-slug="${escapeHtml(slug)}">
        <div class="form-group">
          <label for="guestbook-name">${strings.guestbookNameLabel}</label>
          <input type="text" id="guestbook-name" name="guestName" required>
        </div>
        <div class="form-group">
          <label for="guestbook-message">${strings.guestbookMessageLabel}</label>
          <textarea id="guestbook-message" name="message" rows="4" required></textarea>
        </div>
        <button type="submit" class="btn btn-primary">${strings.guestbookSubmitButton}</button>
        <p class="form-status" id="guestbook-status" role="alert"></p>
      </form>

      <div class="guestbook-messages">${messages}</div>
    </section>
  `;
}

// Render photo upload section
function renderPhotoUpload(data: SectionData, slug: string, strings: TranslationStrings): string {
  const title = (data.title as string) || strings.photosTitle;
  const description = (data.description as string) || strings.photosDescription;

  return `
    <section class="section photo-upload-section" id="photos">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      <p class="section-description">${escapeHtml(description)}</p>
      <a href="/w/${escapeHtml(slug)}/photos" class="btn btn-primary">${strings.photosUploadButton}</a>
    </section>
  `;
}

// Render music request section
function renderMusicRequest(data: SectionData, slug: string, strings: TranslationStrings): string {
  const title = (data.title as string) || strings.musicTitle;
  const description = (data.description as string) || strings.musicDescription;

  return `
    <section class="section music-section" id="music">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      <p class="section-description">${escapeHtml(description)}</p>

      <form class="music-form" id="music-form" data-slug="${escapeHtml(slug)}">
        <div class="form-row">
          <div class="form-group">
            <label for="music-song">${strings.musicSongTitleLabel}</label>
            <input type="text" id="music-song" name="songTitle" required>
          </div>
          <div class="form-group">
            <label for="music-artist">${strings.musicArtistLabel}</label>
            <input type="text" id="music-artist" name="artistName" required>
          </div>
        </div>
        <div class="form-group">
          <label for="music-name">${strings.musicYourNameLabel}</label>
          <input type="text" id="music-name" name="requesterName">
        </div>
        <button type="submit" class="btn btn-primary">${strings.musicSubmitButton}</button>
        <p class="form-status" id="music-status" role="alert"></p>
      </form>
    </section>
  `;
}

// Render gallery section
function renderGallery(gallery: GalleryConfig, strings: TranslationStrings): string {
  if (!gallery.photos?.length) return '';

  const photos = gallery.photos
    .sort((a, b) => a.order - b.order)
    .map((photo, index) => `
      <button class="gallery-item" data-index="${index}" data-url="${escapeHtml(photo.url || '')}">
        <img src="${escapeHtml(photo.url || '')}" alt="${escapeHtml(photo.caption || `Photo ${index + 1}`)}" loading="lazy">
      </button>
    `)
    .join('');

  return `
    <section class="section gallery-section" id="gallery">
      <h2 class="section-title">${strings.galleryTitle}</h2>
      <div class="gallery-grid">${photos}</div>
    </section>

    <div class="lightbox" id="lightbox" role="dialog" aria-modal="true" hidden>
      <button class="lightbox-close" aria-label="Close">&times;</button>
      <button class="lightbox-prev" aria-label="Previous">&larr;</button>
      <img class="lightbox-image" src="" alt="">
      <button class="lightbox-next" aria-label="Next">&rarr;</button>
    </div>
  `;
}

// Render video section
function renderVideo(video: VideoConfig, strings: TranslationStrings): string {
  if (!video.videos?.length) return '';

  const videos = video.videos
    .sort((a, b) => a.order - b.order)
    .map(v => {
      const embedUrl = v.platform === 'youtube'
        ? `https://www.youtube.com/embed/${v.videoId}`
        : `https://player.vimeo.com/video/${v.videoId}`;

      return `
        <div class="video-embed">
          <iframe
            src="${embedUrl}"
            title="${escapeHtml(v.title || 'Video')}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen>
          </iframe>
        </div>
      `;
    })
    .join('');

  return `
    <section class="section video-section" id="video">
      <h2 class="section-title">${strings.videoTitle}</h2>
      <div class="videos-container">${videos}</div>
    </section>
  `;
}

// Render seating section
function renderSeating(seating: SeatingConfig, strings: TranslationStrings): string {
  if (!seating.tables?.length) return '';

  const tables = seating.tables
    .sort((a, b) => a.order - b.order)
    .map(table => `
      <div class="seating-table">
        <h3 class="table-name">${escapeHtml(table.name)}</h3>
        <p class="table-capacity">${table.guestCount}/${table.capacity} guests</p>
        ${table.notes ? `<p class="table-notes">${escapeHtml(table.notes)}</p>` : ''}
      </div>
    `)
    .join('');

  return `
    <section class="section seating-section" id="seating">
      <h2 class="section-title">${strings.seatingTitle}</h2>
      <div class="seating-grid">${tables}</div>
    </section>
  `;
}

// Main render function
export function renderInvitationPage(config: RenderConfig, options?: RenderOptions): string {
  const lang = config.language || 'en';
  const strings = buildStrings(lang);
  const heroSection = config.sections.find(section => section.type === 'hero');
  const heroData = heroSection?.data || {};

  return renderHero(heroData, config, strings, options);
}

export function renderWeddingPage(config: RenderConfig, options?: RenderOptions): string {
  const lang = config.language || 'en';
  const strings = buildStrings(lang);

  const slug = config.wedding.slug;
  const sections: string[] = [];

  if (config.features.ANNOUNCEMENT_BANNER && config.announcement?.enabled) {
    sections.push(renderAnnouncement(config.announcement));
  }

  // Sort sections by order
  const sortedSections = [...config.sections].sort((a, b) => a.order - b.order);

  for (const section of sortedSections) {
    if (!section.enabled) continue;

    switch (section.type) {
      case 'hero':
        sections.push(renderHero(section.data, config, strings, options));
        break;
      case 'event_details':
        if (config.eventDetails) {
          sections.push(renderEventDetails(config.eventDetails, strings));
        }
        break;
      case 'rsvp':
        if (config.features.RSVP) {
          sections.push(renderRsvp(section.data, slug, strings));
        }
        break;
      case 'faq':
        if (config.features.FAQ_SECTION && config.faq) {
          sections.push(renderFaq(config.faq, strings));
        }
        break;
      case 'registry':
        if (config.features.REGISTRY && config.registry) {
          sections.push(renderRegistry(config.registry, strings));
        }
        break;
      case 'accommodations':
        if (config.features.ACCOMMODATIONS && config.accommodations) {
          sections.push(renderAccommodations(config.accommodations, strings));
        }
        break;
      case 'guestbook':
        if (config.features.GUESTBOOK && config.guestbook) {
          sections.push(renderGuestbook(config.guestbook, slug, strings));
        }
        break;
      case 'photo_upload':
        if (config.features.PHOTO_UPLOAD) {
          sections.push(renderPhotoUpload(section.data, slug, strings));
        }
        break;
      case 'music_request':
        if (config.features.MUSIC_REQUESTS) {
          sections.push(renderMusicRequest(section.data, slug, strings));
        }
        break;
      case 'gallery':
        if (config.gallery) {
          sections.push(renderGallery(config.gallery, strings));
        }
        break;
      case 'video':
        if (config.features.VIDEO_EMBED && config.video) {
          sections.push(renderVideo(config.video, strings));
        }
        break;
      case 'seating':
        if (config.features.SEATING_CHART && config.seating) {
          sections.push(renderSeating(config.seating, strings));
        }
        break;
    }
  }

  return sections.join('\n');
}

// Apply theme to document
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.primary);
  root.style.setProperty('--color-accent', theme.accent);
  root.style.setProperty('--color-neutral-light', theme.neutralLight);
  root.style.setProperty('--color-neutral-dark', theme.neutralDark);
}
