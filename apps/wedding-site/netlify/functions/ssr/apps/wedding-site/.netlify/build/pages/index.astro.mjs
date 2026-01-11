import { c as createComponent, e as renderHead, r as renderTemplate } from '../chunks/astro/server_6gLzEsed.mjs';
export { renderers } from '../renderers.mjs';

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<html lang="en"> <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Wedding Site</title>${renderHead()}</head> <body> <main> <h1>Wedding Site</h1> <p>Navigate to /w/[slug] to view a specific wedding.</p> </main> </body></html>`;
}, "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/pages/index.astro", void 0);

const $$file = "/Users/batu/Documents/DEVELOPMENT/wedding-bestie/apps/wedding-site/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
