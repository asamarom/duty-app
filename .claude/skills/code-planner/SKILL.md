---
name: code-planner
description: Plan code changes based on sprint requirement changes. Reviews the latest sprint_x.md from /sprints/ and creates a task breakdown for implementation. Does NOT write code - only creates the plan. Use when explicitly invoked by the user.
---

# Code Planner

Create a task breakdown plan for implementing requirement changes from the latest sprint.

## Workflow

1. **Find the latest sprint file**
   ```bash
   ls sprints/ | grep -oP 'sprint_\K\d+' | sort -n | tail -1
   ```
   Read `sprints/sprint_<latest>.md`

2. **Parse the sprint document** to extract:
   - Added requirements (new features to implement)
   - Modified requirements (existing code to update)
   - Removed requirements (code to delete/deprecate)

3. **For each requirement, analyze the codebase** to determine:
   - Which files need to be created
   - Which files need to be modified
   - Which files need to be deleted
   - Dependencies between tasks

4. **Create task breakdown** with:
   - Clear task descriptions
   - Affected files
   - Task type (CREATE, MODIFY, DELETE)
   - Priority order based on dependencies

5. **Save the plan** to `sprint_tasks/sprint_<X>_tasks.md`

## Codebase Analysis Guidelines

When analyzing requirements:

- **AUTH/PERS/ONBOARD**: Check `src/hooks/`, `src/components/auth/`, Supabase policies
- **EQUIP**: Check `src/components/equipment/`, `src/hooks/useEquipment*`
- **XFER**: Check `src/components/transfers/`, `src/hooks/useTransfer*`
- **UI/I18N**: Check `src/components/ui/`, `src/i18n/translations.ts`
- **UNIT**: Check `src/components/units/`, `src/hooks/useUnit*`

## Output

Save to: `sprint_tasks/sprint_X_tasks.md` where X matches the sprint number.
