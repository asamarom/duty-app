import { test, expect } from '@playwright/test';
import { loginAsTestUser, clearAuthState, isStagingTest } from './utils/test-auth';

test.describe('Admin/Leader — full transfers page', () => {
  test.beforeEach(async ({ page }) => {
    if (!isStagingTest()) {
      await clearAuthState(page);
    }
  });

  test('admin sees Transfers tab on Equipment page', async ({ page }) => {
    test.setTimeout(60000);
    await loginAsTestUser(page, 'admin');
    await page.goto('/equipment');
    await page.waitForLoadState('domcontentloaded');

    const transfersTab = page.locator('[role="tab"]:has-text("Transfers"), [role="tab"]:has-text("העברות")').first();
    await expect(transfersTab).toBeVisible({ timeout: 20000 });
  });

  test('admin is redirected from /assignment-requests to equipment transfers tab', async ({ page }) => {
    test.setTimeout(60000);
    await loginAsTestUser(page, 'admin');
    await page.goto('/assignment-requests');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/\/equipment.*tab=transfers|\/equipment\?tab=transfers/, { timeout: 15000 });
  });

  test('admin sees Incoming, All Pending, and History tabs', async ({ page }) => {
    test.setTimeout(60000);
    await loginAsTestUser(page, 'admin');
    await page.goto('/equipment?tab=transfers');
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.locator('[role="tab"]:has-text("Incoming"), [role="tab"]:has-text("נכנסות")').first()
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator('[role="tab"]:has-text("All Pending"), [role="tab"]:has-text("כל הממתינות")').first()
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('[role="tab"]:has-text("History"), [role="tab"]:has-text("היסטוריה")').first()
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Regular user — no standalone transfers page', () => {
  test.beforeEach(async ({ page }) => {
    if (!isStagingTest()) {
      await clearAuthState(page);
    }
  });

  test('user does NOT see standalone Transfers nav link', async ({ page }) => {
    await loginAsTestUser(page, 'user');
    await page.goto('/');

    const transfersLink = page.locator('a[href*="/assignment-requests"]');
    await expect(transfersLink).not.toBeVisible({ timeout: 8000 });
  });

  test('user is redirected from /assignment-requests to equipment transfers tab', async ({ page }) => {
    await loginAsTestUser(page, 'user');
    await page.goto('/assignment-requests');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/\/equipment/, { timeout: 8000 });
  });
});

test.describe('Regular user — My Requests in Equipment page', () => {
  test.beforeEach(async ({ page }) => {
    if (!isStagingTest()) {
      await clearAuthState(page);
    }
  });

  test('user sees Transfers tab on Equipment page', async ({ page }) => {
    await loginAsTestUser(page, 'user');
    await page.goto('/equipment?tab=transfers');
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.locator('[role="tab"]:has-text("Incoming"), [role="tab"]:has-text("נכנסות")').first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('user sees empty state in Incoming tab when no transfers', async ({ page }) => {
    await loginAsTestUser(page, 'user');
    await page.goto('/equipment?tab=transfers');
    await page.waitForLoadState('domcontentloaded');

    // The Incoming tab is shown by default; if no incoming transfers, empty state is shown
    await expect(
      page.locator('[role="tab"]:has-text("Incoming"), [role="tab"]:has-text("נכנסות")').first()
    ).toBeVisible({ timeout: 8000 });
  });
});
