// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://agentdoor.ai',
  // One address per page. Search Console had /geniuz and /geniuz/ as two pages (5 Sep 2026);
  // every link, canonical and sitemap entry now ends in a slash, and netlify.toml redirects the
  // bare form.
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [react(), sitemap({
    filenameBase: 'sitemap',
    // The agent-built rooms are static files in public/, so Astro's sitemap does not discover
    // them; list them so search can.
    customPages: [
      'https://agentdoor.ai/arcade/',
      'https://agentdoor.ai/alpenglow/',
      'https://agentdoor.ai/aurora/',
      'https://agentdoor.ai/fluid/',
      'https://agentdoor.ai/gravity/',
      'https://agentdoor.ai/hyperlap/',
      'https://agentdoor.ai/murmur/',
      'https://agentdoor.ai/particle-life/',
      'https://agentdoor.ai/self-portrait/',
    ],
  })]
});
