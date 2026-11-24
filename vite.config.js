import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',   // served from https://sl.elimssmile.dev/
  // the lazy-loaded 3D keycard preview chunk (three.js) is ~150 kB gzipped
  build: { chunkSizeWarningLimit: 700 },
})