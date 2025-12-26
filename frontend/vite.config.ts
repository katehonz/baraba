import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // needed for docker
    port: 5173,
    proxy: {
        '/api': {
            target: 'http://baraba_phoenix:4000',
            changeOrigin: true,
            secure: false
        },
        '/vat-api': {
            target: 'http://vat_service:5004',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/vat-api/, '/api')
        }
    }
  }
})
