# Maintaining Test Coverage on Staging Without Test Login Form

## Problem

**Test Login Form** (emulator-only feature):
- Available locally with `VITE_TEST_MODE=true` + Firebase emulators
- Simple dropdown to select test users
- NOT available on Vercel staging (real Firebase, no test UI)

**Current Situation:**
- 72 tests use `loginAsTestUser()` which requires test login form
- These tests fail on staging because form doesn't exist
- Losing significant test coverage on staging

---

## Solution: Use Playwright Auth Setup with Firebase Custom Tokens

### Approach: Pre-authenticate Test Users

Instead of using the test login form, we can:
1. Generate Firebase custom tokens (via Admin SDK)
2. Save authenticated sessions to Playwright storage state
3. Use these sessions in tests (same as local tests do)

This allows tests to run on staging with **zero code changes** to existing tests!

---

## Implementation Plan

### Step 1: Create Auth Setup Script for Staging

**File:** `e2e/staging-auth.setup.ts`

```typescript
import { test as setup, expect } from '@playwright/test';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';

// Firebase Staging config (from Vercel env vars)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
};

// Custom tokens generated server-side (via GitHub Actions secret)
const TEST_USER_TOKENS = {
  admin: process.env.TEST_USER_ADMIN_TOKEN,
  leader: process.env.TEST_USER_LEADER_TOKEN,
  user: process.env.TEST_USER_USER_TOKEN,
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

async function authenticateAndSave(page, userType) {
  const token = TEST_USER_TOKENS[userType];
  if (!token) {
    throw new Error(`No custom token for ${userType}. Generate tokens first.`);
  }

  // Navigate to the app
  await page.goto('/');

  // Sign in using custom token
  await page.evaluate(async ({ config, token }) => {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getAuth, signInWithCustomToken } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

    const app = initializeApp(config);
    const auth = getAuth(app);
    await signInWithCustomToken(auth, token);
  }, { config: firebaseConfig, token });

  // Wait for auth to be fully established
  await page.waitForURL('**/', { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  // Save auth state
  await page.context().storageState({ path: authFiles[userType] });
}
```

### Step 2: Generate Custom Tokens (CI Script)

**File:** `scripts/generate-staging-auth-tokens.cjs`

```javascript
/**
 * Generate Firebase custom tokens for staging E2E tests.
 *
 * Usage: node scripts/generate-staging-auth-tokens.cjs
 *
 * Outputs tokens that should be stored as GitHub Secrets:
 * - TEST_USER_ADMIN_TOKEN
 * - TEST_USER_LEADER_TOKEN
 * - TEST_USER_USER_TOKEN
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Load Firebase Staging service account
const serviceAccountPath = path.join(__dirname, '..', 'firebase-staging-service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account not found:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// UIDs from our seeded test users
const TEST_USERS = {
  admin: 'pp7voDBZFPTrl4ldASBlcgpwidv1',   // From seed output
  leader: 'vlxirvIybcTHt6VitMNUCvCN1nj2',  // From seed output
  user: 'fcHGizEBWaU2Kj9xiEOvt2ag3eB2',    // From seed output
};

async function generateTokens() {
  console.log('🔑 Generating custom tokens for staging test users...\n');

  const tokens = {};

  for (const [userType, uid] of Object.entries(TEST_USERS)) {
    try {
      const token = await admin.auth().createCustomToken(uid);
      tokens[userType] = token;
      console.log(`✅ ${userType}: ${token.substring(0, 50)}...`);
    } catch (error) {
      console.error(`❌ Failed to generate token for ${userType}:`, error.message);
    }
  }

  console.log('\n📝 Add these to GitHub Secrets:');
  console.log('\nGitHub Settings → Secrets → Actions → New repository secret:\n');
  console.log(`TEST_USER_ADMIN_TOKEN="${tokens.admin}"`);
  console.log(`TEST_USER_LEADER_TOKEN="${tokens.leader}"`);
  console.log(`TEST_USER_USER_TOKEN="${tokens.user}"`);

  // Also save to local file for manual testing
  fs.writeFileSync(
    path.join(__dirname, '..', '.staging-tokens.json'),
    JSON.stringify(tokens, null, 2)
  );
  console.log('\n💾 Tokens saved to .staging-tokens.json (gitignored)');

  process.exit(0);
}

generateTokens();
```

### Step 3: Update Workflow to Use Auth Setup

**File:** `.github/workflows/deploy-and-test.yml`

```yaml
test-staging-desktop:
  name: E2E Desktop Tests on Staging
  runs-on: ubuntu-latest
  needs: deploy-staging
  steps:
    - uses: actions/checkout@v4
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    - name: Install dependencies
      run: npm ci
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps chromium

    # NEW: Run auth setup to create authenticated sessions
    - name: Setup Auth Sessions for Staging
      env:
        STAGING_URL: ${{ needs.deploy-staging.outputs.preview-url }}
        VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
        VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
        VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
        TEST_USER_ADMIN_TOKEN: ${{ secrets.TEST_USER_ADMIN_TOKEN }}
        TEST_USER_LEADER_TOKEN: ${{ secrets.TEST_USER_LEADER_TOKEN }}
        TEST_USER_USER_TOKEN: ${{ secrets.TEST_USER_USER_TOKEN }}
      run: npx cross-env TEST_ENV=staging playwright test e2e/staging-auth.setup.ts

    # Run tests with auth sessions
    - name: Run E2E Tests Against Staging (Desktop)
      env:
        STAGING_URL: ${{ needs.deploy-staging.outputs.preview-url }}
      run: npm run test:e2e:staging
```

