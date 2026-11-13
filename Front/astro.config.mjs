// @ts-check
import { defineConfig } from 'astro/config';

const buildEnv = /** @type {typeof globalThis & { process?: { env?: Record<string, string | undefined> } }} */ (globalThis).process?.env ?? {};
const buildVersion = buildEnv.CF_PAGES_COMMIT_SHA || buildEnv.GITHUB_SHA || `local-${Date.now()}`;

// https://astro.build/config
export default defineConfig({
  // Canonical production origin used by canonical URLs, robots.txt, and the sitemap.
  site: 'https://corporacionantonyrodriguez.com',
  vite: {
    define: {
      __BUILD_VERSION__: JSON.stringify(buildVersion),
    },
  },
});
