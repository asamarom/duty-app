# Claude Code Instructions

This document provides instructions for AI assistants working on this codebase.

## Project Overview

Duty Tactical Management System (DTMS) - A military/security asset management application built with React, TypeScript, and Supabase.

## Requirements-Driven Development Workflow

This project uses a two-document system for requirement tracking:

### Key Documents

1. **[PRODUCT.md](./PRODUCT.md)** - Source of truth for all product requirements
   - Human-readable prose with inline requirement IDs
   - Format: `[AREA-N]` or `[AREA-N.M]` for sub-requirements
   - Areas: `AUTH`, `PERS`, `EQUIP`, `XFER`, `ONBOARD`, `UI`, `I18N`, `UNIT`

2. **[TESTS.md](./TESTS.md)** - Test coverage matrix
   - Maps every requirement to its E2E tests
   - Status values: `covered`, `partial`, `gap`, `not-testable`
   - Contains summary table and detailed per-requirement status

### LLM Workflow

When the user modifies requirements:

1. **Adding a requirement to PRODUCT.md**:
   - Add a corresponding entry to TESTS.md with status `gap`
   - Update the summary table counts

2. **Requesting test generation**:
   - Check TESTS.md for `gap` status items
   - Generate E2E tests that cover the requirement
   - Update TESTS.md status to `covered` with test references

3. **Requesting coverage report**:
   - Parse both documents
   - Report total coverage percentage
   - List all gaps grouped by area

4. **Deleting a requirement from PRODUCT.md**:
   - Remove corresponding entry from TESTS.md
   - Update summary table counts
   - Note: Do not delete the E2E test files unless explicitly asked

### Requirement ID Format

- Pattern: `[AREA-N]` or `[AREA-N.M]`
- Examples: `[AUTH-1]`, `[XFER-4.2]`, `[UI-3]`
- Always use the next available number in sequence

## E2E Testing

### Test Structure

- Tests are in `e2e/` directory using Playwright
- Test users are seeded via `scripts/seed-test-users.js`
- Test mode enabled via `VITE_TEST_MODE=true` environment variable

### Test User Types

| Type | Email | Status |
|------|-------|--------|
| admin | test-admin@duty.test | Approved with admin role |
| leader | test-leader@duty.test | Approved with leader role |
| user | test-user@duty.test | Approved with user role |
| new | test-new@duty.test | No signup request |
| pending | test-pending@duty.test | Pending approval |
| declined | test-declined@duty.test | Declined |

### Running Tests

```bash
# Local development
npm run test:e2e

# Against staging (Firebase)
npm run test:e2e:staging
```

## Deployment

### Firebase Hosting

- **Production**: `duty-82f42.web.app`
- **Test/Staging**: `duty-82f42-test.web.app`

```bash
# Deploy production
npm run deploy

# Deploy test (with VITE_TEST_MODE=true)
npm run deploy:test
```

## Code Conventions

- Use TypeScript strictly
- Follow existing component patterns in `src/components/`
- Use Supabase hooks in `src/hooks/`
- Translations in `src/i18n/translations.ts`
- Bilingual support: English and Hebrew (RTL)
