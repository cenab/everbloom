// Main entry point for wedding site

import {
  fetchSiteConfig,
  fetchRsvpView,
  submitGuestbookMessage,
  submitMusicRequest,
  verifyPasscode,
  requestPhotoUploadToken,
  completePhotoUpload,
} from './lib/api';
import { renderWeddingPage, applyTheme } from './lib/render';
import { t } from './lib/i18n';
import type { RenderConfig } from './types';
import './styles/main.css';

const PASSCODE_STORAGE_PREFIX = 'weddingSitePasscode:';

function getPasscodeStorageKey(slug: string): string {
  return `${PASSCODE_STORAGE_PREFIX}${slug}`;
}

function hasPasscodeAccess(slug: string): boolean {
  try {
    return sessionStorage.getItem(getPasscodeStorageKey(slug)) !== null;
  } catch {
    return false;
  }
}

function storePasscodeAccess(slug: string, token?: string): void {
  try {
    sessionStorage.setItem(getPasscodeStorageKey(slug), token || 'verified');
  } catch {
    // Ignore storage errors (private mode, etc.)
  }
}

// Router - determine what page to show based on URL
function getRoute(): { page: string; slug?: string; token?: string } {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  // Photo upload page: /w/slug-here/photos
  const photoMatch = path.match(/^\/w\/([^/]+)\/photos\/?$/);
  if (photoMatch) {
    return { page: 'photo-upload', slug: photoMatch[1] };
  }

  // Wedding page: /w/slug-here
  const weddingMatch = path.match(/^\/w\/([^/]+)\/?$/);
  if (weddingMatch) {
    return { page: 'wedding', slug: weddingMatch[1] };
  }

  // RSVP page: /rsvp?token=xxx
  if (path === '/rsvp' || path === '/rsvp/') {
    return { page: 'rsvp', token: params.get('token') || undefined };
  }

  // Home page
  if (path === '/' || path === '') {
    return { page: 'home' };
  }

  // 404
  return { page: 'not-found' };
}

// Hide loading spinner
function hideLoading(): void {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.display = 'none';
  }
}

// Show content in main container
function showContent(html: string): void {
  const main = document.getElementById('main-content');
  if (main) {
    main.innerHTML = html;
  }
  hideLoading();
}

// Render landing/home page
function renderHomePage(): void {
  showContent(`
    <div class="home-page">
      <div class="home-hero">
        <h1>Everbloom</h1>
        <p>Beautiful wedding websites for your special day</p>
      </div>
    </div>
  `);
}

// Render 404 page
function renderNotFoundPage(lang = 'en'): void {
  showContent(`
    <div class="error-page">
      <h1>${t('notFound', lang)}</h1>
      <p>${t('notFoundMessage', lang)}</p>
      <a href="/" class="btn btn-primary">${t('goHome', lang)}</a>
    </div>
  `);
}

// Render error page
function renderErrorPage(message: string): void {
  showContent(`
    <div class="error-page">
      <h1>Error</h1>
      <p>${message}</p>
      <a href="/" class="btn btn-primary">Go Home</a>
    </div>
  `);
}

function renderPasscodeGate(config: RenderConfig, slug: string, onSuccess: () => void): void {
  applyTheme(config.theme);

  showContent(`
    <div class="passcode-page">
      <div class="passcode-card">
        <h1>Enter Passcode</h1>
        <p>This wedding site is protected. Please enter the passcode to continue.</p>
        <form id="passcode-form" class="passcode-form">
          <div class="form-group">
            <label for="passcode-input">Passcode</label>
            <input type="password" id="passcode-input" name="passcode" autocomplete="current-password" required>
          </div>
          <button type="submit" class="btn btn-primary">Unlock Site</button>
          <p class="form-status" id="passcode-status" role="alert"></p>
        </form>
      </div>
    </div>
  `);

  const form = document.getElementById('passcode-form') as HTMLFormElement | null;
  const status = document.getElementById('passcode-status');
  const submitBtn = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const passcode = (formData.get('passcode') || '').toString();

    if (!passcode) {
      if (status) {
        status.textContent = 'Passcode is required.';
        status.className = 'form-status error';
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
    }

    const result = await verifyPasscode(slug, passcode);

    if (result.valid) {
      storePasscodeAccess(slug, result.sessionToken);
      onSuccess();
      return;
    }

    if (status) {
      status.textContent = 'Invalid passcode. Please try again.';
      status.className = 'form-status error';
    }

    if (submitBtn) {
      submitBtn.disabled = false;
    }
  });
}

