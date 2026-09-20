import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // three.js and Leaflet are large and only needed by specific views.
        // Splitting them keeps the landing entry chunk small and lets the
        // hero type paint before WebGL is parsed.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('three') || id.includes('@react-three')) return 'three'
          if (id.includes('leaflet')) return 'leaflet'
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils'))
            return 'motion'
        },
      },
    },
    // The three chunk is legitimately large; warn later than the default.
    chunkSizeWarningLimit: 900,
  },
})
