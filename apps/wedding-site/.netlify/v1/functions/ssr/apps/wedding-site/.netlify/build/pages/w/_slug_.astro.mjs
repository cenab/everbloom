import { c as createComponent, a as createAstro, m as maybeRenderHead, b as addAttribute, r as renderTemplate, d as defineStyleVars, g as defineScriptVars, f as renderComponent } from '../../chunks/astro/server_6gLzEsed.mjs';
import { a as fetchSiteConfig } from '../../chunks/api_DY9V-Yw_.mjs';
import { a as $$PasscodeGateWrapper, $ as $$ErrorPage, b as $$WeddingLayout } from '../../chunks/ErrorPage_Cw19BkIb.mjs';
/* empty css                                    */
import { g as getTranslations, $ as $$LanguageSelector } from '../../chunks/LanguageSelector_BxXQ46vK.mjs';
export { renderers } from '../../renderers.mjs';

const $$Astro$e = createAstro();
const $$AnnouncementBanner = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$e, $$props, $$slots);
  Astro2.self = $$AnnouncementBanner;
  const { announcement, theme } = Astro2.props;
  const { title, message } = announcement;
  return renderTemplate`${maybeRenderHead()}<section class="announcement-banner" role="region" aria-label="Announcement"${addAttribute(`--primary: ${theme.primary}; --accent: ${theme.accent}; --neutral-light: ${theme.neutralLight}; --neutral-dark: ${theme.neutralDark};`, "style")} data-astro-cid-2opq22vd> <div class="announcement-content" data-astro-cid-2opq22vd> ${title && renderTemplate`<h2 class="announcement-title" data-astro-cid-2opq22vd>${title}</h2>`} ${message && renderTemplate`<p class="announcement-message" data-astro-cid-2opq22vd>${message}</p>`} </div> </section> `;
}, "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/components/AnnouncementBanner.astro", void 0);

const $$Astro$d = createAstro();
const $$HeroSection = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$d, $$props, $$slots);
  Astro2.self = $$HeroSection;
  const { section, theme } = Astro2.props;
  const { headline, subheadline } = section.data;
  return renderTemplate`${maybeRenderHead()}<section class="hero-section"${addAttribute(`--primary: ${theme.primary}; --accent: ${theme.accent}; --neutral-light: ${theme.neutralLight}; --neutral-dark: ${theme.neutralDark};`, "style")} data-astro-cid-7nmnspah> <div class="hero-content" data-astro-cid-7nmnspah> <h1 class="hero-headline" data-astro-cid-7nmnspah>${headline || "Our Wedding"}</h1> ${subheadline && renderTemplate`<p class="hero-subheadline" data-astro-cid-7nmnspah>${subheadline}</p>`} </div> </section> `;
}, "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/components/sections/HeroSection.astro", void 0);

const $$Astro$c = createAstro();
const $$EventDetailsSection = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$c, $$props, $$slots);
  Astro2.self = $$EventDetailsSection;
  const { section, theme, weddingDate, venue, city, slug, calendarEnabled, eventDetails } = Astro2.props;
  const { title, description } = section.data;
  function formatTime(time) {
    const [hours, minutes] = time.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  }
  function formatDate(dateStr) {
    const date = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }
  const showCalendarButtons = calendarEnabled && eventDetails;
  const apiBaseUrl = "http://localhost:3001/api";
  const icsDownloadUrl = `${apiBaseUrl}/calendar/${slug}/download.ics`;
  const googleCalendarUrl = `${apiBaseUrl}/calendar/${slug}/google`;
  const hasMultipleEvents = eventDetails?.events && eventDetails.events.length > 1;
  const events = (eventDetails?.events || []).slice().sort((a, b) => {
    const dateA = /* @__PURE__ */ new Date(`${a.date}T${a.startTime}`);
    const dateB = /* @__PURE__ */ new Date(`${b.date}T${b.startTime}`);
    return dateA.getTime() - dateB.getTime();
  });
  const displayDate = eventDetails?.date ? formatDate(eventDetails.date) : weddingDate;
  const displayTime = eventDetails?.startTime ? formatTime(eventDetails.startTime) : null;
  const displayVenue = eventDetails?.venue || venue;
  const displayCity = eventDetails?.city || city;
  return renderTemplate`${maybeRenderHead()}<section class="event-details-section"${addAttribute(`--primary: ${theme.primary}; --accent: ${theme.accent}; --neutral-light: ${theme.neutralLight}; --neutral-dark: ${theme.neutralDark};`, "style")} data-astro-cid-fcl2hznd> <div class="event-details-content" data-astro-cid-fcl2hznd> <h2 class="section-title" data-astro-cid-fcl2hznd>${title || "The Details"}</h2> ${description && renderTemplate`<p class="section-description" data-astro-cid-fcl2hznd>${description}</p>`} ${hasMultipleEvents ? renderTemplate`<!-- Timeline display for multiple events (sorted chronologically) -->
      <div class="timeline" data-astro-cid-fcl2hznd> <div class="timeline-line" data-astro-cid-fcl2hznd></div> ${events.map((event, index) => renderTemplate`<div class="timeline-event" data-astro-cid-fcl2hznd> <div class="timeline-marker" data-astro-cid-fcl2hznd> <div class="timeline-dot" data-astro-cid-fcl2hznd></div> </div> <div class="timeline-card" data-astro-cid-fcl2hznd> <div class="timeline-order" data-astro-cid-fcl2hznd>${index + 1}</div> <h3 class="event-name" data-astro-cid-fcl2hznd>${event.name}</h3> <div class="event-details" data-astro-cid-fcl2hznd> <div class="detail-item" data-astro-cid-fcl2hznd> <span class="detail-label" data-astro-cid-fcl2hznd>When</span> <span class="detail-value" data-astro-cid-fcl2hznd>${formatDate(event.date)}</span> <span class="detail-time" data-astro-cid-fcl2hznd>${formatTime(event.startTime)} - ${formatTime(event.endTime)}</span> </div> <div class="detail-item" data-astro-cid-fcl2hznd> <span class="detail-label" data-astro-cid-fcl2hznd>Where</span> <span class="detail-value" data-astro-cid-fcl2hznd>${event.venue}</span> <span class="detail-address" data-astro-cid-fcl2hznd>${event.address}</span> <span class="detail-city" data-astro-cid-fcl2hznd>${event.city}</span> </div> </div> </div> </div>`)} </div>` : renderTemplate`<!-- Single event display (legacy) -->
      <div class="details-grid" data-astro-cid-fcl2hznd> ${displayDate && renderTemplate`<div class="detail-item" data-astro-cid-fcl2hznd> <span class="detail-label" data-astro-cid-fcl2hznd>When</span> <span class="detail-value" data-astro-cid-fcl2hznd>${displayDate}</span> ${displayTime && renderTemplate`<span class="detail-time" data-astro-cid-fcl2hznd>${displayTime}</span>`} </div>`} ${displayVenue && renderTemplate`<div class="detail-item" data-astro-cid-fcl2hznd> <span class="detail-label" data-astro-cid-fcl2hznd>Where</span> <span class="detail-value" data-astro-cid-fcl2hznd>${displayVenue}</span> </div>`} ${displayCity && renderTemplate`<div class="detail-item" data-astro-cid-fcl2hznd> <span class="detail-label" data-astro-cid-fcl2hznd>Location</span> <span class="detail-value" data-astro-cid-fcl2hznd>${displayCity}</span> </div>`} </div>`} ${showCalendarButtons && renderTemplate`<div class="calendar-buttons" data-astro-cid-fcl2hznd> <a${addAttribute(icsDownloadUrl, "href")} class="calendar-btn calendar-btn-primary" download data-astro-cid-fcl2hznd> <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-fcl2hznd> <rect x="3" y="4" width="18" height="18" rx="2" ry="2" data-astro-cid-fcl2hznd></rect> <line x1="16" y1="2" x2="16" y2="6" data-astro-cid-fcl2hznd></line> <line x1="8" y1="2" x2="8" y2="6" data-astro-cid-fcl2hznd></line> <line x1="3" y1="10" x2="21" y2="10" data-astro-cid-fcl2hznd></line> </svg>
