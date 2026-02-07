---
name: coder
description: Implement code changes from sprint task files. Reads the latest sprint_x_tasks.md from /sprint_tasks/, executes each task sequentially, writes the code, and updates task status in the file. Runs automatically through all tasks without pausing. Use when explicitly invoked by the user.
---

# Coder

Implement all tasks from the latest sprint task file, updating status as each task completes.

## Workflow

1. **Find the latest tasks file**
   ```bash
   ls sprint_tasks/ | grep -oP 'sprint_\K\d+' | sort -n | tail -1
   ```
   Read `sprint_tasks/sprint_<latest>_tasks.md`

2. **Parse the tasks file** to extract:
   - All tasks with their details (requirement ID, type, files, notes)
   - Current status of each task
   - Implementation order

3. **For each task with status `pending`**:

   a. **Update status to `in_progress`** in the tasks file

   b. **Read the requirement** from PRODUCT.md for full context

   c. **Implement the task**:
      - CREATE: Write new files/components
      - MODIFY: Edit existing files
      - DELETE: Remove code/files

   d. **Update status to `completed`** in the tasks file

   e. **Move to next task**

4. **Continue until all tasks are completed**

## Task Status Values

| Status | Meaning |
|--------|---------|
| `pending` | Not started |
| `in_progress` | Currently being implemented |
| `completed` | Implementation finished |

## Status Update Format

Update the task in the markdown file:

Before:
```markdown
#### Task 1: [AUTH-5] - Add logout button
- **Status**: pending
```

During:
```markdown
#### Task 1: [AUTH-5] - Add logout button
- **Status**: in_progress
```

After:
```markdown
#### Task 1: [AUTH-5] - Add logout button
- **Status**: completed
```

## Implementation Guidelines

- Follow existing code patterns in the codebase
- Use TypeScript strictly
- Follow component patterns in `src/components/`
- Use existing hooks from `src/hooks/`
- Add translations to `src/i18n/translations.ts` for new UI text
- Support both English and Hebrew (RTL)
- Do NOT run tests or linting after each task
- Do NOT create git commits

## Codebase Reference

| Area | Key Locations |
|------|---------------|
| AUTH | `src/hooks/useAuth*`, `src/components/auth/` |
| PERS | `src/components/personnel/`, `src/hooks/usePersonnel*` |
| EQUIP | `src/components/equipment/`, `src/hooks/useEquipment*` |
| XFER | `src/components/transfers/`, `src/hooks/useTransfer*` |
| UNIT | `src/components/units/`, `src/hooks/useUnit*` |
| UI | `src/components/ui/` |
| I18N | `src/i18n/translations.ts` |

## Error Handling

If a task cannot be completed:
- Update status to `blocked`
- Add a note explaining the blocker
- Continue to next task
