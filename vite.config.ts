import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import removeLeadingSlash from "./src/plugins/removeLeadingSlash";

export default defineConfig({
  base: './',
  plugins: [
    removeLeadingSlash(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Life Game',
        short_name: 'LifeGame',
        description: 'Conway\'s Game of Life implementation',
        display: 'fullscreen',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          },
          {
            src: 'icons.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      }
    })
  ],
});
