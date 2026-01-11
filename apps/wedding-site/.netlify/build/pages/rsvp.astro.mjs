import { c as createComponent, a as createAstro, d as defineStyleVars, b as addAttribute, e as renderHead, r as renderTemplate, f as renderComponent, g as defineScriptVars, F as Fragment } from '../chunks/astro/server_6gLzEsed.mjs';
import { f as fetchRsvpView } from '../chunks/api_DY9V-Yw_.mjs';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Astro = createAstro();
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const token = Astro2.url.searchParams.get("token");
  if (!token) {
    return Astro2.redirect("/");
  }
  const { data, error } = await fetchRsvpView(token);
  let errorMessage = "";
  if (error === "INVALID_TOKEN") {
    errorMessage = "This RSVP link is no longer valid. Please contact the couple for a new invitation.";
  } else if (error === "FEATURE_DISABLED") {
    errorMessage = "RSVPs are currently closed for this event.";
  } else if (error === "WEDDING_NOT_FOUND") {
    errorMessage = "This wedding event could not be found.";
  } else if (error) {
    errorMessage = "Something went wrong. Please try again later.";
  }
  const defaultTheme = {
    primary: "#c9826b",
    accent: "#8fac8b",
    neutralLight: "#faf8f5",
    neutralDark: "#2d2d2d"
  };
  const theme = data?.theme || defaultTheme;
  const guest = data?.guest;
  const wedding = data?.wedding;
  const title = wedding ? `RSVP - ${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}` : "RSVP";
  const $$definedVars = defineStyleVars([{
    primary: theme.primary,
    accent: theme.accent,
    neutralLight: theme.neutralLight,
    neutralDark: theme.neutralDark
  }]);
  return renderTemplate`<html lang="en" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="description" content="RSVP to our wedding celebration"><title>${title}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">${renderHead()}</head> <body data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <div class="rsvp-container" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> ${errorMessage ? renderTemplate`<div class="error-container" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <div class="error-icon" aria-hidden="true" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> ${error === "FEATURE_DISABLED" ? "⏸" : "💌"} </div> <p class="error-message" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>${errorMessage}</p> </div>` : data && guest && wedding && renderTemplate`${renderComponent($$result, "Fragment", Fragment, { "data-astro-cid-vbydfbpv": true, "style": $$definedVars }, { "default": async ($$result2) => renderTemplate` <h1 class="couple-names" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}</h1> <p class="event-label" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>Wedding Celebration</p> <div class="success-container" id="success" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <div class="success-icon" aria-hidden="true" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>🎉</div> <h2 class="success-title" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>Thank you!</h2> <p class="success-message" id="success-message" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}></p> <a${addAttribute(`/w/${wedding.slug}`, "href")} class="back-link" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>View wedding details</a> </div> <div class="form-container" id="form" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <p class="greeting" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>
Hello <strong data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>${guest.name}</strong>,<br data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>
will you be joining us?
</p> ${guest.rsvpStatus !== "pending" && renderTemplate`<div class="current-status" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>
You previously responded: <strong data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> ${guest.rsvpStatus === "attending" ? "Attending" : "Not attending"} </strong> </div>`} <div class="submission-error" id="submission-error" role="alert" aria-live="assertive" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <p class="submission-error-message" id="submission-error-message" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>
We couldn't send your response. Please check your connection and try again.
</p> <p class="submission-error-hint" id="submission-error-hint" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>
Your selections have been saved. Click retry when you're ready.
</p> <button type="button" class="retry-btn" id="retry-btn" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>Try again</button> </div> <form id="rsvp-form" aria-label="RSVP form" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <input type="hidden" name="token"${addAttribute(token, "value")} data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <fieldset class="rsvp-options" role="radiogroup" aria-label="Will you be attending?" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <legend class="visually-hidden" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>Will you be attending?</legend> <label class="rsvp-option" data-value="attending" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <input type="radio" name="rsvpStatus" value="attending"${addAttribute(guest.rsvpStatus === "attending", "checked")} aria-describedby="rsvp-help" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <span class="rsvp-option-radio" aria-hidden="true" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}></span> <span data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>Joyfully accept</span> </label> <label class="rsvp-option" data-value="not_attending" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <input type="radio" name="rsvpStatus" value="not_attending"${addAttribute(guest.rsvpStatus === "not_attending", "checked")} aria-describedby="rsvp-help" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <span class="rsvp-option-radio" aria-hidden="true" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}></span> <span data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>Regretfully decline</span> </label> </fieldset> <p id="rsvp-help" class="visually-hidden" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>Select your attendance response</p> <div class="party-size-section" id="party-size-section" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <span class="section-label" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>Number of guests in your party</span> <div class="stepper" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <button type="button" class="stepper-btn" id="decrease-btn" aria-label="Decrease party size" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>−</button> <span class="stepper-value" id="party-size-value" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>${guest.partySize}</span> <input type="hidden" name="partySize" id="party-size-input"${addAttribute(guest.partySize, "value")} data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <button type="button" class="stepper-btn" id="increase-btn" aria-label="Increase party size" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>+</button> </div> </div>  <div class="plus-one-section" id="plus-one-section"${addAttribute(guest.plusOneAllowance || 0, "data-allowance")} data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <span class="section-label" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>Who will be joining you?</span> <p class="plus-one-intro" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>
Please provide the names of your additional guests so we can prepare their place cards.
</p> <div class="plus-one-cards" id="plus-one-cards" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>  ${(guest.plusOneGuests || []).map((plusOne, index) => renderTemplate`<div class="plus-one-card"${addAttribute(index, "data-index")} data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <div class="plus-one-card-header" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <span class="plus-one-card-label" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>Guest ${index + 1}</span> <button type="button" class="plus-one-remove-btn" aria-label="Remove guest" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>×</button> </div> <input type="text" class="plus-one-input plus-one-name" placeholder="Full name"${addAttribute(plusOne.name, "value")} required data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <input type="text" class="plus-one-input plus-one-dietary" placeholder="Dietary restrictions (optional)"${addAttribute(plusOne.dietaryNotes || "", "value")} data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> </div>`)} </div> <button type="button" class="add-plus-one-btn" id="add-plus-one-btn" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>
+ Add a guest
</button> <p class="plus-one-limit-hint" id="plus-one-limit-hint" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>
You can bring up to ${guest.plusOneAllowance || 0} additional guest${(guest.plusOneAllowance || 0) !== 1 ? "s" : ""} </p> </div> <div class="dietary-section" id="dietary-section" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <label class="section-label" for="dietary-notes" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>Any dietary restrictions? (optional)</label> <textarea class="dietary-input" name="dietaryNotes" id="dietary-notes" placeholder="Let us know about any allergies or dietary needs..." data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>${guest.dietaryNotes || ""}</textarea> </div> <div class="photo-optout-section" id="photo-optout-section" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <label class="photo-optout-label" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <input type="checkbox" name="photoOptOut" id="photo-optout"${addAttribute(guest.photoOptOut, "checked")} class="photo-optout-checkbox" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <span class="photo-optout-checkmark" aria-hidden="true" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}></span> <span class="photo-optout-text" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>Please don't include me in event photos</span> </label> <p class="photo-optout-hint" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>Let us know if you'd prefer not to appear in shared photos from the event.</p> </div> <button type="submit" class="submit-btn" id="submit-btn" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>
Send response
</button> </form> <div class="privacy-section" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <button type="button" class="privacy-link" id="request-data-btn" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>
Request a copy of your data
</button> </div> </div>  <div class="data-export-dialog" id="data-export-dialog" role="dialog" aria-labelledby="data-export-title" aria-modal="true" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <div class="data-export-content" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <h2 class="data-export-title" id="data-export-title" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>Request Your Data</h2> <p class="data-export-text" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>
We'll send a copy of all the information we have about you to your email address.
</p> <div class="data-export-actions" id="data-export-actions" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}> <button type="button" class="data-export-btn secondary" id="data-export-cancel" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>Cancel</button> <button type="button" class="data-export-btn primary" id="data-export-confirm" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}>Send to my email</button> </div> <div class="data-export-status hidden" id="data-export-status" data-astro-cid-vbydfbpv${addAttribute($$definedVars, "style")}></div> </div> </div> ` })}`} </div> ${!errorMessage && data && renderTemplate(_a || (_a = __template(["<script>(function(){", `
        document.addEventListener('DOMContentLoaded', () => {
          const form = document.getElementById('rsvp-form');
          const formContainer = document.getElementById('form');
          const successContainer = document.getElementById('success');
          const successMessage = document.getElementById('success-message');
          const submitBtn = document.getElementById('submit-btn');
          const options = document.querySelectorAll('.rsvp-option');
          const partySizeSection = document.getElementById('party-size-section');
          const dietarySection = document.getElementById('dietary-section');
          const partySizeValue = document.getElementById('party-size-value');
          const partySizeInput = document.getElementById('party-size-input');
          const decreaseBtn = document.getElementById('decrease-btn');
          const increaseBtn = document.getElementById('increase-btn');

          // Plus-one elements
          const plusOneSection = document.getElementById('plus-one-section');
          const plusOneCards = document.getElementById('plus-one-cards');
          const addPlusOneBtn = document.getElementById('add-plus-one-btn');
          const plusOneLimitHint = document.getElementById('plus-one-limit-hint');
          const plusOneAllowance = parseInt(plusOneSection?.dataset.allowance) || 0;

          // Error display elements
          const submissionError = document.getElementById('submission-error');
          const submissionErrorMessage = document.getElementById('submission-error-message');
          const submissionErrorHint = document.getElementById('submission-error-hint');
          const retryBtn = document.getElementById('retry-btn');

          // Error type tracking
          let lastErrorType = null; // 'network' or 'api'

          // Get current plus-one count
          function getPlusOneCount() {
            return plusOneCards?.querySelectorAll('.plus-one-card').length || 0;
          }

          // Update plus-one UI state
          function updatePlusOneUI() {
            const count = getPlusOneCount();
            const canAddMore = count < plusOneAllowance;

            if (addPlusOneBtn) {
              addPlusOneBtn.disabled = !canAddMore;
              addPlusOneBtn.textContent = canAddMore ? '+ Add a guest' : 'Maximum guests added';
            }

            if (plusOneLimitHint) {
              const remaining = plusOneAllowance - count;
              if (count === 0) {
                plusOneLimitHint.textContent = \`You can bring up to \${plusOneAllowance} additional guest\${plusOneAllowance !== 1 ? 's' : ''}\`;
              } else if (remaining > 0) {
                plusOneLimitHint.textContent = \`\${remaining} more guest\${remaining !== 1 ? 's' : ''} available\`;
              } else {
                plusOneLimitHint.textContent = 'All guest spots filled';
              }
            }

            // Update party size to reflect plus-ones + 1 (the guest)
            updatePartySizeFromPlusOnes();

            // Re-number card labels
            const cards = plusOneCards?.querySelectorAll('.plus-one-card') || [];
            cards.forEach((card, index) => {
              const label = card.querySelector('.plus-one-card-label');
              if (label) {
                label.textContent = \`Guest \${index + 1}\`;
              }
            });
          }

          // Update party size based on plus-one count
          function updatePartySizeFromPlusOnes() {
            const plusOneCount = getPlusOneCount();
            const minPartySize = 1 + plusOneCount; // Guest + plus-ones

            if (partySize < minPartySize) {
              partySize = minPartySize;
              updatePartySize();
            }

            // Update minimum for stepper
            if (decreaseBtn) {
              decreaseBtn.disabled = partySize <= minPartySize;
            }
          }

          // Create a plus-one card element
          function createPlusOneCard(index, name = '', dietary = '') {
            const card = document.createElement('div');
            card.className = 'plus-one-card';
            card.dataset.index = index;
            card.innerHTML = \`
              <div class="plus-one-card-header">
                <span class="plus-one-card-label">Guest \${index + 1}</span>
                <button type="button" class="plus-one-remove-btn" aria-label="Remove guest">×</button>
              </div>
              <input
                type="text"
                class="plus-one-input plus-one-name"
                placeholder="Full name"
                value="\${name}"
                required
              />
              <input
                type="text"
                class="plus-one-input plus-one-dietary"
                placeholder="Dietary restrictions (optional)"
                value="\${dietary}"
              />
            \`;

            // Add remove handler
            const removeBtn = card.querySelector('.plus-one-remove-btn');
            removeBtn.addEventListener('click', () => {
              card.remove();
              updatePlusOneUI();
            });

            return card;
          }

          // Add plus-one button handler
          if (addPlusOneBtn && plusOneAllowance > 0) {
            addPlusOneBtn.addEventListener('click', () => {
              const count = getPlusOneCount();
              if (count < plusOneAllowance) {
                const card = createPlusOneCard(count);
                plusOneCards.appendChild(card);
                updatePlusOneUI();
                // Focus the name input
                card.querySelector('.plus-one-name')?.focus();
              }
            });
          }

          // Initialize remove button handlers for existing cards
          plusOneCards?.querySelectorAll('.plus-one-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.target.closest('.plus-one-card')?.remove();
              updatePlusOneUI();
            });
          });

          // Get plus-one guests data
          function getPlusOneGuests() {
            const cards = plusOneCards?.querySelectorAll('.plus-one-card') || [];
            const guests = [];
            cards.forEach(card => {
              const name = card.querySelector('.plus-one-name')?.value?.trim();
              const dietary = card.querySelector('.plus-one-dietary')?.value?.trim();
              if (name) {
                guests.push({
                  name,
                  dietaryNotes: dietary || undefined,
                });
              }
            });
            return guests;
          }

          // Update UI based on current selection
          function updateUI() {
            const selected = document.querySelector('input[name="rsvpStatus"]:checked');
            const isAttending = selected && selected.value === 'attending';

            options.forEach(opt => {
              const input = opt.querySelector('input');
              opt.classList.toggle('selected', input.checked);
            });

            partySizeSection.classList.toggle('visible', isAttending);
            dietarySection.classList.toggle('visible', isAttending);

            // Show plus-one section if attending and has allowance
            if (plusOneSection && plusOneAllowance > 0) {
              plusOneSection.classList.toggle('visible', isAttending);
            }
          }

          // Initialize UI
          updateUI();
          updatePlusOneUI();

          // Handle option selection
          options.forEach(option => {
            option.addEventListener('click', () => {
              const input = option.querySelector('input');
              input.checked = true;
              updateUI();
            });
          });

          // Party size stepper
          let partySize = parseInt(partySizeInput.value) || 1;

          function updatePartySize() {
            partySizeValue.textContent = partySize;
            partySizeInput.value = partySize;

            const minPartySize = 1 + getPlusOneCount();
            decreaseBtn.disabled = partySize <= minPartySize;
            increaseBtn.disabled = partySize >= 20;
          }

          decreaseBtn.addEventListener('click', () => {
            const minPartySize = 1 + getPlusOneCount();
            if (partySize > minPartySize) {
              partySize--;
              updatePartySize();
            }
          });

          increaseBtn.addEventListener('click', () => {
            if (partySize < 20) {
              partySize++;
              updatePartySize();
            }
          });

          updatePartySize();

          // Show inline error with appropriate message
          function showError(type, message) {
            lastErrorType = type;

            if (type === 'network') {
              submissionErrorMessage.textContent = "We couldn't send your response. Please check your connection and try again.";
              submissionErrorHint.textContent = "Your selections have been saved. Click retry when you're ready.";
            } else if (type === 'plus_one_limit') {
              submissionErrorMessage.textContent = message || "You've exceeded the number of allowed additional guests.";
              submissionErrorHint.textContent = "Please remove some guests and try again.";
            } else {
              // API error (server returned an error)
              submissionErrorMessage.textContent = "Something went wrong while saving your response.";
              submissionErrorHint.textContent = "Please try again in a moment.";
            }

            submissionError.classList.add('visible');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send response';
          }

          // Hide error display
          function hideError() {
            submissionError.classList.remove('visible');
            lastErrorType = null;
          }

          // Submit RSVP data
          async function submitRsvp() {
            hideError();
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            retryBtn.disabled = true;

            const formData = new FormData(form);
            const plusOneGuests = getPlusOneGuests();

            // Validate plus-one limit client-side
            if (plusOneGuests.length > plusOneAllowance) {
              showError('plus_one_limit', \`You can only bring up to \${plusOneAllowance} additional guest\${plusOneAllowance !== 1 ? 's' : ''}.\`);
              retryBtn.disabled = false;
              return;
            }

            const photoOptOutCheckbox = document.getElementById('photo-optout');
            const photoOptOut = photoOptOutCheckbox?.checked || false;

            const data = {
              token: formData.get('token'),
              rsvpStatus: formData.get('rsvpStatus'),
              partySize: parseInt(formData.get('partySize')) || 1,
              dietaryNotes: formData.get('dietaryNotes') || undefined,
              plusOneGuests: plusOneGuests.length > 0 ? plusOneGuests : undefined,
              photoOptOut,
            };

            try {
              const response = await fetch(\`\${apiBaseUrl}/rsvp/submit\`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
              });

              const result = await response.json();

              if (result.ok) {
                formContainer.classList.add('hidden');
                successContainer.classList.add('visible');
                successMessage.textContent = result.data.message;
              } else {
                // Check for specific error codes
                if (result.error === 'PLUS_ONE_LIMIT_EXCEEDED') {
                  showError('plus_one_limit');
                } else {
                  showError('api');
                }
              }
            } catch (error) {
              // Network error (fetch failed, timeout, no connection, etc.)
              console.error('Error submitting RSVP:', error);
              showError('network');
            } finally {
              retryBtn.disabled = false;
            }
          }

          // Form submission
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitRsvp();
          });

          // Retry button click
          retryBtn.addEventListener('click', async () => {
            await submitRsvp();
          });

          // Data export dialog handling
          const requestDataBtn = document.getElementById('request-data-btn');
          const dataExportDialog = document.getElementById('data-export-dialog');
          const dataExportCancel = document.getElementById('data-export-cancel');
          const dataExportConfirm = document.getElementById('data-export-confirm');
          const dataExportStatus = document.getElementById('data-export-status');
          const dataExportActions = document.getElementById('data-export-actions');

          // Get the token from the form
          const tokenInput = document.querySelector('input[name="token"]');
          const guestToken = tokenInput?.value;

          // Open dialog
          requestDataBtn?.addEventListener('click', () => {
            dataExportDialog.classList.add('visible');
            dataExportStatus.classList.add('hidden');
            dataExportActions.style.display = 'flex';
            dataExportConfirm.disabled = false;
            dataExportCancel.disabled = false;
          });

          // Close dialog
          dataExportCancel?.addEventListener('click', () => {
            dataExportDialog.classList.remove('visible');
          });

          // Close dialog on backdrop click
          dataExportDialog?.addEventListener('click', (e) => {
            if (e.target === dataExportDialog) {
              dataExportDialog.classList.remove('visible');
            }
          });

          // Handle data export request
          dataExportConfirm?.addEventListener('click', async () => {
            if (!guestToken) {
              dataExportStatus.textContent = 'Unable to process request. Please refresh the page.';
              dataExportStatus.className = 'data-export-status error';
              return;
            }

            dataExportConfirm.disabled = true;
            dataExportCancel.disabled = true;
            dataExportConfirm.textContent = 'Sending...';

            try {
              const response = await fetch(\`\${apiBaseUrl}/rsvp/data-export\`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: guestToken }),
              });

              const result = await response.json();

              if (result.ok) {
                dataExportActions.style.display = 'none';
                dataExportStatus.textContent = \`\${result.data.message} (\${result.data.sentTo})\`;
                dataExportStatus.className = 'data-export-status success';
              } else {
                dataExportStatus.textContent = 'Unable to send data export. Please try again later.';
                dataExportStatus.className = 'data-export-status error';
                dataExportConfirm.textContent = 'Send to my email';
                dataExportConfirm.disabled = false;
                dataExportCancel.disabled = false;
              }
            } catch (error) {
              console.error('Error requesting data export:', error);
              dataExportStatus.textContent = 'Network error. Please check your connection and try again.';
              dataExportStatus.className = 'data-export-status error';
              dataExportConfirm.textContent = 'Send to my email';
              dataExportConfirm.disabled = false;
              dataExportCancel.disabled = false;
            }
          });

          // Close dialog on Escape key
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dataExportDialog.classList.contains('visible')) {
              dataExportDialog.classList.remove('visible');
            }
          });
        });
      })();</script>`], ["<script>(function(){", `
        document.addEventListener('DOMContentLoaded', () => {
          const form = document.getElementById('rsvp-form');
          const formContainer = document.getElementById('form');
          const successContainer = document.getElementById('success');
          const successMessage = document.getElementById('success-message');
          const submitBtn = document.getElementById('submit-btn');
          const options = document.querySelectorAll('.rsvp-option');
          const partySizeSection = document.getElementById('party-size-section');
          const dietarySection = document.getElementById('dietary-section');
          const partySizeValue = document.getElementById('party-size-value');
          const partySizeInput = document.getElementById('party-size-input');
          const decreaseBtn = document.getElementById('decrease-btn');
          const increaseBtn = document.getElementById('increase-btn');

          // Plus-one elements
          const plusOneSection = document.getElementById('plus-one-section');
          const plusOneCards = document.getElementById('plus-one-cards');
          const addPlusOneBtn = document.getElementById('add-plus-one-btn');
          const plusOneLimitHint = document.getElementById('plus-one-limit-hint');
          const plusOneAllowance = parseInt(plusOneSection?.dataset.allowance) || 0;

          // Error display elements
          const submissionError = document.getElementById('submission-error');
          const submissionErrorMessage = document.getElementById('submission-error-message');
          const submissionErrorHint = document.getElementById('submission-error-hint');
          const retryBtn = document.getElementById('retry-btn');

          // Error type tracking
          let lastErrorType = null; // 'network' or 'api'

          // Get current plus-one count
          function getPlusOneCount() {
            return plusOneCards?.querySelectorAll('.plus-one-card').length || 0;
          }

          // Update plus-one UI state
          function updatePlusOneUI() {
            const count = getPlusOneCount();
            const canAddMore = count < plusOneAllowance;

            if (addPlusOneBtn) {
              addPlusOneBtn.disabled = !canAddMore;
              addPlusOneBtn.textContent = canAddMore ? '+ Add a guest' : 'Maximum guests added';
            }

            if (plusOneLimitHint) {
              const remaining = plusOneAllowance - count;
              if (count === 0) {
                plusOneLimitHint.textContent = \\\`You can bring up to \\\${plusOneAllowance} additional guest\\\${plusOneAllowance !== 1 ? 's' : ''}\\\`;
              } else if (remaining > 0) {
                plusOneLimitHint.textContent = \\\`\\\${remaining} more guest\\\${remaining !== 1 ? 's' : ''} available\\\`;
              } else {
                plusOneLimitHint.textContent = 'All guest spots filled';
              }
            }

            // Update party size to reflect plus-ones + 1 (the guest)
            updatePartySizeFromPlusOnes();

            // Re-number card labels
            const cards = plusOneCards?.querySelectorAll('.plus-one-card') || [];
            cards.forEach((card, index) => {
              const label = card.querySelector('.plus-one-card-label');
              if (label) {
                label.textContent = \\\`Guest \\\${index + 1}\\\`;
              }
            });
          }

          // Update party size based on plus-one count
          function updatePartySizeFromPlusOnes() {
            const plusOneCount = getPlusOneCount();
            const minPartySize = 1 + plusOneCount; // Guest + plus-ones

            if (partySize < minPartySize) {
              partySize = minPartySize;
              updatePartySize();
            }

            // Update minimum for stepper
            if (decreaseBtn) {
              decreaseBtn.disabled = partySize <= minPartySize;
            }
          }

          // Create a plus-one card element
          function createPlusOneCard(index, name = '', dietary = '') {
            const card = document.createElement('div');
            card.className = 'plus-one-card';
            card.dataset.index = index;
            card.innerHTML = \\\`
              <div class="plus-one-card-header">
                <span class="plus-one-card-label">Guest \\\${index + 1}</span>
                <button type="button" class="plus-one-remove-btn" aria-label="Remove guest">×</button>
              </div>
              <input
                type="text"
                class="plus-one-input plus-one-name"
                placeholder="Full name"
                value="\\\${name}"
                required
              />
              <input
                type="text"
                class="plus-one-input plus-one-dietary"
                placeholder="Dietary restrictions (optional)"
                value="\\\${dietary}"
              />
            \\\`;

            // Add remove handler
            const removeBtn = card.querySelector('.plus-one-remove-btn');
            removeBtn.addEventListener('click', () => {
              card.remove();
              updatePlusOneUI();
            });

            return card;
          }

          // Add plus-one button handler
          if (addPlusOneBtn && plusOneAllowance > 0) {
            addPlusOneBtn.addEventListener('click', () => {
              const count = getPlusOneCount();
              if (count < plusOneAllowance) {
                const card = createPlusOneCard(count);
                plusOneCards.appendChild(card);
                updatePlusOneUI();
                // Focus the name input
                card.querySelector('.plus-one-name')?.focus();
              }
            });
          }

          // Initialize remove button handlers for existing cards
          plusOneCards?.querySelectorAll('.plus-one-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.target.closest('.plus-one-card')?.remove();
              updatePlusOneUI();
            });
          });

          // Get plus-one guests data
          function getPlusOneGuests() {
            const cards = plusOneCards?.querySelectorAll('.plus-one-card') || [];
            const guests = [];
            cards.forEach(card => {
              const name = card.querySelector('.plus-one-name')?.value?.trim();
              const dietary = card.querySelector('.plus-one-dietary')?.value?.trim();
              if (name) {
                guests.push({
                  name,
                  dietaryNotes: dietary || undefined,
                });
              }
            });
            return guests;
          }

          // Update UI based on current selection
          function updateUI() {
            const selected = document.querySelector('input[name="rsvpStatus"]:checked');
            const isAttending = selected && selected.value === 'attending';

            options.forEach(opt => {
              const input = opt.querySelector('input');
              opt.classList.toggle('selected', input.checked);
            });

            partySizeSection.classList.toggle('visible', isAttending);
            dietarySection.classList.toggle('visible', isAttending);

            // Show plus-one section if attending and has allowance
            if (plusOneSection && plusOneAllowance > 0) {
              plusOneSection.classList.toggle('visible', isAttending);
            }
          }

          // Initialize UI
          updateUI();
          updatePlusOneUI();

          // Handle option selection
          options.forEach(option => {
            option.addEventListener('click', () => {
              const input = option.querySelector('input');
              input.checked = true;
              updateUI();
            });
          });

          // Party size stepper
          let partySize = parseInt(partySizeInput.value) || 1;

          function updatePartySize() {
            partySizeValue.textContent = partySize;
            partySizeInput.value = partySize;

            const minPartySize = 1 + getPlusOneCount();
            decreaseBtn.disabled = partySize <= minPartySize;
            increaseBtn.disabled = partySize >= 20;
          }

          decreaseBtn.addEventListener('click', () => {
            const minPartySize = 1 + getPlusOneCount();
            if (partySize > minPartySize) {
              partySize--;
              updatePartySize();
            }
          });

          increaseBtn.addEventListener('click', () => {
            if (partySize < 20) {
              partySize++;
              updatePartySize();
            }
          });

          updatePartySize();

          // Show inline error with appropriate message
          function showError(type, message) {
            lastErrorType = type;

            if (type === 'network') {
              submissionErrorMessage.textContent = "We couldn't send your response. Please check your connection and try again.";
              submissionErrorHint.textContent = "Your selections have been saved. Click retry when you're ready.";
            } else if (type === 'plus_one_limit') {
              submissionErrorMessage.textContent = message || "You've exceeded the number of allowed additional guests.";
              submissionErrorHint.textContent = "Please remove some guests and try again.";
            } else {
              // API error (server returned an error)
              submissionErrorMessage.textContent = "Something went wrong while saving your response.";
              submissionErrorHint.textContent = "Please try again in a moment.";
            }

            submissionError.classList.add('visible');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send response';
          }

          // Hide error display
          function hideError() {
            submissionError.classList.remove('visible');
            lastErrorType = null;
          }

          // Submit RSVP data
          async function submitRsvp() {
            hideError();
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            retryBtn.disabled = true;

            const formData = new FormData(form);
            const plusOneGuests = getPlusOneGuests();

            // Validate plus-one limit client-side
            if (plusOneGuests.length > plusOneAllowance) {
              showError('plus_one_limit', \\\`You can only bring up to \\\${plusOneAllowance} additional guest\\\${plusOneAllowance !== 1 ? 's' : ''}.\\\`);
              retryBtn.disabled = false;
              return;
            }

            const photoOptOutCheckbox = document.getElementById('photo-optout');
            const photoOptOut = photoOptOutCheckbox?.checked || false;

            const data = {
              token: formData.get('token'),
              rsvpStatus: formData.get('rsvpStatus'),
              partySize: parseInt(formData.get('partySize')) || 1,
              dietaryNotes: formData.get('dietaryNotes') || undefined,
              plusOneGuests: plusOneGuests.length > 0 ? plusOneGuests : undefined,
              photoOptOut,
            };

            try {
              const response = await fetch(\\\`\\\${apiBaseUrl}/rsvp/submit\\\`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
              });

              const result = await response.json();

              if (result.ok) {
                formContainer.classList.add('hidden');
                successContainer.classList.add('visible');
                successMessage.textContent = result.data.message;
              } else {
                // Check for specific error codes
                if (result.error === 'PLUS_ONE_LIMIT_EXCEEDED') {
                  showError('plus_one_limit');
                } else {
                  showError('api');
                }
              }
            } catch (error) {
              // Network error (fetch failed, timeout, no connection, etc.)
              console.error('Error submitting RSVP:', error);
              showError('network');
            } finally {
              retryBtn.disabled = false;
            }
          }

          // Form submission
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitRsvp();
          });

          // Retry button click
          retryBtn.addEventListener('click', async () => {
            await submitRsvp();
          });

          // Data export dialog handling
          const requestDataBtn = document.getElementById('request-data-btn');
          const dataExportDialog = document.getElementById('data-export-dialog');
          const dataExportCancel = document.getElementById('data-export-cancel');
          const dataExportConfirm = document.getElementById('data-export-confirm');
          const dataExportStatus = document.getElementById('data-export-status');
          const dataExportActions = document.getElementById('data-export-actions');

          // Get the token from the form
          const tokenInput = document.querySelector('input[name="token"]');
          const guestToken = tokenInput?.value;

          // Open dialog
          requestDataBtn?.addEventListener('click', () => {
            dataExportDialog.classList.add('visible');
            dataExportStatus.classList.add('hidden');
            dataExportActions.style.display = 'flex';
            dataExportConfirm.disabled = false;
            dataExportCancel.disabled = false;
          });

          // Close dialog
          dataExportCancel?.addEventListener('click', () => {
            dataExportDialog.classList.remove('visible');
          });

          // Close dialog on backdrop click
          dataExportDialog?.addEventListener('click', (e) => {
            if (e.target === dataExportDialog) {
              dataExportDialog.classList.remove('visible');
            }
          });

          // Handle data export request
          dataExportConfirm?.addEventListener('click', async () => {
            if (!guestToken) {
              dataExportStatus.textContent = 'Unable to process request. Please refresh the page.';
              dataExportStatus.className = 'data-export-status error';
              return;
            }

            dataExportConfirm.disabled = true;
            dataExportCancel.disabled = true;
            dataExportConfirm.textContent = 'Sending...';

            try {
              const response = await fetch(\\\`\\\${apiBaseUrl}/rsvp/data-export\\\`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: guestToken }),
              });

              const result = await response.json();

              if (result.ok) {
                dataExportActions.style.display = 'none';
                dataExportStatus.textContent = \\\`\\\${result.data.message} (\\\${result.data.sentTo})\\\`;
                dataExportStatus.className = 'data-export-status success';
              } else {
                dataExportStatus.textContent = 'Unable to send data export. Please try again later.';
                dataExportStatus.className = 'data-export-status error';
                dataExportConfirm.textContent = 'Send to my email';
                dataExportConfirm.disabled = false;
                dataExportCancel.disabled = false;
              }
            } catch (error) {
              console.error('Error requesting data export:', error);
              dataExportStatus.textContent = 'Network error. Please check your connection and try again.';
              dataExportStatus.className = 'data-export-status error';
              dataExportConfirm.textContent = 'Send to my email';
              dataExportConfirm.disabled = false;
              dataExportCancel.disabled = false;
            }
          });

          // Close dialog on Escape key
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dataExportDialog.classList.contains('visible')) {
              dataExportDialog.classList.remove('visible');
            }
          });
        });
      })();</script>`])), defineScriptVars({ apiBaseUrl: "http://localhost:3001/api" }))} </body> </html>`;
}, "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/pages/rsvp/index.astro", void 0);
const $$file = "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/pages/rsvp/index.astro";
const $$url = "/rsvp";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
