import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
    // Increase warning threshold slightly for TF-heavy recharts bundle
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split vendor chunks for better caching
        manualChunks: {
          react:    ['react', 'react-dom', 'react-router-dom'],
          charts:   ['recharts'],
          ui:       ['lucide-react', 'react-hot-toast'],
          zustand:  ['zustand'],
          axios:    ['axios'],
        },
      },
    },
  },

  server: {
    // Dev server proxies to local FastAPI backend
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
