import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/weight-estimation/' : '/',
  server: {
    port: 5176,
    strictPort: false, // Allow Vite to use alternative ports if 5176 is busy
    proxy: {
      '/api/replicate': {
        target: 'https://api.replicate.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/replicate/, ''),
        secure: true,
        ws: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Replicate proxy error:', err.message);
          });
        },
      },
      '/api/download': {
        target: 'https://replicate.delivery',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/download/, ''),
        secure: true,
        ws: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Download proxy error:', err.message);
          });
        },
      }
    }
  }
})