Add to Calendar
</a> <a${addAttribute(googleCalendarUrl, "href")} class="calendar-btn calendar-btn-secondary" target="_blank" rel="noopener noreferrer" data-astro-cid-fcl2hznd> <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" data-astro-cid-fcl2hznd> <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" data-astro-cid-fcl2hznd></path> </svg>
Google Calendar
</a> </div>`} </div> </section> `;
}, "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/components/sections/EventDetailsSection.astro", void 0);

const $$Astro$b = createAstro();
const $$RsvpSection = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$b, $$props, $$slots);
  Astro2.self = $$RsvpSection;
  const { section, theme, slug, language } = Astro2.props;
  const { title, description } = section.data;
  const t = getTranslations(language);
  return renderTemplate`${maybeRenderHead()}<section class="rsvp-section"${addAttribute(`--primary: ${theme.primary}; --accent: ${theme.accent}; --neutral-light: ${theme.neutralLight}; --neutral-dark: ${theme.neutralDark};`, "style")} data-astro-cid-wqzymgxl> <div class="rsvp-content" data-astro-cid-wqzymgxl> <h2 class="section-title" data-astro-cid-wqzymgxl>${title || t.rsvpTitle}</h2> ${description && renderTemplate`<p class="section-description" data-astro-cid-wqzymgxl>${description}</p>`} <a${addAttribute(`/w/${slug}/rsvp`, "href")} class="rsvp-button" data-astro-cid-wqzymgxl> ${t.rsvpRespondButton} </a> </div> </section> `;
}, "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/components/sections/RsvpSection.astro", void 0);

const $$Astro$a = createAstro();
const $$PhotoUploadSection = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$a, $$props, $$slots);
  Astro2.self = $$PhotoUploadSection;
  const { section, theme, slug } = Astro2.props;
  const { title, description, ctaLabel } = section.data;
  return renderTemplate`${maybeRenderHead()}<section class="photo-upload-section"${addAttribute(`--primary: ${theme.primary}; --accent: ${theme.accent}; --neutral-light: ${theme.neutralLight}; --neutral-dark: ${theme.neutralDark};`, "style")} data-astro-cid-7ctt2t5g> <div class="photo-upload-content" data-astro-cid-7ctt2t5g> <span class="photo-eyebrow" data-astro-cid-7ctt2t5g>Photo Album</span> <h2 class="section-title" data-astro-cid-7ctt2t5g>${title || "Share Photos"}</h2> ${description && renderTemplate`<p class="section-description" data-astro-cid-7ctt2t5g>${description}</p>`} <a${addAttribute(`/w/${slug}/photos`, "href")} class="photo-upload-button" data-astro-cid-7ctt2t5g> ${ctaLabel || "Add your photos"} </a> </div> </section> `;
}, "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/components/sections/PhotoUploadSection.astro", void 0);

const $$Astro$9 = createAstro();
const $$FaqSection = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$9, $$props, $$slots);
  Astro2.self = $$FaqSection;
  const { section, theme, faq } = Astro2.props;
  const { title, description } = section.data;
  const faqItems = faq?.items?.slice().sort((a, b) => a.order - b.order) || [];
  return renderTemplate`${maybeRenderHead()}<section class="faq-section"${addAttribute(`--primary: ${theme.primary}; --accent: ${theme.accent}; --neutral-light: ${theme.neutralLight}; --neutral-dark: ${theme.neutralDark};`, "style")} data-astro-cid-3b2l2v47> <div class="faq-content" data-astro-cid-3b2l2v47> <h2 class="section-title" data-astro-cid-3b2l2v47>${title || "Frequently Asked Questions"}</h2> ${description && renderTemplate`<p class="section-description" data-astro-cid-3b2l2v47>${description}</p>`} ${faqItems.length === 0 ? renderTemplate`<p class="no-faqs" data-astro-cid-3b2l2v47>Questions and answers will appear here.</p>` : renderTemplate`<div class="faq-list" role="list" data-astro-cid-3b2l2v47> ${faqItems.map((item, index) => renderTemplate`<details class="faq-item" role="listitem" data-astro-cid-3b2l2v47> <summary class="faq-question"${addAttribute(`faq-question-${index}`, "id")}${addAttribute(`faq-answer-${index}`, "aria-controls")} data-astro-cid-3b2l2v47> <span class="faq-question-text" data-astro-cid-3b2l2v47>${item.question}</span> <span class="faq-icon" aria-hidden="true" data-astro-cid-3b2l2v47></span> </summary> <div class="faq-answer"${addAttribute(`faq-answer-${index}`, "id")} role="region"${addAttribute(`faq-question-${index}`, "aria-labelledby")} data-astro-cid-3b2l2v47>${item.answer}</div> </details>`)} </div>`} </div> </section> `;
}, "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/components/sections/FaqSection.astro", void 0);

