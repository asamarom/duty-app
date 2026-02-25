import { test, expect } from '@playwright/test';
import { loginAsTestUser, clearAuthState, isStagingTest } from './utils/test-auth';

test.describe('Battalion Scoping — Data Visibility', () => {
  test.beforeEach(async ({ page }) => {
    if (!isStagingTest()) {
      await clearAuthState(page);
    }
  });

  test('[SCOPE-1] leader sees multiple personnel from different sub-units in their battalion', async ({ page }) => {
    test.setTimeout(45000);

    await loginAsTestUser(page, 'leader');
    await page.goto('/personnel');
    await page.waitForLoadState('domcontentloaded');

    // Wait for personnel cards to appear (PersonnelCard uses .card-tactical, not <a> links)
    const personnelCards = page.locator('.card-tactical');
    await personnelCards.first().waitFor({ state: 'visible', timeout: 20000 });

    const count = await personnelCards.count();

    // Must show at least 2 personnel: proves full-battalion scoping, not just own company
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('[SCOPE-2] leader sees personnel from both their company and other sub-units', async ({ page }) => {
    test.setTimeout(45000);

    await loginAsTestUser(page, 'leader');
    await page.goto('/personnel');
    await page.waitForLoadState('domcontentloaded');

    // PersonnelCard renders "lastName, firstName" format
    // Test Leader (lastName='Leader', firstName='Test') belongs to company unit — must be visible
    await expect(page.getByText('Leader, Test').first()).toBeVisible({ timeout: 20000 });

    // Test User (lastName='User', firstName='Test') belongs to platoon unit (different sub-unit) — must also be visible
    await expect(page.getByText('User, Test').first()).toBeVisible({ timeout: 20000 });
  });

  test('[SCOPE-3] admin sees all battalion personnel', async ({ page }) => {
    test.setTimeout(45000);

    await loginAsTestUser(page, 'admin');
    await page.goto('/personnel');
    await page.waitForLoadState('domcontentloaded');

    // Wait for at least one personnel card to appear
    const personnelCards = page.locator('.card-tactical');
    await personnelCards.first().waitFor({ state: 'visible', timeout: 20000 });

    const count = await personnelCards.count();

    // Must show at least 3: Test Admin (battalion) + Test Leader (company) + Test User (platoon)
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('[SCOPE-4] leader equipment page loads without infinite spinner', async ({ page }) => {
    test.setTimeout(45000);

    await loginAsTestUser(page, 'leader');
    await page.goto('/equipment');
    await page.waitForLoadState('domcontentloaded');

    // Hard assertion: actual page content (heading or equipment elements) must be present
    const heading = page.getByRole('heading').first();
    await heading.waitFor({ state: 'visible', timeout: 20000 });

    // Soft assertion: no spinner/loading indicator should be visible after content loads
    await expect
      .soft(page.locator('[data-testid="loading-spinner"], .animate-spin').first())
      .not.toBeVisible({ timeout: 5000 });
  });

  test('[SCOPE-5] regular user equipment page loads without infinite spinner', async ({ page }) => {
    test.setTimeout(45000);

    await loginAsTestUser(page, 'user');
    await page.goto('/equipment');
    await page.waitForLoadState('domcontentloaded');

    // Hard assertion: page must render some content (heading or main area)
    const heading = page.getByRole('heading').first();
    await heading.waitFor({ state: 'visible', timeout: 20000 });

    // Soft assertion: no spinner visible — catches setLoading(false) regression on permission error
    await expect
      .soft(page.locator('[data-testid="loading-spinner"], .animate-spin').first())
      .not.toBeVisible({ timeout: 5000 });
  });
});