// Setup interactive elements after render
function setupInteractivity(config: RenderConfig): void {
  const slug = config.wedding.slug;

  // Guestbook form
  const guestbookForm = document.getElementById('guestbook-form') as HTMLFormElement | null;
  if (guestbookForm) {
    guestbookForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(guestbookForm);
      const guestName = formData.get('guestName') as string;
      const message = formData.get('message') as string;
      const status = document.getElementById('guestbook-status');

      const submitBtn = guestbookForm.querySelector('button[type="submit"]') as HTMLButtonElement;
      submitBtn.disabled = true;

      const result = await submitGuestbookMessage(slug, guestName, message);

      if (result.success) {
        if (status) {
          status.textContent = t('guestbookSuccessMessage', config.language);
          status.className = 'form-status success';
        }
        guestbookForm.reset();
      } else {
        if (status) {
          status.textContent = t('guestbookErrorMessage', config.language);
          status.className = 'form-status error';
        }
      }

      submitBtn.disabled = false;
    });
  }

  // Music request form
  const musicForm = document.getElementById('music-form') as HTMLFormElement | null;
  if (musicForm) {
    musicForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(musicForm);
      const songTitle = formData.get('songTitle') as string;
      const artistName = formData.get('artistName') as string;
      const requesterName = formData.get('requesterName') as string | undefined;
      const status = document.getElementById('music-status');

      const submitBtn = musicForm.querySelector('button[type="submit"]') as HTMLButtonElement;
      submitBtn.disabled = true;

      const result = await submitMusicRequest(slug, songTitle, artistName, requesterName);

      if (result.success) {
        if (status) {
          status.textContent = t('musicSuccessMessage', config.language);
          status.className = 'form-status success';
        }
        musicForm.reset();
      } else {
        if (status) {
          status.textContent = t('musicErrorMessage', config.language);
          status.className = 'form-status error';
        }
      }

      submitBtn.disabled = false;
    });
  }

  // Gallery lightbox
  const galleryItems = document.querySelectorAll('.gallery-item');
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = lightbox?.querySelector('.lightbox-image') as HTMLImageElement | null;
  const lightboxClose = lightbox?.querySelector('.lightbox-close');
  const lightboxPrev = lightbox?.querySelector('.lightbox-prev');
  const lightboxNext = lightbox?.querySelector('.lightbox-next');

  if (galleryItems.length > 0 && lightbox && lightboxImage) {
    let currentIndex = 0;
    const photos = config.gallery?.photos?.sort((a, b) => a.order - b.order) || [];

    function showPhoto(index: number): void {
      if (!lightboxImage || !photos.length) return;
      currentIndex = (index + photos.length) % photos.length;
      lightboxImage.src = photos[currentIndex].url || '';
      lightboxImage.alt = photos[currentIndex].caption || '';
    }

    function openLightbox(index: number): void {
      showPhoto(index);
      lightbox?.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox(): void {
      lightbox?.setAttribute('hidden', '');
      document.body.style.overflow = '';
    }

    galleryItems.forEach((item) => {
      item.addEventListener('click', () => {
        const index = parseInt(item.getAttribute('data-index') || '0', 10);
        openLightbox(index);
      });
    });

    lightboxClose?.addEventListener('click', closeLightbox);
    lightboxPrev?.addEventListener('click', () => showPhoto(currentIndex - 1));
    lightboxNext?.addEventListener('click', () => showPhoto(currentIndex + 1));

    lightbox?.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (lightbox?.hasAttribute('hidden')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showPhoto(currentIndex - 1);
      if (e.key === 'ArrowRight') showPhoto(currentIndex + 1);
    });
  }
}

function renderWeddingContent(config: RenderConfig): void {
  // Apply theme
  applyTheme(config.theme);

  // Update page title
  const names = config.wedding.partnerNames;
  document.title = `${names[0]} & ${names[1]} | Wedding`;

  // Update meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', `Wedding celebration of ${names[0]} and ${names[1]}`);
  }

  // Render content
  const html = renderWeddingPage(config);
  showContent(`<div class="wedding-page">${html}</div>`);

  // Setup interactive elements
  setupInteractivity(config);
}

// Render wedding page
async function renderWedding(slug: string): Promise<void> {
  const config = await fetchSiteConfig(slug);

  if (!config) {
    renderNotFoundPage();
    return;
  }

  if (config.passcodeProtected && config.features.PASSCODE_SITE && !hasPasscodeAccess(slug)) {
    renderPasscodeGate(config, slug, () => renderWeddingContent(config));
    return;
  }

  renderWeddingContent(config);
}

