import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, forward API + uploaded images to `php artisan serve`
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://127.0.0.1:8000', '/storage': 'http://127.0.0.1:8000' } },
})
