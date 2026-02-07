import { test as base, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// Path to store authenticated session (ESM-compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const AUTH_FILE = path.join(__dirname, '../.auth/user.json');

/**
 * Custom fixture that provides authenticated page.
 *
 * Usage Options:
 *
 * 1. MANUAL AUTH (Recommended for first setup):
 *    Run: npx playwright test --project=setup
 *    This opens a browser for you to log in manually.
 *    Your session is saved and reused for subsequent tests.
 *
 * 2. TEST MODE AUTH (For CI/automated testing):
 *    Set VITE_TEST_MODE=true to use the test login form with Firebase emulators.
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ browser }, use) => {
    // Try to use saved auth state if it exists
    let context;
    try {
      context = await browser.newContext({ storageState: AUTH_FILE });
    } catch {
      // No auth state saved yet, use fresh context
      context = await browser.newContext();
    }
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
