import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@3minutes/contracts': resolve(__dirname, '../packages/contracts/src/index.ts'),
      '@3minutes/design-tokens': resolve(__dirname, '../packages/design-tokens/src/index.ts'),
    },
  },
  server: {
    port: 5174,
    https: {},
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          three: ['three'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
}));
