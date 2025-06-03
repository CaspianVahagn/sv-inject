import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'svInject',
      fileName: 'index',
      formats:  ["es"],
    },
    rollupOptions: {
      external: ['vite', 'node:async_hooks'],
      output: {
        globals: {
          vite: 'vite'
        }
      }
    }
  }
});