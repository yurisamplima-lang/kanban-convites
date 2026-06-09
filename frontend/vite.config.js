import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy para o backend durante desenvolvimento
      '/leads': 'http://localhost:3001',
      '/messages': 'http://localhost:3001',
      '/webhook': 'http://localhost:3001',
    }
  }
});
