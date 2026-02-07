---
name: tests-updater
description: Update TESTS.md with planned tests based on sprint requirement changes. Reads the latest sprint_x.md from /sprints/, adds entries for new/modified requirements with status "planned", marks removed requirements for test deletion, and closes test gaps by defining missing tests. Does NOT write test code. Use when explicitly invoked by the user.
---

# Tests Updater

Update TESTS.md with planned test entries based on sprint changes and close existing test gaps.

## Workflow

1. **Find the latest sprint file**
   ```bash
   ls sprints/ | grep -oP 'sprint_\K\d+' | sort -n | tail -1
   ```
   Read `sprints/sprint_<latest>.md`

2. **Parse the sprint document** to extract:
   - Added requirements → need new test entries
   - Modified requirements → may need updated test descriptions
   - Removed requirements → mark tests for deletion

3. **Read current TESTS.md** to understand:
   - Existing entries and their status
   - Current gaps that need test definitions
   - Summary table counts

4. **Handle each change type**:

   **Added requirements**:
   - Create entry with status `planned`
   - Write test description and scenarios

   **Modified requirements**:
   - Update existing entry or create new one
   - Status `planned` if test needs rewriting

   **Removed requirements**:
   - Change status to `deprecated`
   - Add note: "Requirement removed in Sprint X - delete test"

5. **Close existing gaps**:
   - Review all entries with status `gap`
   - Define test descriptions and scenarios
   - Change status from `gap` to `planned`

6. **Update TESTS.md**:
   - Add/update entries under appropriate area sections
   - Update summary table counts
   - Add "Planned" and "Deprecated" columns if missing

## Status Values

| Status | Meaning |
|--------|---------|
| `covered` | Test exists and fully covers requirement |
| `partial` | Test exists but incomplete coverage |
| `gap` | No test exists, not yet planned |
| `planned` | Test described, ready to implement |
| `deprecated` | Requirement removed, test should be deleted |
| `not-testable` | Cannot be tested via E2E |

## Entry Format

### Planned Test
```markdown
### [REQ-ID] Requirement description
- **Status**: planned
- **Sprint**: {SPRINT_NUMBER}
- **Test Description**: {WHAT_THE_TEST_SHOULD_VERIFY}
- **Scenarios**:
  - Given {PRECONDITION}, when {ACTION}, then {EXPECTED_RESULT}
- **Notes**: {IMPLEMENTATION_CONSIDERATIONS}
```

### Deprecated Test
```markdown
### [REQ-ID] Requirement description
- **Status**: deprecated
- **Sprint**: {SPRINT_NUMBER}
- **Notes**: Requirement removed - delete associated tests
- **Tests to remove**:
  - `e2e/file.spec.ts` > "test name"
```

## Summary Table Format

```markdown
| Area | Total | Covered | Partial | Planned | Deprecated | Gaps |
|------|-------|---------|---------|---------|------------|------|
```

## Gap Closure Guidelines

When closing gaps, consider:
- Test user types: admin, leader, user, pending, declined, new
- Happy path and error states
- Permission boundaries
- Data validation
- UI feedback (success/error messages)
- State persistence (refresh, navigation)

Write actionable test descriptions that another developer can implement without ambiguity.
