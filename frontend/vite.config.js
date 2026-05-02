import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT) || 3000,
    proxy: process.env.VITE_API_URL ? undefined : {
      '/api': { target: 'http://backend:8000', changeOrigin: true }
    }
  }
})
