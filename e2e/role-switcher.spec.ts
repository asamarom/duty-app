import { test, expect } from '@playwright/test';

/**
 * Tests for the standalone role-switcher tool (tools/role-switcher.html).
 *
 * The page is served separately on port 3999:
 *   npx serve /path/to/tools -p 3999 --cors
 *
 * It connects to the Firebase emulator (auth:9099, firestore:8085) directly
 * via REST API — no build step needed.
 */

// serve redirects .html → clean URL
const TOOL_URL = 'http://localhost:3999/role-switcher';

test.describe('Role Switcher Tool', () => {
  test('shows login form on load', async ({ page }) => {
    await page.goto(TOOL_URL);
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
  });

  test('logs in and shows current user state', async ({ page }) => {
    await page.goto(TOOL_URL);
    await page.getByLabel(/email/i).fill('test-admin@e2e.local');
    await page.getByLabel(/password/i).fill('TestPassword123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Should show user info and controls
    await expect(page.getByText(/test admin/i)).toBeVisible({ timeout: 15000 });
    // Role badge is shown in the user info meta section
    await expect(page.locator('#user-role')).toBeVisible();
  });

  test('shows role buttons and unit buttons after login', async ({ page }) => {
    await page.goto(TOOL_URL);
    await page.getByLabel(/email/i).fill('test-admin@e2e.local');
    await page.getByLabel(/password/i).fill('TestPassword123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    await expect(page.getByText(/test admin/i)).toBeVisible({ timeout: 8000 });

    // Role buttons
    await expect(page.getByRole('button', { name: /^admin$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^leader$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^user$/i })).toBeVisible();

    // At least one unit button (seeded: Test Battalion, Alpha Company, First Platoon)
    await expect(page.getByText(/battalion|company|platoon/i).first()).toBeVisible();
  });

  test('changes role and shows success feedback', async ({ page }) => {
    await page.goto(TOOL_URL);
    await page.getByLabel(/email/i).fill('test-admin@e2e.local');
    await page.getByLabel(/password/i).fill('TestPassword123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    await expect(page.getByText(/test admin/i)).toBeVisible({ timeout: 8000 });

    // Click the "leader" role button
    await page.getByRole('button', { name: /^leader$/i }).click();

    // Should show success feedback
    await expect(page.getByText(/leader/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/✓|success|changed/i)).toBeVisible({ timeout: 5000 });

    // Restore admin role
    await page.getByRole('button', { name: /^admin$/i }).click();
    await expect(page.getByText(/✓|success|changed/i)).toBeVisible({ timeout: 5000 });
  });

  test('changes unit assignment and shows success feedback', async ({ page }) => {
    await page.goto(TOOL_URL);
    await page.getByLabel(/email/i).fill('test-admin@e2e.local');
    await page.getByLabel(/password/i).fill('TestPassword123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    await expect(page.getByText(/test admin/i)).toBeVisible({ timeout: 8000 });

    // Click any unit button (First Platoon or Alpha Company)
    const unitBtn = page.getByRole('button', { name: /platoon|company/i }).first();
    await unitBtn.click();

    // Should show success feedback
    await expect(page.getByText(/✓|success|changed/i)).toBeVisible({ timeout: 5000 });
  });
});
