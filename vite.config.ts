import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/agendaqui-api': {
        target: 'https://agendaqui-api.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/agendaqui-api/, ''),
        secure: true,
      },
    },
  },
})