// Render RSVP page (simplified - full implementation would be more complex)
async function renderRsvpPage(token?: string): Promise<void> {
  if (!token) {
    renderErrorPage('RSVP token is required. Please use the link from your invitation.');
    return;
  }

  const data = await fetchRsvpView(token);

  if (!data) {
    renderErrorPage('Invalid or expired RSVP token.');
    return;
  }

  // Apply theme
  applyTheme(data.theme);

  // Update page title
  document.title = `RSVP - ${data.wedding.partnerNames[0]} & ${data.wedding.partnerNames[1]}`;

  // Simplified RSVP form (full implementation would include all features)
  showContent(`
    <div class="rsvp-page">
      <h1>RSVP</h1>
      <p>Hello, ${data.guest.name}!</p>
      <p>Please respond to the wedding invitation of ${data.wedding.partnerNames[0]} & ${data.wedding.partnerNames[1]}.</p>

      <form id="rsvp-form" class="rsvp-form">
        <input type="hidden" name="token" value="${token}">

        <div class="form-group">
          <label>Will you be attending?</label>
          <div class="radio-group">
            <label>
              <input type="radio" name="rsvpStatus" value="attending" required>
              Yes, I will attend
            </label>
            <label>
              <input type="radio" name="rsvpStatus" value="not_attending">
              Sorry, I cannot attend
            </label>
          </div>
        </div>

        <div class="form-group">
          <label for="dietary-notes">Dietary restrictions or notes</label>
          <textarea id="dietary-notes" name="dietaryNotes" rows="3"></textarea>
        </div>

        <button type="submit" class="btn btn-primary">Submit RSVP</button>
        <p class="form-status" id="rsvp-status" role="alert"></p>
      </form>
    </div>
  `);

  // Setup form submission
  const form = document.getElementById('rsvp-form') as HTMLFormElement;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const status = document.getElementById('rsvp-status');
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;

    submitBtn.disabled = true;

    try {
      const response = await fetch('/api/rsvp-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: formData.get('token'),
          rsvpStatus: formData.get('rsvpStatus'),
          partySize: 1,
          dietaryNotes: formData.get('dietaryNotes'),
        }),
      });

      const result = await response.json();

      if (result.ok) {
        if (status) {
          status.textContent = 'Thank you! Your RSVP has been submitted.';
          status.className = 'form-status success';
        }
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      if (status) {
        status.textContent = 'Failed to submit RSVP. Please try again.';
        status.className = 'form-status error';
      }
    }

    submitBtn.disabled = false;
  });
}

function updateFormStatus(status: HTMLElement | null, message: string, state?: 'success' | 'error'): void {
  if (!status) return;
  status.textContent = message;
  status.className = state ? `form-status ${state}` : 'form-status';
}

function createUploadItem(list: HTMLElement, file: File): HTMLSpanElement {
  const item = document.createElement('li');
  item.className = 'upload-item';

  const name = document.createElement('span');
  name.className = 'upload-name';
  name.textContent = file.name;

  const status = document.createElement('span');
  status.className = 'upload-state';
  status.textContent = 'Queued';

  item.append(name, status);
  list.appendChild(item);

  return status;
}

function setUploadState(
  status: HTMLSpanElement,
  state: 'queued' | 'uploading' | 'success' | 'error',
  message: string
): void {
  status.textContent = message;
  status.className = `upload-state ${state}`;
}

