import { test, expect } from '@playwright/test';

test.describe('Authentication Page', () => {
  test('should display auth page with Google sign-in button', async ({ page }) => {
    await page.goto('/auth');

    // Check page title and branding
    await expect(page.getByTestId('system-name')).toBeVisible();
    await expect(page.getByTestId('system-tagline')).toBeVisible();

    // Check welcome card
    await expect(page.getByTestId('auth-welcome')).toBeVisible();
    await expect(page.getByTestId('auth-sign-in-desc')).toBeVisible();

    // Check Google sign-in button
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
  });

  test('should redirect to auth page when accessing protected route without login', async ({ page }) => {
    // Try to access protected dashboard
    await page.goto('/');

    // Should redirect to auth page
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should redirect to auth when accessing equipment page without login', async ({ page }) => {
    await page.goto('/equipment');
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should redirect to auth when accessing personnel page without login', async ({ page }) => {
    await page.goto('/personnel');
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should show 404 page for unknown routes', async ({ page }) => {
    await page.goto('/unknown-route-12345');
    await expect(page.getByText('404')).toBeVisible();
  });
});
