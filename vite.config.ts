import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use '/' for Vercel/web, './' for mobile apps
  // Vercel sets process.env.VERCEL to '1' during build
  base: process.env.VERCEL ? '/' : './',
  // Pass environment variables to the app
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env.VERCEL': JSON.stringify(process.env.VERCEL || '')
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Suppress the chunk size warning
    chunkSizeWarningLimit: 1000
  }
});