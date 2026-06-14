// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://agentdoor.ai',
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [react(), sitemap({
    filenameBase: 'sitemap',
    // The agent-built game rooms are static files in public/, so Astro's
    // sitemap doesn't discover them automatically. List them so Google can.
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