# Critical Fix Required: Remove VITE_TEST_MODE from Vercel

## Problem

All staging tests are failing because the Vercel preview deployment has `VITE_TEST_MODE=true` set in its environment variables.

### What's Happening

1. When `VITE_TEST_MODE=true`, the app shows the test login form (for local emulator testing)
2. The test login form requires manual interaction and doesn't work with storage state authentication
3. Our tests use Firebase custom token authentication via storage state
4. Storage state loads the session, but the app shows the test login page instead of recognizing the authentication

### Evidence

Screenshot from failed performance test shows:
- App is on the authentication page
- "TEST MODE" banner is visible
- Test login form is displayed with "Select a test user..." dropdown
- This means `VITE_TEST_MODE=true` is active in the deployment

## Solution

Remove `VITE_TEST_MODE` from Vercel's preview environment variables:

### Steps to Fix

1. Go to Vercel Dashboard: https://vercel.com/
2. Select the `duty-app` project
3. Go to Settings → Environment Variables
4. Find `VITE_TEST_MODE`
5. Delete it OR set it to `false`
6. Important: Make sure it's removed/disabled for **Preview** environment (not just Production)

### Why This Matters

- **Test Mode** is ONLY for local development with Firebase emulators
- **Staging/Preview** should use real Firebase with custom token authentication
- **Production** should never have test mode enabled

## Impact

Once fixed, all tests should pass because:
- Storage state authentication will work correctly
- App will respect the Firebase auth session from custom tokens
- No test login form will block the authenticated user

## Verification

After removing the environment variable:
1. Trigger a new CI run
2. Tests should authenticate successfully using storage state
3. Dashboard heading should be visible (test currently fails at this assertion)

## Related Files

- `src/lib/testAuth.ts:89` - Checks `import.meta.env.VITE_TEST_MODE === 'true'`
- `e2e/staging-auth.setup.ts` - Creates storage state with custom tokens
- `playwright.config.ts` - Configures projects to use storage state files