const $$Astro$8 = createAstro();
const $$RegistrySection = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$8, $$props, $$slots);
  Astro2.self = $$RegistrySection;
  const { section, theme, registry } = Astro2.props;
  const { title, description } = section.data;
  const registryLinks = registry?.links?.slice().sort((a, b) => a.order - b.order) || [];
  return renderTemplate`${maybeRenderHead()}<section class="registry-section"${addAttribute(`--primary: ${theme.primary}; --accent: ${theme.accent}; --neutral-light: ${theme.neutralLight}; --neutral-dark: ${theme.neutralDark};`, "style")} data-astro-cid-rtak5keh> <div class="registry-content" data-astro-cid-rtak5keh> <h2 class="section-title" data-astro-cid-rtak5keh>${title || "Gift Registry"}</h2> ${description && renderTemplate`<p class="section-description" data-astro-cid-rtak5keh>${description}</p>`} ${registryLinks.length === 0 ? renderTemplate`<p class="no-registries" data-astro-cid-rtak5keh>Registry links will appear here.</p>` : renderTemplate`<div class="registry-list" data-astro-cid-rtak5keh> ${registryLinks.map((link) => renderTemplate`<a${addAttribute(link.url, "href")} target="_blank" rel="noopener noreferrer" class="registry-link" data-astro-cid-rtak5keh> <span class="registry-name" data-astro-cid-rtak5keh>${link.name}</span> <svg class="external-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-rtak5keh> <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" data-astro-cid-rtak5keh></path> <polyline points="15 3 21 3 21 9" data-astro-cid-rtak5keh></polyline> <line x1="10" y1="14" x2="21" y2="3" data-astro-cid-rtak5keh></line> </svg> </a>`)} </div>`} </div> </section> `;
}, "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/components/sections/RegistrySection.astro", void 0);

const $$Astro$7 = createAstro();
const $$AccommodationsSection = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$7, $$props, $$slots);
  Astro2.self = $$AccommodationsSection;
  const { section, theme, accommodations } = Astro2.props;
  const { title, description } = section.data;
  const hotels = accommodations?.hotels?.slice().sort((a, b) => a.order - b.order) || [];
  const travelInfo = accommodations?.travelInfo;
  const hasTravelInfo = travelInfo && (travelInfo.airportDirections || travelInfo.parkingInfo || travelInfo.mapUrl);
  return renderTemplate`${maybeRenderHead()}<section class="accommodations-section"${addAttribute(`--primary: ${theme.primary}; --accent: ${theme.accent}; --neutral-light: ${theme.neutralLight}; --neutral-dark: ${theme.neutralDark};`, "style")} data-astro-cid-llnvahqu> <div class="accommodations-content" data-astro-cid-llnvahqu> <h2 class="section-title" data-astro-cid-llnvahqu>${title || "Where to Stay"}</h2> ${description && renderTemplate`<p class="section-description" data-astro-cid-llnvahqu>${description}</p>`}  ${hotels.length > 0 && renderTemplate`<div class="hotels-section" data-astro-cid-llnvahqu> <h3 class="subsection-title" data-astro-cid-llnvahqu>Accommodations</h3> <div class="hotels-list" data-astro-cid-llnvahqu> ${hotels.map((hotel) => renderTemplate`<div class="hotel-card" data-astro-cid-llnvahqu> <h4 class="hotel-name" data-astro-cid-llnvahqu>${hotel.name}</h4> <p class="hotel-address" data-astro-cid-llnvahqu>${hotel.address}</p> ${hotel.roomBlockCode && renderTemplate`<div class="room-block" data-astro-cid-llnvahqu> <span class="room-block-label" data-astro-cid-llnvahqu>Room block code:</span> <span class="room-block-code" data-astro-cid-llnvahqu>${hotel.roomBlockCode}</span> </div>`} ${hotel.notes && renderTemplate`<p class="hotel-notes" data-astro-cid-llnvahqu>${hotel.notes}</p>`} ${hotel.bookingUrl && renderTemplate`<a${addAttribute(hotel.bookingUrl, "href")} target="_blank" rel="noopener noreferrer" class="booking-link" data-astro-cid-llnvahqu>
Book Now
<svg class="external-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-llnvahqu> <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" data-astro-cid-llnvahqu></path> <polyline points="15 3 21 3 21 9" data-astro-cid-llnvahqu></polyline> <line x1="10" y1="14" x2="21" y2="3" data-astro-cid-llnvahqu></line> </svg> </a>`} </div>`)} </div> </div>`}  ${hasTravelInfo && renderTemplate`<div class="travel-section" data-astro-cid-llnvahqu> <h3 class="subsection-title" data-astro-cid-llnvahqu>Getting There</h3> ${travelInfo.airportDirections && renderTemplate`<div class="travel-item" data-astro-cid-llnvahqu> <div class="travel-icon" data-astro-cid-llnvahqu> <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-llnvahqu> <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" data-astro-cid-llnvahqu></path> </svg> </div> <div class="travel-content" data-astro-cid-llnvahqu> <h4 class="travel-label" data-astro-cid-llnvahqu>From the Airport</h4> <p class="travel-text" data-astro-cid-llnvahqu>${travelInfo.airportDirections}</p> </div> </div>`} ${travelInfo.parkingInfo && renderTemplate`<div class="travel-item" data-astro-cid-llnvahqu> <div class="travel-icon" data-astro-cid-llnvahqu> <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-llnvahqu> <rect x="3" y="3" width="18" height="18" rx="2" data-astro-cid-llnvahqu></rect> <path d="M9 17V7h4a3 3 0 0 1 0 6H9" data-astro-cid-llnvahqu></path> </svg> </div> <div class="travel-content" data-astro-cid-llnvahqu> <h4 class="travel-label" data-astro-cid-llnvahqu>Parking</h4> <p class="travel-text" data-astro-cid-llnvahqu>${travelInfo.parkingInfo}</p> </div> </div>`} ${travelInfo.mapUrl && renderTemplate`<a${addAttribute(travelInfo.mapUrl, "href")} target="_blank" rel="noopener noreferrer" class="map-link" data-astro-cid-llnvahqu> <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-llnvahqu> <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" data-astro-cid-llnvahqu></polygon> <line x1="9" y1="3" x2="9" y2="18" data-astro-cid-llnvahqu></line> <line x1="15" y1="6" x2="15" y2="21" data-astro-cid-llnvahqu></line> </svg>
View Map
</a>`} </div>`}  ${hotels.length === 0 && !hasTravelInfo && renderTemplate`<p class="no-accommodations" data-astro-cid-llnvahqu>Accommodation details will appear here.</p>`} </div> </section> `;
}, "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/components/sections/AccommodationsSection.astro", void 0);

