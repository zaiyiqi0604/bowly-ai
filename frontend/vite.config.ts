import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@mediapipe/pose': fileURLToPath(
        new URL('./src/shims/mediapipe-pose.ts', import.meta.url),
      ),
    },
  },
})
