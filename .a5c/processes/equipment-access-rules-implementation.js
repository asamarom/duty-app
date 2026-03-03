/**
 * @process equipment-access-rules-implementation
 * @description Implement equipment access rules from EQUIPMENT_ACCESS_RULES.md role-by-role with TDD cycles
 * @inputs { roles: string[] }
 * @outputs { success: boolean, rolesCompleted: string[], testResults: object }
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

/**
 * Equipment Access Rules Implementation Process
 *
 * Implements access control rules role-by-role:
 * 1. Admin role rules
 * 2. Leader/Signature-approved role rules
 * 3. Regular User role rules
 *
 * Each role goes through:
 * - Implement Firestore security rules
 * - Update client-side code (hooks, components)
 * - Update/create E2E tests
 * - Run full test suite
 * - Commit and verify
 * - Move to next role only if all tests pass
 */
export async function process(inputs, ctx) {
  const {
    roles = ['admin', 'leader', 'user']
  } = inputs;

  const completedRoles = [];
  const results = {
    rolesCompleted: [],
    iterations: []
  };

  // ============================================================================
  // PHASE 0: ANALYSIS & PLANNING
  // ============================================================================

  const analysisResult = await ctx.task(analyzeCurrentStateTask, {
    rulesDoc: 'EQUIPMENT_ACCESS_RULES.md',
    firestoreRules: 'firestore.rules',
    clientCode: 'src/hooks/useEquipment.tsx'
  });

  await ctx.breakpoint({
    question: 'Review the gap analysis between current implementation and EQUIPMENT_ACCESS_RULES.md. Approve to proceed with implementation?',
    title: 'Gap Analysis Review',
    context: {
      runId: ctx.runId,
      files: [
        { path: `tasks/${analysisResult.effectId}/analysis.md`, format: 'markdown', label: 'Gap Analysis' }
      ]
    }
  });

  // ============================================================================
  // ROLE-BY-ROLE IMPLEMENTATION LOOP
  // ============================================================================

  for (const role of roles) {
    ctx.log(`\n========== IMPLEMENTING ${role.toUpperCase()} ROLE ==========\n`);

    let roleComplete = false;
    let attempt = 0;
    const maxAttempts = 3;

    while (!roleComplete && attempt < maxAttempts) {
      attempt++;
      ctx.log(`Attempt ${attempt} for ${role} role...`);

      // ------------------------------------------------------------------------
      // Step 1: Implement Firestore Rules for Role
      // ------------------------------------------------------------------------

      const firestoreResult = await ctx.task(implementFirestoreRulesTask, {
        role,
        rulesDoc: 'EQUIPMENT_ACCESS_RULES.md',
        currentRules: 'firestore.rules',
        attempt
      });

      // ------------------------------------------------------------------------
      // Step 2: Implement Client-Side Code for Role
      // ------------------------------------------------------------------------

      const clientCodeResult = await ctx.task(implementClientCodeTask, {
        role,
        rulesDoc: 'EQUIPMENT_ACCESS_RULES.md',
        files: [
          'src/hooks/useEquipment.tsx',
          'src/hooks/useAssignmentRequests.tsx',
          'src/components/equipment/**/*.tsx'
        ],
        attempt
      });

      // ------------------------------------------------------------------------
      // Step 3: Update/Create E2E Tests for Role
      // ------------------------------------------------------------------------

      const testsResult = await ctx.task(updateE2ETestsTask, {
        role,
        rulesDoc: 'EQUIPMENT_ACCESS_RULES.md',
        testFiles: [
          'e2e/equipment.spec.ts',
          'e2e/transfers.spec.ts',
          'e2e/equipment-quantity-with-pending-transfers.spec.ts'
        ],
        attempt
      });

      // ------------------------------------------------------------------------
      // Step 4: Run Full Test Suite (Desktop)
      // ------------------------------------------------------------------------

      const testRunDesktopResult = await ctx.task(runFullTestSuiteTask, {
        role,
        command: 'npm run test:e2e',
        expectSuccess: true,
        viewport: 'desktop'
      });

      // ------------------------------------------------------------------------
      // Step 4b: Run Mobile Test Suite
      // ------------------------------------------------------------------------

      const testRunMobileResult = await ctx.task(runFullTestSuiteTask, {
        role,
        command: 'npm run test:e2e',
        expectSuccess: true,
        viewport: 'mobile'
      });

      const testRunResult = {
        success: testRunDesktopResult.success && testRunMobileResult.success,
        allPassed: testRunDesktopResult.allPassed && testRunMobileResult.allPassed,
        desktop: testRunDesktopResult,
        mobile: testRunMobileResult
      };

      // ------------------------------------------------------------------------
      // Step 5: Verify Test Results
      // ------------------------------------------------------------------------

      if (testRunResult.success && testRunResult.allPassed) {
        // All tests passed!
        ctx.log(`✓ All tests passed for ${role} role`);

        // ------------------------------------------------------------------------
        // Step 6: Commit Changes
        // ------------------------------------------------------------------------

        const commitResult = await ctx.task(commitChangesTask, {
          role,
          message: `Implement ${role} role equipment access rules\n\nImplements access control from EQUIPMENT_ACCESS_RULES.md:\n- Firestore security rules\n- Client-side filtering\n- E2E test coverage\n\nAll tests passing.`,
          files: [
            'firestore.rules',
            'src/hooks/useEquipment.tsx',
            'src/hooks/useAssignmentRequests.tsx',
            'src/components/equipment/**/*.tsx',
            'e2e/*.spec.ts'
          ]
        });

        // ------------------------------------------------------------------------
        // Step 7: Verification Breakpoint
        // ------------------------------------------------------------------------

        await ctx.breakpoint({
          question: `${role} role implementation complete. Review changes and approve to continue to next role?`,
          title: `${role.toUpperCase()} Role Complete`,
          context: {
            runId: ctx.runId,
            files: [
              { path: `tasks/${testRunResult.effectId}/test-results.json`, format: 'json', label: 'Test Results' },
              { path: `tasks/${commitResult.effectId}/commit-summary.md`, format: 'markdown', label: 'Commit Summary' }
            ]
          }
        });

        roleComplete = true;
        completedRoles.push(role);
        results.rolesCompleted.push(role);
        results.iterations.push({
          role,
          attempt,
          success: true,
          commitSha: commitResult.sha
        });

      } else {
        // Tests failed - analyze and retry
        ctx.log(`✗ Tests failed for ${role} role (attempt ${attempt})`);

        const debugResult = await ctx.task(debugTestFailuresTask, {
          role,
          testResults: testRunResult,
          attempt
        });

        if (attempt >= maxAttempts) {
          throw new Error(`Failed to implement ${role} role after ${maxAttempts} attempts. Last error: ${testRunResult.error}`);
        }

        ctx.log(`Retrying ${role} role with fixes...`);
      }
    }
  }

  // ============================================================================
  // PHASE 3: FINAL VERIFICATION
  // ============================================================================

  const finalVerification = await ctx.task(finalVerificationTask, {
    rolesCompleted: completedRoles
  });

  await ctx.breakpoint({
    question: 'All roles implemented successfully. Review final test results and approve to complete?',
    title: 'Final Verification',
    context: {
      runId: ctx.runId,
      files: [
        { path: `tasks/${finalVerification.effectId}/final-report.md`, format: 'markdown', label: 'Implementation Report' }
      ]
    }
  });

  return {
    success: true,
    rolesCompleted: completedRoles,
    results
  };
}

