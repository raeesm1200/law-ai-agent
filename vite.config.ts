import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
      'all', // Allow all hosts for Render deployment
      'law-ai-agent-1.onrender.com',
      'legal-rag-chatbot-frontend.onrender.com'
    ],
  },
})
