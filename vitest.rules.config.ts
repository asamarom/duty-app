import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest config for Firestore security rules tests.
 * Runs WITHOUT the Firebase mocks used in component tests.
 * Requires a live Firestore emulator on port 8085.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/test/rules/**/*.test.ts'],
    // No setupFiles — we need real Firebase, not the mocked version
    testTimeout: 30000,
    hookTimeout: 30000,
    sequence: {
      // Rules tests must run sequentially (shared emulator state)
      concurrent: false,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