const $$Astro$6 = createAstro();
const $$GuestbookSection = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$6, $$props, $$slots);
  Astro2.self = $$GuestbookSection;
  const { section, theme, guestbook, weddingSlug } = Astro2.props;
  const { title, description } = section.data;
  const approvedMessages = guestbook?.messages?.filter((m) => m.status === "approved") || [];
  const apiBaseUrl = "http://localhost:3001/api";
  return renderTemplate`${maybeRenderHead()}<section class="guestbook-section"${addAttribute(`--primary: ${theme.primary}; --accent: ${theme.accent}; --neutral-light: ${theme.neutralLight}; --neutral-dark: ${theme.neutralDark};`, "style")}${addAttribute(weddingSlug, "data-wedding-slug")}${addAttribute(apiBaseUrl, "data-api-base-url")} data-astro-cid-2dj2jj2w> <div class="guestbook-content" data-astro-cid-2dj2jj2w> <h2 class="section-title" data-astro-cid-2dj2jj2w>${title || "Guestbook"}</h2> ${description && renderTemplate`<p class="section-description" data-astro-cid-2dj2jj2w>${description}</p>`} <!-- Submission form --> <form id="guestbook-form" class="guestbook-form" aria-label="Guestbook submission form" data-astro-cid-2dj2jj2w> <div class="form-group" data-astro-cid-2dj2jj2w> <label for="guest-name" class="form-label" data-astro-cid-2dj2jj2w>Your name</label> <input type="text" id="guest-name" name="guestName" required maxlength="100" class="form-input" placeholder="Enter your name" aria-required="true" aria-describedby="guest-name-error" data-astro-cid-2dj2jj2w> <span id="guest-name-error" class="field-error" role="alert" data-astro-cid-2dj2jj2w></span> </div> <div class="form-group" data-astro-cid-2dj2jj2w> <label for="message" class="form-label" data-astro-cid-2dj2jj2w>Your message</label> <textarea id="message" name="message" required maxlength="1000" rows="4" class="form-textarea" placeholder="Leave a message for the happy couple..." aria-required="true" aria-describedby="message-error" data-astro-cid-2dj2jj2w></textarea> <span id="message-error" class="field-error" role="alert" data-astro-cid-2dj2jj2w></span> </div> <button type="submit" class="submit-button" id="submit-button" data-astro-cid-2dj2jj2w>
Sign the guestbook
</button> <div id="form-message" class="form-message" role="status" aria-live="polite" data-astro-cid-2dj2jj2w></div> </form> <!-- Messages display --> <div class="messages-section" data-astro-cid-2dj2jj2w> <h3 class="messages-title" data-astro-cid-2dj2jj2w>Messages from guests</h3> ${approvedMessages.length === 0 ? renderTemplate`<p class="no-messages" data-astro-cid-2dj2jj2w>Be the first to leave a message!</p>` : renderTemplate`<div class="messages-list" data-astro-cid-2dj2jj2w> ${approvedMessages.map((msg) => renderTemplate`<article class="message-card" data-astro-cid-2dj2jj2w> <div class="message-header" data-astro-cid-2dj2jj2w> <span class="message-author" data-astro-cid-2dj2jj2w>${msg.guestName}</span> <time class="message-date"${addAttribute(msg.createdAt, "datetime")} data-astro-cid-2dj2jj2w> ${new Date(msg.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  })} </time> </div> <p class="message-text" data-astro-cid-2dj2jj2w>${msg.message}</p> </article>`)} </div>`} </div> </div> </section>  `;
}, "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/components/sections/GuestbookSection.astro", void 0);

const $$Astro$5 = createAstro();
const $$MusicRequestSection = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$5, $$props, $$slots);
  Astro2.self = $$MusicRequestSection;
  const { section, theme, slug } = Astro2.props;
  const data = section.data;
  const title = data.title || "Suggest a Song";
  const description = data.description || "Help us create the perfect playlist for our celebration";
  const $$definedVars = defineStyleVars([{ primary: theme.primary, accent: theme.accent, neutralLight: theme.neutralLight, neutralDark: theme.neutralDark }]);
  return renderTemplate`${maybeRenderHead()}<section class="music-request-section" data-astro-cid-jjwyvwdc${addAttribute($$definedVars, "style")}> <div class="container" data-astro-cid-jjwyvwdc${addAttribute($$definedVars, "style")}> <h2 class="section-title" data-astro-cid-jjwyvwdc${addAttribute($$definedVars, "style")}>${title}</h2> <p class="section-description" data-astro-cid-jjwyvwdc${addAttribute($$definedVars, "style")}>${description}</p> <a${addAttribute(`/w/${slug}/music`, "href")} class="request-button" data-astro-cid-jjwyvwdc${addAttribute($$definedVars, "style")}>
Share a song request
</a> </div> </section> `;
}, "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/components/sections/MusicRequestSection.astro", void 0);

