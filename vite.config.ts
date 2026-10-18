/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };
import splashScreens from './scripts/splash-screens.json' with { type: 'json' };

// For GitHub Pages set BASE_PATH=/<repo-name>/ at build time.
const base = process.env.BASE_PATH ?? '/';

/**
 * iOS ignores the manifest for its launch screen and needs one image per screen size and
 * orientation (rendered by `npm run icons`). On iOS device-width/height stay the portrait
 * values in both orientations.
 */
function appleSplashScreens(): Plugin {
  return {
    name: 'apple-splash-screens',
    transformIndexHtml: () =>
      splashScreens.flatMap(({ width, height, ratio }) =>
        (['portrait', 'landscape'] as const).map((orientation) => {
          const [w, h] = orientation === 'portrait' ? [width, height] : [height, width];
          return {
            tag: 'link',
            attrs: {
              rel: 'apple-touch-startup-image',
              href: `splash/${w * ratio}x${h * ratio}.png`,
              media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: ${orientation})`,
            },
            injectTo: 'head' as const,
          };
        }),
      ),
  };
}

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    svelte(),
    appleSplashScreens(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      // globPatterns below already precaches the icons; the plugin adds the manifest itself.
      includeManifestIcons: false,
      manifest: {
        id: base,
        name: 'Push-Up Progress',
        short_name: 'Push-Ups',
        description: 'Adaptive push-up training cycles that grow your max.',
        lang: 'en',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        background_color: '#0b0b0c',
        theme_color: '#0b0b0c',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // iOS picks one launch screen when the app is added to the Home Screen; don't make
        // every install download all of them.
        globIgnores: ['splash/**'],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
