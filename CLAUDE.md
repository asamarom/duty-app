# Claude Code Instructions

This document provides instructions for AI assistants working on this codebase.

## Project Overview

Duty Tactical Management System (DTMS) - A military/security asset management application built with React, TypeScript, and Firebase.

## Sprint Workflow

The full sprint workflow, requirements-driven development process, and skill definitions are in [`.claude/agents/sprint-workflow.md`](.claude/agents/sprint-workflow.md).

## E2E Testing

### Test Structure

- Tests are in `e2e/` directory using Playwright
- Test users are seeded via `scripts/seed-emulator-users.cjs`
- Test mode enabled via `VITE_TEST_MODE=true` environment variable

### Test User Types

| Type | Email | Status |
|------|-------|--------|
| admin | test-admin@e2e.local | Approved with admin role |
| leader | test-leader@e2e.local | Approved with leader role |
| user | test-user@e2e.local | Approved with user role |
| new | test-new@e2e.local | No signup request |
| pending | test-pending@e2e.local | Pending approval |
| declined | test-declined@e2e.local | Declined |

### Running Tests

```bash
# Local development
npm run test:e2e

# Against staging (Firebase)
npm run test:e2e:staging
```

## Deployment

### Vercel

- **Production**: Deployed via Vercel (connected to main branch)
- **Preview**: Automatic preview deployments for PRs

The Firebase project `duty-82f42` is used for Firestore and Auth only.

```bash
# Local development
npm run dev

# Build
npm run build
```

## Code Conventions

- Use TypeScript strictly
- Follow existing component patterns in `src/components/`
- Use Firebase hooks in `src/hooks/`
- Translations in `src/i18n/translations.ts`
- Bilingual support: English and Hebrew (RTL)

## CI/CD Workflow

### Required: Track CI After Every Push

**CRITICAL**: After pushing commits to `main`, you MUST track the CI pipeline status:

1. **Immediately after push**: Check CI status with `gh run list --limit 1`
2. **Wait for completion**: Monitor until status shows `completed`
3. **Verify result**: Check if conclusion is `success` or `failure`
4. **Handle failures**: If CI fails, investigate logs with `gh run view <run-id> --log-failed`

```bash
# Check latest CI run
gh run list --limit 1

# Check detailed status
gh run list --limit 1 --json status,conclusion,name

# View failed logs
gh run view <run-id> --log-failed
```

**Do not proceed with new work until CI passes or failures are addressed.**