// ============================================================================
// TASK DEFINITIONS
// ============================================================================

const analyzeCurrentStateTask = defineTask('analyze-current-state', (args, taskCtx) => ({
  kind: 'agent',
  title: `Analyze current equipment access implementation vs ${args.rulesDoc}`,
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Security & Access Control Analyst',
      task: `Analyze the gap between current equipment access implementation and documented rules`,
      context: {
        rulesDoc: args.rulesDoc,
        firestoreRules: args.firestoreRules,
        clientCode: args.clientCode
      },
      instructions: [
        `Read and understand all equipment access rules from ${args.rulesDoc}`,
        `Read current Firestore security rules from ${args.firestoreRules}`,
        `Read current client-side implementation from ${args.clientCode}`,
        'Identify gaps between documented rules and current implementation',
        'Organize gaps by role (Admin, Leader, User)',
        'List specific changes needed for each role',
        'Create a detailed gap analysis markdown document',
        `Write the analysis to tasks/${taskCtx.effectId}/analysis.md`
      ],
      outputFormat: 'JSON with summary and analysisFile path'
    },
    outputSchema: {
      type: 'object',
      required: ['summary', 'gaps', 'analysisFile'],
      properties: {
        summary: { type: 'string' },
        gaps: {
          type: 'object',
          properties: {
            admin: { type: 'array', items: { type: 'string' } },
            leader: { type: 'array', items: { type: 'string' } },
            user: { type: 'array', items: { type: 'string' } }
          }
        },
        analysisFile: { type: 'string' }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const implementFirestoreRulesTask = defineTask('implement-firestore-rules', (args, taskCtx) => ({
  kind: 'agent',
  title: `Implement Firestore rules for ${args.role} role`,
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Firebase Security Rules Developer',
      task: `Implement equipment access rules for ${args.role} role in Firestore security rules`,
      context: {
        role: args.role,
        rulesDoc: args.rulesDoc,
        currentRules: args.currentRules,
        attempt: args.attempt
      },
      instructions: [
        `Read the ${args.role} role requirements from ${args.rulesDoc}`,
        `Read current Firestore rules from ${args.currentRules}`,
        `Modify the equipment collection rules to implement ${args.role} permissions`,
        'Update helper functions if needed (e.g., isSignatureApproved, canDeleteEquipment)',
        'Ensure rules follow defense-in-depth security principles',
        'Test rule logic mentally for edge cases',
        'Write the updated rules back to firestore.rules',
        'Create a summary of changes made'
      ],
      outputFormat: 'JSON with changes summary'
    },
    outputSchema: {
      type: 'object',
      required: ['success', 'changes', 'rulesFile'],
      properties: {
        success: { type: 'boolean' },
        changes: { type: 'array', items: { type: 'string' } },
        rulesFile: { type: 'string' }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const implementClientCodeTask = defineTask('implement-client-code', (args, taskCtx) => ({
  kind: 'agent',
  title: `Implement client-side code for ${args.role} role`,
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Frontend Security Developer',
      task: `Implement client-side equipment access filtering for ${args.role} role`,
      context: {
        role: args.role,
        rulesDoc: args.rulesDoc,
        files: args.files,
        attempt: args.attempt
      },
      instructions: [
        `Read the ${args.role} role client-side requirements from ${args.rulesDoc}`,
        'Read current implementations of all files in the files array',
        `Update useEquipment.tsx to implement visibility filtering for ${args.role}`,
        'Update equipment components to show/hide actions based on role permissions',
        'Ensure unassigned equipment is only visible to admins',
        'Implement serialized equipment validation (person-only assignment)',
        'Update transfer hierarchy validation (one level up/down for leaders)',
        'Ensure all changes are backward compatible',
        'Write updated code back to files',
        'Create a summary of changes made'
      ],
      outputFormat: 'JSON with changes summary'
    },
    outputSchema: {
      type: 'object',
      required: ['success', 'changes', 'filesModified'],
      properties: {
        success: { type: 'boolean' },
        changes: { type: 'array', items: { type: 'string' } },
        filesModified: { type: 'array', items: { type: 'string' } }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const updateE2ETestsTask = defineTask('update-e2e-tests', (args, taskCtx) => ({
  kind: 'agent',
  title: `Update E2E tests for ${args.role} role`,
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'QA Test Engineer',
      task: `Update and create E2E tests for ${args.role} equipment access rules`,
      context: {
        role: args.role,
        rulesDoc: args.rulesDoc,
        testFiles: args.testFiles,
        attempt: args.attempt
      },
      instructions: [
        `Read the ${args.role} role requirements from ${args.rulesDoc}`,
        'Read existing E2E test files',
        `Update existing tests to reflect new ${args.role} permissions`,
        `Create new test cases for ${args.role} role if coverage gaps exist`,
        'Ensure tests cover: visibility, create, update, delete, transfer permissions',
        'Test edge cases: unassigned equipment visibility, serialized equipment, hierarchy validation',
        'Use existing test patterns and helpers from the codebase',
        'Ensure tests are isolated and can run independently',
        'Write updated/new test code back to files',
        'Create a summary of test coverage changes'
      ],
      outputFormat: 'JSON with test changes summary'
    },
    outputSchema: {
      type: 'object',
      required: ['success', 'changes', 'testFilesModified', 'newTestCount'],
      properties: {
        success: { type: 'boolean' },
        changes: { type: 'array', items: { type: 'string' } },
        testFilesModified: { type: 'array', items: { type: 'string' } },
        newTestCount: { type: 'number' }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const runFullTestSuiteTask = defineTask('run-full-test-suite', (args, taskCtx) => ({
  kind: 'shell',
  title: `Run full E2E test suite for ${args.role} role verification`,
  shell: {
    command: args.command,
    cwd: '/home/ubuntu/duty-app',
    env: {
      CI: 'true'
    }
  },
  io: {
    stdoutPath: `tasks/${taskCtx.effectId}/stdout.txt`,
    stderrPath: `tasks/${taskCtx.effectId}/stderr.txt`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const commitChangesTask = defineTask('commit-changes', (args, taskCtx) => ({
  kind: 'agent',
  title: `Commit ${args.role} role implementation`,
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Git Commit Manager',
      task: `Stage and commit changes for ${args.role} role implementation`,
      context: {
        role: args.role,
        message: args.message,
        files: args.files
      },
      instructions: [
        'Stage all modified files related to equipment access rules',
        `Create a commit with the provided message for ${args.role} role`,
        'Verify the commit was created successfully',
        'Get the commit SHA',
        `Create a commit summary markdown document at tasks/${taskCtx.effectId}/commit-summary.md`,
        'Return the commit SHA and summary'
      ],
      outputFormat: 'JSON with commit info'
    },
    outputSchema: {
      type: 'object',
      required: ['success', 'sha', 'summary'],
      properties: {
        success: { type: 'boolean' },
        sha: { type: 'string' },
        summary: { type: 'string' },
        filesCommitted: { type: 'array', items: { type: 'string' } }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const debugTestFailuresTask = defineTask('debug-test-failures', (args, taskCtx) => ({
  kind: 'agent',
  title: `Debug test failures for ${args.role} role (attempt ${args.attempt})`,
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Test Debugging Specialist',
      task: `Analyze test failures and create fix recommendations for ${args.role} role`,
      context: {
        role: args.role,
        testResults: args.testResults,
        attempt: args.attempt
      },
      instructions: [
        'Read the test failure output and error messages',
        'Identify root causes of test failures',
        'Check if failures are due to: incorrect rules, client-side bugs, or test issues',
        'Create specific fix recommendations',
        'Prioritize fixes by impact',
        `Write debug analysis to tasks/${taskCtx.effectId}/debug-analysis.md`,
        'Return actionable fixes'
      ],
      outputFormat: 'JSON with debug analysis and fixes'
    },
    outputSchema: {
      type: 'object',
      required: ['analysis', 'fixes', 'debugFile'],
      properties: {
        analysis: { type: 'string' },
        fixes: { type: 'array', items: { type: 'string' } },
        debugFile: { type: 'string' }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const finalVerificationTask = defineTask('final-verification', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Final verification of all roles implementation',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'QA Verification Lead',
      task: 'Perform final verification of equipment access rules implementation',
      context: {
        rolesCompleted: args.rolesCompleted
      },
      instructions: [
        'Run full E2E test suite one more time',
        'Verify all equipment access rules from EQUIPMENT_ACCESS_RULES.md are implemented',
        'Check Firestore rules for completeness',
        'Check client-side code for completeness',
        'Verify test coverage for all roles',
        'Create final implementation report',
        `Write report to tasks/${taskCtx.effectId}/final-report.md`,
        'Return verification summary'
      ],
      outputFormat: 'JSON with verification results'
    },
    outputSchema: {
      type: 'object',
      required: ['success', 'summary', 'reportFile'],
      properties: {
        success: { type: 'boolean' },
        summary: { type: 'string' },
        reportFile: { type: 'string' },
        testsPassed: { type: 'number' },
        testsFailed: { type: 'number' }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));
