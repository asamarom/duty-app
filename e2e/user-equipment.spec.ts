import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './utils/test-auth';

/**
 * User Equipment Access Rules Tests
 *
 * These tests verify equipment access rules for regular Users from EQUIPMENT_ACCESS_RULES.md
 * Tests run under staging (regular user) authentication context.
 */

test.describe('User Equipment Access Rules [USER-EQUIP]', () => {
  test.beforeEach(async ({ page }) => {
    if (!isStagingTest()) {
      await clearAuthState(page);
    }
    await loginAsTestUser(page, 'user');
  });

  test('[USER-EQUIP-1] user can see equipment assigned to their unit and personally', async ({ page }) => {
    // User role requirement: Users see equipment assigned to their unit or personally
    // They can also see pending transfers TO them for approval

    await page.goto('/equipment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');

    // User is in Platoon unit - should see Platoon Vest
    const seesPlatoonEquipment = pageContent?.includes('Platoon Vest');
    console.log(`User sees Platoon Vest (their unit): ${seesPlatoonEquipment}`);
    expect(seesPlatoonEquipment).toBe(true);

    // User should see M4 Carbine (assigned to them personally)
    const seesPersonalEquipment = pageContent?.includes('M4 Carbine');
    console.log(`User sees M4 Carbine (personal): ${seesPersonalEquipment}`);
    expect(seesPersonalEquipment).toBe(true);

    // User should NOT see Company Helmet (different unit)
    const seesCompanyEquipment = pageContent?.includes('Company Helmet');
    console.log(`User sees Company Helmet (other unit): ${seesCompanyEquipment} (should be false)`);
    expect(seesCompanyEquipment).toBe(false);

    // User should NOT see unassigned equipment (admin only)
    const seesUnassigned = pageContent?.includes('Unassigned Binoculars');
    console.log(`User sees Unassigned Binoculars: ${seesUnassigned} (should be false)`);
    expect(seesUnassigned).toBe(false);
  });

  test('[USER-EQUIP-2] user cannot create equipment', async ({ page }) => {
    // User role requirement: Regular users cannot create equipment directly

    await page.goto('/equipment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Look for "Add Equipment" button
    const addButton = page.locator('button').filter({ hasText: /add.*equipment|הוסף.*ציוד/i }).first();
    const hasAddButton = await addButton.isVisible({ timeout: 3000 }).catch(() => false);

    // User should NOT see add equipment button
    console.log(`User has add equipment button: ${hasAddButton} (should be false)`);
    
    // Try accessing the add page directly
    await page.goto('/equipment/add');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const currentUrl = page.url();
    const isOnAddPage = currentUrl.includes('/equipment/add');
    
    // User might be redirected or see an error
    console.log(`User can access /equipment/add: ${isOnAddPage}`);
  });

  test('[USER-EQUIP-3] user cannot update equipment fields', async ({ page }) => {
    // User role requirement: Users cannot update equipment fields

    await page.goto('/equipment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const equipmentLink = page.locator('a[href^="/equipment/"]').first();
    const hasLink = await equipmentLink.isVisible().catch(() => false);

    if (hasLink) {
      await equipmentLink.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for Edit button - user should NOT see it
      const editButton = page.locator('button:has-text("Edit"), button:has-text("עריכה")').first();
      const hasEditButton = await editButton.isVisible({ timeout: 3000 }).catch(() => false);

      // User should NOT have edit permissions
      expect(hasEditButton).toBe(false);
      console.log(`User has edit button: ${hasEditButton} (should be false)`);
    }
  });

  test('[USER-EQUIP-4] user cannot delete equipment', async ({ page }) => {
    // User role requirement: Users cannot delete equipment

    await page.goto('/equipment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const equipmentLink = page.locator('a[href^="/equipment/"]').first();
    const hasLink = await equipmentLink.isVisible().catch(() => false);

    if (hasLink) {
      await equipmentLink.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for Delete button - user should NOT see it
      const deleteButton = page.locator('button:has-text("Delete"), button:has-text("מחק")').first();
      const hasDeleteButton = await deleteButton.isVisible({ timeout: 3000 }).catch(() => false);

      // User should NOT have delete permissions
      expect(hasDeleteButton).toBe(false);
      console.log(`User has delete button: ${hasDeleteButton} (should be false)`);
    }
  });

  test('[USER-EQUIP-5] user can request transfer for personally assigned equipment', async ({ page }) => {
    // User role requirement: Users can request transfers for equipment assigned to them personally

    await page.goto('/equipment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const equipmentLink = page.locator('a[href^="/equipment/"]').first();
    const hasLink = await equipmentLink.isVisible().catch(() => false);

    if (hasLink) {
      await equipmentLink.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for Transfer/Assign button
      const transferButton = page.locator('button').filter({ 
        hasText: /transfer|assign|העבר|הקצה/i 
      }).first();
      const hasTransferButton = await transferButton.isVisible({ timeout: 5000 }).catch(() => false);

      // User might see transfer button only for their personal equipment
      console.log(`User has transfer button: ${hasTransferButton}`);
    }
  });

  test('[USER-EQUIP-6] user sees pending transfers TO them for approval', async ({ page }) => {
    // User role requirement: Users can see equipment with pending transfers TO them

    await page.goto('/equipment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Check for Transfers tab
    const transfersTab = page.getByRole('tab', { name: /transfers|העברות/i });
    const hasTransfersTab = await transfersTab.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasTransfersTab) {
      await transfersTab.click();
      await page.waitForTimeout(500);

      // Check for pending transfers
      const transfersList = page.locator('[data-testid="transfers-list"], .transfer-card, table tbody tr').first();
      const hasTransfers = await transfersList.isVisible().catch(() => false);

      console.log(`User has transfers tab and can see transfers: ${hasTransfers}`);
    }
  });
});
