// Internationalization for wedding site

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'pt' | 'de' | 'it' | 'nl' | 'ja' | 'zh' | 'ko';

export interface TranslationStrings {
  rsvp: string;
  faq: string;
  registry: string;
  accommodations: string;
  guestbook: string;
  photos: string;
  music: string;
  seating: string;
  gallery: string;
  video: string;
  rsvpTitle: string;
  rsvpRespondButton: string;
  faqTitle: string;
  registryTitle: string;
  registryViewRegistry: string;
  accommodationsTitle: string;
  accommodationsBookNow: string;
  accommodationsRoomBlockCode: string;
  accommodationsGettingThere: string;
  accommodationsAirportDirections: string;
  accommodationsParking: string;
  accommodationsViewMap: string;
  photosTitle: string;
  photosDescription: string;
  photosUploadButton: string;
  musicTitle: string;
  musicDescription: string;
  musicSongTitleLabel: string;
  musicArtistLabel: string;
  musicYourNameLabel: string;
  musicSubmitButton: string;
  musicSuccessMessage: string;
  musicErrorMessage: string;
  guestbookTitle: string;
  guestbookDescription: string;
  guestbookNameLabel: string;
  guestbookMessageLabel: string;
  guestbookSubmitButton: string;
  guestbookSuccessMessage: string;
  guestbookErrorMessage: string;
  guestbookNoMessages: string;
  eventDetailsTitle: string;
  eventDetailsCeremony: string;
  eventDetailsReception: string;
  eventDetailsAddToCalendar: string;
  eventDetailsGetDirections: string;
  galleryTitle: string;
  videoTitle: string;
  heroJoinUs: string;
  seatingTitle: string;
  seatingYourTable: string;
  loading: string;
  error: string;
  submit: string;
  cancel: string;
  back: string;
  notFound: string;
  notFoundMessage: string;
  goHome: string;
}

const en: TranslationStrings = {
  rsvp: 'RSVP',
  faq: 'FAQ',
  registry: 'Registry',
  accommodations: 'Accommodations',
  guestbook: 'Guestbook',
  photos: 'Photos',
  music: 'Music',
  seating: 'Seating',
  gallery: 'Gallery',
  video: 'Video',
  rsvpTitle: 'RSVP',
  rsvpRespondButton: 'Respond to our invitation',
  faqTitle: 'Frequently Asked Questions',
  registryTitle: 'Gift Registry',
  registryViewRegistry: 'View Registry',
  accommodationsTitle: 'Accommodations',
  accommodationsBookNow: 'Book Now',
  accommodationsRoomBlockCode: 'Room Block Code',
  accommodationsGettingThere: 'Getting There',
  accommodationsAirportDirections: 'From the Airport',
  accommodationsParking: 'Parking',
  accommodationsViewMap: 'View Map',
  photosTitle: 'Share Your Photos',
  photosDescription: 'Help us capture the memories by sharing your photos from our special day.',
  photosUploadButton: 'Upload Photos',
  musicTitle: 'Request a Song',
  musicDescription: 'Help us build the perfect playlist for our celebration.',
  musicSongTitleLabel: 'Song Title',
  musicArtistLabel: 'Artist',
  musicYourNameLabel: 'Your Name (optional)',
  musicSubmitButton: 'Submit Request',
  musicSuccessMessage: 'Song request submitted!',
  musicErrorMessage: 'Failed to submit request. Please try again.',
  guestbookTitle: 'Guestbook',
  guestbookDescription: 'Leave us a message to celebrate our special day.',
  guestbookNameLabel: 'Your Name',
  guestbookMessageLabel: 'Your Message',
  guestbookSubmitButton: 'Sign Guestbook',
  guestbookSuccessMessage: 'Your message has been submitted for review.',
  guestbookErrorMessage: 'Failed to submit message. Please try again.',
  guestbookNoMessages: 'Be the first to sign our guestbook!',
  eventDetailsTitle: 'Event Details',
  eventDetailsCeremony: 'Ceremony',
  eventDetailsReception: 'Reception',
  eventDetailsAddToCalendar: 'Add to Calendar',
  eventDetailsGetDirections: 'Get Directions',
  galleryTitle: 'Photo Gallery',
  videoTitle: 'Our Story',
  heroJoinUs: 'Join us in celebrating our love',
  seatingTitle: 'Seating Chart',
  seatingYourTable: 'Your Table',
  loading: 'Loading...',
  error: 'An error occurred',
  submit: 'Submit',
  cancel: 'Cancel',
  back: 'Back',
  notFound: 'Page Not Found',
  notFoundMessage: 'The wedding page you\'re looking for doesn\'t exist.',
  goHome: 'Go Home',
};

