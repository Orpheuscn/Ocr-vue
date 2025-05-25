import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'OCR文本识别工具',
        short_name: 'OCR工具',
        description: 'OCR文本识别应用',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        clientsClaim: true,
        skipWaiting: true,
      },
      strategies: 'generateSW',
      filename: 'sw.js',
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0', // 使所有网络接口可访问，对Docker环境很重要
    port: 8082,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
        xfwd: true,
        cookieDomainRewrite: 'localhost',
        cookiePathRewrite: '/',
      },
      '/api/python': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        ws: true,
        xfwd: true,
        cookieDomainRewrite: 'localhost',
        cookiePathRewrite: '/',
        rewrite: (path) => path.replace(/^\/api\/python/, ''),
      },
    },
    hmr: {
      overlay: true,
      clientPort: 8082,
    },
  },
  preview: {
    host: '0.0.0.0', // 同样使所有网络接口可访问
    port: 8080,
    strictPort: true,
  },
})
