import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages için base path (production build'de kullanılacak)
  base: process.env.NODE_ENV === 'production' ? '/borc-takip/' : '/',
  build: {
    // Chunk size uyarısı için limit artırıldı
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Vendor chunk'ları ayır (daha iyi caching için)
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase'],
          'pdf-vendor': ['jspdf', 'html2canvas'],
        },
      },
    },
  },
})

