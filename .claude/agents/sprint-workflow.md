# Sprint Workflow Agent

This agent orchestrates the requirements-driven development workflow for the Duty Tactical Management System.

## Requirements-Driven Development Workflow

This project uses a two-document system for requirement tracking:

### Key Documents

1. **[PRODUCT.md](../../PRODUCT.md)** - Source of truth for all product requirements
   - Human-readable prose with inline requirement IDs
   - Format: `[AREA-N]` or `[AREA-N.M]` for sub-requirements
   - Areas: `AUTH`, `PERS`, `EQUIP`, `XFER`, `ONBOARD`, `UI`, `I18N`, `UNIT`

2. **[TESTS.md](../../TESTS.md)** - Test coverage matrix
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

## Sprint Workflow

When the user says **"run sprint workflow"** or **"execute sprint workflow"**, run the following skill sequence:

### Workflow Steps

```
PRODUCT.md changes
       ↓
1. /sprinter        →  sprints/sprint_x.md
       ↓
2. In parallel:
   ├── /code-planner   →  sprint_tasks/sprint_x_tasks.md
   └── /tests-updater  →  TESTS.md (status: planned)
       ↓
3. In parallel:
   ├── /coder          →  implements code, updates task status
   └── /test-writer    →  writes test code (status: covered)
       ↓
4. /tester          →  runs tests → commits if all pass
```

### Output Directories

- `sprints/` - Sprint summary documents
- `sprint_tasks/` - Task breakdown files
- `e2e/` - E2E test files

## Skills Reference

All skills are defined in `.claude/skills/` and invoked via slash commands.

### /sprinter - Sprint Summary Generator

Generates a sprint summary document from PRODUCT.md changes.

| | |
|---|---|
| **Input** | PRODUCT.md (git diff since last sprint) |
| **Output** | `sprints/sprint_x.md` |
| **Trigger** | User says "create a sprint" or "generate sprint summary" |

Finds the last sprint number, diffs PRODUCT.md against the last sprint commit, groups added/modified/removed requirements by area, and writes a structured sprint document.

### /code-planner - Task Breakdown Planner

Plans code changes based on sprint requirement changes.

| | |
|---|---|
| **Input** | `sprints/sprint_x.md` |
| **Output** | `sprint_tasks/sprint_x_tasks.md` |
| **Trigger** | Invoked as step 2 of the sprint workflow |

Reads the latest sprint file, analyzes the codebase to determine files to create/modify/delete, and produces a prioritized task list (High/Medium/Low) with dependency ordering.

### /tests-updater - Test Planning Agent

Updates TESTS.md with planned tests based on sprint requirement changes.

| | |
|---|---|
| **Input** | `sprints/sprint_x.md` |
| **Output** | Updates `TESTS.md` (status: `planned`) |
| **Trigger** | Invoked as step 2 of the sprint workflow |

Adds entries for new requirements (`planned`), updates entries for modified requirements, marks removed requirements as `deprecated`, and closes existing test gaps (`gap` → `planned`).

### /coder - Code Implementation Agent

Implements code changes from sprint task files.

| | |
|---|---|
| **Input** | `sprint_tasks/sprint_x_tasks.md` |
| **Output** | Writes/modifies source code, updates task status |
| **Trigger** | Invoked as step 3 of the sprint workflow |

Processes each pending task sequentially: reads the requirement from PRODUCT.md, implements the change, and updates the task status. Does NOT run tests or create commits.

### /test-writer - Test Code Generator

Writes E2E test code for planned tests in TESTS.md.

| | |
|---|---|
| **Input** | `TESTS.md` (entries with status `planned`) |
| **Output** | Playwright test code in `e2e/`, updates TESTS.md (`planned` → `covered`) |
| **Trigger** | Invoked as step 3 of the sprint workflow |

Reads all planned entries, writes Playwright tests following project patterns, and updates the coverage status.

### /tester - Test Runner & Committer

Runs all E2E tests and commits if successful.

| | |
|---|---|
| **Input** | All staged changes |
| **Output** | Test results; git commit if all pass |
| **Trigger** | Invoked as step 4 of the sprint workflow |

Runs `npm run test:e2e`. If all tests pass, stages and commits with a sprint summary message. If tests fail, summarizes failures and asks the user how to proceed.