const $$Astro$4 = createAstro();
const $$SeatingSection = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$4, $$props, $$slots);
  Astro2.self = $$SeatingSection;
  const { section, theme, seating } = Astro2.props;
  const { title, description } = section.data;
  const tables = seating?.tables?.sort((a, b) => a.order - b.order) || [];
  return renderTemplate`${maybeRenderHead()}<section class="seating-section"${addAttribute(`--primary: ${theme.primary}; --accent: ${theme.accent}; --neutral-light: ${theme.neutralLight}; --neutral-dark: ${theme.neutralDark};`, "style")} data-astro-cid-mzhbnrow> <div class="seating-content" data-astro-cid-mzhbnrow> <h2 class="section-title" data-astro-cid-mzhbnrow>${title || "Seating Chart"}</h2> ${description && renderTemplate`<p class="section-description" data-astro-cid-mzhbnrow>${description}</p>`} <p class="seating-info" data-astro-cid-mzhbnrow>
To view your table assignment, please check your RSVP confirmation.
</p> ${tables.length === 0 ? renderTemplate`<p class="no-tables" data-astro-cid-mzhbnrow>Seating arrangements will be available soon.</p>` : renderTemplate`<div class="tables-grid" data-astro-cid-mzhbnrow> ${tables.map((table) => renderTemplate`<article class="table-card" data-astro-cid-mzhbnrow> <div class="table-header" data-astro-cid-mzhbnrow> <h3 class="table-name" data-astro-cid-mzhbnrow>${table.name}</h3> <span class="table-count" data-astro-cid-mzhbnrow> ${table.guestCount} / ${table.capacity} </span> </div> ${table.notes && renderTemplate`<p class="table-notes" data-astro-cid-mzhbnrow>${table.notes}</p>`} </article>`)} </div>`} </div> </section> `;
}, "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/components/sections/SeatingSection.astro", void 0);

