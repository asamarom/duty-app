import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('Dashboard first load under 3s', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const duration = Date.now() - start;
    expect(duration, `Dashboard loaded in ${duration}ms — expected < 3000ms`).toBeLessThan(3000);
  });

  test('Navigation between screens under 800ms after first load', async ({ page }) => {
    // First load — let prefetch run
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to Personnel
    const t1 = Date.now();
    await page.goto('/personnel');
    await page.waitForLoadState('domcontentloaded');
    const d1 = Date.now() - t1;
    expect(d1, `Personnel navigation took ${d1}ms — expected < 800ms`).toBeLessThan(800);

    // Navigate to Equipment
    const t2 = Date.now();
    await page.goto('/equipment');
    await page.waitForLoadState('domcontentloaded');
    const d2 = Date.now() - t2;
    expect(d2, `Equipment navigation took ${d2}ms — expected < 800ms`).toBeLessThan(800);

    // Navigate back to Dashboard
    const t3 = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const d3 = Date.now() - t3;
    expect(d3, `Dashboard return navigation took ${d3}ms — expected < 800ms`).toBeLessThan(800);
  });

  test('Data is visible after navigation without manual refresh', async ({ page }) => {
    // Validates that onSnapshot listeners are active and pushing data
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to Personnel — data should be present from listener
    await page.goto('/personnel');
    await page.waitForLoadState('networkidle');
    // Personnel table/list should have content from the onSnapshot listener
    const personnelContent = page.locator('table tbody tr, [data-testid="personnel-row"], .personnel-list-item').first();
    await expect(personnelContent).toBeVisible({ timeout: 5000 });

    // Navigate to Equipment — data should be present from listener
    await page.goto('/equipment');
    await page.waitForLoadState('networkidle');
    // Equipment list should have content
    const equipmentContent = page.locator('table tbody tr, [data-testid="equipment-row"], .equipment-list-item').first();
    await expect(equipmentContent).toBeVisible({ timeout: 5000 });
  });
});
