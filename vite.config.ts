import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',   // ✅ Add this line
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3000,
    host: true,
    allowedHosts: [
      'all',
      'law-ai-agent-1.onrender.com',
      'legal-rag-chatbot-frontend.onrender.com'
    ],
  },
})
