import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  // Relative base is mandatory for webOS/Tizen packages served from file://.
  base: './',
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
    target: 'es2015',
    cssTarget: 'chrome61',
    minify: 'terser',
    sourcemap: false,
    terserOptions: {
      compress: {
        drop_console: false,
        passes: 2,
      },
    },
  },
  plugins: [
    legacy({
      targets: ['chrome >= 69', 'safari >= 11'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderLegacyChunks: true,
      modernPolyfills: false,
    }),
  ],
});