const es: TranslationStrings = {
  rsvp: 'Confirmar asistencia',
  faq: 'Preguntas frecuentes',
  registry: 'Lista de regalos',
  accommodations: 'Alojamiento',
  guestbook: 'Libro de visitas',
  photos: 'Fotos',
  music: 'Música',
  seating: 'Ubicación',
  gallery: 'Galería',
  video: 'Video',
  rsvpTitle: 'Confirmar asistencia',
  rsvpRespondButton: 'Responder a nuestra invitación',
  faqTitle: 'Preguntas frecuentes',
  registryTitle: 'Lista de regalos',
  registryViewRegistry: 'Ver lista',
  accommodationsTitle: 'Alojamiento',
  accommodationsBookNow: 'Reservar ahora',
  accommodationsRoomBlockCode: 'Código de reserva',
  accommodationsGettingThere: 'Cómo llegar',
  accommodationsAirportDirections: 'Desde el aeropuerto',
  accommodationsParking: 'Estacionamiento',
  accommodationsViewMap: 'Ver mapa',
  photosTitle: 'Comparte tus fotos',
  photosDescription: 'Ayúdanos a capturar los recuerdos compartiendo tus fotos de nuestro día especial.',
  photosUploadButton: 'Subir fotos',
  musicTitle: 'Solicitar una canción',
  musicDescription: 'Ayúdanos a crear la lista de reproducción perfecta para nuestra celebración.',
  musicSongTitleLabel: 'Título de la canción',
  musicArtistLabel: 'Artista',
  musicYourNameLabel: 'Tu nombre (opcional)',
  musicSubmitButton: 'Enviar solicitud',
  musicSuccessMessage: '¡Solicitud de canción enviada!',
  musicErrorMessage: 'Error al enviar la solicitud. Por favor intenta de nuevo.',
  guestbookTitle: 'Libro de visitas',
  guestbookDescription: 'Déjanos un mensaje para celebrar nuestro día especial.',
  guestbookNameLabel: 'Tu nombre',
  guestbookMessageLabel: 'Tu mensaje',
  guestbookSubmitButton: 'Firmar libro',
  guestbookSuccessMessage: 'Tu mensaje ha sido enviado para revisión.',
  guestbookErrorMessage: 'Error al enviar el mensaje. Por favor intenta de nuevo.',
  guestbookNoMessages: '¡Sé el primero en firmar nuestro libro de visitas!',
  eventDetailsTitle: 'Detalles del evento',
  eventDetailsCeremony: 'Ceremonia',
  eventDetailsReception: 'Recepción',
  eventDetailsAddToCalendar: 'Añadir al calendario',
  eventDetailsGetDirections: 'Obtener direcciones',
  galleryTitle: 'Galería de fotos',
  videoTitle: 'Nuestra historia',
  heroJoinUs: 'Únete a nosotros para celebrar nuestro amor',
  seatingTitle: 'Ubicación de mesas',
  seatingYourTable: 'Tu mesa',
  loading: 'Cargando...',
  error: 'Ocurrió un error',
  submit: 'Enviar',
  cancel: 'Cancelar',
  back: 'Volver',
  notFound: 'Página no encontrada',
  notFoundMessage: 'La página de boda que buscas no existe.',
  goHome: 'Ir al inicio',
};

// Add more languages as needed - using English as fallback
const translations: Record<SupportedLanguage, TranslationStrings> = {
  en,
  es,
  fr: en, // Fallback to English
  pt: en,
  de: en,
  it: en,
  nl: en,
  ja: en,
  zh: en,
  ko: en,
};

export function getTranslations(language?: string): TranslationStrings {
  const lang = (language || 'en') as SupportedLanguage;
  return translations[lang] || translations.en;
}

export function t(key: keyof TranslationStrings, language?: string): string {
  const strings = getTranslations(language);
  return strings[key] || translations.en[key];
}

export const LANGUAGE_OPTIONS: { code: SupportedLanguage; nativeName: string }[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'es', nativeName: 'Español' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'pt', nativeName: 'Português' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'it', nativeName: 'Italiano' },
  { code: 'nl', nativeName: 'Nederlands' },
  { code: 'ja', nativeName: '日本語' },
  { code: 'zh', nativeName: '中文' },
  { code: 'ko', nativeName: '한국어' },
];