### Step 4: Update Test Utils to Use Staging Auth

**File:** `e2e/utils/test-auth.ts` (add new function)

```typescript
/**
 * Check if we're running on staging (real Firebase, not emulators).
 */
export function isStagingTest(): boolean {
  return process.env.TEST_ENV === 'staging';
}

/**
 * Login as a test user - works for both local (test form) and staging (custom tokens).
 */
export async function loginAsTestUser(
  page: Page,
  userType: TestUserType,
  options: {
    waitForNavigation?: boolean;
    expectedUrl?: string;
  } = {}
): Promise<void> {
  const { waitForNavigation = true, expectedUrl } = options;
  const userInfo = TEST_USER_INFO[userType];

  // On staging, use pre-authenticated storage state
  if (isStagingTest()) {
    // Storage state is already loaded via project config
    // Just navigate to the expected page
    const targetUrl = expectedUrl ?? userInfo.expectedRoute;
    await page.goto(targetUrl);

    if (waitForNavigation) {
      await page.waitForURL(`**${targetUrl}`, { timeout: 15000 });
    }
    return;
  }

  // Local: use test login form (existing code)
  await page.goto('/auth');
  const testLoginForm = page.getByTestId('test-login-form');
  await expect(testLoginForm).toBeVisible({ timeout: 10000 });
  // ... rest of existing code
}
```

### Step 5: Update Playwright Config for Staging Projects

**File:** `playwright.config.ts`

```typescript
{
  name: 'staging',
  use: {
    ...devices['Desktop Chrome'],
    // Use pre-authenticated storage state for staging
    storageState: process.env.CI
      ? './e2e/.auth/staging-admin.json'  // Default to admin in CI
      : undefined,
  },
},
{
  name: 'staging-auth-leader',
  use: {
    ...devices['Desktop Chrome'],
    storageState: './e2e/.auth/staging-leader.json',
  },
  testIgnore: /auth\.spec\.ts/,
},
{
  name: 'staging-auth-user',
  use: {
    ...devices['Desktop Chrome'],
    storageState: './e2e/.auth/staging-user.json',
  },
  testIgnore: /auth\.spec\.ts/,
},
```

---

## Alternative: Simpler Approach - Use Firebase Auth REST API

Instead of custom tokens, use Firebase Auth REST API directly in tests:

**File:** `e2e/utils/staging-auth.ts`

```typescript
import { Page } from '@playwright/test';

export async function loginWithPassword(
  page: Page,
  email: string,
  password: string = 'TestPassword123!'
): Promise<void> {
  await page.goto('/');

  // Use Firebase Auth REST API to sign in
  await page.evaluate(async ({ email, password, apiKey }) => {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Login failed: ${data.error.message}`);
    }

    // Set the ID token in Firebase Auth
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getAuth, signInWithCustomToken } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

    const app = initializeApp({
      apiKey,
      authDomain: 'duty-staging.firebaseapp.com',
      projectId: 'duty-staging',
    });

    const auth = getAuth(app);
    await auth.updateCurrentUser({
      uid: data.localId,
      email: data.email,
    });
  }, {
    email,
    password,
    apiKey: process.env.VITE_FIREBASE_API_KEY,
  });

  await page.waitForTimeout(2000);
}
```

**Usage in tests:**

```typescript
import { loginWithPassword } from './utils/staging-auth';

test('should display dashboard', async ({ page }) => {
  if (process.env.TEST_ENV === 'staging') {
    await loginWithPassword(page, 'test-admin@e2e.local');
  } else {
    await loginAsTestUser(page, 'admin');
  }

  // Rest of test...
});
```

---

## Recommendation: Custom Token Approach

**Pros:**
- ✅ Zero test code changes (tests use same `loginAsTestUser()` function)
- ✅ Most secure (tokens generated once, used in CI)
- ✅ Fastest (auth state pre-created, no login overhead per test)
- ✅ Matches local testing patterns exactly

**Cons:**
- ⚠️ Requires generating tokens and storing as GitHub Secrets
- ⚠️ Need to regenerate tokens if test users change

**Setup Steps:**
1. Run `node scripts/generate-staging-auth-tokens.cjs`
2. Add tokens to GitHub Secrets
3. Add `staging-auth.setup.ts` file
4. Update workflow to run setup
5. Tests work unchanged! ✨

---

## Result: Full Coverage on Staging

**Before:**
- 72 tests skip on staging (no test login form)
- Limited coverage

**After:**
- All 72 tests run on staging with real Firebase auth
- Complete coverage of authenticated flows
- Tests run faster (pre-authenticated, no login overhead)
- Same test code works locally and on staging
