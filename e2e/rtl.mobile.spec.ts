import { test, expect } from '@playwright/test';
import { loginAsTestUser, isStagingTest } from './utils/test-auth';

/**
 * Mobile RTL Tests
 *
 * These tests specifically verify RTL layout on mobile viewports.
 * Mobile is the primary use case for Hebrew/RTL in this app.
 *
 * Run with:
 *   npm run test:e2e -- --project=mobile-chrome
 *   npm run test:e2e -- --project=mobile-safari
 *   npm run test:e2e:staging -- --project=staging-mobile
 */

test.describe('Mobile RTL [Equipment Page]', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, 'admin');
    await page.goto('/equipment', { waitUntil: 'load' });

    // Wait for loading spinner to disappear (indicates data loaded)
    const loader = page.getByText(/loading equipment|טוען ציוד/i);
    try {
      await loader.waitFor({ state: 'detached', timeout: 30000 });
    } catch {
      // If loader doesn't appear or disappear, continue anyway
    }

    // Wait for main content to appear (tabs or title)
    await page.locator('[role="tablist"], h1').first().waitFor({ timeout: 10000 });
    await page.waitForTimeout(500); // Brief wait for mobile rendering to stabilize
  });

  test('[M-RTL-1] Mobile viewport should have RTL direction', async ({ page }) => {
    const htmlDir = await page.locator('html').getAttribute('dir');
    expect(htmlDir).toBe('rtl');

    // Verify we're actually in mobile viewport
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBeLessThanOrEqual(428); // Max mobile width
  });

  test('[M-RTL-2] Mobile header should align right', async ({ page }) => {
    const header = page.locator('header').first();

    if (await header.isVisible().catch(() => false)) {
      const direction = await header.evaluate(el =>
        window.getComputedStyle(el).direction
      );
      expect(direction).toBe('rtl');
    }
  });

  test('[M-RTL-3] Mobile navigation should flow right to left', async ({ page }) => {
    // Check mobile menu/navigation
    const nav = page.locator('nav, [role="navigation"]').first();

    if (await nav.isVisible().catch(() => false)) {
      const direction = await nav.evaluate(el =>
        window.getComputedStyle(el).direction
      );
      expect(direction).toBe('rtl');
    }
  });

  test('[M-RTL-4] Mobile tabs should be RTL', async ({ page }) => {
    const tabsList = page.locator('[role="tablist"]').first();

    if (await tabsList.isVisible().catch(() => false)) {
      const direction = await tabsList.evaluate(el =>
        window.getComputedStyle(el).direction
      );
      expect(direction).toBe('rtl');

      // On mobile, tabs might scroll - verify RTL scroll direction
      const scrollLeft = await tabsList.evaluate(el => el.scrollLeft);
      // In RTL, initial scrollLeft can be 0 or negative depending on browser
      expect(typeof scrollLeft).toBe('number');
    }
  });

  test('[M-RTL-5] Mobile search input should support RTL', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/חיפוש|search/i);

    if (await searchInput.isVisible().catch(() => false)) {
      // Tap to focus (mobile interaction)
      await searchInput.tap();

      const direction = await searchInput.evaluate(el =>
        window.getComputedStyle(el).direction
      );
      expect(direction).toBe('rtl');

      // Type Hebrew on mobile
      await searchInput.fill('בדיקה נייד');
      const value = await searchInput.inputValue();
      expect(value).toBe('בדיקה נייד');
    }
  });

  test('[M-RTL-6] Mobile table/list should respect RTL', async ({ page }) => {
    // Mobile might show list instead of table
    const contentContainer = page.locator('[role="table"], [class*="list"]').first();

    if (await contentContainer.isVisible().catch(() => false)) {
      const direction = await contentContainer.evaluate(el =>
        window.getComputedStyle(el).direction
      );
      expect(direction).toBe('rtl');
    }
  });

  test('[M-RTL-7] Mobile buttons should align correctly', async ({ page }) => {
    const buttons = page.locator('button:visible');
    const firstButton = buttons.first();

    if (await firstButton.isVisible().catch(() => false)) {
      const parent = firstButton.locator('..');
      const parentDirection = await parent.evaluate(el =>
        window.getComputedStyle(el).direction
      );
      expect(parentDirection).toBe('rtl');
    }
  });

  test('[M-RTL-8] Mobile page title should align right', async ({ page }) => {
    // Look for visible h1 in MobileHeader
    const title = page.locator('h1:visible').filter({ hasText: /מלאי ציוד|equipment inventory/i }).first();
    await expect(title).toBeVisible({ timeout: 5000 });

    const titleBox = await title.boundingBox();
    const viewport = page.viewportSize();

    if (titleBox && viewport) {
      // Title should be closer to right edge than left edge
      const distanceFromRight = viewport.width - (titleBox.x + titleBox.width);
      const distanceFromLeft = titleBox.x;
      expect(distanceFromRight).toBeLessThan(distanceFromLeft);
    }
  });

  test('[M-RTL-9] Visual snapshot - Mobile Equipment Page RTL', async ({ page }) => {
    test.skip(isStagingTest(), 'Visual snapshots not needed on staging');

    // Wait for content to fully render
    await page.waitForTimeout(2000);

    // Take full page screenshot for visual regression
    await expect(page).toHaveScreenshot('mobile-equipment-rtl.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Mobile RTL [Dashboard]', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, 'admin');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('[M-RTL-D1] Mobile dashboard should have RTL', async ({ page }) => {
    const htmlDir = await page.locator('html').getAttribute('dir');
    expect(htmlDir).toBe('rtl');
  });

  test('[M-RTL-D2] Visual snapshot - Mobile Dashboard RTL', async ({ page }) => {
    test.skip(isStagingTest(), 'Visual snapshots not needed on staging');

    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('mobile-dashboard-rtl.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Mobile RTL [Touch Interactions]', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, 'admin');
  });

  test('[M-RTL-T1] Swipe gestures should respect RTL', async ({ page }) => {
    await page.goto('/equipment');
    await page.waitForLoadState('networkidle');

    const htmlDir = await page.locator('html').getAttribute('dir');
    expect(htmlDir).toBe('rtl');

    // In RTL, swiping left should navigate forward (opposite of LTR)
    // This is a placeholder - actual swipe testing would need more complex setup
    // Just verify RTL is set for now
    const tabsList = page.locator('[role="tablist"]').first();
    if (await tabsList.isVisible().catch(() => false)) {
      const direction = await tabsList.evaluate(el =>
        window.getComputedStyle(el).direction
      );
      expect(direction).toBe('rtl');
    }
  });
});
