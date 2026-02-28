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
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Auth state file paths (relative to e2e directory)
const authFiles = {
  admin: path.join(__dirname, '.auth', 'staging-admin.json'),
  leader: path.join(__dirname, '.auth', 'staging-leader.json'),
  user: path.join(__dirname, '.auth', 'staging-user.json'),
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

  // Wait for app to fully load
  await page.waitForLoadState('domcontentloaded');

  // Sign in using custom token via Firebase SDK
  // We need to use the SAME Firebase instance that the app uses
  const authResult = await page.evaluate(async ({ customToken }) => {
    // Access the app's Firebase auth instance that should already be initialized
    // @ts-ignore - accessing global Firebase instance
    const auth = window.auth;

    if (!auth) {
      throw new Error('App Firebase auth instance not found on window.auth');
    }

    // Dynamically import signInWithCustomToken
    const { signInWithCustomToken } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

    // Sign in with custom token using the app's existing auth instance
    const userCredential = await signInWithCustomToken(auth, customToken);

    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email
    };
  }, { customToken: token });

  console.log(`🔓 Signed in as: ${authResult.email} (${authResult.uid})`);

  // Wait for Firebase to persist auth state to localStorage/IndexedDB
  // and for the app to redirect to the dashboard
  await page.waitForTimeout(5000);

  // Additionally wait for navigation to complete
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
    console.log('⚠️  networkidle timeout - continuing anyway');
  });

  // Verify we're authenticated by checking we're on dashboard (not auth page)
  const currentUrl = page.url();
  if (currentUrl.includes('/auth')) {
    throw new Error(`Authentication failed for ${userType} - still on auth page`);
  }

  // Set admin mode to ON for admin users in localStorage
  if (userType === 'admin') {
    await page.evaluate(() => {
      localStorage.setItem('pmtb_admin_mode', 'true');
    });
    console.log(`🔑 Set admin mode to ON in localStorage`);
  }

  console.log(`✅ Authenticated as ${userType}, saving session...`);
  console.log(`📁 Target path: ${authFiles[userType]}`);
  console.log(`📁 Directory exists: ${fs.existsSync(path.dirname(authFiles[userType]))}`);
  console.log(`📁 Working directory: ${process.cwd()}`);

  // Save authenticated session
  try {
    await page.context().storageState({ path: authFiles[userType] });
    console.log(`💾 Session saved successfully`);

    // Verify file was created
    if (fs.existsSync(authFiles[userType])) {
      const stats = fs.statSync(authFiles[userType]);
      console.log(`✅ File verified: ${authFiles[userType]} (${stats.size} bytes)`);
    } else {
      throw new Error(`File was not created at ${authFiles[userType]}`);
    }
  } catch (error) {
    console.error(`❌ Failed to save session: ${error}`);
    throw error;
  }
}
