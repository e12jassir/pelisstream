import { defineConfig, type Plugin } from 'vite';
import legacy from '@vitejs/plugin-legacy';

/**
 * webOS 3-6 and Tizen TV load packaged apps from `file:///`. Chromium treats a
 * `file://` document as an opaque origin, so the `crossorigin` attribute Vite
 * adds to generated `<script>`/`<link>` tags makes those classic resources
 * fail a CORS fetch and the TV shows a blank screen. Same-origin attributes
 * are redundant anyway: removing them only relaxes the fetch mode.
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
    stripCrossOriginForTv(),
  ],
});
