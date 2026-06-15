import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@tensorflow') || id.includes('pose-detection')) {
            return 'pose-engine'
          }
          if (id.includes('node_modules/vue') || id.includes('node_modules/pinia')) {
            return 'vue-core'
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@mediapipe/pose': fileURLToPath(
        new URL('./src/shims/mediapipe-pose.ts', import.meta.url),
      ),
    },
  },
})
