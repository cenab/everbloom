import { renderers } from './renderers.mjs';
import { s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_CvSoi7hX.mjs';
import { manifest } from './manifest_WR8cROJF.mjs';
import { createExports } from '@astrojs/netlify/ssr-function.js';

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/rsvp.astro.mjs');
const _page2 = () => import('./pages/w/_slug_/music.astro.mjs');
const _page3 = () => import('./pages/w/_slug_/photos.astro.mjs');
const _page4 = () => import('./pages/w/_slug_.astro.mjs');
const _page5 = () => import('./pages/index.astro.mjs');

const pageMap = new Map([
    ["../../node_modules/.pnpm/astro@4.16.19_@types+node@20.19.27_rollup@4.55.1_terser@5.44.1_typescript@5.9.3/node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/rsvp/index.astro", _page1],
    ["src/pages/w/[slug]/music.astro", _page2],
    ["src/pages/w/[slug]/photos.astro", _page3],
    ["src/pages/w/[slug]/index.astro", _page4],
    ["src/pages/index.astro", _page5]
]);
const serverIslandMap = new Map();
const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "bb3906db-8774-4e6d-9fd4-4db02c6edfde"
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (_start in serverEntrypointModule) {
	serverEntrypointModule[_start](_manifest, _args);
}

export { __astrojsSsrVirtualEntry as default, pageMap };
