import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://api-gateway:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://api-gateway:8000',
        ws: true,
      },
    },
  },
  preview: {
    port: 8000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
