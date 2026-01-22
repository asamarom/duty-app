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
 * 2. MOCK AUTH (For CI/automated testing):
 *    Set localStorage tokens directly (see mockAuth function below)
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

/**
 * Mock Supabase auth by setting localStorage tokens.
 * Use this for CI testing without real Google OAuth.
 *
 * You'll need to provide valid test tokens from your Supabase project.
 */
export async function mockSupabaseAuth(page: Page, tokens: {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
}) {
  await page.addInitScript((tokens) => {
    const supabaseKey = 'sb-' + window.location.hostname.split('.')[0] + '-auth-token';
    const authData = {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: tokens.userId,
        email: tokens.email,
        role: 'authenticated',
      }
    };
    localStorage.setItem(supabaseKey, JSON.stringify(authData));
  }, tokens);
}

export { expect } from '@playwright/test';
