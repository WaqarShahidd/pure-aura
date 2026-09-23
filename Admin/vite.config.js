import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 5174, not 5173: the storefront already owns that port and running both at once is the
// normal case while developing.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, strictPort: true },
})
