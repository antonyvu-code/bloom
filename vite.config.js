import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  server: { port: 5625 },
  preview: { port: 5625 },
  build: {
    rollupOptions: {
      // Multi-page: without this, only index.html ships and the case study is
      // dropped from the production build (it still works in dev).
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        caseStudy: resolve(import.meta.dirname, 'case-study.html'),
      },
    },
  },
});
