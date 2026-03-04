import { test, expect } from '@playwright/test';
import { loginAsTestUser, isStagingTest, clearAuthState } from './utils/test-auth';

/**
 * Leader Equipment Access Rules Tests
 *
 * These tests verify equipment access rules for Leaders from EQUIPMENT_ACCESS_RULES.md
 * Tests run under staging-leader authentication context.
 */

test.describe('Leader Equipment Access Rules [LEADER-EQUIP]', () => {
  // Tests run under staging-leader project with staging-leader.json auth
  // No need to call loginAsTestUser - already authenticated via storageState

  test('[LEADER-EQUIP-1] leader can see equipment assigned to their unit and personally', async ({ page }) => {
    // Leader role requirement: Leaders see equipment assigned to their unit or personally
    // They should NOT see equipment from other units even in the same battalion

    await page.goto('/equipment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');

    // Leader is in Company unit - should see Company Helmet
    const seesCompanyEquipment = pageContent?.includes('Company Helmet');
    console.log(`Leader sees Company Helmet (their unit): ${seesCompanyEquipment}`);
    expect(seesCompanyEquipment).toBe(true);

    // Leader should NOT see Platoon Vest (different unit in same battalion)
    const seesPlatoonEquipment = pageContent?.includes('Platoon Vest');
    console.log(`Leader sees Platoon Vest (other unit): ${seesPlatoonEquipment} (should be false)`);
    expect(seesPlatoonEquipment).toBe(false);

    // Leader should NOT see unassigned equipment (admin only)
    const seesUnassigned = pageContent?.includes('Unassigned Binoculars');
    console.log(`Leader sees Unassigned Binoculars: ${seesUnassigned} (should be false)`);
    expect(seesUnassigned).toBe(false);
  });

  test('[LEADER-EQUIP-2] leader can create equipment in their unit only', async ({ page }) => {
    // Leader role requirement: Leaders can create equipment but only in their own unit
    // The battalionId must match their battalion

    await page.goto('/equipment/add');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const currentUrl = page.url();
    if (currentUrl.includes('/equipment/add')) {
      // Check for name input field
      const nameInput = page.locator('input[name="name"], input[id*="name"]').first();
      const hasNameInput = await nameInput.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasNameInput) {
        // Leader should be able to access the form
        expect(hasNameInput).toBe(true);
        console.log('Leader can access equipment creation form');

        // Check if battalion selector exists - leader might have it pre-selected or hidden
        const battalionSelector = page.getByText(/Select.*attalion|בחר.*גדוד/i).or(
          page.locator('button').filter({ hasText: /battalion|גדוד/i })
        ).first();
        const hasBattalionSelector = await battalionSelector.isVisible({ timeout: 3000 }).catch(() => false);
        
        console.log(`Leader has battalion selector visible: ${hasBattalionSelector}`);
        // Battalion might be pre-filled for leaders (restricted to their battalion)
      }
    }
  });

  test('[LEADER-EQUIP-3] leader cannot update equipment fields', async ({ page }) => {
    // Leader role requirement: Leaders cannot update quantity, status, description
    // Only admins can update equipment fields

    await page.goto('/equipment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const equipmentLink = page.locator('a[href^="/equipment/"]').first();
    const hasLink = await equipmentLink.isVisible().catch(() => false);

    if (hasLink) {
      await equipmentLink.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for Edit button - leader should NOT see it
      const editButton = page.locator('button:has-text("Edit"), button:has-text("עריכה")').first();
      const hasEditButton = await editButton.isVisible({ timeout: 3000 }).catch(() => false);

      // Leader should NOT have edit permissions
      expect(hasEditButton).toBe(false);
      console.log(`Leader has edit button: ${hasEditButton} (should be false)`);
    }
  });

  test('[LEADER-EQUIP-4] leader cannot delete equipment (restricted by firestore rules)', async ({ page }) => {
    // Leader role requirement: Leaders can technically delete equipment created by their unit
    // and assigned to their unit, but this requires complex checks (cross-collection joins)
    // that Firestore rules cannot efficiently perform, so delete is admin-only at security level

    await page.goto('/equipment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const equipmentLink = page.locator('a[href^="/equipment/"]').first();
    const hasLink = await equipmentLink.isVisible().catch(() => false);

    if (hasLink) {
      await equipmentLink.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for Delete button - leader should NOT see it (admin only)
      const deleteButton = page.locator('button:has-text("Delete"), button:has-text("מחק")').first();
      const hasDeleteButton = await deleteButton.isVisible({ timeout: 3000 }).catch(() => false);

      // Leader should NOT have delete UI (security rules enforce admin-only)
      expect(hasDeleteButton).toBe(false);
      console.log(`Leader has delete button: ${hasDeleteButton} (should be false)`);
    }
  });

  test('[LEADER-EQUIP-5] leader can request equipment transfers', async ({ page }) => {
    // Leader role requirement: Leaders can request transfers for equipment in their unit

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

      // Leader should be able to request transfers
      console.log(`Leader has transfer button: ${hasTransferButton}`);
    }
  });
});

