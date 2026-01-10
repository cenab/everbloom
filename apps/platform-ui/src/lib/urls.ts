export function getWeddingSiteBaseUrl() {
  const baseUrl = import.meta.env.VITE_WEDDING_SITE_URL?.trim();
  if (baseUrl) {
    return baseUrl.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/+$/, '');
  }
  return 'http://localhost:4321';
}

export function getWeddingSiteUrl(slug: string, options?: { preview?: boolean }) {
  const url = new URL(`/w/${slug}`, getWeddingSiteBaseUrl());
  if (options?.preview) {
    url.searchParams.set('preview', 'true');
  }
  return url.toString();
}
