import { test as setup, expect } from '@playwright/test';
import { AUTH_FILE } from './fixtures/auth';

const isProduction = process.env.TEST_ENV === 'production';
const envLabel = isProduction ? 'PRODUCTION (Firebase)' : 'LOCAL';

/**
 * This setup test opens a browser for manual Google OAuth login.
 *
 * Local:      npm run test:e2e:setup
 * Production: npm run test:e2e:prod:setup
 *
 * After logging in, your session is saved to .auth/user.json
 * and reused by all subsequent tests.
 */
setup('authenticate', async ({ page, baseURL }) => {
  // Go to auth page
  await page.goto('/auth');

  // Wait for auth page to load
  await expect(page.getByText('PMTB System')).toBeVisible();

  console.log('\n========================================');
  console.log(`MANUAL LOGIN REQUIRED - ${envLabel}`);
  console.log('========================================');
  console.log(`URL: ${baseURL}`);
  console.log('----------------------------------------');
  console.log('1. Click "Continue with Google" in the browser');
  console.log('2. Complete Google OAuth login');
  console.log('3. Wait for redirect to dashboard');
  console.log('========================================\n');

  // Wait for user to complete OAuth flow and land on dashboard
  // Increase timeout for manual login
  await page.waitForURL('/', { timeout: 120000 });

  // Verify we're logged in by checking for dashboard content
  await expect(page.locator('text=Dashboard').or(page.locator('text=לוח בקרה'))).toBeVisible({ timeout: 10000 });

  console.log('\n✓ Login successful! Saving session...\n');

  // Save the authenticated state
  await page.context().storageState({ path: AUTH_FILE });
});
