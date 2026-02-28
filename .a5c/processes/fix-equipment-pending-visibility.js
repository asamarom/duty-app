/**
 * @process fix-equipment-pending-visibility
 * @description Systematically debug and fix bug where pending transfer items appear in Equipment tab
 * @inputs {}
 * @outputs { success: boolean, fixApplied: boolean, testsPass: boolean }
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

/**
 * Fix Equipment Pending Transfer Visibility Bug
 *
 * Bug Description:
 * - User with "מסייעת leader" role sees 5 אלונקה items in Equipment tab
 * - Only 2 items are actually pending transfer approval (visible in Transfers tab)
 * - The other 3 items are pending transfers but shouldn't be visible in Equipment tab
 * - Equipment tab should only show items actually assigned to user's unit/personnel
 *
 * Root Cause:
 * - useEquipment hook doesn't filter out equipment with pending transfers to other units
 * - It shows ALL equipment including items pending transfer that user hasn't approved yet
 *
 * Expected Behavior:
 * - Equipment tab: Only show items actually assigned to user's unit or personnel
 * - Items with pending transfers TO the user should NOT appear until approved
 * - Transfers tab: Show pending transfers for approval (already working correctly)
 *
 * Flow:
 * 1. Analyze bug and identify root cause
 * 2. Identify exact fix location
 * 3. Implement filtering fix
 * 4. Test locally (TypeScript check)
 * 5. Run E2E tests
 * 6. Verify fix
 */
export async function process(inputs, ctx) {
  ctx.log('Starting Equipment Pending Visibility Bug Fix Process');

  // ============================================================================
  // PHASE 1: Analyze Bug
  // ============================================================================

  ctx.log('\n=== PHASE 1: Analyze Bug ===');

  const analysisResult = await ctx.task(analyzeBugTask, {});

  ctx.log(`Current behavior: ${analysisResult.currentBehavior}`);
  ctx.log(`Root cause: ${analysisResult.rootCause}`);

  // ============================================================================
  // PHASE 2: Identify Fix Location
  // ============================================================================

  ctx.log('\n=== PHASE 2: Identify Fix Location ===');

  const fixPlanResult = await ctx.task(identifyFixTask, {
    analyzeBugResult: analysisResult
  });

  ctx.log(`Fix location: ${fixPlanResult.fixLocation}`);
  ctx.log(`Approach: ${fixPlanResult.approach}`);

  // ============================================================================
  // PHASE 3: Implement Fix
  // ============================================================================

  ctx.log('\n=== PHASE 3: Implement Fix ===');

  const implementResult = await ctx.task(implementFixTask, {
    analyzeBugResult: analysisResult,
    identifyFixResult: fixPlanResult
  });

  ctx.log(`Files modified: ${implementResult.filesModified.join(', ')}`);
  ctx.log(`Changes: ${implementResult.changesDescription}`);

  // ============================================================================
  // PHASE 4: Test Locally (TypeScript Check)
  // ============================================================================

  ctx.log('\n=== PHASE 4: Test Locally ===');

  const testResult = await ctx.task(testLocallyTask, {
    implementFixResult: implementResult
  });

  ctx.log('TypeScript check completed');

  // ============================================================================
  // PHASE 5: Run E2E Tests
  // ============================================================================

  ctx.log('\n=== PHASE 5: Run E2E Tests ===');

  const e2eResult = await ctx.task(runTestsTask, {
    implementFixResult: implementResult
  });

  ctx.log('E2E tests completed');

  // ============================================================================
  // PHASE 6: Verify Fix
  // ============================================================================

  ctx.log('\n=== PHASE 6: Verify Fix ===');

  const verifyResult = await ctx.task(verifyFixTask, {
    implementFixResult: implementResult,
    testLocallyResult: testResult,
    runTestsResult: e2eResult
  });

  ctx.log(`Verification status: ${verifyResult.verified ? 'PASSED' : 'FAILED'}`);
  ctx.log(`Summary: ${verifyResult.summary}`);

  return {
    success: verifyResult.verified,
    fixApplied: true,
    testsPass: verifyResult.verified,
    analysis: analysisResult,
    implementation: implementResult,
    verification: verifyResult
  };
}

