import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    setupFiles: ['./test/setup.ts'],
    // Ensure environment variables are loaded
    env: {
      OPENROUTER_API_KEY: process.env.AI_API_KEY,
      AI_API_KEY: process.env.AI_API_KEY,
      MODEL: process.env.MODEL,
    },
    globals: true,
    testTimeout: 15000, // Increase timeout to 15 seconds
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
