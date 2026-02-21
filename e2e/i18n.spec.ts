import { test, expect } from '@playwright/test';
import { loginAsTestUser, clearAuthState } from './utils/test-auth';

test.describe('Localization [I18N]', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
    await loginAsTestUser(page, 'admin');
  });

  test('[I18N-1] should support bilingual content (English and Hebrew)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check that page content uses bilingual patterns
    // The app should display text in either English or Hebrew
    const dashboardHeading = page.getByRole('heading', { name: /dashboard|לוח בקרה/i }).first();
    await expect(dashboardHeading).toBeVisible({ timeout: 10000 });

    // Verify navigation items support both languages
    const personnelLink = page.locator('text=/personnel|כוח אדם/i').first();
    const hasPersonnel = await personnelLink.isVisible().catch(() => false);

    const equipmentLink = page.locator('text=/equipment|ציוד/i').first();
    const hasEquipment = await equipmentLink.isVisible().catch(() => false);

    expect(hasPersonnel || hasEquipment).toBeTruthy();
  });

  test('[I18N-2] should have RTL compatibility for Hebrew', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check for RTL direction attribute on html element
    const htmlDir = await page.locator('html').getAttribute('dir');

    // The app MUST have RTL set on the html element for proper Hebrew support
    expect(htmlDir).toBe('rtl');

    // Verify RTL is applied to key layout containers
    const mainContent = page.locator('main, [role="main"]').first();
    if (await mainContent.isVisible().catch(() => false)) {
      const mainDir = await mainContent.evaluate(el =>
        window.getComputedStyle(el).direction
      );
      expect(mainDir).toBe('rtl');
    }
  });
});
