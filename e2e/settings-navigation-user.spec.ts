import { test, expect } from '@playwright/test';
import { loginAsTestUser, clearAuthState, isStagingTest } from './utils/test-auth';

/**
 * Settings Page Refactoring & Navigation E2E Tests - REGULAR USER ROLE
 *
 * Tests Settings page structure for regular users.
 */

test.describe('Settings Page - Structure [Regular User]', () => {
  test.beforeEach(async ({ page }) => {
    if (!isStagingTest()) {
      await clearAuthState(page);
    }
    await loginAsTestUser(page, 'user');
    await page.goto('/settings', { waitUntil: 'load' });
    await page.waitForTimeout(1000);
  });

  test('[SETTINGS-U1] should display only Profile tab for regular user', async ({ page }) => {
    // Regular users should only see Profile tab (no Units or Approvals)
    const tabsList = page.locator('[role="tablist"]');

    // If tabs exist, check count
    if (await tabsList.isVisible().catch(() => false)) {
      const allTabs = page.locator('[role="tab"]');
      const tabCount = await allTabs.count();

      // Should be 1 tab (Profile only) for regular users
      expect(tabCount).toBe(1);

      const profileTab = page.getByRole('tab', { name: /profile|פרופיל/i });
      await expect(profileTab).toBeVisible();
    } else {
      // If no tabs, just Profile content should be visible
      const languageSelect = page.locator('[role="combobox"]').or(
        page.getByText(/language|שפה/i).locator('..').locator('select, [role="combobox"]')
      );
      await expect(languageSelect.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('[SETTINGS-U2] Units and Approvals tabs should NOT be visible for regular user', async ({ page }) => {
    // Check that Units tab is NOT visible
    const unitsTab = page.getByRole('tab', { name: /units|יחידות/i });
    const hasUnitsTab = await unitsTab.isVisible().catch(() => false);
    expect(hasUnitsTab).toBeFalsy();

    // Check that Approvals tab is NOT visible
    const approvalsTab = page.getByRole('tab', { name: /approvals|אישורים/i });
    const hasApprovalsTab = await approvalsTab.isVisible().catch(() => false);
    expect(hasApprovalsTab).toBeFalsy();
  });

  test('[SETTINGS-U3] Regular user should NOT see Manage Units or Manage Approvals buttons', async ({ page }) => {
    // Check that Manage Units button is NOT visible
    const manageUnitsButton = page.getByRole('button', { name: /manage units|נהל יחידות/i });
    const hasManageUnits = await manageUnitsButton.isVisible().catch(() => false);
    expect(hasManageUnits).toBeFalsy();

    // Check that Manage Approvals button is NOT visible
    const manageApprovalsButton = page.getByRole('button', { name: /manage approvals|נהל אישורים/i });
    const hasManageApprovals = await manageApprovalsButton.isVisible().catch(() => false);
    expect(hasManageApprovals).toBeFalsy();
  });
});
