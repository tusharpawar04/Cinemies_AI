import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('three')) return 'three-core'
          if (id.includes('@react-three')) return 'r3f'
          if (id.includes('postprocessing')) return 'postprocessing'
          if (id.includes('gsap')) return 'gsap'
          if (id.includes('framer-motion')) return 'motion'
        }
      }
    }
  }
})