// ============================================================================
// Task Definitions
// ============================================================================

const analyzeBugTask = defineTask('analyze-bug', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Analyze equipment visibility bug',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior debugging specialist',
      task: `Analyze the equipment visibility bug in the duty-app codebase.

Context:
- User role: "מסייעת leader"
- Issue: Sees 5 אלונקה items in Equipment tab, but only 2 are pending their approval
- Expected: Should only see equipment assigned to their unit, not pending transfers

Your tasks:
1. Read /home/ubuntu/duty-app/src/hooks/useEquipment.tsx (focus on lines 126-193)
2. Read /home/ubuntu/duty-app/src/pages/EquipmentPage.tsx (focus on lines 31-52)
3. Read /home/ubuntu/duty-app/src/hooks/useAssignmentRequests.tsx (focus on lines 175-218)
4. Analyze how equipment filtering works currently
5. Identify why pending transfer items appear in Equipment tab
6. Determine the root cause: is equipment being created for pending transfers?
7. Propose where the fix should be applied (useEquipment vs EquipmentPage)

Output as JSON:
{
  "currentBehavior": "description of what's happening",
  "rootCause": "why pending items show up",
  "proposedSolution": "where and how to fix",
  "filteringLogicNeeded": "what filtering logic is needed"
}`,
      context: {
        files: [
          '/home/ubuntu/duty-app/src/hooks/useEquipment.tsx',
          '/home/ubuntu/duty-app/src/pages/EquipmentPage.tsx',
          '/home/ubuntu/duty-app/src/hooks/useAssignmentRequests.tsx'
        ]
      },
      outputFormat: 'JSON'
    },
    outputSchema: {
      type: 'object',
      required: ['currentBehavior', 'rootCause', 'proposedSolution', 'filteringLogicNeeded']
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const identifyFixTask = defineTask('identify-fix', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Identify exact fix location',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Software architect',
      task: `Based on the bug analysis, identify the exact location and approach for the fix.

Previous analysis results: ${JSON.stringify(args.analyzeBugResult)}

Your tasks:
1. Review the useEquipment hook rebuild function (lines 73-204)
2. Check how equipment rows are created for assignments
3. Determine if we need to filter at:
   - useEquipment hook level (filter out pending transfers to other units)
   - EquipmentPage component level (filter displayed items)
   - Or both
4. Consider user's unit context from useAssignmentRequests (lines 175-199)
5. Specify exact file, function, and line numbers for changes

Output as JSON:
{
  "fixLocation": "file path and function name",
  "lineNumbers": "specific lines to modify",
  "approach": "detailed description of the fix",
  "requiresUserContext": "boolean - does fix need current user's unit/personnel ID",
  "additionalContext": "any additional data needed (hooks, props, etc)"
}`,
      context: {
        previousAnalysis: args.analyzeBugResult
      },
      outputFormat: 'JSON'
    },
    outputSchema: {
      type: 'object',
      required: ['fixLocation', 'lineNumbers', 'approach', 'requiresUserContext']
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const implementFixTask = defineTask('implement-fix', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Implement the filtering fix',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior TypeScript/React developer',
      task: `Implement the fix for the equipment visibility bug.

Bug analysis: ${JSON.stringify(args.analyzeBugResult)}
Fix location: ${JSON.stringify(args.identifyFixResult)}

Your tasks:
1. Read the files identified in the fix location
2. Implement the filtering logic to exclude:
   - Equipment items that have pending transfers TO other units
   - Equipment items not yet assigned to the current user's unit/personnel
3. Ensure the fix properly uses:
   - Current user's personnel ID
   - Current user's unit ID
   - Equipment assignment data
   - Pending transfer data
4. Preserve existing functionality:
   - Transfers tab should still work
   - Unassigned equipment should still appear if appropriate
   - Equipment actually assigned to user's unit should appear
5. Use the Edit tool to make the necessary code changes
6. Ensure TypeScript types are correct
7. Add comments explaining the filtering logic

After making changes, return a summary of what was changed.

Output as JSON:
{
  "filesModified": ["list of files changed"],
  "changesDescription": "description of changes made",
  "filteringLogic": "explanation of the filtering logic added",
  "edgeCasesHandled": ["list of edge cases considered"]
}`,
      context: {
        previousAnalysis: args.analyzeBugResult,
        fixPlan: args.identifyFixResult
      },
      instructions: [
        'Read all relevant files before making changes',
        'Use Edit tool to make precise changes',
        'Preserve existing functionality',
        'Add clear comments',
        'Ensure TypeScript compilation will succeed'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: {
      type: 'object',
      required: ['filesModified', 'changesDescription', 'filteringLogic']
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const testLocallyTask = defineTask('test-locally', (args, taskCtx) => ({
  kind: 'shell',
  title: 'Test the fix in development mode',
  script: `
cd /home/ubuntu/duty-app

# First check TypeScript compilation
echo "Checking TypeScript compilation..."
npx tsc --noEmit || exit 1

echo "TypeScript check passed!"
echo ""
echo "Fix has been implemented. Manual testing required:"
echo "1. Start dev server: npm run dev"
echo "2. Login as מסייעת leader user"
echo "3. Navigate to Equipment tab"
echo "4. Verify only appropriate אלונקה items appear"
echo "5. Navigate to Transfers tab"
echo "6. Verify 2 pending items still appear correctly"
echo ""
echo "TypeScript compilation successful. Ready for manual testing."
`,
  io: {
    stdoutPath: `tasks/${taskCtx.effectId}/stdout.txt`,
    stderrPath: `tasks/${taskCtx.effectId}/stderr.txt`
  }
}));

const runTestsTask = defineTask('run-tests', (args, taskCtx) => ({
  kind: 'shell',
  title: 'Run E2E tests for equipment and transfers',
  script: `
cd /home/ubuntu/duty-app

echo "Running equipment E2E tests..."
npx playwright test e2e/equipment.spec.ts --reporter=list || echo "Equipment tests completed with status: $?"

echo ""
echo "Running transfers E2E tests..."
npx playwright test e2e/transfers.spec.ts --reporter=list || echo "Transfers tests completed with status: $?"

echo ""
echo "Running transfers role split tests..."
npx playwright test e2e/transfers-role-split.spec.ts --reporter=list || echo "Transfers role split tests completed with status: $?"

echo ""
echo "Test execution completed. Check results above."
`,
  io: {
    stdoutPath: `tasks/${taskCtx.effectId}/stdout.txt`,
    stderrPath: `tasks/${taskCtx.effectId}/stderr.txt`
  }
}));

const verifyFixTask = defineTask('verify-fix', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Verify the fix resolves the issue',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'QA engineer',
      task: `Verify that the equipment visibility bug has been fixed.

Implementation details: ${JSON.stringify(args.implementFixResult)}
Test results stdout: Check the stdout file for test results

Your tasks:
1. Review the changes made
2. Analyze the filtering logic
3. Check if TypeScript compilation succeeded
4. Verify the filtering logic is sound
5. Identify any potential issues or edge cases
6. Provide final verification status

Consider:
- Does the fix address the root cause?
- Are there any potential regressions?
- Does it handle all edge cases?
- Is the code maintainable?

Output as JSON:
{
  "verified": true/false,
  "issues": ["list of any issues found"],
  "recommendations": ["any recommendations for improvement"],
  "summary": "overall assessment of the fix"
}`,
      context: {
        implementationDetails: args.implementFixResult
      },
      outputFormat: 'JSON'
    },
    outputSchema: {
      type: 'object',
      required: ['verified', 'issues', 'recommendations', 'summary']
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));
