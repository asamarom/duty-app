import { test, expect } from '@playwright/test';
import { loginAsTestUser, clearAuthState, isStagingTest } from './utils/test-auth';

/**
 * Settings Page Refactoring & Navigation E2E Tests - LEADER ROLE
 *
 * Tests Settings page structure for leader users.
 */

test.describe('Settings Page - Structure [Leader]', () => {
  test.beforeEach(async ({ page }) => {
    if (!isStagingTest()) {
      await clearAuthState(page);
    }
    await loginAsTestUser(page, 'leader');
    await page.goto('/settings', { waitUntil: 'load' });
    await page.waitForTimeout(1000);
  });

  test('[SETTINGS-L1] should display 2 tabs for leader', async ({ page }) => {
    const tabsList = page.locator('[role="tablist"]');
    await expect(tabsList).toBeVisible({ timeout: 15000 });

    // Leaders see Profile + Units (but NOT Approvals)
    // Wait for roles to load from Firestore
    const allTabs = page.locator('[role="tab"]');
    await expect(allTabs).toHaveCount(2, { timeout: 15000 });
  });

  test('[SETTINGS-L2] Units tab should show units management for leader', async ({ page }) => {
    // Wait for tabs to load (roles from Firestore)
    const allTabs = page.locator('[role="tab"]');
    await expect(allTabs).toHaveCount(2, { timeout: 15000 });

    const unitsTab = page.getByRole('tab', { name: /units|יחידות/i });
    await unitsTab.click();
    await page.waitForTimeout(500);

    // Leader should see units management
    const unitsContent = page.getByText(/battalion|company|platoon|גדוד|פלוגה|מחלקה/i).first();
    const hasUnitsContent = await unitsContent.isVisible().catch(() => false);

    const addUnitButton = page.getByRole('button', { name: /add unit|הוסף יחידה/i });
    const hasAddButton = await addUnitButton.isVisible().catch(() => false);

    expect(hasUnitsContent || hasAddButton).toBeTruthy();
  });

  test('[SETTINGS-L3] Approvals tab should NOT be visible for leader', async ({ page }) => {
    // Leaders should NOT see the Approvals tab (admin-only)
    const approvalsTab = page.getByRole('tab', { name: /approvals|אישורים/i });

    // Approvals tab should not exist for leaders
    await expect(approvalsTab).not.toBeVisible();
  });
});
