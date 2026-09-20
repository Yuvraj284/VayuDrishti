import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Leaflet is only needed by Monitor and framer-motion by every page
        // but the hero; splitting them keeps the landing entry chunk small.
        // The storm renderer is plain WebGL and adds no vendor weight.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('leaflet')) return 'leaflet'
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils'))
            return 'motion'
        },
      },
    },
  },
})
