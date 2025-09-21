import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {VitePWA} from 'vite-plugin-pwa'
import path from 'path'
import tailwindcss from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";
import {visualizer} from "rollup-plugin-visualizer";

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  define: {
    global: 'window',
  },
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@aptos-labs/ts-sdk")) return "aptos";
            if (id.includes("@zxing")) return "zxing";
            if (id.includes("@walletconnect")) return "walletconnect";
            if (id.includes("@noble")) return "noble";
            if (id.includes("poseidon")) return "poseidon";
            if (id.includes("react")) return "react";
            if (id.includes("eciesjs") || id.includes("elliptic")) return "crypto";
            return "vendor";
          }
        },
      },
    },
  },
  plugins: [
    react(),
    visualizer({filename: "stats.html"}),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Aptoosh — Scan, Shop, Pay in a Flash',
        short_name: 'Aptoosh',
        description: 'Shop with QR codes and pay instantly with crypto or card. Powered by Aptoosh.',
        theme_color: '#000000',
        background_color: '#ffffff',
        icons: [
          {
            src: '/logo-t-g-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo-t-g-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Add runtime caching for better performance
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      }
    })
  ],
})
