# Vercel Firebase Environment Setup

## Problem
Preview deployments on Vercel don't have access to Firebase, causing E2E tests to fail when checking for data.

## Solution
1. Configure Vercel preview environment variables to connect to Firebase Staging project
2. Seed the Firebase Staging project with test data

## Prerequisites
- Firebase Staging project (`duty-staging`) already exists in Firebase Console
- You have Owner/Editor access to the Firebase project

## Setup Instructions

### Option 1: Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/asas-projects-25ed4645/duty-app/settings/environment-variables

2. Add the following environment variables with scope **Preview**:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `VITE_TEST_MODE` | `true` | Preview |
| `VITE_FIREBASE_API_KEY` | `AIzaSyBCEsDWXYAP-2I6JnbO5rgmdUCCx_7qEd4` | Preview |
| `VITE_FIREBASE_AUTH_DOMAIN` | `duty-staging.firebaseapp.com` | Preview |
| `VITE_FIREBASE_PROJECT_ID` | `duty-staging` | Preview |
| `VITE_FIREBASE_STORAGE_BUCKET` | `duty-staging.firebasestorage.app` | Preview |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `37921740435` | Preview |
| `VITE_FIREBASE_APP_ID` | `1:37921740435:web:f89ab09d3541cc47dcdf66` | Preview |

**Important**: Make sure to select **Preview** scope only, not Production!

### Option 2: Via Vercel CLI

If you have Vercel CLI installed locally:

```bash
cd /path/to/duty-app
npm install -g vercel@latest
vercel login

# Add each variable for preview environment
vercel env add VITE_TEST_MODE preview
# Enter value: true

vercel env add VITE_FIREBASE_API_KEY preview
# Enter value: AIzaSyBCEsDWXYAP-2I6JnbO5rgmdUCCx_7qEd4

vercel env add VITE_FIREBASE_AUTH_DOMAIN preview
# Enter value: duty-staging.firebaseapp.com

vercel env add VITE_FIREBASE_PROJECT_ID preview
# Enter value: duty-staging

vercel env add VITE_FIREBASE_STORAGE_BUCKET preview
# Enter value: duty-staging.firebasestorage.app

vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID preview
# Enter value: 37921740435

vercel env add VITE_FIREBASE_APP_ID preview
# Enter value: 1:37921740435:web:f89ab09d3541cc47dcdf66
```

## Verification

After adding the environment variables:

1. Trigger a new preview deployment (push to a PR or main branch)
2. Check the deployment logs to verify environment variables are loaded
3. Visit the preview URL and check browser console for Firebase connection
4. E2E tests should now pass as they can access Firebase data

## Firebase Projects

- **Production**: `duty-82f42` (Firebase Production)
- **Staging/Preview**: `duty-staging` (Firebase Staging - used for previews and E2E tests)

## Step 2: Seed Firebase Staging with Test Data

The `duty-staging` project needs test data for E2E tests to pass.

### Manual Seeding via Firebase Console

1. Go to Firebase Console: https://console.firebase.google.com/project/duty-staging
2. Navigate to Firestore Database
3. Create the following collections and documents manually, or...

### Automated Seeding (Recommended)

Create a script to seed Firebase Staging programmatically:

**Note**: This requires converting `scripts/seed-emulator-users.cjs` to work with real Firebase instead of emulators. The script needs:
- Firebase Admin SDK credentials
- Firestore write access
- Firebase Auth admin access

**TODO**: Create `scripts/seed-firebase-staging.js` that:
1. Uses Firebase Admin SDK with service account
2. Seeds the same test data as the emulator script:
   - Units (battalion, company, platoon)
   - Personnel (admin, leader, user)
   - Equipment (bulk, serialized items)
   - Assignments

## Alternative: Skip Data-Dependent Tests on Staging

If seeding Firebase Staging is not desirable, you can modify the failing performance test to skip when running on staging:

```typescript
test.skip(process.env.TEST_ENV === 'staging', 'Data is visible after navigation without manual refresh', async ({ page }) => {
  // Test code...
});
```

This way:
- ✅ Tests run locally with emulators (have data)
- ⏭️ Tests skip on staging (no data needed)
- ✅ Other performance tests still run on staging

## Security Note

These Firebase credentials are for the **staging** project which has security rules in place. The API key is safe to expose in client-side code as Firebase security is enforced via Firestore security rules, not the API key.
