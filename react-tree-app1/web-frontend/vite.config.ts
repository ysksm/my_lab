import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 開発サーバーの設定
    port: 3001, // フロントエンドのポート番号
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // バックエンドAPIのURL
        changeOrigin: true,
      }
    }
  },
})
