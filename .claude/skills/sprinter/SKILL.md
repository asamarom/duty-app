---
name: sprinter
description: Generate sprint summary documents from PRODUCT.md changes. Use when the user says "create a sprint", "generate sprint summary", or asks to summarize product requirement changes since the last sprint.
---

# Sprinter

Generate a sprint summary document that captures all requirement changes in PRODUCT.md since the last sprint.

## Workflow

1. **Find the last sprint number**
   ```bash
   ls sprints/ | grep -oP 'sprint_\K\d+' | sort -n | tail -1
   ```
   If no sprints exist, start at 1.

2. **Get the commit of the last sprint creation**
   ```bash
   git log -1 --format=%H -- sprints/sprint_<last>.md
   ```
   If no previous sprint, use the initial commit or first commit that touched PRODUCT.md.

3. **Get PRODUCT.md diff since that commit**
   ```bash
   git diff <commit>..HEAD -- PRODUCT.md
   ```

4. **Parse the diff** to identify:
   - **Added requirements**: Lines starting with `+` containing `[AREA-N]` patterns
   - **Removed requirements**: Lines starting with `-` containing `[AREA-N]` patterns
   - **Modified requirements**: Same ID appears in both added and removed

5. **Group by area**: AUTH, PERS, EQUIP, XFER, ONBOARD, UI, I18N, UNIT

6. **Create the sprint document** at `sprints/sprint_<next>.md` using the template in `assets/sprint-template.md`

## Requirement ID Pattern

Format: `[AREA-N]` or `[AREA-N.M]`
Examples: `[AUTH-1]`, `[XFER-4.2]`, `[UI-3]`

## Output Location

Save to: `sprints/sprint_X.md` where X is the next sequential number.
