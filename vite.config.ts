import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      // Proxy to the local zillit-catering-api backend during dev.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // Socket.io transport — the actual HTTP + WebSocket upgrade goes
      // through /socket.io/ even when the namespace is /ws/<module>.
      '/socket.io': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        ws: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
