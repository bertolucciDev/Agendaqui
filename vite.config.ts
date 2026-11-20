import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')

  return {
    base: '/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/agendaqui-api': {
          target: env.VITE_API_PROXY_TARGET ?? 'https://agendaqui-api.onrender.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/agendaqui-api/, ''),
          secure: true,
          timeout: 120_000,
          keepalive: true,
          ws: true,
        },
      },
    },
  }
})
