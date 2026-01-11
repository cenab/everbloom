import { c as createComponent, a as createAstro, d as defineStyleVars, b as addAttribute, e as renderHead, h as renderSlot, r as renderTemplate, g as defineScriptVars, m as maybeRenderHead } from './astro/server_6gLzEsed.mjs';
/* empty css                         */

const $$Astro$2 = createAstro();
const $$WeddingLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$WeddingLayout;
  const { config, language } = Astro2.props;
  const { wedding, theme } = config;
  const effectiveLanguage = language || config.language || "en";
  const title = `${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`;
  const description = `Join us to celebrate the wedding of ${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`;
  const siteUrl = "https://everbloom.wedding";
  const canonicalUrl = `${siteUrl}/w/${wedding.slug}`;
  const defaultOgImageUrl = `${siteUrl}/og-image-default.png`;
  const ogImageUrl = config.ogImageUrl || defaultOgImageUrl;
  const ogImageType = config.ogImageUrl ? config.ogImageUrl.includes(".jpg") || config.ogImageUrl.includes(".jpeg") ? "image/jpeg" : config.ogImageUrl.includes(".png") ? "image/png" : config.ogImageUrl.includes(".webp") ? "image/webp" : "image/png" : "image/png";
  const ogImageWidth = "1200";
  const ogImageHeight = "630";
  const $$definedVars = defineStyleVars([{
    primary: theme.primary,
    accent: theme.accent,
    neutralLight: theme.neutralLight,
    neutralDark: theme.neutralDark
  }]);
  return renderTemplate`<html${addAttribute(effectiveLanguage, "lang")} data-astro-cid-mxayhcme${addAttribute($$definedVars, "style")}> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="description"${addAttribute(description, "content")}><meta name="theme-color"${addAttribute(theme.primary, "content")}><title>${title}</title><!-- Open Graph meta tags for social sharing --><meta property="og:type" content="website"><meta property="og:title"${addAttribute(title, "content")}><meta property="og:description"${addAttribute(description, "content")}><meta property="og:url"${addAttribute(canonicalUrl, "content")}><meta property="og:image"${addAttribute(ogImageUrl, "content")}><meta property="og:image:width"${addAttribute(ogImageWidth, "content")}><meta property="og:image:height"${addAttribute(ogImageHeight, "content")}><meta property="og:image:type"${addAttribute(ogImageType, "content")}><meta property="og:image:alt"${addAttribute(`Wedding invitation for ${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`, "content")}><meta property="og:site_name" content="Everbloom"><meta property="og:locale"${addAttribute(effectiveLanguage === "en" ? "en_US" : effectiveLanguage, "content")}><!-- Twitter Card meta tags --><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title"${addAttribute(title, "content")}><meta name="twitter:description"${addAttribute(description, "content")}><meta name="twitter:image"${addAttribute(ogImageUrl, "content")}><meta name="twitter:image:alt"${addAttribute(`Wedding invitation for ${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`, "content")}><!-- Canonical URL --><link rel="canonical"${addAttribute(canonicalUrl, "href")}><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">${renderHead()}</head> <body data-astro-cid-mxayhcme${addAttribute($$definedVars, "style")}> <!-- Skip to main content link for keyboard navigation --> <a href="#main-content" class="skip-link" data-astro-cid-mxayhcme${addAttribute($$definedVars, "style")}>Skip to main content</a> <main id="main-content" tabindex="-1" data-astro-cid-mxayhcme${addAttribute($$definedVars, "style")}> ${renderSlot($$result, $$slots["default"])} </main> </body></html>`;
}, "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/components/WeddingLayout.astro", void 0);

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Astro$1 = createAstro();
const $$PasscodeGateWrapper = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$PasscodeGateWrapper;
  const { config } = Astro2.props;
  const isProtected = config.features.PASSCODE_SITE && config.passcodeProtected;
  const theme = config.theme;
  const partnerNames = config.wedding.partnerNames;
  const slug = config.wedding.slug;
  return renderTemplate`${isProtected ? renderTemplate(_a || (_a = __template(["", '<div id="passcode-gate-wrapper"', '><!-- Passcode Form (shown initially) --><div id="passcode-form-container"', '><div style="max-width: 400px; width: 100%; text-align: center;"><!-- Lock icon --><div', '><svg width="32" height="32" fill="none" viewBox="0 0 24 24"', ' stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"></path></svg></div><h1', ">", " & ", "</h1><p", '>\nThis wedding site is private\n</p><form id="passcode-form" aria-label="Site access form"><div style="margin-bottom: 1rem;"><label for="passcode-input" class="visually-hidden">Site passcode</label><input type="password" id="passcode-input" placeholder="Enter passcode" autofocus aria-describedby="passcode-hint" autocomplete="off"', '></div><p id="passcode-error" role="alert" aria-live="assertive"', '></p><button type="submit" id="passcode-submit"', '>\nEnter\n</button></form><p id="passcode-hint"', '>\nPlease enter the passcode you received from the couple\n</p><style>\n          .visually-hidden {\n            position: absolute;\n            width: 1px;\n            height: 1px;\n            padding: 0;\n            margin: -1px;\n            overflow: hidden;\n            clip: rect(0, 0, 0, 0);\n            white-space: nowrap;\n            border: 0;\n          }\n\n          #passcode-input:focus {\n            outline: 2px solid var(--primary, ${theme.primary});\n            outline-offset: 2px;\n          }\n\n          #passcode-submit:focus-visible {\n            outline: 2px solid ${theme.neutralDark};\n            outline-offset: 2px;\n          }\n        </style></div></div><!-- Protected Content (hidden initially) --><div id="protected-content" style="display: none;">', "</div></div>\n\n  <script>(function(){", "\n    document.addEventListener('DOMContentLoaded', () => {\n      const wrapper = document.getElementById('passcode-gate-wrapper');\n      const formContainer = document.getElementById('passcode-form-container');\n      const protectedContent = document.getElementById('protected-content');\n      const form = document.getElementById('passcode-form');\n      const input = document.getElementById('passcode-input');\n      const errorEl = document.getElementById('passcode-error');\n      const submitBtn = document.getElementById('passcode-submit');\n\n      if (!wrapper || !formContainer || !protectedContent || !form || !input) {\n        return;\n      }\n\n      const slug = wrapper.dataset.slug;\n      const storageKey = `everbloom_passcode_${slug}`;\n\n      const showContent = () => {\n        formContainer.style.display = 'none';\n        protectedContent.style.display = 'block';\n      };\n\n      const showError = (message) => {\n        errorEl.textContent = message;\n        errorEl.style.display = 'block';\n        input.style.borderColor = '#b91c1c';\n        input.setAttribute('aria-invalid', 'true');\n      };\n\n      const clearError = () => {\n        errorEl.style.display = 'none';\n        input.style.borderColor = '';\n        input.removeAttribute('aria-invalid');\n      };\n\n      // Check for existing session\n      try {\n        const storedToken = localStorage.getItem(storageKey);\n        if (storedToken) {\n          showContent();\n          return;\n        }\n      } catch (e) {\n        // localStorage not available\n      }\n\n      input.addEventListener('input', clearError);\n\n      form.addEventListener('submit', async (e) => {\n        e.preventDefault();\n\n        const passcode = input.value.trim();\n        if (!passcode) {\n          showError('Please enter the passcode');\n          return;\n        }\n\n        submitBtn.disabled = true;\n        submitBtn.textContent = 'Verifying...';\n        submitBtn.style.opacity = '0.7';\n        clearError();\n\n        try {\n          const response = await fetch(`${apiBaseUrl}/site-config/${slug}/verify-passcode`, {\n            method: 'POST',\n            headers: {\n              'Content-Type': 'application/json',\n            },\n            body: JSON.stringify({ passcode }),\n          });\n\n          const data = await response.json();\n\n          if (data.ok && data.data.valid) {\n            // Store session token\n            if (data.data.sessionToken) {\n              try {\n                localStorage.setItem(storageKey, data.data.sessionToken);\n              } catch (e) {\n                // localStorage not available\n              }\n            }\n            showContent();\n          } else {\n            showError('Incorrect passcode. Please try again.');\n            input.value = '';\n            input.focus();\n          }\n        } catch (err) {\n          showError('Unable to verify passcode. Please try again.');\n        } finally {\n          submitBtn.disabled = false;\n          submitBtn.textContent = 'Enter';\n          submitBtn.style.opacity = '1';\n        }\n      });\n    });\n  })();</script>"], ["", '<div id="passcode-gate-wrapper"', '><!-- Passcode Form (shown initially) --><div id="passcode-form-container"', '><div style="max-width: 400px; width: 100%; text-align: center;"><!-- Lock icon --><div', '><svg width="32" height="32" fill="none" viewBox="0 0 24 24"', ' stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"></path></svg></div><h1', ">", " & ", "</h1><p", '>\nThis wedding site is private\n</p><form id="passcode-form" aria-label="Site access form"><div style="margin-bottom: 1rem;"><label for="passcode-input" class="visually-hidden">Site passcode</label><input type="password" id="passcode-input" placeholder="Enter passcode" autofocus aria-describedby="passcode-hint" autocomplete="off"', '></div><p id="passcode-error" role="alert" aria-live="assertive"', '></p><button type="submit" id="passcode-submit"', '>\nEnter\n</button></form><p id="passcode-hint"', '>\nPlease enter the passcode you received from the couple\n</p><style>\n          .visually-hidden {\n            position: absolute;\n            width: 1px;\n            height: 1px;\n            padding: 0;\n            margin: -1px;\n            overflow: hidden;\n            clip: rect(0, 0, 0, 0);\n            white-space: nowrap;\n            border: 0;\n          }\n\n          #passcode-input:focus {\n            outline: 2px solid var(--primary, \\${theme.primary});\n            outline-offset: 2px;\n          }\n\n          #passcode-submit:focus-visible {\n            outline: 2px solid \\${theme.neutralDark};\n            outline-offset: 2px;\n          }\n        </style></div></div><!-- Protected Content (hidden initially) --><div id="protected-content" style="display: none;">', "</div></div>\n\n  <script>(function(){", "\n    document.addEventListener('DOMContentLoaded', () => {\n      const wrapper = document.getElementById('passcode-gate-wrapper');\n      const formContainer = document.getElementById('passcode-form-container');\n      const protectedContent = document.getElementById('protected-content');\n      const form = document.getElementById('passcode-form');\n      const input = document.getElementById('passcode-input');\n      const errorEl = document.getElementById('passcode-error');\n      const submitBtn = document.getElementById('passcode-submit');\n\n      if (!wrapper || !formContainer || !protectedContent || !form || !input) {\n        return;\n      }\n\n      const slug = wrapper.dataset.slug;\n      const storageKey = \\`everbloom_passcode_\\${slug}\\`;\n\n      const showContent = () => {\n        formContainer.style.display = 'none';\n        protectedContent.style.display = 'block';\n      };\n\n      const showError = (message) => {\n        errorEl.textContent = message;\n        errorEl.style.display = 'block';\n        input.style.borderColor = '#b91c1c';\n        input.setAttribute('aria-invalid', 'true');\n      };\n\n      const clearError = () => {\n        errorEl.style.display = 'none';\n        input.style.borderColor = '';\n        input.removeAttribute('aria-invalid');\n      };\n\n      // Check for existing session\n      try {\n        const storedToken = localStorage.getItem(storageKey);\n        if (storedToken) {\n          showContent();\n          return;\n        }\n      } catch (e) {\n        // localStorage not available\n      }\n\n      input.addEventListener('input', clearError);\n\n      form.addEventListener('submit', async (e) => {\n        e.preventDefault();\n\n        const passcode = input.value.trim();\n        if (!passcode) {\n          showError('Please enter the passcode');\n          return;\n        }\n\n        submitBtn.disabled = true;\n        submitBtn.textContent = 'Verifying...';\n        submitBtn.style.opacity = '0.7';\n        clearError();\n\n        try {\n          const response = await fetch(\\`\\${apiBaseUrl}/site-config/\\${slug}/verify-passcode\\`, {\n            method: 'POST',\n            headers: {\n              'Content-Type': 'application/json',\n            },\n            body: JSON.stringify({ passcode }),\n          });\n\n          const data = await response.json();\n\n          if (data.ok && data.data.valid) {\n            // Store session token\n            if (data.data.sessionToken) {\n              try {\n                localStorage.setItem(storageKey, data.data.sessionToken);\n              } catch (e) {\n                // localStorage not available\n              }\n            }\n            showContent();\n          } else {\n            showError('Incorrect passcode. Please try again.');\n            input.value = '';\n            input.focus();\n          }\n        } catch (err) {\n          showError('Unable to verify passcode. Please try again.');\n        } finally {\n          submitBtn.disabled = false;\n          submitBtn.textContent = 'Enter';\n          submitBtn.style.opacity = '1';\n        }\n      });\n    });\n  })();</script>"])), maybeRenderHead(), addAttribute(slug, "data-slug"), addAttribute(`
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: ${theme.neutralLight};
        padding: 2rem;
      `, "style"), addAttribute(`
            width: 4rem;
            height: 4rem;
            margin: 0 auto 1.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background-color: ${theme.primary}20;
          `, "style"), addAttribute(theme.primary, "stroke"), addAttribute(`
            font-family: 'Cormorant Garamond', 'Georgia', serif;
            font-size: 1.75rem;
            font-weight: 400;
            color: ${theme.neutralDark};
            margin: 0 0 0.5rem 0;
          `, "style"), partnerNames[0], partnerNames[1], addAttribute(`
            font-family: 'Inter', 'Helvetica Neue', sans-serif;
            font-size: 1rem;
            color: ${theme.neutralDark};
            opacity: 0.7;
            margin: 0 0 2rem 0;
          `, "style"), addAttribute(`
                width: 100%;
                padding: 1rem 1.25rem;
                font-size: 1rem;
                font-family: 'Inter', 'Helvetica Neue', sans-serif;
                border: 1px solid ${theme.neutralDark}30;
                border-radius: 0.5rem;
                background-color: ${theme.neutralLight};
                color: ${theme.neutralDark};
                outline: none;
                box-sizing: border-box;
                text-align: center;
                letter-spacing: 0.1em;
              `, "style"), addAttribute(`
              font-family: 'Inter', 'Helvetica Neue', sans-serif;
              font-size: 0.875rem;
              color: #dc2626;
              margin: 0 0 1rem 0;
              display: none;
            `, "style"), addAttribute(`
              width: 100%;
              padding: 1rem 2rem;
              font-size: 1rem;
              font-family: 'Inter', 'Helvetica Neue', sans-serif;
              font-weight: 500;
              color: ${theme.neutralLight};
              background-color: ${theme.primary};
              border: none;
              border-radius: 0.5rem;
              cursor: pointer;
              transition: opacity 0.2s ease;
            `, "style"), addAttribute(`
            font-family: 'Inter', 'Helvetica Neue', sans-serif;
            font-size: 0.75rem;
            color: ${theme.neutralDark};
            opacity: 0.5;
            margin: 2rem 0 0 0;
          `, "style"), renderSlot($$result, $$slots["default"]), defineScriptVars({ apiBaseUrl: "http://localhost:3001/api" })) : renderTemplate`${renderSlot($$result, $$slots["default"])}`}`;
}, "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/components/PasscodeGateWrapper.astro", void 0);

