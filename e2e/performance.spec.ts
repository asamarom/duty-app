import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './utils/test-auth';

test.describe('Performance', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, 'admin');
  });

  test('Dashboard first load under 3s', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    // Wait for dashboard heading to be visible — measures meaningful render time.
    // Avoid networkidle: onSnapshot keeps WebSocket connections open indefinitely.
    await expect(page.getByRole('heading', { name: /לוח בקרה|dashboard/i }).first()).toBeVisible({ timeout: 3000 });
    const duration = Date.now() - start;
    expect(duration, `Dashboard loaded in ${duration}ms — expected < 3000ms`).toBeLessThan(3000);
  });

  test('Navigation between screens under 800ms after first load', async ({ page }) => {
    // First load — let prefetch warm onSnapshot listeners
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: /לוח בקרה|dashboard/i }).first()).toBeVisible({ timeout: 5000 });

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
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: /לוח בקרה|dashboard/i }).first()).toBeVisible({ timeout: 5000 });

    // Navigate to Personnel — data should be present from onSnapshot listener
    await page.goto('/personnel');
    await page.waitForLoadState('domcontentloaded');
    // Personnel items render as .card-tactical divs (PersonnelCard component)
    const personnelContent = page.locator('.card-tactical').first();
    await expect(personnelContent).toBeVisible({ timeout: 8000 });

    // Navigate to Equipment — data should be present from onSnapshot listener
    await page.goto('/equipment');
    await page.waitForLoadState('domcontentloaded');
    // Equipment renders a table on desktop (EquipmentTable component, hidden lg:table)
    const equipmentContent = page.locator('table tbody tr').first();
    await expect(equipmentContent).toBeVisible({ timeout: 8000 });
  });
});
