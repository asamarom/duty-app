---
name: test-writer
description: Write E2E test code for planned tests in TESTS.md. Reads all entries with status "planned", writes Playwright test code following project patterns, and updates status to "covered" in TESTS.md. Does NOT run tests. Use when explicitly invoked by the user.
---

# Test Writer

Write E2E test code for all planned tests in TESTS.md.

## Workflow

1. **Read TESTS.md** and find all entries with status `planned`

2. **For each planned test**:

   a. Read the test description and scenarios

   b. Determine the appropriate test file:
      - AUTH → `e2e/auth.spec.ts` or `e2e/user-lifecycle.spec.ts`
      - PERS → `e2e/personnel.spec.ts`
      - EQUIP → `e2e/equipment.spec.ts`
      - XFER → `e2e/transfers.spec.ts` (create if needed)
      - UI → `e2e/dashboard.spec.ts` or appropriate file
      - I18N → `e2e/i18n.spec.ts` (create if needed)
      - UNIT → `e2e/units.spec.ts` (create if needed)
      - ONBOARD → `e2e/user-lifecycle.spec.ts`

   c. Write the test code following project patterns

   d. Update TESTS.md:
      - Change status from `planned` to `covered`
      - Add test file and test name reference

3. **Update summary table** counts in TESTS.md

## Test File Structure

```typescript
import { test, expect } from '@playwright/test';
import { loginAsTestUser, TestUserType } from './utils/test-auth';

test.describe('Feature Area', () => {
  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

## Test User Authentication

Use `loginAsTestUser()` from `e2e/utils/test-auth.ts`:

```typescript
import { loginAsTestUser } from './utils/test-auth';

// Login as specific user type
await loginAsTestUser(page, 'admin');  // admin, leader, user, new, pending, declined
```

See `references/test-patterns.md` for complete patterns and utilities.

## Status Update Format

Before:
```markdown
### [REQ-ID] Requirement
- **Status**: planned
- **Test Description**: ...
```

After:
```markdown
### [REQ-ID] Requirement
- **Status**: covered
- **Tests**:
  - `e2e/file.spec.ts` > "test name"
```

## Guidelines

- Follow existing test patterns in the codebase
- Use data-testid selectors when available
- Support bilingual text with regex matchers: `/english|עברית/i`
- Keep tests independent and idempotent
- Do NOT run tests after writing
- Do NOT modify application code
