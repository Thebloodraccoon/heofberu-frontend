import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
  '@tests': fileURLToPath(new URL('./tests', import.meta.url)),
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias },
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true,
      interval: 500,
      binaryInterval: 1000,
    },
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Vite 8 (rolldown) поддерживает manualChunks только функцией.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@tanstack/react-query')) return 'query'
            if (id.includes('react') || id.includes('scheduler')) return 'vendor'
          }
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.js',
    css: false,
    resolve: { alias },
    include: ['tests/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'src/lib/utils/**/*.{js,jsx}',
        'src/lib/api/httpClient.js',
        'src/lib/i18n/**/*.{js,jsx}',
        'src/components/ui/**/*.{js,jsx}',
        'src/components/sheet/**/*.{js,jsx}',
        'src/features/auth/ProtectedRoute.jsx',
        'src/features/characters/components/wizard/**/*.{js,jsx}',
      ],
      exclude: [
        'src/main.jsx',
        'src/**/*.{test,spec}.{js,jsx}',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
})
