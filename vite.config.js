import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/solr': {
        target: 'https://search.d3.hockey',
        changeOrigin: true,
        secure: true,
      },
      '/nhl-api': {
        target: 'https://api-web.nhle.com',
        changeOrigin: true,
        secure: true,
        followRedirects: true,
        rewrite: (path) => path.replace(/^\/nhl-api/, ''),
      },
    }
  }
})
