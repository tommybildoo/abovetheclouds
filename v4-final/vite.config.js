import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          maplibre: ['maplibre-gl'],
        },
      },
    },
  },
  server: {
    proxy: {
      // In local dev, `wrangler pages dev` serves /api on its own port —
      // point Vite's dev server at it so `fetch('/api/...')` works from
      // `npm run dev` too. Adjust the port if you changed it.
      '/api': 'http://127.0.0.1:8788',
    },
  },
});
