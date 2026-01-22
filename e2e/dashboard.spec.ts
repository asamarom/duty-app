import { test, expect } from '@playwright/test';
import { loginAsTestUser, clearAuthState } from './utils/test-auth';

test.describe('Dashboard (Authenticated)', () => {
  // For staging with test users, login before each test
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
    await loginAsTestUser(page, 'admin');
  });

  test('should display dashboard with stats cards', async ({ page }) => {
    // Wait for dashboard to load (either English or Hebrew)
    await expect(
      page.getByRole('heading', { name: /לוח בקרה|dashboard/i }).first()
    ).toBeVisible({ timeout: 10000 });

    // Check for stat cards (Personnel and Equipment)
    await expect(
      page.getByText(/total personnel|סה"כ אנשים/i)
    ).toBeVisible();

    await expect(
      page.getByText(/equipment items|פריטי ציוד/i)
    ).toBeVisible();
  });

  test('should display personnel overview section', async ({ page }) => {
    await expect(
      page.getByText(/personnel overview|סקירת כוח אדם/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to personnel page from sidebar', async ({ page }) => {
    // Click on Personnel in sidebar (desktop view)
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByRole('link', { name: /personnel|כוח אדם/i }).first().click();

    await expect(page).toHaveURL('/personnel');
  });

  test('should navigate to equipment page from sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByRole('link', { name: /equipment|ציוד/i }).first().click();

    await expect(page).toHaveURL('/equipment');
  });
});
