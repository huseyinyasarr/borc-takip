import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages için base path (production build'de kullanılacak)
  base: process.env.NODE_ENV === 'production' ? '/borc-takip/' : '/',
})

