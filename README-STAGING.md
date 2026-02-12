# Staging/Preview Deployment Guide

## Purpose
This branch (`staging/e2e-testing`) is configured for E2E testing with test mode enabled.

## Configuration
- **Test Mode**: Enabled (`VITE_TEST_MODE=true`)
- **Database**: Firebase Production (duty-82f42)
- **Test Users**: Uses existing test users in Firebase

## Test Users
The following test users should exist in Firebase:
- `test-admin@e2e.local` (password: `TestPassword123!`)
- `test-leader@e2e.local` (password: `TestPassword123!`)
- `test-user@e2e.local` (password: `TestPassword123!`)
- `test-new@e2e.local` (no signup request)
- `test-pending@e2e.local` (pending approval)
- `test-declined@e2e.local` (declined)

## Vercel Deployment
When this branch is pushed, Vercel will create a preview deployment.

**Important**: In Vercel dashboard, add environment variable for preview:
- Key: `VITE_TEST_MODE`
- Value: `true`
- Environment: `Preview`
- Branch: `staging/e2e-testing`

## Running Tests Against Preview
Once deployed, run:
```bash
BASE_URL=<preview-url> npm run test:e2e
```

## Security Note
⚠️ **Never merge this branch to main!** Test mode should NEVER be enabled in production.
