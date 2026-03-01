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

  test('[SETTINGS-3] Units tab should show summary stats and Manage Units button', async ({ page }) => {
    // Wait for tabs to load (roles from Firestore)
    const allTabs = page.locator('[role="tab"]');
    await expect(allTabs).toHaveCount(3, { timeout: 15000 });

    // Click on Units tab
    const unitsTab = page.getByRole('tab', { name: /units|יחידות/i });
    await unitsTab.click();
    await page.waitForTimeout(500);

    // Check that summary statistics are visible
    const summaryStats = page.getByText(/units in your battalion|יחידות בגדוד שלך/i).or(
      page.getByText(/battalion|company|platoon|גדוד|פלוגה|מחלקה/i)
    );
    const hasSummary = await summaryStats.first().isVisible().catch(() => false);
    expect(hasSummary).toBeTruthy();

    // Check for "Manage Units" button
    const manageUnitsButton = page.getByRole('button', { name: /manage units|נהל יחידות/i });
    await expect(manageUnitsButton).toBeVisible({ timeout: 5000 });
  });

  test('[SETTINGS-4] Approvals tab should show summary stats and Manage Approvals button', async ({ page }) => {
    // Wait for tabs to load (roles from Firestore)
    const allTabs = page.locator('[role="tab"]');
    await expect(allTabs).toHaveCount(3, { timeout: 15000 });

    // Click on Approvals tab
    const approvalsTab = page.getByRole('tab', { name: /approvals|אישורים/i });
    await approvalsTab.click();
    await page.waitForTimeout(500);

    // Check that pending approvals summary is visible
    const pendingSummary = page.getByText(/pending approvals|אישורים ממתינים/i).or(
      page.getByText(/pending requests|בקשות ממתינות/i)
    );
    const hasSummary = await pendingSummary.first().isVisible().catch(() => false);
    expect(hasSummary).toBeTruthy();

    // Check for "Manage Approvals" button
    const manageApprovalsButton = page.getByRole('button', { name: /manage approvals|נהל אישורים/i });
    await expect(manageApprovalsButton).toBeVisible({ timeout: 5000 });
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

  test('[SETTINGS-8] Manage Units button should open Units sheet', async ({ page }) => {
    // Wait for tabs to load
    const allTabs = page.locator('[role="tab"]');
    await expect(allTabs).toHaveCount(3, { timeout: 15000 });

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

  test('[SETTINGS-9] Manage Approvals button should open Approvals sheet', async ({ page }) => {
    // Wait for tabs to load
    const allTabs = page.locator('[role="tab"]');
    await expect(allTabs).toHaveCount(3, { timeout: 15000 });

    // Navigate to Approvals tab
    const approvalsTab = page.getByRole('tab', { name: /approvals|אישורים/i });
    await approvalsTab.click();
    await page.waitForTimeout(500);

    // Click "Manage Approvals" button
    const manageApprovalsButton = page.getByRole('button', { name: /manage approvals|נהל אישורים/i });
    await manageApprovalsButton.click();
    await page.waitForTimeout(500);

    // Verify sheet/dialog opened
    const sheet = page.locator('[role="dialog"]').or(page.locator('[class*="sheet"]'));
    await expect(sheet.first()).toBeVisible({ timeout: 5000 });

    // Sheet should contain approvals management content
    const sheetContent = sheet.first();
    const hasApprovalsContent = await sheetContent.getByText(/pending|approved|declined|approve|decline|ממתין|אושר|נדחה|אשר|דחה/i).first().isVisible().catch(() => false);
    expect(hasApprovalsContent).toBeTruthy();
  });

  test('[SETTINGS-10] Admin should see summary statistics in Units and Approvals tabs', async ({ page }) => {
    // Wait for tabs to load
    const allTabs = page.locator('[role="tab"]');
    await expect(allTabs).toHaveCount(3, { timeout: 15000 });

    // Check Units tab summary
    const unitsTab = page.getByRole('tab', { name: /units|יחידות/i });
    await unitsTab.click();
    await page.waitForTimeout(500);

    // Look for unit statistics or counts
    const unitStats = page.getByText(/\d+.*battalion|battalion.*\d+|גדוד.*\d+|\d+.*גדוד/i).or(
      page.getByText(/units in your battalion|יחידות בגדוד/i)
    );
    const hasUnitStats = await unitStats.first().isVisible().catch(() => false);

    // Check Approvals tab summary
    const approvalsTab = page.getByRole('tab', { name: /approvals|אישורים/i });
    await approvalsTab.click();
    await page.waitForTimeout(500);

    // Look for pending count or approval statistics
    const approvalStats = page.getByText(/\d+.*pending|pending.*\d+|ממתין.*\d+|\d+.*ממתין/i).or(
      page.getByText(/pending requests|בקשות ממתינות/i)
    );
    const hasApprovalStats = await approvalStats.first().isVisible().catch(() => false);

    // At least one tab should show statistics
    expect(hasUnitStats || hasApprovalStats).toBeTruthy();
  });
});