var __freeze$1 = Object.freeze;
var __defProp$1 = Object.defineProperty;
var __template$1 = (cooked, raw) => __freeze$1(__defProp$1(cooked, "raw", { value: __freeze$1(raw || cooked.slice()) }));
var _a$1;
const $$Astro$3 = createAstro();
const $$GallerySection = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$GallerySection;
  const { section, theme, gallery } = Astro2.props;
  const { title, description } = section.data;
  const photos = gallery?.photos?.slice().sort((a, b) => a.order - b.order) || [];
  return renderTemplate(_a$1 || (_a$1 = __template$1(["", '<section class="gallery-section"', ' data-astro-cid-ortru64c> <div class="gallery-content" data-astro-cid-ortru64c> <h2 class="section-title" data-astro-cid-ortru64c>', "</h2> ", " ", ' </div> </section> <!-- Lightbox modal - Accessible dialog --> <div id="lightbox" class="lightbox" role="dialog" aria-modal="true" aria-labelledby="lightbox-title" style="display: none;" data-astro-cid-ortru64c> <h2 id="lightbox-title" class="visually-hidden" data-astro-cid-ortru64c>Photo gallery viewer</h2> <button class="lightbox-close" aria-label="Close photo viewer" data-astro-cid-ortru64c> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-astro-cid-ortru64c> <path d="M18 6 6 18" data-astro-cid-ortru64c></path> <path d="m6 6 12 12" data-astro-cid-ortru64c></path> </svg> </button> <button class="lightbox-prev" aria-label="View previous photo" data-astro-cid-ortru64c> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-astro-cid-ortru64c> <path d="m15 18-6-6 6-6" data-astro-cid-ortru64c></path> </svg> </button> <button class="lightbox-next" aria-label="View next photo" data-astro-cid-ortru64c> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-astro-cid-ortru64c> <path d="m9 18 6-6-6-6" data-astro-cid-ortru64c></path> </svg> </button> <div class="lightbox-content" data-astro-cid-ortru64c> <img id="lightbox-image" src="" alt="Gallery photo" data-astro-cid-ortru64c> <p id="lightbox-caption" class="lightbox-caption" aria-live="polite" data-astro-cid-ortru64c></p> </div> </div>  <script>(function(){', "\n  // Lightbox functionality with accessibility\n  const lightbox = document.getElementById('lightbox');\n  const lightboxImage = document.getElementById('lightbox-image');\n  const lightboxCaption = document.getElementById('lightbox-caption');\n  const closeBtn = document.querySelector('.lightbox-close');\n  const prevBtn = document.querySelector('.lightbox-prev');\n  const nextBtn = document.querySelector('.lightbox-next');\n  const photoItems = document.querySelectorAll('.photo-item');\n\n  let currentIndex = 0;\n  let lastFocusedElement = null;\n\n  // Get focusable elements within lightbox for focus trap\n  function getFocusableElements() {\n    return lightbox?.querySelectorAll(\n      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])'\n    );\n  }\n\n  function showPhoto(index) {\n    if (photos.length === 0) return;\n    currentIndex = (index + photos.length) % photos.length;\n    const photo = photos[currentIndex];\n    if (lightboxImage && photo.url) {\n      lightboxImage.src = photo.url;\n      lightboxImage.alt = photo.caption || `Photo ${currentIndex + 1} of ${photos.length}`;\n    }\n    if (lightboxCaption) {\n      lightboxCaption.textContent = photo.caption || '';\n      lightboxCaption.style.display = photo.caption ? 'block' : 'none';\n    }\n  }\n\n  function openLightbox(index, triggerElement) {\n    lastFocusedElement = triggerElement || document.activeElement;\n    showPhoto(index);\n    if (lightbox) {\n      lightbox.style.display = 'flex';\n      document.body.style.overflow = 'hidden';\n      // Focus the close button when lightbox opens\n      closeBtn?.focus();\n    }\n  }\n\n  function closeLightbox() {\n    if (lightbox) {\n      lightbox.style.display = 'none';\n      document.body.style.overflow = '';\n      // Restore focus to the element that opened the lightbox\n      lastFocusedElement?.focus();\n    }\n  }\n\n  // Focus trap for lightbox\n  function handleFocusTrap(e) {\n    if (lightbox?.style.display !== 'flex') return;\n\n    const focusableElements = getFocusableElements();\n    if (!focusableElements || focusableElements.length === 0) return;\n\n    const firstElement = focusableElements[0];\n    const lastElement = focusableElements[focusableElements.length - 1];\n\n    if (e.key === 'Tab') {\n      if (e.shiftKey) {\n        // Shift + Tab\n        if (document.activeElement === firstElement) {\n          e.preventDefault();\n          lastElement.focus();\n        }\n      } else {\n        // Tab\n        if (document.activeElement === lastElement) {\n          e.preventDefault();\n          firstElement.focus();\n        }\n      }\n    }\n  }\n\n  // Event listeners for photo items (click and keyboard)\n  photoItems.forEach((item) => {\n    item.addEventListener('click', () => {\n      const index = parseInt(item.dataset.index || '0', 10);\n      openLightbox(index, item);\n    });\n\n    // Allow Enter/Space to open lightbox\n    item.addEventListener('keydown', (e) => {\n      if (e.key === 'Enter' || e.key === ' ') {\n        e.preventDefault();\n        const index = parseInt(item.dataset.index || '0', 10);\n        openLightbox(index, item);\n      }\n    });\n  });\n\n  if (closeBtn) {\n    closeBtn.addEventListener('click', closeLightbox);\n  }\n\n  if (prevBtn) {\n    prevBtn.addEventListener('click', () => showPhoto(currentIndex - 1));\n  }\n\n  if (nextBtn) {\n    nextBtn.addEventListener('click', () => showPhoto(currentIndex + 1));\n  }\n\n  // Keyboard navigation\n  document.addEventListener('keydown', (e) => {\n    if (lightbox?.style.display === 'flex') {\n      if (e.key === 'Escape') closeLightbox();\n      if (e.key === 'ArrowLeft') {\n        showPhoto(currentIndex - 1);\n        prevBtn?.focus();\n      }\n      if (e.key === 'ArrowRight') {\n        showPhoto(currentIndex + 1);\n        nextBtn?.focus();\n      }\n      // Handle focus trap\n      handleFocusTrap(e);\n    }\n  });\n\n  // Close on backdrop click\n  if (lightbox) {\n    lightbox.addEventListener('click', (e) => {\n      if (e.target === lightbox) closeLightbox();\n    });\n  }\n})();<\/script>"], ["", '<section class="gallery-section"', ' data-astro-cid-ortru64c> <div class="gallery-content" data-astro-cid-ortru64c> <h2 class="section-title" data-astro-cid-ortru64c>', "</h2> ", " ", ' </div> </section> <!-- Lightbox modal - Accessible dialog --> <div id="lightbox" class="lightbox" role="dialog" aria-modal="true" aria-labelledby="lightbox-title" style="display: none;" data-astro-cid-ortru64c> <h2 id="lightbox-title" class="visually-hidden" data-astro-cid-ortru64c>Photo gallery viewer</h2> <button class="lightbox-close" aria-label="Close photo viewer" data-astro-cid-ortru64c> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-astro-cid-ortru64c> <path d="M18 6 6 18" data-astro-cid-ortru64c></path> <path d="m6 6 12 12" data-astro-cid-ortru64c></path> </svg> </button> <button class="lightbox-prev" aria-label="View previous photo" data-astro-cid-ortru64c> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-astro-cid-ortru64c> <path d="m15 18-6-6 6-6" data-astro-cid-ortru64c></path> </svg> </button> <button class="lightbox-next" aria-label="View next photo" data-astro-cid-ortru64c> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-astro-cid-ortru64c> <path d="m9 18 6-6-6-6" data-astro-cid-ortru64c></path> </svg> </button> <div class="lightbox-content" data-astro-cid-ortru64c> <img id="lightbox-image" src="" alt="Gallery photo" data-astro-cid-ortru64c> <p id="lightbox-caption" class="lightbox-caption" aria-live="polite" data-astro-cid-ortru64c></p> </div> </div>  <script>(function(){', "\n  // Lightbox functionality with accessibility\n  const lightbox = document.getElementById('lightbox');\n  const lightboxImage = document.getElementById('lightbox-image');\n  const lightboxCaption = document.getElementById('lightbox-caption');\n  const closeBtn = document.querySelector('.lightbox-close');\n  const prevBtn = document.querySelector('.lightbox-prev');\n  const nextBtn = document.querySelector('.lightbox-next');\n  const photoItems = document.querySelectorAll('.photo-item');\n\n  let currentIndex = 0;\n  let lastFocusedElement = null;\n\n  // Get focusable elements within lightbox for focus trap\n  function getFocusableElements() {\n    return lightbox?.querySelectorAll(\n      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])'\n    );\n  }\n\n  function showPhoto(index) {\n    if (photos.length === 0) return;\n    currentIndex = (index + photos.length) % photos.length;\n    const photo = photos[currentIndex];\n    if (lightboxImage && photo.url) {\n      lightboxImage.src = photo.url;\n      lightboxImage.alt = photo.caption || \\`Photo \\${currentIndex + 1} of \\${photos.length}\\`;\n    }\n    if (lightboxCaption) {\n      lightboxCaption.textContent = photo.caption || '';\n      lightboxCaption.style.display = photo.caption ? 'block' : 'none';\n    }\n  }\n\n  function openLightbox(index, triggerElement) {\n    lastFocusedElement = triggerElement || document.activeElement;\n    showPhoto(index);\n    if (lightbox) {\n      lightbox.style.display = 'flex';\n      document.body.style.overflow = 'hidden';\n      // Focus the close button when lightbox opens\n      closeBtn?.focus();\n    }\n  }\n\n  function closeLightbox() {\n    if (lightbox) {\n      lightbox.style.display = 'none';\n      document.body.style.overflow = '';\n      // Restore focus to the element that opened the lightbox\n      lastFocusedElement?.focus();\n    }\n  }\n\n  // Focus trap for lightbox\n  function handleFocusTrap(e) {\n    if (lightbox?.style.display !== 'flex') return;\n\n    const focusableElements = getFocusableElements();\n    if (!focusableElements || focusableElements.length === 0) return;\n\n    const firstElement = focusableElements[0];\n    const lastElement = focusableElements[focusableElements.length - 1];\n\n    if (e.key === 'Tab') {\n      if (e.shiftKey) {\n        // Shift + Tab\n        if (document.activeElement === firstElement) {\n          e.preventDefault();\n          lastElement.focus();\n        }\n      } else {\n        // Tab\n        if (document.activeElement === lastElement) {\n          e.preventDefault();\n          firstElement.focus();\n        }\n      }\n    }\n  }\n\n  // Event listeners for photo items (click and keyboard)\n  photoItems.forEach((item) => {\n    item.addEventListener('click', () => {\n      const index = parseInt(item.dataset.index || '0', 10);\n      openLightbox(index, item);\n    });\n\n    // Allow Enter/Space to open lightbox\n    item.addEventListener('keydown', (e) => {\n      if (e.key === 'Enter' || e.key === ' ') {\n        e.preventDefault();\n        const index = parseInt(item.dataset.index || '0', 10);\n        openLightbox(index, item);\n      }\n    });\n  });\n\n  if (closeBtn) {\n    closeBtn.addEventListener('click', closeLightbox);\n  }\n\n  if (prevBtn) {\n    prevBtn.addEventListener('click', () => showPhoto(currentIndex - 1));\n  }\n\n  if (nextBtn) {\n    nextBtn.addEventListener('click', () => showPhoto(currentIndex + 1));\n  }\n\n  // Keyboard navigation\n  document.addEventListener('keydown', (e) => {\n    if (lightbox?.style.display === 'flex') {\n      if (e.key === 'Escape') closeLightbox();\n      if (e.key === 'ArrowLeft') {\n        showPhoto(currentIndex - 1);\n        prevBtn?.focus();\n      }\n      if (e.key === 'ArrowRight') {\n        showPhoto(currentIndex + 1);\n        nextBtn?.focus();\n      }\n      // Handle focus trap\n      handleFocusTrap(e);\n    }\n  });\n\n  // Close on backdrop click\n  if (lightbox) {\n    lightbox.addEventListener('click', (e) => {\n      if (e.target === lightbox) closeLightbox();\n    });\n  }\n})();<\/script>"])), maybeRenderHead(), addAttribute(`--primary: ${theme.primary}; --accent: ${theme.accent}; --neutral-light: ${theme.neutralLight}; --neutral-dark: ${theme.neutralDark};`, "style"), title || "Our Story", description && renderTemplate`<p class="section-description" data-astro-cid-ortru64c>${description}</p>`, photos.length === 0 ? renderTemplate`<p class="no-photos" data-astro-cid-ortru64c>Photos will appear here.</p>` : renderTemplate`<div class="photo-grid" role="list" data-astro-cid-ortru64c> ${photos.map((photo, index) => renderTemplate`<div class="photo-item"${addAttribute(index, "data-index")} role="listitem" tabindex="0"${addAttribute(`View ${photo.caption || `photo ${index + 1}`} in full size`, "aria-label")} data-astro-cid-ortru64c> ${photo.url ? renderTemplate`<img${addAttribute(photo.url, "src")}${addAttribute(photo.caption || `Photo ${index + 1}`, "alt")} class="photo-image" loading="lazy" data-astro-cid-ortru64c>` : renderTemplate`<div class="photo-placeholder" aria-hidden="true" data-astro-cid-ortru64c> <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-ortru64c> <rect width="18" height="18" x="3" y="3" rx="2" ry="2" data-astro-cid-ortru64c></rect> <circle cx="9" cy="9" r="2" data-astro-cid-ortru64c></circle> <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" data-astro-cid-ortru64c></path> </svg> </div>`} ${photo.caption && renderTemplate`<p class="photo-caption" data-astro-cid-ortru64c>${photo.caption}</p>`} </div>`)} </div>`, defineScriptVars({ photos }));
}, "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/components/sections/GallerySection.astro", void 0);

