import { test, expect } from '@playwright/test';
import { loginAsTestUser, clearAuthState, isStagingTest } from './utils/test-auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

/**
 * Test: Equipment Quantity Display with Pending Transfers OUT
 *
 * Bug scenario:
 * - User has 5 אלונקה assigned to their unit
 * - 2 are pending transfer OUT to another unit
 * - Equipment tab should show "x3" (available), not "x5" (total)
 *
 * This test verifies that currentQuantity is reduced by pendingTransferOutQuantity
 */

// Initialize Firebase Admin (for emulator tests only)
let adminDb: ReturnType<typeof getFirestore>;
if (!isStagingTest()) {
  if (getApps().length === 0) {
    initializeApp({
      projectId: 'duty-82f42',
    });
  }
  adminDb = getFirestore();
  // Connect to emulator
  adminDb.settings({
    host: 'localhost:8085',
    ssl: false,
  });
}

test.describe('Equipment Quantity with Pending Transfers OUT', () => {
  let testEquipmentId: string;
  let testUnitId: string;
  let testAssignmentId: string;
  let testTransferIds: string[] = [];

  test.beforeAll(async () => {
    if (isStagingTest()) {
      console.log('Skipping setup for staging test');
      return;
    }

    // Create test data in Firestore emulator
    console.log('Setting up test data...');

    // 1. Create a test unit
    const unitRef = await adminDb.collection('units').add({
      name: 'Test Unit 6724',
      unitType: 'company',
      battalionId: 'test-battalion-1',
      createdAt: new Date(),
    });
    testUnitId = unitRef.id;
    console.log(`Created test unit: ${testUnitId}`);

    // 2. Create equipment: אלונקה
    const equipmentRef = await adminDb.collection('equipment').add({
      name: 'אלונקה',
      totalQuantity: 5,
      serialTracking: false,
      battalionId: 'test-battalion-1',
      createdAt: new Date(),
    });
    testEquipmentId = equipmentRef.id;
    console.log(`Created equipment: ${testEquipmentId}`);

    // 3. Create assignment: 5 אלונקה assigned to test unit
    const assignmentRef = await adminDb.collection('assignments').add({
      equipmentId: testEquipmentId,
      unitId: testUnitId,
      quantity: 5,
      assignedType: 'unit',
      assignedAt: new Date(),
    });
    testAssignmentId = assignmentRef.id;
    console.log(`Created assignment: ${testAssignmentId}`);

    // 4. Create 2 pending transfer requests OUT (to another unit)
    const otherUnitRef = await adminDb.collection('units').add({
      name: 'Other Unit',
      unitType: 'company',
      battalionId: 'test-battalion-1',
      createdAt: new Date(),
    });

    const transfer1Ref = await adminDb.collection('assignmentRequests').add({
      equipmentId: testEquipmentId,
      fromUnitId: testUnitId,
      toUnitId: otherUnitRef.id,
      quantity: 1,
      status: 'pending_transfer',
      requestType: 'transfer',
      createdAt: new Date(),
    });
    testTransferIds.push(transfer1Ref.id);

    const transfer2Ref = await adminDb.collection('assignmentRequests').add({
      equipmentId: testEquipmentId,
      fromUnitId: testUnitId,
      toUnitId: otherUnitRef.id,
      quantity: 1,
      status: 'pending_transfer',
      requestType: 'transfer',
      createdAt: new Date(),
    });
    testTransferIds.push(transfer2Ref.id);

    console.log(`Created 2 pending transfers: ${testTransferIds.join(', ')}`);
    console.log('Test data setup complete!');
  });

  test.afterAll(async () => {
    if (isStagingTest()) {
      console.log('Skipping cleanup for staging test');
      return;
    }

    // Clean up test data
    console.log('Cleaning up test data...');

    if (testEquipmentId) {
      await adminDb.collection('equipment').doc(testEquipmentId).delete();
    }
    if (testAssignmentId) {
      await adminDb.collection('assignments').doc(testAssignmentId).delete();
    }
    for (const transferId of testTransferIds) {
      await adminDb.collection('assignmentRequests').doc(transferId).delete();
    }
    if (testUnitId) {
      await adminDb.collection('units').doc(testUnitId).delete();
    }

    console.log('Cleanup complete!');
  });

  test.beforeEach(async ({ page }) => {
    if (!isStagingTest()) {
      await clearAuthState(page);
    }
  });

  test('[QUANTITY-ADJUST] should show x3 not x5 when 2 items are pending transfer OUT', async ({ page }) => {
    if (isStagingTest()) {
      console.log('Skipping test - requires emulator setup');
      test.skip();
      return;
    }

    // Login as unit leader
    await loginAsTestUser(page, 'leader');
    await page.goto('/equipment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Navigate to Equipment tab
    const equipmentTab = page.getByRole('tab', { name: /ציוד|equipment/i }).first();
    if (await equipmentTab.isVisible()) {
      await equipmentTab.click();
      await page.waitForTimeout(500);
    }

    // Find the אלונקה row
    const alenkaRow = page.locator('table tbody tr, [data-testid="equipment-item"]')
      .filter({ hasText: 'אלונקה' });

    // Verify the row exists
    await expect(alenkaRow).toBeVisible({ timeout: 5000 });

    // Check the quantity column
    // The displayed quantity should be 3 (5 total - 2 pending transfer OUT)
    // NOT 5 (the total quantity)
    const quantityCell = alenkaRow.locator('td').filter({ hasText: /x?\d+/ });
    const quantityText = await quantityCell.textContent();

    console.log(`Quantity displayed: ${quantityText}`);

    // Assert: Should show x3 (or just "3"), not x5
    expect(quantityText).toMatch(/3/);
    expect(quantityText).not.toMatch(/5/);

    // Additional check: The row should indicate 2 items are pending transfer
    // (This depends on UI implementation - may show badge or text)
    const rowText = await alenkaRow.textContent();
    console.log(`Row text: ${rowText}`);
  });

  test('[QUANTITY-HIDE] should hide row entirely if all items are pending transfer OUT', async ({ page }) => {
    if (isStagingTest()) {
      console.log('Skipping test - requires emulator setup');
      test.skip();
      return;
    }

    // This test verifies the edge case: if ALL 5 items were pending transfer,
    // the row should be hidden entirely (not shown in Equipment tab)

    // Create additional test data: 3 more pending transfers (total 5 pending)
    const otherUnit = await adminDb.collection('units')
      .where('name', '==', 'Other Unit')
      .get();

    const transfer3Ref = await adminDb.collection('assignmentRequests').add({
      equipmentId: testEquipmentId,
      fromUnitId: testUnitId,
      toUnitId: otherUnit.docs[0].id,
      quantity: 3,
      status: 'pending_transfer',
      requestType: 'transfer',
      createdAt: new Date(),
    });
    testTransferIds.push(transfer3Ref.id);

    // Login and check
    await loginAsTestUser(page, 'leader');
    await page.goto('/equipment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const equipmentTab = page.getByRole('tab', { name: /ציוד|equipment/i }).first();
    if (await equipmentTab.isVisible()) {
      await equipmentTab.click();
      await page.waitForTimeout(500);
    }

    // אלונקה row should NOT be visible (all items pending transfer OUT)
    const alenkaRow = page.locator('table tbody tr, [data-testid="equipment-item"]')
      .filter({ hasText: 'אלונקה' });

    await expect(alenkaRow).not.toBeVisible();

    console.log('Row correctly hidden when all items are pending transfer OUT');
  });
});
