import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/replicate': {
        target: 'https://api.replicate.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/replicate/, ''),
        secure: true
      },
      '/api/download': {
        target: 'https://replicate.delivery',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/download/, ''),
        secure: true
      }
    }
  }
})
