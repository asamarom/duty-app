# Environment Configuration Guide

This project uses a **2-environment setup**: **Staging (Preview)** and **Production**.

## 🎯 Why 2 Environments?

- **Staging**: Test changes before production using real Firebase (not emulators)
- **Production**: Live application with real user data
- **No localhost development**: Eliminates environment inconsistencies

## 📋 Environment Overview

| Environment | Purpose | Firebase Project | Auth Method | URL |
|------------|---------|------------------|-------------|-----|
| **Staging** | Testing & debugging | `duty-staging` | Test users (username/password) | Vercel preview deployments |
| **Production** | Live application | `duty-82f42` | Google OAuth only | https://duty-app.vercel.app |

## 🔧 Staging Environment Setup

### Step 1: Initialize Staging Firebase

```bash
# 1. Authenticate with Firebase
firebase login

# 2. Select staging project
firebase use staging

# 3. Run setup script to seed test data
npm run setup:staging

# 4. Deploy security rules
npm run deploy:rules:staging
```

### Step 2: Configure Vercel

```bash
# Set environment variables for preview deployments
./scripts/configure-vercel-preview.sh
```

### Step 3: Remove Vercel Password Protection

1. Go to https://vercel.com/[your-team]/duty-app/settings/deployment-protection
2. Disable "Vercel Authentication" for preview deployments
3. Save changes

### Step 4: Test Preview Deployment

```bash
# Push to trigger preview deployment
git push origin [your-branch]

# Preview URL will be shown in Vercel dashboard
# Example: https://duty-app-git-[branch]-[team].vercel.app
```

**Note**: After adding/updating Vercel environment variables, you must trigger a new deployment for changes to take effect.

## 🔑 Test Users (Staging Only)

The staging environment includes these test users:

| Email | Role | Password | Service Number |
|-------|------|----------|----------------|
| test-admin@e2e.local | Admin | (use test login UI) | ADM-001 |
| test-leader@e2e.local | Leader | (use test login UI) | LDR-001 |
| test-user@e2e.local | User | (use test login UI) | USR-001 |

**Note**: Staging uses the test login UI (visible when `VITE_TEST_MODE=true`). No actual passwords needed - select user from dropdown.

## 🚀 Deployment Workflow

### For Staging/Preview

```bash
# 1. Create a feature branch
git checkout -b feature/my-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push to trigger preview deployment
git push origin feature/my-feature

# 4. Vercel automatically deploys to preview URL
# 5. Test using test users
# 6. Verify RTL, features, etc.
```

### For Production

```bash
# 1. Merge to main after preview testing
git checkout main
git merge feature/my-feature

# 2. Push to main
git push origin main

# 3. Vercel automatically deploys to production
# 4. Production uses Google OAuth
```

## 🔐 Environment Variables

### Staging (.env.preview)

```env
VITE_TEST_MODE=true
VITE_FIREBASE_API_KEY=AIzaSyBCEsDWXYAP-2I6JnbO5rgmdUCCx_7qEd4
VITE_FIREBASE_AUTH_DOMAIN=duty-staging.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=duty-staging
VITE_FIREBASE_STORAGE_BUCKET=duty-staging.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=37921740435
VITE_FIREBASE_APP_ID=1:37921740435:web:f89ab09d3541cc47dcdf66
```

### Production (.env.production)

```env
VITE_TEST_MODE=false
VITE_FIREBASE_API_KEY=AIzaSyCNJWjzqPqg0oZuJ62WMq7cZG737k0hPKY
VITE_FIREBASE_AUTH_DOMAIN=duty-82f42.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=duty-82f42
VITE_FIREBASE_STORAGE_BUCKET=duty-82f42.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=234474777051
VITE_FIREBASE_APP_ID=1:234474777051:web:f912e9442f4b36fd5c9ffe
```

## 🧪 Testing

### E2E Tests on Staging

```bash
# Run E2E tests against staging
npm run test:e2e:staging
```

### E2E Tests on Production

```bash
# Run E2E tests against production (read-only)
npm run test:e2e:prod
```

## 🔄 Syncing Data Between Environments

**Production → Staging** (for testing with prod-like data):

```bash
# Export from production
firebase use production
firebase firestore:export gs://duty-82f42.appspot.com/backups/$(date +%Y%m%d)

# Import to staging
firebase use staging
firebase firestore:import gs://duty-82f42.appspot.com/backups/[date]
```

**Note**: Be careful with sensitive production data. Only sync sanitized data to staging.

## 📊 Firestore Security Rules

Security rules are shared between environments (same schema):

```bash
# Deploy to staging
npm run deploy:rules:staging

# Deploy to production
npm run deploy:rules:production

# Or deploy to both
firebase deploy --only firestore:rules
```

## ❌ What We Removed

- **Localhost development**: No more Firebase emulators
- **3rd environment complexity**: Simplified to 2 environments
- **Vercel password protection**: Preview deployments are now publicly accessible (protected by Firebase Auth)

## ✅ Benefits

1. **Consistency**: Staging mirrors production exactly
2. **Accessibility**: Anyone can access staging with test users
3. **Debugging**: Developers can see exactly what users see
4. **Faster iteration**: No local setup required
5. **CI/CD friendly**: All environments accessible from CI

## 🆘 Troubleshooting

### Preview deployment shows Vercel login

- **Problem**: Vercel Authentication still enabled
- **Solution**: Disable in Vercel dashboard → Settings → Deployment Protection

### Test users not working

- **Problem**: Staging database not seeded
- **Solution**: Run `npm run setup:staging`

### Wrong Firebase project

- **Problem**: Using production data in staging
- **Solution**: Check `.env.preview` has `duty-staging` project ID

### Security rules failing

- **Problem**: Rules not deployed to staging
- **Solution**: Run `npm run deploy:rules:staging`

## 📝 Quick Reference

```bash
# Setup staging (first time)
npm run setup:staging
npm run deploy:rules:staging
./scripts/configure-vercel-preview.sh

# Deploy to staging
git push origin [branch]

# Deploy to production
git push origin main

# Test staging
npm run test:e2e:staging

# Switch Firebase projects
firebase use staging   # or production
```
