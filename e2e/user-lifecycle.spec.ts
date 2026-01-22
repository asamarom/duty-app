import { test, expect } from '@playwright/test';
import {
  loginAsTestUser,
  logoutTestUser,
  isTestModeEnabled,
  verifyLoggedInAs,
  clearAuthState,
  TEST_USER_INFO,
  type TestUserType,
} from './utils/test-auth';

test.describe('User Lifecycle E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await clearAuthState(page);
  });

  test.describe('Test Mode Verification', () => {
    test('should show test login form when VITE_TEST_MODE=true', async ({ page }) => {
      const testModeActive = await isTestModeEnabled(page);
      expect(testModeActive).toBe(true);
    });

    test('should display all test user options in dropdown', async ({ page }) => {
      await page.goto('/auth');

      // Open the dropdown
      const selectTrigger = page.getByTestId('test-user-select');
      await selectTrigger.click();

      // Verify all user options are available
      const userTypes: TestUserType[] = ['admin', 'leader', 'user', 'new', 'pending', 'declined'];
      for (const userType of userTypes) {
        const option = page.getByTestId(`test-user-${userType}`);
        await expect(option).toBeVisible();
      }
    });
  });

  test.describe('Approved Users - Dashboard Access', () => {
    test('admin user should access dashboard', async ({ page }) => {
      await loginAsTestUser(page, 'admin');
      await verifyLoggedInAs(page, 'admin');

      // Admin should see admin-specific features
      await expect(page.getByRole('heading', { name: /לוח בקרה|dashboard/i }).first()).toBeVisible();
    });

    test('leader user should access dashboard', async ({ page }) => {
      await loginAsTestUser(page, 'leader');
      await verifyLoggedInAs(page, 'leader');

      await expect(page.getByRole('heading', { name: /לוח בקרה|dashboard/i }).first()).toBeVisible();
    });

    test('regular user should access dashboard', async ({ page }) => {
      await loginAsTestUser(page, 'user');
      await verifyLoggedInAs(page, 'user');

      await expect(page.getByRole('heading', { name: /לוח בקרה|dashboard/i }).first()).toBeVisible();
    });
  });

  test.describe('Unapproved Users - Restricted Access', () => {
    test('new user should be redirected to signup request page', async ({ page }) => {
      await loginAsTestUser(page, 'new');

      // Should be on signup request page
      await expect(page).toHaveURL(/signup-request/);

      // Should see signup form heading
      await expect(page.getByRole('heading', { name: /signup|registration|הרשמה|בקשה/i }).first()).toBeVisible();
    });

    test('pending user should see pending approval page', async ({ page }) => {
      await loginAsTestUser(page, 'pending');

      // Should be on pending approval page
      await expect(page).toHaveURL(/pending-approval/);

      // Should see pending message heading
      await expect(page.getByRole('heading', { name: /pending|ממתין|waiting/i }).first()).toBeVisible();
    });

    test('declined user should see decline reason', async ({ page }) => {
      await loginAsTestUser(page, 'declined');

      // Should be on pending approval page (shows decline info)
      await expect(page).toHaveURL(/pending-approval/);

      // Should see declined message heading
      await expect(page.getByRole('heading', { name: /declined|נדחה|denied/i }).first()).toBeVisible();
    });
  });

  test.describe('Logout Flow', () => {
    test('should successfully logout and redirect to auth page', async ({ page }) => {
      // Login first
      await loginAsTestUser(page, 'user');
      await verifyLoggedInAs(page, 'user');

      // Logout
      await logoutTestUser(page);

      // Should be back on auth page
      await expect(page).toHaveURL(/auth/);

      // Test login form should be visible again
      const testLoginForm = page.getByTestId('test-login-form');
      await expect(testLoginForm).toBeVisible();
    });
  });

  test.describe('Role-Based Navigation', () => {
    test('admin should see admin menu items', async ({ page }) => {
      await loginAsTestUser(page, 'admin');

      // Admin should see settings link in navigation
      const navigation = page.locator('nav, [role="navigation"], aside');
      await expect(navigation.getByRole('link', { name: /settings|הגדרות/i })).toBeVisible();
    });

    test('regular user should have limited navigation', async ({ page }) => {
      await loginAsTestUser(page, 'user');

      // Regular user should see basic navigation
      const navigation = page.locator('nav, [role="navigation"], aside');

      // Should see dashboard link
      await expect(navigation.getByRole('link', { name: /לוח בקרה|dashboard/i })).toBeVisible();
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain session after page refresh', async ({ page }) => {
      await loginAsTestUser(page, 'admin');
      await verifyLoggedInAs(page, 'admin');

      // Refresh the page
      await page.reload();

      // Should still be logged in and on dashboard
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { name: /לוח בקרה|dashboard/i }).first()).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('unauthenticated user should be redirected to auth page', async ({ page }) => {
      // Try to access dashboard directly without login
      await page.goto('/');

      // Should be redirected to auth
      await expect(page).toHaveURL(/auth/);
    });

    test('new user cannot access dashboard directly', async ({ page }) => {
      await loginAsTestUser(page, 'new', { waitForNavigation: false });

      // Try to navigate to dashboard
      await page.goto('/');

      // Should be redirected to signup-request
      await expect(page).toHaveURL(/signup-request/);
    });

    test('pending user cannot access dashboard directly', async ({ page }) => {
      await loginAsTestUser(page, 'pending', { waitForNavigation: false });

      // Try to navigate to dashboard
      await page.goto('/');

      // Should be redirected to pending-approval
      await expect(page).toHaveURL(/pending-approval/);
    });
  });
});

test.describe('Full User Lifecycle Flow', () => {
  test('complete lifecycle: login -> navigate -> logout -> login as different user', async ({ page }) => {
    // Step 1: Login as admin
    await loginAsTestUser(page, 'admin');
    await expect(page.getByRole('heading', { name: /לוח בקרה|dashboard/i }).first()).toBeVisible();

    // Step 2: Navigate around (verify admin access)
    const settingsLink = page.getByText(/settings|הגדרות/i);
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await expect(page).toHaveURL(/settings/);
    }

    // Step 3: Logout
    await logoutTestUser(page);
    await expect(page).toHaveURL(/auth/);

    // Step 4: Login as regular user
    await loginAsTestUser(page, 'user');
    await expect(page.getByRole('heading', { name: /לוח בקרה|dashboard/i }).first()).toBeVisible();

    // Verify we're logged in as different user
    await verifyLoggedInAs(page, 'user');
  });
});
