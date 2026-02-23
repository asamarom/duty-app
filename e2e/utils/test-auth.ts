import { Page, expect } from '@playwright/test';

/**
 * Test user types matching the seeded test users.
 */
export type TestUserType = 'admin' | 'leader' | 'user' | 'new' | 'pending' | 'declined';

/**
 * Test user metadata for verification after login.
 */
export const TEST_USER_INFO: Record<TestUserType, {
  email: string;
  displayName: string;
  role: string;
  approvalStatus: string;
  expectedRoute: string;
}> = {
  admin: {
    email: 'test-admin@e2e.local',
    displayName: 'Test Admin',
    role: 'admin',
    approvalStatus: 'approved',
    expectedRoute: '/', // Dashboard
  },
  leader: {
    email: 'test-leader@e2e.local',
    displayName: 'Test Leader',
    role: 'leader',
    approvalStatus: 'approved',
    expectedRoute: '/', // Dashboard
  },
  user: {
    email: 'test-user@e2e.local',
    displayName: 'Test User',
    role: 'user',
    approvalStatus: 'approved',
    expectedRoute: '/', // Dashboard
  },
  new: {
    email: 'test-new@e2e.local',
    displayName: 'Test New User',
    role: 'none',
    approvalStatus: 'none',
    expectedRoute: '/signup-request', // Signup form
  },
  pending: {
    email: 'test-pending@e2e.local',
    displayName: 'Test Pending User',
    role: 'none',
    approvalStatus: 'pending',
    expectedRoute: '/pending-approval', // Pending page
  },
  declined: {
    email: 'test-declined@e2e.local',
    displayName: 'Test Declined User',
    role: 'none',
    approvalStatus: 'declined',
    expectedRoute: '/pending-approval', // Shows decline reason
  },
};

/**
 * Check if we're running on staging (real Firebase, not emulators).
 */
export function isStagingTest(): boolean {
  return process.env.TEST_ENV === 'staging';
}

/**
 * Login as a test user.
 *
 * - On local/emulator: Uses the test login form
 * - On staging: Uses pre-authenticated storage state (no login needed)
 *
 * Prerequisites:
 * - Local: App must be running with VITE_TEST_MODE=true and test users seeded
 * - Staging: Auth setup must have run to create storage state files
 *
 * @param page - Playwright page instance
 * @param userType - Type of test user to login as
 * @param options - Additional options
 */
export async function loginAsTestUser(
  page: Page,
  userType: TestUserType,
  options: {
    /** Wait for navigation after login. Default: true */
    waitForNavigation?: boolean;
    /** Expected URL after login. Default: auto-detect based on user type */
    expectedUrl?: string;
  } = {}
): Promise<void> {
  const { waitForNavigation = true, expectedUrl } = options;
  const userInfo = TEST_USER_INFO[userType];

  // On staging, storage state is already loaded via project config
  // Just navigate to the expected page - we're already authenticated
  if (isStagingTest()) {
    const targetUrl = expectedUrl ?? userInfo.expectedRoute;
    await page.goto(targetUrl);

    if (waitForNavigation) {
      await page.waitForURL(`**${targetUrl}`, { timeout: 15000 });
    }
    return;
  }

  // Local: use test login form
  // Navigate to auth page
  await page.goto('/auth');

  // Wait for the test login form to be visible
  const testLoginForm = page.getByTestId('test-login-form');
  await expect(testLoginForm).toBeVisible({ timeout: 10000 });

  // Open the user select dropdown
  const selectTrigger = page.getByTestId('test-user-select');
  await selectTrigger.click();

  // Select the test user
  const userOption = page.getByTestId(`test-user-${userType}`);
  await userOption.click();

  // Click the login button
  const loginButton = page.getByTestId('test-login-button');
  await loginButton.click();

  // Wait a moment for login response
  await page.waitForTimeout(2000);

  // Check for error message (indicates test users not seeded)
  const testForm = page.getByTestId('test-login-form');
  const errorText = testForm.getByText(/invalid login credentials/i);
  const hasError = await errorText.isVisible().catch(() => false);
  if (hasError) {
    throw new Error(
      `Login failed for test user "${userType}": Invalid login credentials\n\n` +
      `Test users may not be seeded in the Auth Emulator.\n` +
      `Ensure the emulator is running: firebase emulators:start --only auth,firestore\n` +
      `Then seed users: node scripts/seed-emulator-users.js`
    );
  }

  // Wait for navigation if requested
  if (waitForNavigation) {
    const targetUrl = expectedUrl ?? userInfo.expectedRoute;
    await page.waitForURL(`**${targetUrl}`, { timeout: 15000 });
  }
}

/**
 * Logout the current user.
 *
 * @param page - Playwright page instance
 */
export async function logoutTestUser(page: Page): Promise<void> {
  // Look for logout button - in Hebrew it's "התנתק"
  const logoutButton = page.getByRole('button', { name: /logout|sign out|יציאה|התנתק/i })
    .or(page.getByText(/logout|sign out|יציאה|התנתק/i));

  // If not visible, try opening user menu first
  const userMenu = page.getByTestId('user-menu').or(page.getByRole('button', { name: /profile|user/i }));
  if (await userMenu.isVisible()) {
    await userMenu.click();
  }

  await logoutButton.click();

  // Wait to be redirected to auth page
  await page.waitForURL('**/auth', { timeout: 10000 });
}

/**
 * Check if the test login form is visible (test mode is enabled).
 *
 * @param page - Playwright page instance
 * @returns true if test mode is enabled
 */
export async function isTestModeEnabled(page: Page): Promise<boolean> {
  await page.goto('/auth');
  // Wait for the auth page to fully load
  await page.waitForLoadState('networkidle');
  const testLoginForm = page.getByTestId('test-login-form');
  // Use expect with a longer timeout for reliability
  try {
    await expect(testLoginForm).toBeVisible({ timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify that the user is logged in as the expected test user.
 *
 * @param page - Playwright page instance
 * @param userType - Expected test user type
 */
export async function verifyLoggedInAs(page: Page, userType: TestUserType): Promise<void> {
  const userInfo = TEST_USER_INFO[userType];

  // Check that we're on the expected route
  await expect(page).toHaveURL(new RegExp(userInfo.expectedRoute));

  // For approved users, verify dashboard/main content is visible
  if (userInfo.approvalStatus === 'approved') {
    // Look for the dashboard heading specifically
    const dashboardHeading = page.getByRole('heading', { name: /לוח בקרה|dashboard/i }).first();
    await expect(dashboardHeading).toBeVisible({ timeout: 10000 });
  }
}

/**
 * Clear all auth state (useful for test cleanup).
 *
 * @param page - Playwright page instance
 */
export async function clearAuthState(page: Page): Promise<void> {
  // Navigate to the app first if on about:blank to avoid SecurityError
  const currentUrl = page.url();
  if (currentUrl === 'about:blank' || (!currentUrl.includes('localhost') && !currentUrl.includes('duty-82f42.web.app'))) {
    await page.goto('/auth');
  }

  await page.evaluate(async () => {
    // Clear Firebase auth state from IndexedDB
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name && (db.name.includes('firebase') || db.name.includes('firebaseLocalStorage'))) {
        indexedDB.deleteDatabase(db.name);
      }
    }

    // Clear Firebase auth tokens from localStorage
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.includes('firebase') || key.includes('auth')) {
        localStorage.removeItem(key);
      }
    }
  });
}

/**
 * Check if we're running against production Firebase URL.
 */
export function isProductionTest(): boolean {
  return process.env.TEST_ENV === 'production';
}