async function renderPhotoUploadPage(slug: string): Promise<void> {
  const config = await fetchSiteConfig(slug);

  if (!config) {
    renderNotFoundPage();
    return;
  }

  if (config.passcodeProtected && config.features.PASSCODE_SITE && !hasPasscodeAccess(slug)) {
    renderPasscodeGate(config, slug, () => renderPhotoUploadPage(slug));
    return;
  }

  if (!config.features.PHOTO_UPLOAD) {
    renderErrorPage('Photo uploads are not enabled for this wedding.');
    return;
  }

  applyTheme(config.theme);

  const names = config.wedding.partnerNames;
  document.title = `Share Photos | ${names[0]} & ${names[1]}`;

  const lang = config.language || 'en';
  const title = t('photosTitle', lang);
  const description = t('photosDescription', lang);
  const uploadButton = t('photosUploadButton', lang);

  showContent(`
    <div class="photo-upload-page">
      <div class="photo-upload-card">
        <h1>${title}</h1>
        <p>${description}</p>

        <form id="photo-upload-form" class="photo-upload-form">
          <div class="form-group">
            <label for="uploader-name">Your name (optional)</label>
            <input type="text" id="uploader-name" name="uploaderName" autocomplete="name">
          </div>
          <div class="form-group">
            <label for="uploader-email">Your email (optional)</label>
            <input type="email" id="uploader-email" name="uploaderEmail" autocomplete="email">
          </div>
          <div class="form-group">
            <label for="photo-files">Select photos</label>
            <input type="file" id="photo-files" name="photos" accept="image/*" multiple required>
            <p class="form-help">You can select multiple photos at once.</p>
          </div>
          <button type="submit" class="btn btn-primary">${uploadButton}</button>
          <p class="form-status" id="photo-upload-status" role="alert"></p>
        </form>

        <ul class="upload-list" id="photo-upload-list"></ul>
      </div>
    </div>
  `);

  const form = document.getElementById('photo-upload-form') as HTMLFormElement | null;
  const fileInput = document.getElementById('photo-files') as HTMLInputElement | null;
  const status = document.getElementById('photo-upload-status');
  const list = document.getElementById('photo-upload-list');
  const submitBtn = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const files = fileInput?.files ? Array.from(fileInput.files) : [];
    if (files.length === 0) {
      updateFormStatus(status, 'Please select at least one photo.', 'error');
      return;
    }

    const formData = new FormData(form);
    const uploaderName = (formData.get('uploaderName') || '').toString().trim();
    const uploaderEmail = (formData.get('uploaderEmail') || '').toString().trim();

    if (submitBtn) submitBtn.disabled = true;
    if (fileInput) fileInput.disabled = true;

    if (list) {
      list.innerHTML = '';
    }

    updateFormStatus(status, 'Starting uploads...');

    let successCount = 0;
    let failureCount = 0;

    for (const file of files) {
      const listStatus = list ? createUploadItem(list, file) : null;
      if (listStatus) {
        setUploadState(listStatus, 'uploading', 'Requesting upload URL...');
      }

      const tokenResponse = await requestPhotoUploadToken({
        slug,
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
      });

      if (!tokenResponse) {
        if (listStatus) {
          setUploadState(listStatus, 'error', 'Failed to prepare upload.');
        }
        failureCount += 1;
        continue;
      }

      if (listStatus) {
        setUploadState(listStatus, 'uploading', 'Uploading...');
      }

      try {
        const uploadResponse = await fetch(tokenResponse.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error('Upload failed');
        }
      } catch {
        if (listStatus) {
          setUploadState(listStatus, 'error', 'Upload failed.');
        }
        failureCount += 1;
        continue;
      }

      if (listStatus) {
        setUploadState(listStatus, 'uploading', 'Finalizing...');
      }

      const metadataResponse = await completePhotoUpload({
        uploadId: tokenResponse.uploadId,
        uploaderName: uploaderName || undefined,
        uploaderEmail: uploaderEmail || undefined,
      });

      if (!metadataResponse) {
        if (listStatus) {
          setUploadState(listStatus, 'error', 'Could not save metadata.');
        }
        failureCount += 1;
        continue;
      }

      if (listStatus) {
        setUploadState(listStatus, 'success', 'Uploaded.');
      }
      successCount += 1;
    }

    if (successCount > 0 && failureCount === 0) {
      updateFormStatus(status, 'All photos uploaded successfully.', 'success');
      form.reset();
    } else if (successCount > 0) {
      updateFormStatus(
        status,
        `Uploaded ${successCount} photo${successCount > 1 ? 's' : ''}. ${failureCount} failed.`,
        'error'
      );
    } else {
      updateFormStatus(status, 'Uploads failed. Please try again.', 'error');
    }

    if (submitBtn) submitBtn.disabled = false;
    if (fileInput) fileInput.disabled = false;
  });
}

// Main app initialization
async function init(): Promise<void> {
  const route = getRoute();

  switch (route.page) {
    case 'home':
      renderHomePage();
      break;
    case 'wedding':
      if (route.slug) {
        await renderWedding(route.slug);
      } else {
        renderNotFoundPage();
      }
      break;
    case 'rsvp':
      await renderRsvpPage(route.token);
      break;
    case 'photo-upload':
      if (route.slug) {
        await renderPhotoUploadPage(route.slug);
      } else {
        renderNotFoundPage();
      }
      break;
    default:
      renderNotFoundPage();
  }
}

// Start the app
init().catch((err) => {
  console.error('App initialization failed:', err);
  renderErrorPage('Something went wrong. Please refresh the page.');
});
