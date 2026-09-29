import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@evergreen-learn': path.resolve(
        __dirname,
        '../caremate-admin-portal/data/learn.json',
      ),
      '@caremate/learn-content': path.resolve(
        __dirname,
        '../packages/learn-content/src/index.ts',
      ),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5175,
    strictPort: true,
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, '../caremate-admin-portal/data'),
        path.resolve(__dirname, '../packages/learn-content'),
      ],
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5175,
    strictPort: true,
  },
});
