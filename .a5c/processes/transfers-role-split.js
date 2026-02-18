/**
 * @process transfers-role-split
 * @description TDD implementation: split assignment-requests page into admin-only view
 *   and a user-facing "My Requests" panel inside EquipmentPage.
 * @inputs { repoPath: string }
 * @outputs { success: boolean, filesModified: string[] }
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

export async function process(inputs, ctx) {
  const repoPath = inputs.repoPath || '/home/ubuntu/claude-code-telegram/duty-app';

  // ── PHASE 1: UI Design ─────────────────────────────────────────────────────
  // UI expert agent reads the current implementation and designs the new UX:
  // - "My Requests" panel inside EquipmentPage for regular users
  // - Admin AssignmentRequestsPage cleanup (remove tabs not relevant to regular users)
  // - Navigation changes (hide Transfers link from regular users)
  const uiSpec = await ctx.task(uiDesignTask, { repoPath });

  // ── PHASE 2: Write E2E tests (RED — TDD) ──────────────────────────────────
  // Write failing tests BEFORE implementation. Tests verify:
  // - Admin sees full transfers page with all tabs
  // - Regular user does NOT see transfers nav link
  // - Regular user sees "My Requests" section in Equipment page
  // - Regular user can see their own pending requests from Equipment page
  const e2eTests = await ctx.task(writeE2ETestsTask, { repoPath, uiSpec });

  // ── PHASE 3: Implement all changes ────────────────────────────────────────
  const implementation = await ctx.task(implementTask, { repoPath, uiSpec });

  // ── PHASE 4: TypeScript check + unit tests ─────────────────────────────────
  const qualityCheck = await ctx.task(qualityCheckTask, { repoPath });

  // ── PHASE 5: Run E2E tests (convergence loop) ──────────────────────────────
  const e2eResult = await ctx.task(runE2EConvergenceTask, { repoPath });

  // ── PHASE 6: Commit ────────────────────────────────────────────────────────
  await ctx.task(commitTask, {
    repoPath,
    filesModified: [
      ...implementation.filesModified,
      ...e2eTests.filesModified,
    ],
  });

  return {
    success: true,
    filesModified: implementation.filesModified,
  };
}

// ── Task 1: UI Design ─────────────────────────────────────────────────────────
export const uiDesignTask = defineTask('ui-design', (args, taskCtx) => ({
  kind: 'agent',
  title: 'UI Design: transfers role split',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Expert UI/UX designer and React engineer specializing in military/tactical management interfaces. You design clear, simple, intuitive UIs with minimal cognitive overhead.',
      task: `Design the UI for splitting the assignment-requests feature into:
1. An admin-only management page (existing /assignment-requests, simplified)
2. A user-facing "My Requests" section embedded in the Equipment page

The app uses RTL Hebrew, Tailwind CSS, shadcn/ui components, and a dark tactical theme.`,
      context: {
        repoPath: args.repoPath,
        currentFeatureDescription: `
Current state:
- /assignment-requests shows 3 tabs to ALL users: "Incoming", "Pending", "History"
- "Incoming" = transfers where user is the recipient and hasn't approved yet (recipient_approved=false)
- "Pending" = all pending requests (sent by anyone)
- "History" = completed (approved/rejected) requests

Required change:
- Regular users should NOT see the standalone /assignment-requests page at all
- Regular users should see ONLY their own pending (sent) requests, from within the Equipment screen
- Admin/Leader users keep the full management page

Key data: AssignmentRequest has fields: status ('pending'|'approved'|'rejected'), requestedBy (uid), recipient_approved (boolean)
Current page: src/pages/AssignmentRequestsPage.tsx
Equipment page: src/pages/EquipmentPage.tsx
Nav: src/components/layout/Sidebar.tsx + MobileNav.tsx
Hook: src/hooks/useAssignmentRequests.tsx (returns: requests, incomingTransfers, loading)
`,
      },
      instructions: [
        `Read: ${args.repoPath}/src/pages/AssignmentRequestsPage.tsx`,
        `Read: ${args.repoPath}/src/pages/EquipmentPage.tsx`,
        `Read: ${args.repoPath}/src/components/layout/Sidebar.tsx`,
        `Read: ${args.repoPath}/src/components/layout/MobileNav.tsx`,
        `Read: ${args.repoPath}/src/i18n/translations.ts`,
        `Read: ${args.repoPath}/src/hooks/useAssignmentRequests.tsx`,
        '',
        'Now design the following (produce a concrete spec, not vague ideas):',
        '',
        '== DESIGN 1: "My Requests" in EquipmentPage ==',
        'Where exactly in the Equipment page should user requests appear?',
        'Options to evaluate:',
        '  A) A collapsible section at the top/bottom of the equipment list',
        '  B) A badge/button in the page header that opens a slide-over drawer',
        '  C) A tab alongside the equipment list',
        'Choose the option that is most intuitive for a user who just created a transfer request',
        'and wants to check its status. The user just requested a transfer from the equipment',
        'screen, so they naturally look at the equipment page for status.',
        '',
        'For the chosen option, specify:',
        '  - Exact component structure (what shadcn components to use)',
        '  - What data to show per request row: equipment name, to-unit, status badge, date',
        '  - Empty state when no pending requests',
        '  - How to filter: only requests where requestedBy == current user uid',
        '',
        '== DESIGN 2: Admin AssignmentRequestsPage ==',
        'The admin page keeps all 3 tabs but may need minor cleanup:',
        '  - "Incoming" tab: transfers where the admin/leader unit is recipient',
        '  - "Pending" tab: all pending requests across the system',
        '  - "History" tab: all completed requests',
        'Identify if any current UI elements are confusing and should be clarified.',
        '',
        '== DESIGN 3: Navigation changes ==',
        'Specify exactly which condition hides the Transfers nav link.',
        'Current: shown if isAdmin || isLeader. Keep this — just confirm.',
        'Regular users (role="user" only): should NOT see the link.',
        '',
        '== DESIGN 4: New translation keys needed ==',
        'List any new i18n keys required for the user-facing panel.',
        '',
        'Return a concrete spec as structured JSON.',
      ],
      outputFormat: 'JSON with fields: myRequestsDesign (object), adminPageChanges (string), navCondition (string), newI18nKeys (object), dataTestIds (object)',
    },
    outputSchema: {
      type: 'object',
      required: ['myRequestsDesign', 'adminPageChanges', 'navCondition', 'newI18nKeys', 'dataTestIds'],
      properties: {
        myRequestsDesign: {
          type: 'object',
          properties: {
            approach: { type: 'string' },
            placement: { type: 'string' },
            components: { type: 'array', items: { type: 'string' } },
            rowFields: { type: 'array', items: { type: 'string' } },
            emptyStateText: { type: 'string' },
            filter: { type: 'string' },
          },
        },
        adminPageChanges: { type: 'string' },
        navCondition: { type: 'string' },
        newI18nKeys: { type: 'object' },
        dataTestIds: { type: 'object' },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ── Task 2: Write E2E tests (TDD — RED phase) ─────────────────────────────────
export const writeE2ETestsTask = defineTask('write-e2e-tests', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Write E2E tests for transfers role split (TDD - write before implementing)',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior QA engineer following strict TDD methodology. Write tests FIRST before any implementation exists.',
      task: 'Write Playwright E2E tests for the transfers role-split feature. Tests should FAIL right now and PASS after implementation.',
      context: {
        repoPath: args.repoPath,
        uiSpec: args.uiSpec,
      },
      instructions: [
        `Read: ${args.repoPath}/e2e/utils/test-auth.ts`,
        `Read: ${args.repoPath}/e2e/equipment.spec.ts (if exists, for patterns)`,
        `Read: ${args.repoPath}/e2e/personnel.spec.ts (for patterns)`,
        `Read: ${args.repoPath}/playwright.config.ts`,
        '',
        `Create: ${args.repoPath}/e2e/transfers-role-split.spec.ts`,
        '',
        'Write tests using the loginAsTestUser helper. Use test.describe blocks:',
        '',
        'DESCRIBE 1: "Admin/Leader — full transfers page"',
        '  test("admin sees Transfers link in sidebar")',
        '    - loginAsTestUser(page, "admin")',
        '    - page.goto("/")',
        '    - expect sidebar/nav to contain a link to /assignment-requests',
        '',
        '  test("admin can navigate to /assignment-requests")',
        '    - loginAsTestUser(page, "admin")',
        '    - page.goto("/assignment-requests")',
        '    - expect page heading or tab to be visible (not redirected)',
        '',
        'DESCRIBE 2: "Regular user — no standalone transfers page"',
        '  test("user does NOT see Transfers link in nav")',
        '    - loginAsTestUser(page, "user")',
        '    - page.goto("/")',
        '    - expect NO link/button with href="/assignment-requests" to be visible',
        '',
        '  test("user redirected away from /assignment-requests")',
        '    - loginAsTestUser(page, "user")',
        '    - page.goto("/assignment-requests")',
        '    - expect to be redirected (not see the transfers management page)',
        '    - OR expect an "access denied" message',
        '',
        'DESCRIBE 3: "Regular user — My Requests in Equipment page"',
        '  test("user sees My Requests section in Equipment page")',
        '    - loginAsTestUser(page, "user")',
        '    - page.goto("/equipment")',
        '    - Look for the data-testid from uiSpec.dataTestIds (e.g. data-testid="my-requests-section" or similar)',
        '    - expect it to be visible',
        '',
        '  test("My Requests section shows empty state when no requests")',
        '    - loginAsTestUser(page, "user")',
        '    - page.goto("/equipment")',
        '    - expect empty state text to be visible (from uiSpec)',
        '',
        'Use the data-testid values from the uiSpec.dataTestIds when writing selectors.',
        'If uiSpec is not available or empty, use reasonable data-testid names like:',
        '  "my-requests-section", "my-requests-empty", "my-requests-row"',
        '',
        'Use the Write tool to create the test file.',
        'Return filesModified.',
      ],
      outputFormat: 'JSON with fields: filesModified (array), summary (string)',
    },
    outputSchema: {
      type: 'object',
      required: ['filesModified', 'summary'],
      properties: {
        filesModified: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ── Task 3: Implement all changes ──────────────────────────────────────────────
export const implementTask = defineTask('implement', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Implement transfers role split across all affected files',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior React/TypeScript engineer. Implement exactly what the UI spec says — no more, no less.',
      task: 'Implement the transfers role-split feature across all required files. Read each file before modifying.',
      context: {
        repoPath: args.repoPath,
        uiSpec: args.uiSpec,
      },
      instructions: [
        '== CHANGE 1: Route guard in App.tsx ==',
        `Read: ${args.repoPath}/src/App.tsx`,
        'The /assignment-requests route should only be accessible to admin or leader.',
        'Wrap the route with a check: if user has role "user" only (not admin/leader), redirect to /equipment.',
        'Look at how other protected routes work in this file and use the same pattern.',
        'Use Edit tool.',
        '',
        '== CHANGE 2: Hide Transfers nav link from regular users ==',
        `Read: ${args.repoPath}/src/components/layout/Sidebar.tsx`,
        'The Transfers link currently shows for isAdmin || isLeader.',
        'Confirm this condition is correct per the uiSpec.navCondition and keep it.',
        'If it already hides from regular users, no change needed — just verify.',
        'Use Edit tool if needed.',
        '',
        `Read: ${args.repoPath}/src/components/layout/MobileNav.tsx`,
        'Same check for MobileNav — Transfers tab should only show for admin/leader.',
        'Use Edit tool if needed.',
        '',
        '== CHANGE 3: Add i18n keys ==',
        `Read: ${args.repoPath}/src/i18n/translations.ts`,
        'Add any new translation keys from uiSpec.newI18nKeys.',
        'Add them to both the "en" and "he" (Hebrew) sections.',
        'Use Edit tool.',
        '',
        '== CHANGE 4: Add "My Requests" panel to EquipmentPage ==',
        `Read: ${args.repoPath}/src/pages/EquipmentPage.tsx`,
        `Read: ${args.repoPath}/src/hooks/useAssignmentRequests.tsx`,
        `Read: ${args.repoPath}/src/hooks/useAuth.tsx`,
        'Implement the "My Requests" UI as designed in uiSpec.myRequestsDesign.',
        'Key implementation points:',
        '  - Import and use useAssignmentRequests hook',
        '  - Import and use useAuth hook to get current user uid',
        '  - Filter requests: requests.filter(r => r.requestedBy === user?.uid && r.status === "pending")',
        '  - Use the data-testid values from uiSpec.dataTestIds',
        '  - Add the empty state when filtered list is empty',
        '  - Each row shows: equipment name, destination (toName), status badge, date',
        '  - Only show this section to users without admin/leader role (or show to everyone — per uiSpec)',
        'Use shadcn/ui components consistent with the rest of the file.',
        'Use Edit tool.',
        '',
        '== CHANGE 5: Admin transfers page cleanup (if any) ==',
        `Read: ${args.repoPath}/src/pages/AssignmentRequestsPage.tsx`,
        'Apply any changes from uiSpec.adminPageChanges.',
        'If no changes needed, skip this step.',
        'Use Edit tool if needed.',
        '',
        'After all changes, return filesModified.',
      ],
      outputFormat: 'JSON with fields: filesModified (array), summary (string)',
    },
    outputSchema: {
      type: 'object',
      required: ['filesModified', 'summary'],
      properties: {
        filesModified: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ── Task 4: TypeScript check + unit tests ──────────────────────────────────────
export const qualityCheckTask = defineTask('quality-check', (args, taskCtx) => ({
  kind: 'agent',
  title: 'TypeScript check + unit tests — fix all failures',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior TypeScript engineer',
      task: 'Run TypeScript typecheck and unit tests. Fix any failures. Return only when both pass.',
      context: { repoPath: args.repoPath },
      instructions: [
        `Run: npm --prefix ${args.repoPath} run typecheck 2>&1`,
        'If TypeScript errors: read the failing files, fix type issues, re-run.',
        '',
        `Run: npm --prefix ${args.repoPath} run test:run 2>&1`,
        'If unit tests fail: read the failing test files and source files, fix, re-run.',
        'Max 3 fix attempts for each.',
        'Return success=true only when both pass with 0 errors.',
      ],
      outputFormat: 'JSON with fields: typecheckPassed (boolean), unitTestsPassed (boolean), summary (string)',
    },
    outputSchema: {
      type: 'object',
      required: ['typecheckPassed', 'unitTestsPassed', 'summary'],
      properties: {
        typecheckPassed: { type: 'boolean' },
        unitTestsPassed: { type: 'boolean' },
        summary: { type: 'string' },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ── Task 5: Run E2E tests with convergence ──────────────────────────────────────
export const runE2EConvergenceTask = defineTask('e2e-convergence', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Run E2E tests and fix until all pass (convergence)',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior QA engineer. Run E2E tests and fix implementation issues until all tests pass.',
      task: 'Run the transfers-role-split E2E tests. If they fail, investigate, fix the implementation, and re-run. Converge to GREEN.',
      context: { repoPath: args.repoPath },
      instructions: [
        'First, make sure Firebase emulators are running. Check:',
        `  curl -s http://localhost:8085/ 2>/dev/null | head -c 100 || echo "emulators not running"`,
        'If emulators are not running, start them:',
        `  cd ${args.repoPath} && npm run test:e2e:start-emulators 2>&1 &`,
        '  Sleep 10 seconds, then check again.',
        '',
        'Make sure serve (port 3999 for role-switcher) is running — if not, that is fine, not needed here.',
        '',
        'Run ONLY the new spec file (not full suite):',
        `  npx --prefix ${args.repoPath} playwright test e2e/transfers-role-split.spec.ts --project=chromium 2>&1`,
        '',
        'If tests fail:',
        '  1. Read the test output carefully',
        '  2. Read the relevant source files (EquipmentPage.tsx, Sidebar.tsx, App.tsx)',
        '  3. Fix the implementation issue',
        '  4. Re-run the specific failing test',
        '  5. Repeat up to 4 fix-and-rerun cycles',
        '',
        'Common issues to look for:',
        '  - data-testid mismatch between test and implementation',
        '  - Role check condition off (user vs admin)',
        '  - Component not imported or not rendered',
        '  - Selector not finding element due to conditional rendering',
        '',
        'Return allPassing=true only when all tests in the spec pass.',
      ],
      outputFormat: 'JSON with fields: allPassing (boolean), passCount (number), failCount (number), summary (string)',
    },
    outputSchema: {
      type: 'object',
      required: ['allPassing', 'passCount', 'failCount', 'summary'],
      properties: {
        allPassing: { type: 'boolean' },
        passCount: { type: 'number' },
        failCount: { type: 'number' },
        summary: { type: 'string' },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ── Task 6: Commit ─────────────────────────────────────────────────────────────
export const commitTask = defineTask('commit', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Commit all changes',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior engineer',
      task: 'Stage and commit all changed files.',
      context: { repoPath: args.repoPath, filesModified: args.filesModified },
      instructions: [
        `Run: git -C ${args.repoPath} status`,
        `Run: git -C ${args.repoPath} add src/ e2e/`,
        'Commit with message:',
        '"feat: split transfers — admin-only page + My Requests panel in Equipment\\n\\nCo-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"',
        'Return committed=true and commitHash.',
      ],
      outputFormat: 'JSON with fields: committed (boolean), commitHash (string)',
    },
    outputSchema: {
      type: 'object',
      required: ['committed'],
      properties: {
        committed: { type: 'boolean' },
        commitHash: { type: 'string' },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));
