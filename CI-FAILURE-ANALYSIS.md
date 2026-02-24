# CI Test Failure Analysis - Run 22325138264

## Summary

**All tests failed due to `VITE_TEST_MODE=true` being set in Vercel preview environment.**

- **Total failures**: 89 tests
  - Desktop: 83 failed
  - Performance: 3 failed
  - Mobile: 3 failed
- **Root cause**: Staging app showing test login form instead of respecting Firebase authentication
- **Fix**: Remove `VITE_TEST_MODE` from Vercel environment variables

## Root Cause

### The Problem

The Vercel preview deployment has `VITE_TEST_MODE=true` in its environment variables, which causes:

1. App shows test login form (intended only for local emulator testing)
2. Storage state authentication is ignored
3. All tests fail because they can't authenticate

### Evidence

Downloaded screenshot from performance test shows:
- Authentication page displayed
- **"TEST MODE"** banner visible
- Test login form with "Select a test user..." dropdown
- This confirms test mode is active on staging

### Code Reference

In `src/lib/testAuth.ts:89`:
```typescript
export function isTestModeEnabled(): boolean {
  return import.meta.env.VITE_TEST_MODE === 'true';
}
```

When this returns `true`, the app shows the test login form instead of Google OAuth.

## Detailed Failure Breakdown

### Performance Tests (3/3 failed)

All tests fail at the same point - can't find dashboard heading because stuck on auth page:

```
Error: expect(locator).toBeVisible() failed
Locator: getByRole('heading', { name: /לוח בקרה|dashboard/i }).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

**Failed tests:**
1. `Dashboard first load under 3s`
2. `Navigation between screens under 800ms after first load`
3. `Data is visible after navigation without manual refresh`

### Mobile Tests (3/3 failed)

**Failed tests:**
1. `[M-RTL-8] Mobile page title should align right` - Can't find equipment heading
2. `[M-RTL-9] Visual snapshot - Mobile Equipment Page RTL` - Missing snapshot baseline
3. `[M-RTL-D2] Visual snapshot - Mobile Dashboard RTL` - Missing snapshot baseline

Note: 9 mobile tests passed (those that don't require authentication)

### Desktop Tests (83/83 failed)

All authenticated tests failed across all projects:
- **staging** project (user role)
- **staging-admin** project (admin role)
- **staging-leader** project (leader role)

Common failure pattern: Tests can't authenticate, get stuck on auth page.

Sample failures:
- Battalion scoping tests
- Dashboard tests
- Equipment management tests
- Personnel tests
- i18n tests
- Units tests
- Transfers tests
- RTL tests
- User lifecycle tests

## Solution

### Required Action

**Remove `VITE_TEST_MODE` from Vercel environment variables:**

1. Go to https://vercel.com/
2. Select `duty-app` project
3. Navigate to: **Settings → Environment Variables**
4. Find `VITE_TEST_MODE`
5. **Delete it** (or set to `false`)
6. Important: Remove from **Preview** environment

### Why This Works

- Test mode is ONLY for local development with Firebase emulators
- Staging/preview should use real Firebase with custom token authentication
- Production should never have test mode enabled
- Once removed, storage state authentication will work correctly

### What Will Happen

After removing the variable and re-running CI:

1. ✅ Staging app will use real Firebase authentication
2. ✅ Storage state files (from `staging-auth.setup.ts`) will be respected
3. ✅ Tests will be pre-authenticated with the correct roles
4. ✅ All tests should pass

## Infrastructure Status

✅ **Working correctly:**
- Custom token generation (via Firebase Admin SDK)
- Storage state creation (3 separate files for admin/leader/user)
- Auth setup job (creates and uploads storage state artifacts)
- Playwright project configuration (uses correct storage state files)
- Test structure (proper role separation)

❌ **Blocked by:**
- `VITE_TEST_MODE=true` in Vercel preview environment

## Next Steps

1. **[USER ACTION REQUIRED]** Remove `VITE_TEST_MODE` from Vercel
2. Re-run CI pipeline
3. All tests should pass
4. If any tests still fail, investigate specific test issues (but don't expect this)

## Related Files

- `VERCEL-TEST-MODE-FIX.md` - Detailed fix instructions
- `playwright.config.ts` - Test project configuration
- `e2e/staging-auth.setup.ts` - Creates storage state with custom tokens
- `src/lib/testAuth.ts` - Checks test mode flag
- `.github/workflows/deploy-and-test.yml` - CI pipeline
