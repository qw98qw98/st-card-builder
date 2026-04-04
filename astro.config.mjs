
import { defineConfig } from 'astro/config';


export default defineConfig({
  compressHTML: true,
  scopedStyleStrategy: 'class',
  vite: {
    build: {
      cssMinify: true,
    },
  },
});
