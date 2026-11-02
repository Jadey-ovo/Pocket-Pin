import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { ocrAssets } from './build/ocr-assets'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/Pocket-Pin/' : '/',
  plugins: [vue(),ocrAssets()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
