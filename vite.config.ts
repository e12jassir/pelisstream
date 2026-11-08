import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

/**
 * webOS and Tizen TV load packaged apps from `file:///`. Removing `crossorigin`
 * prevents opaque-origin CORS failures when packaged for Smart TVs.
 */
const stripCrossOriginForTv = (): Plugin => ({
  name: 'pelisstream:strip-crossorigin',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler: (html) => html.replace(/\s+crossorigin(?:="[^"]*")?/g, ''),
  },
});

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    stripCrossOriginForTv(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-motion': ['motion'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
});
