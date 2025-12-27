import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const rawBase = process.env.BASE_PATH || env.BASE_PATH || '/';
    const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
    return {
      base,
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          injectRegister: 'auto',
          includeAssets: ['icon.svg', 'maskable.svg'],
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,mp3}'],
            maximumFileSizeToCacheInBytes: 10 * 1024 * 1024
          },
          manifest: {
            name: 'Sacred Forest Sound Healing App',
            short_name: 'Sacred Forest',
            description: 'A looping soundboard for sound healers featuring gapless looping, smooth crossfading, and multi-track synthesis.',
            start_url: '.',
            scope: '.',
            theme_color: '#1d5231',
            background_color: '#fafaf9',
            display: 'standalone',
            icons: [
              {
                src: 'icon.svg',
                sizes: 'any',
                type: 'image/svg+xml'
              },
              {
                src: 'maskable.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'maskable'
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
