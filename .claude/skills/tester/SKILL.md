---
name: tester
description: Run all E2E tests and commit if successful. If tests fail, summarizes the status and asks user how to proceed. Use when explicitly invoked by the user.
---

# Tester

Run all tests and commit if successful.

## Workflow

1. **Run all E2E tests**
   ```bash
   npm run test:e2e
   ```

2. **Analyze results**

   **If ALL tests pass**:
   - Stage all changes: `git add -A`
   - Create commit with sprint summary
   - Inform user of success

   **If ANY tests fail**:
   - Parse test output for failures
   - Create summary report
   - Ask user how to proceed

## Test Commands

| Command | Purpose |
|---------|---------|
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run test:e2e:ui` | Run with interactive UI |
| `npm run test:e2e:report` | View last test report |

## Commit Message Format

```
feat(sprint-X): implement requirements from sprint X

Changes:
- [REQ-1] Description
- [REQ-2] Description

Tests: X passed, 0 failed
```

## Failure Summary Format

```
## Test Results Summary

**Status**: FAILED
**Passed**: X / Y
**Failed**: Z

### Failed Tests:

1. `e2e/file.spec.ts` > "test name"
   - Error: {error message}

2. `e2e/file.spec.ts` > "another test"
   - Error: {error message}
```

## User Decision on Failure

Use AskUserQuestion tool to present options:
- **Fix and retry**: User will fix issues, then invoke `/tester` again
- **Commit anyway**: Stage and commit with note about failing tests
- **Abort**: Do nothing, let user investigate
