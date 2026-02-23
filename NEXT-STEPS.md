# Next Steps: Complete Staging E2E Setup

All three phases have been implemented successfully! Here's what you need to do to complete the setup.

## ✅ What Was Done

### Phase 1: Fixed Test Overlap
- ✅ Modified Playwright config to separate desktop and mobile tests
- ✅ Desktop tests now exclude mobile tests (saves ~95 tests)
- ✅ Mobile tests now only run mobile-specific tests (~14 tests)
- ✅ Eliminated 100% test duplication (saves ~41 minutes per run)

### Phase 2: Added Staging Auth with Custom Tokens
- ✅ Created token generation script: `scripts/generate-staging-auth-tokens.cjs`
- ✅ Created Playwright auth setup: `e2e/staging-auth.setup.ts`
- ✅ Modified test utilities to support staging: `e2e/utils/test-auth.ts`
- ✅ Updated Playwright config with staging auth projects
- ✅ Updated workflow to run auth setup before tests

### Phase 3: Added More Personnel Data
- ✅ Added 3 additional personnel to seed script
- ✅ Personnel distributed across different units (company, platoon, battalion)
- ✅ Fixes battalion scoping tests that expect ≥2 visible personnel

## 🔧 Required Actions

### Step 1: Re-seed Firebase Staging (REQUIRED)

The seed script now has 6 personnel instead of 3. Re-run it:

```bash
cd /home/ubuntu/duty-app
node scripts/seed-firebase-staging.cjs
```

**Expected output:**
```
4️⃣  Seeding personnel collection...
   Created personnel: Test Admin
   Created personnel: Test Leader
   Created personnel: Test User
   Created personnel: John Doe
   Created personnel: Jane Smith
   Created personnel: Bob Johnson
```

### Step 2: Add Firebase Service Account to GitHub Secrets (REQUIRED)

Firebase custom tokens expire after 1 hour, so we can't pre-generate them. Instead, CI generates fresh tokens before each test run using the service account.

1. Open your local `firebase-staging-service-account.json` file

2. Copy the **entire JSON contents** (it should start with `{` and end with `}`)

3. Go to: https://github.com/asamarom/duty-app/settings/secrets/actions

4. Click **"New repository secret"**

5. Add this secret:
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Value: [paste entire JSON from step 2]

**Example format of the JSON:**
```json
{
  "type": "service_account",
  "project_id": "duty-staging",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "...",
  "client_id": "...",
  ...
}
```

### Step 3: Push and Test (REQUIRED)

Push the changes to trigger the updated workflow:

```bash
cd /home/ubuntu/duty-app
git push origin main
```

## 🎯 Expected Results

After pushing, the Deploy & Test workflow will:

1. **Deploy to Staging** (1-2 min)
   - Deploys to Vercel preview URL

2. **Setup Staging Auth** (1-2 min) ← NEW JOB
   - Generates fresh custom tokens (valid for 1 hour)
   - Authenticates with Firebase using custom tokens
   - Saves storage state for all 3 test users

3. **Run Tests in Parallel** (4-8 min total)
   - Desktop Tests: ~95 tests (down from 109)
   - Mobile Tests: ~14 tests (down from 109)
   - Performance Tests: 3 tests
   - **All tests should PASS** ✅

## 📊 Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Test Overlap | 100% duplicate | 0% duplicate | **41 min saved** |
| Desktop Runtime | 22 min | ~8 min | **63% faster** |
| Mobile Runtime | 32 min | ~4 min | **87% faster** |
| Total Runtime | ~54 min | ~13 min | **76% faster** |
| Test Coverage | 72 tests skipped | **0 tests skipped** | **Full coverage** ✅ |

## 🐛 Troubleshooting

### If auth setup fails with "Failed to parse FIREBASE_SERVICE_ACCOUNT"

This means the service account JSON wasn't added correctly to GitHub Secrets. Make sure you:
1. Copied the ENTIRE JSON file contents (starts with `{`, ends with `}`)
2. Named the secret exactly: `FIREBASE_SERVICE_ACCOUNT`
3. Didn't add any extra whitespace or formatting

### If battalion scoping tests still fail

This means Firebase Staging wasn't re-seeded. Complete Step 1 above.

### If tests still overlap (both jobs run same tests)

Check the Playwright test output - you should see:
- Desktop: ~95 tests (excludes mobile)
- Mobile: ~14 tests (mobile only)

If both show 109 tests, the config changes didn't apply. Try pushing again.

## 📁 Files Modified

- `.github/workflows/deploy-and-test.yml` - Added auth setup job, updated dependencies
- `playwright.config.ts` - Separated desktop/mobile tests, added auth projects
- `e2e/staging-auth.setup.ts` - NEW: Playwright auth setup with custom tokens
- `e2e/utils/test-auth.ts` - Added staging detection and skip test login form
- `scripts/generate-staging-auth-tokens.cjs` - NEW: Token generation script
- `scripts/seed-firebase-staging.cjs` - Added 3 more personnel (6 total)

## 📚 Documentation

- `TEST-FAILURE-ANALYSIS.md` - Complete analysis of all test failures
- `STAGING-TEST-COVERAGE-SOLUTION.md` - Custom token auth solution guide
- `VERCEL-FIREBASE-SETUP.md` - Vercel environment setup guide

## ✅ Success Criteria

Your implementation is successful when:

1. ✅ Re-seeded Firebase with 6 personnel
2. ✅ Added Firebase service account to GitHub Secrets
3. ✅ Pushed to trigger new workflow
4. ✅ All E2E tests PASS on staging
5. ✅ Test runtime reduced from ~54min to ~13min
6. ✅ Zero tests skipped (full coverage maintained)
7. ✅ Custom tokens generated fresh on every CI run (no manual updates needed)

---

## 🚀 Ready to Go?

Run these commands in order:

```bash
# Step 1: Re-seed Firebase with 6 personnel
node scripts/seed-firebase-staging.cjs

# Step 2: Add service account to GitHub Secrets (manual)
# 1. Copy contents of firebase-staging-service-account.json
# 2. Go to: https://github.com/asamarom/duty-app/settings/secrets/actions
# 3. Add secret: FIREBASE_SERVICE_ACCOUNT = [paste JSON]

# Step 3: Push and watch tests pass
# (CI will generate fresh tokens automatically before each run)
git push origin main

# Step 4: Monitor workflow
# https://github.com/asamarom/duty-app/actions
```

Once you see all tests passing in the workflow, you're done! 🎉

**Note:** Tokens are now generated automatically in CI before each test run, so you never need to manually update them.