const $$Astro = createAstro();
const $$ErrorPage = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$ErrorPage;
  const { type = "unavailable", title, message } = Astro2.props;
  const defaults = {
    "not-found": {
      title: "We couldn't find this page",
      message: "The wedding page you're looking for doesn't seem to exist. Please double-check the link you received or contact the couple directly."
    },
    "unavailable": {
      title: "This page isn't available right now",
      message: "We're having a little trouble loading this wedding page. Please try again in a few moments, or reach out to the couple if you need assistance."
    },
    "error": {
      title: "Something went wrong",
      message: "We ran into an unexpected issue. Please try refreshing the page, or contact the couple if the problem continues."
    }
  };
  const displayTitle = title || defaults[type].title;
  const displayMessage = message || defaults[type].message;
  const theme = {
    primary: "#c9826b",
    // terracotta
    neutralLight: "#faf8f5",
    // warm off-white
    neutralDark: "#2d2d2d"
    // soft black
  };
  const $$definedVars = defineStyleVars([{
    primary: theme.primary,
    neutralLight: theme.neutralLight,
    neutralDark: theme.neutralDark
  }]);
  return renderTemplate`<html lang="en" data-astro-cid-5spizo76${addAttribute($$definedVars, "style")}> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="robots" content="noindex"><title>${displayTitle}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">${renderHead()}</head> <body data-astro-cid-5spizo76${addAttribute($$definedVars, "style")}> <div class="error-container" data-astro-cid-5spizo76${addAttribute($$definedVars, "style")}> <!-- Heart icon with subtle styling --> <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-5spizo76${addAttribute($$definedVars, "style")}> <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" data-astro-cid-5spizo76${addAttribute($$definedVars, "style")}></path> </svg> <h1 class="error-title" data-astro-cid-5spizo76${addAttribute($$definedVars, "style")}>${displayTitle}</h1> <p class="error-message" data-astro-cid-5spizo76${addAttribute($$definedVars, "style")}>${displayMessage}</p> <div class="error-actions" data-astro-cid-5spizo76${addAttribute($$definedVars, "style")}> <button class="try-again-button" onclick="window.location.reload()" data-astro-cid-5spizo76${addAttribute($$definedVars, "style")}>
Try again
</button> <span class="help-text" data-astro-cid-5spizo76${addAttribute($$definedVars, "style")}>If the problem persists, please contact the couple</span> </div> </div> </body></html>`;
}, "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/components/ErrorPage.astro", void 0);

export { $$ErrorPage as $, $$PasscodeGateWrapper as a, $$WeddingLayout as b };
