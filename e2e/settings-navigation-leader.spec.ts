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

  test('[SETTINGS-L2] Units tab should show Manage Units button for leader', async ({ page }) => {
    // Wait for tabs to load (roles from Firestore)
    const allTabs = page.locator('[role="tab"]');
    await expect(allTabs).toHaveCount(2, { timeout: 15000 });

    const unitsTab = page.getByRole('tab', { name: /units|יחידות/i });
    await unitsTab.click();
    await page.waitForTimeout(500);

    // Leader should see "Manage Units" button
    const manageUnitsButton = page.getByRole('button', { name: /manage units|נהל יחידות/i });
    await expect(manageUnitsButton).toBeVisible({ timeout: 5000 });

    // Check for summary statistics
    const summaryStats = page.getByText(/units in your battalion|יחידות בגדוד שלך/i).or(
      page.getByText(/battalion|company|platoon|גדוד|פלוגה|מחלקה/i)
    );
    const hasSummary = await summaryStats.first().isVisible().catch(() => false);
    expect(hasSummary).toBeTruthy();
  });

  test('[SETTINGS-L3] Approvals tab should NOT be visible for leader', async ({ page }) => {
    // Leaders should NOT see the Approvals tab (admin-only)
    const approvalsTab = page.getByRole('tab', { name: /approvals|אישורים/i });

    // Approvals tab should not exist for leaders
    await expect(approvalsTab).not.toBeVisible();
  });

  test('[SETTINGS-L4] Manage Units button should open Units sheet for leader', async ({ page }) => {
    // Wait for tabs to load
    const allTabs = page.locator('[role="tab"]');
    await expect(allTabs).toHaveCount(2, { timeout: 15000 });

    // Navigate to Units tab
    const unitsTab = page.getByRole('tab', { name: /units|יחידות/i });
    await unitsTab.click();
    await page.waitForTimeout(500);

    // Click "Manage Units" button
    const manageUnitsButton = page.getByRole('button', { name: /manage units|נהל יחידות/i });
    await manageUnitsButton.click();
    await page.waitForTimeout(500);

    // Verify sheet/dialog opened
    const sheet = page.locator('[role="dialog"]').or(page.locator('[class*="sheet"]'));
    await expect(sheet.first()).toBeVisible({ timeout: 5000 });

    // Sheet should contain units management content
    const sheetContent = sheet.first();
    const hasUnitsContent = await sheetContent.getByText(/battalion|company|platoon|add unit|גדוד|פלוגה|מחלקה|הוסף יחידה/i).first().isVisible().catch(() => false);
    expect(hasUnitsContent).toBeTruthy();
  });
});
