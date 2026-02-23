/**
 * Staging Auth Setup for E2E Tests
 *
 * This script creates pre-authenticated Playwright sessions for staging tests.
 * It uses Firebase custom tokens to authenticate test users without needing
 * the test login form (which only works with emulators).
 *
 * Run automatically by CI before E2E tests.
 */

import { test as setup, expect } from '@playwright/test';

// Firebase Staging config (from environment variables)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || '',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.VITE_FIREBASE_APP_ID || '',
};

// Custom tokens generated server-side (via GitHub Actions secrets)
const TEST_USER_TOKENS = {
  admin: process.env.TEST_USER_ADMIN_TOKEN || '',
  leader: process.env.TEST_USER_LEADER_TOKEN || '',
  user: process.env.TEST_USER_USER_TOKEN || '',
};

const authFiles = {
  admin: './e2e/.auth/staging-admin.json',
  leader: './e2e/.auth/staging-leader.json',
  user: './e2e/.auth/staging-user.json',
};

setup('authenticate as admin', async ({ page }) => {
  await authenticateAndSave(page, 'admin');
});

setup('authenticate as leader', async ({ page }) => {
  await authenticateAndSave(page, 'leader');
});

setup('authenticate as user', async ({ page }) => {
  await authenticateAndSave(page, 'user');
});

async function authenticateAndSave(page: any, userType: 'admin' | 'leader' | 'user') {
  const token = TEST_USER_TOKENS[userType];

  if (!token) {
    throw new Error(
      `No custom token for ${userType}.\n\n` +
      `Generate tokens by running: node scripts/generate-staging-auth-tokens.cjs\n` +
      `Then add them to GitHub Secrets:\n` +
      `  - TEST_USER_ADMIN_TOKEN\n` +
      `  - TEST_USER_LEADER_TOKEN\n` +
      `  - TEST_USER_USER_TOKEN`
    );
  }

  console.log(`🔐 Authenticating as ${userType}...`);

  // Navigate to the staging app
  await page.goto('/');

  // Sign in using custom token via Firebase SDK
  await page.evaluate(async ({ config, customToken }) => {
    // Dynamically import Firebase SDK
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getAuth, signInWithCustomToken } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

    // Initialize Firebase
    const app = initializeApp(config);
    const auth = getAuth(app);

    // Sign in with custom token
    await signInWithCustomToken(auth, customToken);
  }, { config: firebaseConfig, customToken: token });

  // Wait for authentication to complete and redirect
  await page.waitForTimeout(3000);

  // Verify we're authenticated by checking we're on dashboard (not auth page)
  const currentUrl = page.url();
  if (currentUrl.includes('/auth')) {
    throw new Error(`Authentication failed for ${userType} - still on auth page`);
  }

  console.log(`✅ Authenticated as ${userType}, saving session...`);

  // Save authenticated session
  await page.context().storageState({ path: authFiles[userType] });

  console.log(`💾 Session saved to ${authFiles[userType]}`);
}
