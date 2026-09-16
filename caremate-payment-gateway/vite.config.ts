import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Listen on 0.0.0.0 so Android emulator (10.0.2.2) can reach the host.
    // Default Vite bind is often [::1] only, which refuses IPv4 connections.
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    env: {
      VITE_WEBSITE_URL: 'https://www.test.local',
      VITE_COMMUNITY_PORTAL_URL: 'https://community.test.local',
      VITE_CARE_PORTAL_URL: 'https://care.test.local',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['src/lib/**/*.ts'],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
});
