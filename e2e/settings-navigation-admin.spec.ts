import { test, expect } from '@playwright/test';
import { loginAsTestUser, clearAuthState, isStagingTest } from './utils/test-auth';

/**
 * Settings Page Refactoring & Navigation E2E Tests - ADMIN ROLE
 *
 * Tests Settings page structure and bottom navigation for admin users.
 */

test.describe('Settings Page - Structure [Admin]', () => {
  test.beforeEach(async ({ page }) => {
    if (!isStagingTest()) {
      await clearAuthState(page);
    }
    await loginAsTestUser(page, 'admin');
    await page.goto('/settings', { waitUntil: 'load' });
    await page.waitForTimeout(1000); // Wait for UI to stabilize
  });

  test('[SETTINGS-1] should display 3 tabs in Settings page for admin', async ({ page }) => {
    // Wait for tabs to be visible
    const tabsList = page.locator('[role="tablist"]');
    await expect(tabsList).toBeVisible({ timeout: 15000 });

    // Wait for all tabs to load (roles need to be fetched from Firestore first)
    const allTabs = page.locator('[role="tab"]');
    await expect(allTabs).toHaveCount(3, { timeout: 15000 });

    // Check for Profile tab (English or Hebrew)
    const profileTab = page.getByRole('tab', { name: /profile|פרופיל/i });
    await expect(profileTab).toBeVisible();

    // Check for Units tab (English or Hebrew)
    const unitsTab = page.getByRole('tab', { name: /units|יחידות/i });
    await expect(unitsTab).toBeVisible();

    // Check for Approvals tab (English or Hebrew)
    const approvalsTab = page.getByRole('tab', { name: /approvals|אישורים/i });
    await expect(approvalsTab).toBeVisible();
  });

  test('[SETTINGS-2] Profile tab should show language selector and logout', async ({ page }) => {
    // Wait for tabs to load (roles from Firestore)
    const allTabs = page.locator('[role="tab"]');
    await expect(allTabs).toHaveCount(3, { timeout: 15000 });

    // Click on Profile tab if not already active
    const profileTab = page.getByRole('tab', { name: /profile|פרופיל/i });
    await profileTab.click();
    await page.waitForTimeout(500);

    // Check for language selector
    const languageSelect = page.locator('[role="combobox"]').or(
      page.getByText(/language|שפה/i).locator('..').locator('select, [role="combobox"]')
    );
    await expect(languageSelect.first()).toBeVisible({ timeout: 5000 });

    // Check for logout button (may be in profile content or as separate button)
    const logoutButton = page.getByRole('button', { name: /logout|sign out|התנתק/i }).or(
      page.getByText(/logout|sign out|התנתק/i)
    );
    // Logout might be anywhere on the page or in a menu
    const hasLogout = await logoutButton.first().isVisible().catch(() => false);
    expect(hasLogout).toBeTruthy();
  });

  test('[SETTINGS-3] Units tab should show units management for admin', async ({ page }) => {
    // Wait for tabs to load (roles from Firestore)
    const allTabs = page.locator('[role="tab"]');
    await expect(allTabs).toHaveCount(3, { timeout: 15000 });

    // Click on Units tab
    const unitsTab = page.getByRole('tab', { name: /units|יחידות/i });
    await unitsTab.click();
    await page.waitForTimeout(500);

    // Check that units content is visible
    const unitsContent = page.getByText(/battalion|company|platoon|גדוד|פלוגה|מחלקה/i).first();
    const hasUnitsContent = await unitsContent.isVisible().catch(() => false);

    // Or check for "add unit" or "manage units" buttons
    const addUnitButton = page.getByRole('button', { name: /add unit|הוסף יחידה/i });
    const hasAddButton = await addUnitButton.isVisible().catch(() => false);

    expect(hasUnitsContent || hasAddButton).toBeTruthy();
  });

  test('[SETTINGS-4] Approvals tab should show approvals for admin', async ({ page }) => {
    // Wait for tabs to load (roles from Firestore)
    const allTabs = page.locator('[role="tab"]');
    await expect(allTabs).toHaveCount(3, { timeout: 15000 });

    // Click on Approvals tab
    const approvalsTab = page.getByRole('tab', { name: /approvals|אישורים/i });
    await approvalsTab.click();
    await page.waitForTimeout(500);

    // Check that approvals content is visible
    const approvalsContent = page.getByText(/pending|approved|declined|ממתין|אושר|נדחה/i).first();
    const hasApprovalsContent = await approvalsContent.isVisible().catch(() => false);

    // Or check for table/list of approvals
    const approvalsTable = page.locator('[role="table"], [class*="approvals"]').first();
    const hasTable = await approvalsTable.isVisible().catch(() => false);

    expect(hasApprovalsContent || hasTable).toBeTruthy();
  });

  test('[SETTINGS-5] Access Control section should NOT be present in Settings', async ({ page }) => {
    // Check all tabs to ensure Access Control is not present
    const tabs = [
      { name: /profile|פרופיל/i },
      { name: /units|יחידות/i },
      { name: /approvals|אישורים/i },
    ];

    for (const tab of tabs) {
      const tabElement = page.getByRole('tab', { name: tab.name });
      if (await tabElement.isVisible().catch(() => false)) {
        await tabElement.click();
        await page.waitForTimeout(500);

        // Check that "Access Control" section is NOT visible
        const accessControlSection = page.getByText(/access control|בקרת גישה/i);
        const isVisible = await accessControlSection.isVisible().catch(() => false);
        expect(isVisible).toBeFalsy();
      }
    }
  });

  test('[SETTINGS-6] App version should be displayed at bottom of settings', async ({ page }) => {
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Check for version info (format: PMTB v1.0.0 or similar)
    const versionText = page.getByText(/v\d+\.\d+\.\d+|version|גרסה/i);
    await expect(versionText.first()).toBeVisible({ timeout: 5000 });
  });

  test('[SETTINGS-7] Tab switching should work correctly', async ({ page }) => {
    // Wait for tabs to load (roles from Firestore)
    const allTabs = page.locator('[role="tab"]');
    await expect(allTabs).toHaveCount(3, { timeout: 15000 });

    // Start with Profile tab
    const profileTab = page.getByRole('tab', { name: /profile|פרופיל/i });
    await profileTab.click();
    await page.waitForTimeout(500);

    // Verify Profile tab is active
    const profileTabActive = await profileTab.getAttribute('aria-selected');
    expect(profileTabActive).toBe('true');

    // Switch to Units tab
    const unitsTab = page.getByRole('tab', { name: /units|יחידות/i });
    await unitsTab.click();
    await page.waitForTimeout(500);

    // Verify Units tab is active
    const unitsTabActive = await unitsTab.getAttribute('aria-selected');
    expect(unitsTabActive).toBe('true');

    // Switch to Approvals tab
    const approvalsTab = page.getByRole('tab', { name: /approvals|אישורים/i });
    await approvalsTab.click();
    await page.waitForTimeout(500);

    // Verify Approvals tab is active
    const approvalsTabActive = await approvalsTab.getAttribute('aria-selected');
    expect(approvalsTabActive).toBe('true');
  });
});
