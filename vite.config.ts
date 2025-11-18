import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // CRITICAL: This ensures assets load correctly when running as a mobile app (file:// protocol)
  base: './',
  // Defines process.env as an empty object so 'process.env.API_KEY' doesn't crash the app in the browser
  define: {
    'process.env': {}
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});