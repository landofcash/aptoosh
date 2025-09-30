import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      __APP_VERSION__: JSON.stringify(pkg.version),
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
  plugins: [
    react(),
    nodePolyfills()
  ],
})