const $$Astro$2 = createAstro();
const $$VideoSection = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$VideoSection;
  const { section, theme, video } = Astro2.props;
  const { title, description } = section.data;
  const videos = video?.videos?.slice().sort((a, b) => a.order - b.order) || [];
  function getEmbedUrl(video2) {
    switch (video2.platform) {
      case "youtube":
        return `https://www.youtube.com/embed/${video2.videoId}`;
      case "vimeo":
        return `https://player.vimeo.com/video/${video2.videoId}`;
      default:
        return "";
    }
  }
  return renderTemplate`${maybeRenderHead()}<section class="video-section"${addAttribute(`--primary: ${theme.primary}; --accent: ${theme.accent}; --neutral-light: ${theme.neutralLight}; --neutral-dark: ${theme.neutralDark};`, "style")} data-astro-cid-wzsi2dz7> <div class="video-content" data-astro-cid-wzsi2dz7> <h2 class="section-title" data-astro-cid-wzsi2dz7>${title || "Our Videos"}</h2> ${description && renderTemplate`<p class="section-description" data-astro-cid-wzsi2dz7>${description}</p>`} ${videos.length === 0 ? renderTemplate`<p class="no-videos" data-astro-cid-wzsi2dz7>Videos will appear here.</p>` : renderTemplate`<div class="video-grid" data-astro-cid-wzsi2dz7> ${videos.map((video2) => renderTemplate`<div class="video-item" data-astro-cid-wzsi2dz7> <div class="video-wrapper" data-astro-cid-wzsi2dz7> <iframe${addAttribute(getEmbedUrl(video2), "src")}${addAttribute(video2.title || "Video", "title")} frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" data-astro-cid-wzsi2dz7></iframe> </div> ${video2.title && renderTemplate`<p class="video-title" data-astro-cid-wzsi2dz7>${video2.title}</p>`} </div>`)} </div>`} </div> </section> `;
}, "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/components/sections/VideoSection.astro", void 0);

