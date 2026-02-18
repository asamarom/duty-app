import { test, expect } from '@playwright/test';
import { loginAsTestUser, clearAuthState } from './utils/test-auth';

test.describe('Admin/Leader — full transfers page', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('admin sees Transfers link in sidebar', async ({ page }) => {
    test.setTimeout(60000);
    await loginAsTestUser(page, 'admin');
    await page.goto('/');

    const transfersLink = page.locator('a[href*="/assignment-requests"]');
    await expect(transfersLink).toBeVisible({ timeout: 20000 });
  });

  test('admin can navigate to /assignment-requests', async ({ page }) => {
    test.setTimeout(60000);
    await loginAsTestUser(page, 'admin');
    await page.goto('/assignment-requests');
    await page.waitForLoadState('domcontentloaded');

    // Should NOT be redirected away — URL must still contain /assignment-requests
    await expect(page).toHaveURL(/\/assignment-requests/, { timeout: 15000 });
  });

  test('admin sees Incoming, All Pending, and History tabs', async ({ page }) => {
    test.setTimeout(60000);
    await loginAsTestUser(page, 'admin');
    await page.goto('/assignment-requests');
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
    await clearAuthState(page);
  });

  test('user does NOT see Transfers link in nav', async ({ page }) => {
    await loginAsTestUser(page, 'user');
    await page.goto('/');

    const transfersLink = page.locator('a[href*="/assignment-requests"]');
    await expect(transfersLink).not.toBeVisible({ timeout: 8000 });
  });

  test('user is redirected away from /assignment-requests', async ({ page }) => {
    await loginAsTestUser(page, 'user');
    await page.goto('/assignment-requests');
    await page.waitForLoadState('domcontentloaded');

    // Either the URL changed (redirect) or an access-denied message is shown
    const currentUrl = page.url();
    const isRedirected = !currentUrl.includes('/assignment-requests');

    const accessDeniedText = page.locator(
      'text=/אין גישה|Access denied|Forbidden|403/i'
    );
    const hasAccessDenied = await accessDeniedText.isVisible({ timeout: 4000 }).catch(() => false);

    expect(isRedirected || hasAccessDenied).toBeTruthy();
  });

  test('user blocked from /assignment-requests sees access-denied message', async ({ page }) => {
    await loginAsTestUser(page, 'user');
    await page.goto('/assignment-requests');
    await page.waitForLoadState('domcontentloaded');

    // ProtectedRoute renders "אין גישה — Access denied" in-place (URL stays)
    await expect(
      page.locator('text=/אין גישה|Access denied/i').first()
    ).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Regular user — My Requests in Equipment page', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('user sees My Requests section in Equipment page', async ({ page }) => {
    await loginAsTestUser(page, 'user');
    await page.goto('/equipment');
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.locator('[data-testid="my-requests-section"]')
    ).toBeVisible({ timeout: 8000 });
  });

  test('My Requests empty state shown when no pending requests', async ({ page }) => {
    await loginAsTestUser(page, 'user');
    await page.goto('/equipment');
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.locator('[data-testid="my-requests-empty"]')
    ).toBeVisible({ timeout: 8000 });
  });
});
