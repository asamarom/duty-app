import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './utils/test-auth';

/**
 * RTL (Right-to-Left) Layout Tests
 *
 * Tests Hebrew language layout and direction on key pages.
 * These tests verify that RTL alignment works correctly on both
 * desktop and mobile viewports.
 */

test.describe('RTL Layout [Equipment Page]', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, 'admin');
    await page.goto('/equipment', { waitUntil: 'load' });
    // Wait for page content to load (equipment stats or title)
    await page.locator('h1').filter({ hasText: /מלאי ציוד|equipment/i }).waitFor({ timeout: 10000 });
    await page.waitForTimeout(1000); // Brief wait for data to stabilize
  });

  test('[RTL-1] HTML should have RTL direction', async ({ page }) => {
    const htmlDir = await page.locator('html').getAttribute('dir');
    expect(htmlDir).toBe('rtl');
  });

  test('[RTL-2] Page title should align to the right', async ({ page }) => {
    // Look for title in both desktop header and MobileHeader (h1 only, more specific)
    const title = page.locator('h1').filter({ hasText: /מלאי ציוד|equipment/i }).first();
    await expect(title).toBeVisible({ timeout: 10000 });

    const parent = title.locator('..');
    const titleBox = await title.boundingBox();
    const parentBox = await parent.boundingBox();

    if (titleBox && parentBox) {
      // Title should be near the right edge of its container
      const distanceFromRight = Math.abs(
        (titleBox.x + titleBox.width) - (parentBox.x + parentBox.width)
      );
      expect(distanceFromRight).toBeLessThan(50); // Within 50px of right edge
    }
  });

  test('[RTL-3] Search input should support RTL', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/חיפוש|search/i);

    if (await searchInput.isVisible().catch(() => false)) {
      // Check if input has RTL direction
      const direction = await searchInput.evaluate(el =>
        window.getComputedStyle(el).direction
      );
      expect(direction).toBe('rtl');

      // Type Hebrew text and verify cursor position
      await searchInput.fill('בדיקה');
      const value = await searchInput.inputValue();
      expect(value).toBe('בדיקה');
    }
  });

  test('[RTL-4] Tabs should flow right to left', async ({ page }) => {
    const tabsList = page.locator('[role="tablist"]').first();

    if (await tabsList.isVisible().catch(() => false)) {
      const direction = await tabsList.evaluate(el =>
        window.getComputedStyle(el).direction
      );
      expect(direction).toBe('rtl');

      // Get all tabs
      const tabs = await tabsList.locator('[role="tab"]').all();
      if (tabs.length >= 2) {
        const firstTabBox = await tabs[0].boundingBox();
        const secondTabBox = await tabs[1].boundingBox();

        if (firstTabBox && secondTabBox) {
          // In RTL, first tab should be to the RIGHT of second tab
          expect(firstTabBox.x).toBeGreaterThan(secondTabBox.x);
        }
      }
    }
  });

  test('[RTL-5] Table should respect RTL layout', async ({ page }) => {
    const table = page.locator('[role="table"]').first();

    if (await table.isVisible().catch(() => false)) {
      // Table container should have RTL direction
      const direction = await table.evaluate(el =>
        window.getComputedStyle(el).direction
      );
      expect(direction).toBe('rtl');

      // First column should be on the right
      const firstCell = table.locator('[role="cell"]').first();
      const lastCell = table.locator('[role="cell"]').nth(1);

      if (await firstCell.isVisible().catch(() => false) && await lastCell.isVisible().catch(() => false)) {
        const firstBox = await firstCell.boundingBox();
        const lastBox = await lastCell.boundingBox();

        if (firstBox && lastBox) {
          // In RTL table, first cell should be to the right of next cell
          expect(firstBox.x).toBeGreaterThanOrEqual(lastBox.x - 5); // Small margin for borders
        }
      }
    }
  });

  test('[RTL-6] Buttons and actions should align right', async ({ page }) => {
    // Find action buttons container
    const actionsContainer = page.locator('div').filter({
      has: page.locator('button').first()
    }).first();

    if (await actionsContainer.isVisible().catch(() => false)) {
      const direction = await actionsContainer.evaluate(el =>
        window.getComputedStyle(el).direction
      );
      expect(direction).toBe('rtl');
    }
  });

  test('[RTL-7] Stats cards should flow right to left', async ({ page }) => {
    const statsCards = page.locator('.card-tactical, [class*="card"]').filter({
      hasText: /סה"כ|total/i
    });

    if (await statsCards.first().isVisible().catch(() => false)) {
      const direction = await statsCards.first().evaluate(el =>
        window.getComputedStyle(el).direction
      );
      expect(direction).toBe('rtl');
    }
  });
});

test.describe('RTL Layout [Personnel Page]', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, 'admin');
    await page.goto('/personnel');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('[RTL-P1] Personnel page should have RTL direction', async ({ page }) => {
    const htmlDir = await page.locator('html').getAttribute('dir');
    expect(htmlDir).toBe('rtl');

    // Check main content area
    const mainContent = page.locator('main, [role="main"]').first();
    if (await mainContent.isVisible().catch(() => false)) {
      const direction = await mainContent.evaluate(el =>
        window.getComputedStyle(el).direction
      );
      expect(direction).toBe('rtl');
    }
  });

  test('[RTL-P2] Personnel content should respect RTL', async ({ page }) => {
    // Personnel uses grid layout, not table - check for grid or table
    const contentContainer = page.locator('.grid, [role="table"]').first();

    if (await contentContainer.isVisible().catch(() => false)) {
      const direction = await contentContainer.evaluate(el =>
        window.getComputedStyle(el).direction
      );
      expect(direction).toBe('rtl');
    }
  });
});

test.describe('RTL Layout [Dashboard]', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, 'admin');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('[RTL-D1] Dashboard should have RTL direction', async ({ page }) => {
    const htmlDir = await page.locator('html').getAttribute('dir');
    expect(htmlDir).toBe('rtl');
  });

  test('[RTL-D2] Dashboard cards should flow right to left', async ({ page }) => {
    const cardsContainer = page.locator('[class*="grid"]').first();

    if (await cardsContainer.isVisible().catch(() => false)) {
      const direction = await cardsContainer.evaluate(el =>
        window.getComputedStyle(el).direction
      );
      expect(direction).toBe('rtl');
    }
  });
});
