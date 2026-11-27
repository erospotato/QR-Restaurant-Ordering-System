import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, forward API + uploaded images to `php artisan serve`, and listen on LAN for mobile QR scanning
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8000', '/storage': 'http://127.0.0.1:8000' },
  },
})
