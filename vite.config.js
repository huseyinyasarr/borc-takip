import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages için base path (production build'de kullanılacak)
  base: process.env.NODE_ENV === 'production' ? '/borc-takip/' : '/',
  resolve: {
    // Firebase paket çözümleme sorununu önlemek için
    alias: {
      // Firebase'in package.json exports sorununu çözmek için
    },
  },
  optimizeDeps: {
    // Firebase için optimize ayarları
    include: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
    esbuildOptions: {
      // Firebase için esbuild ayarları
      target: 'es2020',
    },
  },
  build: {
    // Chunk size uyarısı için limit artırıldı
    chunkSizeWarningLimit: 1000,
    commonjsOptions: {
      // Firebase için CommonJS çözümleme ayarları
      transformMixedEsModules: true,
      defaultIsModuleInterop: true,
    },
    rollupOptions: {
      output: {
        // Vendor chunk'ları ayır (daha iyi caching için)
        // Firebase'i manuel chunk'tan çıkarıyoruz (paket çözümleme sorununu önlemek için)
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor'
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'pdf-vendor'
            }
            // Firebase ve diğer paketler default chunk'ta kalacak
          }
        },
      },
    },
  },
})

