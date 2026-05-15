import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/** 터미널에서 실제 접속 주소를 한눈에 보이게 */
function printGiftBalanceUrl() {
  return {
    name: 'gift-balance-print-url',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const addr = server.httpServer?.address()
        const port = typeof addr === 'object' && addr && 'port' in addr ? addr.port : server.config.server.port
        const host = '127.0.0.1'
        server.config.logger.info(
          `\n\x1b[35m\x1b[1m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n` +
            `\x1b[35m\x1b[1m  잔액 얼마 (gift_balance) 접속 주소:\x1b[0m\n` +
            `\x1b[36m\x1b[1m  http://${host}:${port}/\x1b[0m\n` +
            `\x1b[35m\x1b[1m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n`,
        )
      })
    },
  }
}

export default defineConfig({
  server: {
    // flower(5173) 등과 겹치지 않게 비교적 한가한 포트
    host: '127.0.0.1',
    port: 5200,
    strictPort: false,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    printGiftBalanceUrl(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['wallet-app-icon.svg', 'pwa-192.png', 'pwa-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: '잔액 얼마',
        short_name: '잔액 얼마',
        description: '쿠폰 잔액을 한눈에 확인하세요',
        theme_color: '#6F3BE8',
        background_color: '#FDFDFE',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
})