const $$Astro$1 = createAstro();
const $$SectionRenderer = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$SectionRenderer;
  const { config } = Astro2.props;
  const { sections, theme, wedding, features, faq, registry, accommodations, guestbook, seating, gallery, video, language } = config;
  const enabledSections = sections.filter((section) => section.enabled).sort((a, b) => a.order - b.order);
  return renderTemplate`${enabledSections.map((section) => {
    switch (section.type) {
      case "hero":
        return renderTemplate`${renderComponent($$result, "HeroSection", $$HeroSection, { "section": section, "theme": theme })}`;
      case "event-details":
        return renderTemplate`${renderComponent($$result, "EventDetailsSection", $$EventDetailsSection, { "section": section, "theme": theme, "weddingDate": wedding.date, "venue": wedding.venue, "city": wedding.city, "slug": wedding.slug, "calendarEnabled": features.CALENDAR_INVITE, "eventDetails": config.eventDetails })}`;
      case "rsvp":
        if (features.RSVP) {
          return renderTemplate`${renderComponent($$result, "RsvpSection", $$RsvpSection, { "section": section, "theme": theme, "slug": wedding.slug, "language": language })}`;
        }
        return null;
      case "photo-upload":
        if (features.PHOTO_UPLOAD) {
          return renderTemplate`${renderComponent($$result, "PhotoUploadSection", $$PhotoUploadSection, { "section": section, "theme": theme, "slug": wedding.slug })}`;
        }
        return null;
      case "faq":
        if (features.FAQ_SECTION) {
          return renderTemplate`${renderComponent($$result, "FaqSection", $$FaqSection, { "section": section, "theme": theme, "faq": faq })}`;
        }
        return null;
      case "registry":
        if (features.REGISTRY) {
          return renderTemplate`${renderComponent($$result, "RegistrySection", $$RegistrySection, { "section": section, "theme": theme, "registry": registry })}`;
        }
        return null;
      case "accommodations":
        if (features.ACCOMMODATIONS) {
          return renderTemplate`${renderComponent($$result, "AccommodationsSection", $$AccommodationsSection, { "section": section, "theme": theme, "accommodations": accommodations })}`;
        }
        return null;
      case "guestbook":
        if (features.GUESTBOOK) {
          return renderTemplate`${renderComponent($$result, "GuestbookSection", $$GuestbookSection, { "section": section, "theme": theme, "guestbook": guestbook, "weddingSlug": wedding.slug })}`;
        }
        return null;
      case "music-request":
        if (features.MUSIC_REQUESTS) {
          return renderTemplate`${renderComponent($$result, "MusicRequestSection", $$MusicRequestSection, { "section": section, "theme": theme, "slug": wedding.slug })}`;
        }
        return null;
      case "seating":
        if (features.SEATING_CHART) {
          return renderTemplate`${renderComponent($$result, "SeatingSection", $$SeatingSection, { "section": section, "theme": theme, "seating": seating })}`;
        }
        return null;
      case "gallery":
        return renderTemplate`${renderComponent($$result, "GallerySection", $$GallerySection, { "section": section, "theme": theme, "gallery": gallery })}`;
      case "video":
        if (features.VIDEO_EMBED) {
          return renderTemplate`${renderComponent($$result, "VideoSection", $$VideoSection, { "section": section, "theme": theme, "video": video })}`;
        }
        return null;
      default:
        return null;
    }
  })}`;
}, "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/components/SectionRenderer.astro", void 0);

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Astro = createAstro();
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const { slug } = Astro2.params;
  if (!slug) {
    return Astro2.redirect("/");
  }
  let config = null;
  let fetchError = false;
  try {
    config = await fetchSiteConfig(slug);
  } catch (error) {
    fetchError = true;
  }
  const showError = !config || fetchError;
  const errorType = fetchError ? "unavailable" : "not-found";
  const urlLang = Astro2.url.searchParams.get("lang");
  const adminLanguage = config?.language || "en";
  const effectiveLanguage = urlLang || adminLanguage;
  const announcement = config?.announcement ?? { enabled: false, title: "", message: "" };
  const showAnnouncement = config && config.features.ANNOUNCEMENT_BANNER && announcement.enabled && Boolean(announcement.title.trim() || announcement.message.trim());
  return renderTemplate(_a || (_a = __template(["", "", "<script>(function(){", "\n  /**\n   * Check for stored language preference on page load\n   * If guest has a preference different from current URL, redirect\n   */\n  (function() {\n    try {\n      const storedLang = localStorage.getItem(`everbloom_language_${slug}`);\n      const urlParams = new URLSearchParams(window.location.search);\n      const urlLang = urlParams.get('lang');\n\n      // If there's a stored preference and it's not already in the URL, redirect\n      if (storedLang && storedLang !== urlLang) {\n        urlParams.set('lang', storedLang);\n        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;\n        // Use replace to avoid adding to history\n        window.location.replace(newUrl);\n      }\n    } catch {\n      // localStorage might not be available\n    }\n  })();\n})();<\/script>"], ["", "", "<script>(function(){", "\n  /**\n   * Check for stored language preference on page load\n   * If guest has a preference different from current URL, redirect\n   */\n  (function() {\n    try {\n      const storedLang = localStorage.getItem(\\`everbloom_language_\\${slug}\\`);\n      const urlParams = new URLSearchParams(window.location.search);\n      const urlLang = urlParams.get('lang');\n\n      // If there's a stored preference and it's not already in the URL, redirect\n      if (storedLang && storedLang !== urlLang) {\n        urlParams.set('lang', storedLang);\n        const newUrl = \\`\\${window.location.pathname}?\\${urlParams.toString()}\\`;\n        // Use replace to avoid adding to history\n        window.location.replace(newUrl);\n      }\n    } catch {\n      // localStorage might not be available\n    }\n  })();\n})();<\/script>"])), showError && renderTemplate`${renderComponent($$result, "ErrorPage", $$ErrorPage, { "type": errorType, "data-astro-cid-zhtzu77y": true })}`, !showError && config && renderTemplate`${renderComponent($$result, "PasscodeGateWrapper", $$PasscodeGateWrapper, { "config": config, "data-astro-cid-zhtzu77y": true }, { "default": async ($$result2) => renderTemplate`${renderComponent($$result2, "WeddingLayout", $$WeddingLayout, { "config": config, "language": effectiveLanguage, "data-astro-cid-zhtzu77y": true }, { "default": async ($$result3) => renderTemplate`${maybeRenderHead()}<div class="language-selector-container" data-astro-cid-zhtzu77y>${renderComponent($$result3, "LanguageSelector", $$LanguageSelector, { "currentLanguage": effectiveLanguage, "slug": slug, "data-astro-cid-zhtzu77y": true })}</div>${showAnnouncement && renderTemplate`${renderComponent($$result3, "AnnouncementBanner", $$AnnouncementBanner, { "announcement": announcement, "theme": config.theme, "data-astro-cid-zhtzu77y": true })}`}${renderComponent($$result3, "SectionRenderer", $$SectionRenderer, { "config": { ...config, language: effectiveLanguage }, "data-astro-cid-zhtzu77y": true })}` })}` })}`, defineScriptVars({ slug }));
}, "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/pages/w/[slug]/index.astro", void 0);

const $$file = "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/pages/w/[slug]/index.astro";
const $$url = "/w/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
