import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * Local testing (with test login form):
 *   npm run test:e2e
 *
 * Production testing (Firebase - manual OAuth):
 *   npm run test:e2e:prod
 *
 * UI mode:
 *   npm run test:e2e:ui
 */

// Firebase URLs
const FIREBASE_PROD_URL = 'https://duty-82f42.web.app';
const FIREBASE_TEST_URL = 'https://duty-82f42-test.web.app';

// Check test environment
const testEnv = process.env.TEST_ENV; // 'production' | 'staging' | undefined
const baseURL = testEnv === 'production'
  ? FIREBASE_PROD_URL
  : testEnv === 'staging'
    ? (process.env.STAGING_URL || FIREBASE_TEST_URL)  // Use dynamic Vercel URL if provided
    : (process.env.BASE_URL || 'http://localhost:8080');

const isRemote = testEnv === 'production' || testEnv === 'staging';

export default defineConfig({
  testDir: './e2e',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Parallel workers on CI
  // For staging tests: 2 workers (no emulator conflicts, saves CI minutes)
  // For local with emulators: 1 worker (avoid conflicts)
  workers: process.env.CI && process.env.TEST_ENV === 'staging' ? 2 :
           process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],

  // Shared settings for all projects
  use: {
    baseURL,

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',
  },

  // Configure projects for major browsers
  projects: [
    // Setup project for manual OAuth login (run once to save session)
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        headless: false, // Must be visible for manual OAuth
      },
    },
    // Staging auth setup (automated with custom tokens)
    {
      name: 'staging-auth-setup',
      testMatch: /staging-auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        headless: true, // Headless for CI
      },
    },
    // Main tests - depend on setup for auth state
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: [], // Remove dependency if running without auth
    },
    // Tests requiring authentication
    {
      name: 'chromium-auth',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: /auth\.spec\.ts/, // Skip auth tests (they don't need login)
    },
    // Production tests (no test login form, uses manual OAuth)
    {
      name: 'production',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: FIREBASE_PROD_URL,
      },
      testIgnore: [/auth\.setup\.ts/, /user-lifecycle\.spec\.ts/], // Skip tests requiring test mode
    },
    // Production tests with saved auth
    {
      name: 'production-auth',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: FIREBASE_PROD_URL,
        storageState: './e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: [/auth\.spec\.ts/, /auth\.setup\.ts/, /user-lifecycle\.spec\.ts/],
    },
    // Staging unauthenticated tests (auth.spec.ts only - tests redirect behavior)
    {
      name: 'staging-unauth',
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - tests unauthenticated scenarios
      },
      testMatch: /auth\.spec\.ts/,
    },
    // Staging/Test environment - uses custom token auth (regular user role)
    // This project should NOT run admin/leader tests - they run in staging-admin/staging-leader
    {
      name: 'staging',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './e2e/.auth/staging-user.json',
        // Use dynamic baseURL from top-level config (respects STAGING_URL env var)
      },
      // Exclude: mobile tests, auth tests, admin tests, and leader tests
      testIgnore: [
        /.*\.mobile\.spec\.ts/,           // Mobile tests (run in staging-mobile)
        /auth\.spec\.ts/,                 // Auth tests (run in staging-unauth)
        /battalion.*\.spec\.ts/,          // Leader tests (run in staging-leader)
        /(admin|performance|dashboard|equipment|personnel|i18n|units|transfers|user-lifecycle|rtl).*\.spec\.ts/, // Admin tests (run in staging-admin)
      ],
    },
    // Staging admin tests (requires admin role)
    // Matches: admin-*.spec.ts, performance.spec.ts, dashboard.spec.ts, equipment.spec.ts,
    // personnel.spec.ts, i18n.spec.ts, units.spec.ts, transfers*.spec.ts, user-lifecycle.spec.ts, rtl.spec.ts
    {
      name: 'staging-admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './e2e/.auth/staging-admin.json',
        // Use dynamic baseURL from top-level config (respects STAGING_URL env var)
      },
      testMatch: /(admin|performance|dashboard|equipment|personnel|i18n|units|transfers|user-lifecycle|rtl).*\.spec\.ts/,
      testIgnore: [/.*\.mobile\.spec\.ts/, /auth\.spec\.ts/], // Exclude mobile and auth tests
    },
    // Staging leader tests (requires leader role)
    {
      name: 'staging-leader',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './e2e/.auth/staging-leader.json',
        // Use dynamic baseURL from top-level config (respects STAGING_URL env var)
      },
      testMatch: /.*battalion.*\.spec\.ts/,
      testIgnore: /auth\.spec\.ts/, // Exclude auth tests
    },
    // Mobile testing - Android
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
      },
      testMatch: /.*mobile\.spec\.ts/, // Only run mobile-specific tests
    },
    // Mobile testing - iOS
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
      },
      testMatch: /.*mobile\.spec\.ts/, // Only run mobile-specific tests
    },
    // Staging mobile - for CI testing
    {
      name: 'staging-mobile',
      use: {
        ...devices['Pixel 5'],
        // Use dynamic baseURL from top-level config (respects STAGING_URL env var)
      },
      testMatch: /.*\.mobile\.spec\.ts/, // Run ONLY mobile-specific tests to avoid overlap with staging project
    },
  ],

  // Run Firebase emulators and local dev server when not testing remote
  webServer: isRemote ? undefined : [
    {
      command: 'node scripts/start-emulators.cjs',
      // Wait for port 9098 (the "seed-ready" gate), NOT 9099 (the auth emulator).
      // start-emulators.cjs only opens 9098 after seeding is fully complete,
      // so tests never start before test users exist in the emulator.
      url: 'http://localhost:9098/',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000, // extra time: emulator start + seeding
    },
    {
      command: 'npx cross-env VITE_TEST_MODE=true VITE_FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 VITE_FIRESTORE_EMULATOR_HOST=localhost:8085 npm run dev',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
