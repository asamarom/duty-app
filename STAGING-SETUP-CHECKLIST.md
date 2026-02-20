# Staging Environment Setup Checklist

Complete these steps to activate the 2-environment setup (Staging + Production).

## ✅ Prerequisites (Already Done)

- [x] Created `duty-staging` Firebase project
- [x] Registered web app in Firebase console
- [x] Updated `.env.preview` with staging config
- [x] Updated `.firebaserc` with staging project
- [x] Created setup and configuration scripts
- [x] Committed configuration changes

## 🔧 Manual Steps Required

### Step 1: Authenticate Firebase CLI

```bash
firebase login
```

**Expected output**: Opens browser for Google authentication

### Step 2: Initialize Firestore Database

1. Go to https://console.firebase.google.com/project/duty-staging/firestore
2. Click "Create database"
3. Choose "Start in production mode"
4. Select location: `us-central1` (or your preferred region)
5. Click "Enable"

### Step 3: Enable Firebase Authentication

1. Go to https://console.firebase.google.com/project/duty-staging/authentication
2. Click "Get started"
3. Enable "Email/Password" provider (for test users)
4. Click "Save"

### Step 4: Seed Staging Database

```bash
cd /home/ubuntu/duty-app

# Switch to staging project
firebase use staging

# Run setup script (creates units, test users, equipment)
npm run setup:staging
```

**Expected output**:
```
✓ Connected to Firestore
✓ Units created
✓ Test users created
✓ Sample equipment created
✅ Staging environment setup complete!
```

### Step 5: Deploy Security Rules

```bash
# Deploy Firestore security rules to staging
npm run deploy:rules:staging
```

**Expected output**:
```
✔  Deploy complete!
```

### Step 6: Configure Vercel Environment Variables

```bash
# Run configuration script
./scripts/configure-vercel-preview.sh
```

**Note**: This will prompt you to authenticate with Vercel if not already logged in.

### Step 7: Remove Vercel Password Protection

1. Go to https://vercel.com/settings/deployment-protection
2. Find "Vercel Authentication" section
3. **Disable** "Password Protection" for preview deployments
4. Click "Save"

**Why?** We want preview deployments to be publicly accessible (Firebase Auth will handle access control).

### Step 8: Push and Test

```bash
# Push the configuration changes
git push origin main

# Wait for Vercel deployment (check https://vercel.com/dashboard)
```

Once deployed, you should see:
- Preview URL in Vercel dashboard
- Test login UI on preview deployments
- Working test users (admin, leader, user)

### Step 9: Verify Staging Works

1. Open the preview URL
2. You should see the auth page with "TEST MODE" section
3. Select "Test Admin" from dropdown
4. Click "Sign in as Test User"
5. Navigate to Equipment page
6. Verify RTL alignment in Hebrew mode

## 🧪 Testing the Setup

```bash
# Test that you can access staging from Playwright
node scripts/final-rtl-test.mjs

# Expected: Should login successfully and take screenshots
```

## 📋 Verification Checklist

After completing all steps, verify:

- [ ] Firestore database exists in duty-staging project
- [ ] Authentication provider (Email/Password) enabled
- [ ] Test data seeded (6 units, 3 users, 3 equipment items)
- [ ] Security rules deployed
- [ ] Vercel environment variables set for preview
- [ ] Vercel password protection disabled
- [ ] Preview deployment shows TEST MODE section
- [ ] Can login with test users
- [ ] RTL alignment works correctly in Hebrew mode

## 🐛 Troubleshooting

### Firebase CLI not authenticated

**Error**: `Failed to authenticate, have you run firebase login?`

**Solution**: Run `firebase login` and complete OAuth flow

### Firestore not initialized

**Error**: `FAILED_PRECONDITION: The Cloud Firestore API is not available`

**Solution**: Enable Firestore in Firebase Console (Step 2)

### Can't seed database

**Error**: `Permission denied` or `Missing or insufficient permissions`

**Solution**:
1. Deploy security rules first: `npm run deploy:rules:staging`
2. Or temporarily allow all writes in Firestore rules (not recommended for production)

### Vercel CLI not found

**Error**: `vercel: command not found`

**Solution**: `npm install -g vercel`

### Still seeing Vercel login page

**Problem**: Preview deployment redirects to Vercel authentication

**Solution**: Disable Vercel Authentication in deployment protection settings (Step 7)

## 🎉 Success Criteria

You've successfully set up staging when:

1. ✅ Can access preview URL without Vercel password
2. ✅ See TEST MODE section on auth page
3. ✅ Can login with test users via dropdown
4. ✅ See test data in dashboard (equipment, personnel)
5. ✅ RTL alignment works in Hebrew mode
6. ✅ No Firestore permission errors

## 📚 Next Steps

Once staging is working:

1. **Update CI/CD**: Configure GitHub Actions to run E2E tests against staging
2. **Team access**: Share preview URLs with team members
3. **Testing workflow**: Use staging for all feature testing before production
4. **Data management**: Regularly reset/refresh staging data from production backups

## 📞 Need Help?

If you encounter issues:

1. Check the full documentation: `ENVIRONMENTS.md`
2. Verify Firebase console settings match configuration
3. Check Vercel deployment logs
4. Ensure all environment variables are set correctly
