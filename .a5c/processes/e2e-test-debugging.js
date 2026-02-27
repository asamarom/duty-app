/**
 * @process duty-app/e2e-test-debugging
 * @description E2E Test Debugging & Remediation - Systematically debug and fix failing E2E tests
 * @inputs { testType: string, maxAttempts: number, runLocally: boolean }
 * @outputs { success: boolean, testsFixed: array, summary: object }
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

/**
 * E2E Test Debugging Process for duty-app
 *
 * Comprehensive debugging workflow:
 * 1. Investigate current CI failures
 * 2. Download and analyze test reports/screenshots
 * 3. Reproduce failures locally if possible
 * 4. Analyze root causes
 * 5. Apply fixes
 * 6. Verify fixes locally
 * 7. Push and verify in CI
 * 8. Iterate until all tests pass
 */
export async function process(inputs, ctx) {
  const {
    testType = 'all', // 'all', 'desktop', 'mobile', 'performance'
    maxAttempts = 5,
    runLocally = true,
    ciRunId = null
  } = inputs;

  let attempt = 0;
  let allTestsPassing = false;
  const fixHistory = [];
  const startTime = ctx.now();

  ctx.log('info', `Starting E2E Test Debugging Process for duty-app`);
  ctx.log('info', `Test Type: ${testType}`);
  ctx.log('info', `Max Attempts: ${maxAttempts}`);

  // ============================================================================
  // PHASE 1: INITIAL INVESTIGATION
  // ============================================================================

  ctx.log('info', 'Phase 1: Investigating CI failures and current state');

  const investigation = await ctx.task(investigateCIFailuresTask, {
    testType,
    ciRunId,
    repoPath: '/home/ubuntu/duty-app'
  });

  fixHistory.push({
    phase: 'investigation',
    result: investigation,
    timestamp: ctx.now()
  });

  if (!investigation.hasFailures) {
    ctx.log('info', 'No test failures detected! All tests are passing.');
    return {
      success: true,
      testsFixed: [],
      summary: {
        message: 'All tests already passing',
        totalAttempts: 0
      },
      metadata: {
        processId: 'duty-app/e2e-test-debugging',
        timestamp: startTime,
        duration: ctx.now() - startTime
      }
    };
  }

  ctx.log('info', `Found ${investigation.failedTestCount} failing tests`);

  // ============================================================================
  // PHASE 2: ITERATIVE FIX AND VERIFY LOOP
  // ============================================================================

  while (!allTestsPassing && attempt < maxAttempts) {
    attempt++;
    ctx.log('info', `Starting remediation attempt ${attempt}/${maxAttempts}`);

    // Step 2.1: Analyze failures in detail
    const analysis = await ctx.task(analyzeFailuresTask, {
      investigation,
      fixHistory,
      attempt,
      testType
    });

    fixHistory.push({
      phase: 'analysis',
      attempt,
      result: analysis,
      timestamp: ctx.now()
    });

    // Step 2.2: Apply fixes
    const remediation = await ctx.task(applyFixesTask, {
      analysis,
      fixHistory,
      attempt,
      testType
    });

    fixHistory.push({
      phase: 'remediation',
      attempt,
      result: remediation,
      timestamp: ctx.now()
    });

    // Breakpoint for review if critical changes
    if (remediation.requiresReview) {
      await ctx.breakpoint({
        question: `Attempt ${attempt}: ${remediation.summary}. Review and approve fixes?`,
        title: `E2E Test Fixes - Attempt ${attempt}`,
        tag: 'e2e-fix-review',
        context: {
          runId: ctx.runId,
          filesModified: remediation.filesModified,
          fixDescription: remediation.fixDescription
        }
      });
    }

    // Step 2.3: Verify fixes locally (if enabled)
    if (runLocally) {
      const localVerification = await ctx.task(verifyLocallyTask, {
        testType,
        attempt
      });

      fixHistory.push({
        phase: 'local-verification',
        attempt,
        result: localVerification,
        timestamp: ctx.now()
      });

      if (!localVerification.passed) {
        ctx.log('warn', `Local verification failed on attempt ${attempt}`);
        // Continue to next iteration
        continue;
      }
    }

    // Step 2.4: Commit and push changes
    const commit = await ctx.task(commitChangesTask, {
      attempt,
      fixDescription: remediation.fixDescription,
      filesModified: remediation.filesModified
    });

    fixHistory.push({
      phase: 'commit',
      attempt,
      result: commit,
      timestamp: ctx.now()
    });

    // Step 2.5: Wait for and verify CI
    const ciVerification = await ctx.task(verifyCITask, {
      attempt,
      testType
    });

    fixHistory.push({
      phase: 'ci-verification',
      attempt,
      result: ciVerification,
      timestamp: ctx.now()
    });

    allTestsPassing = ciVerification.allPassed;

    if (allTestsPassing) {
      ctx.log('info', `✅ All tests passing after attempt ${attempt}!`);
      break;
    } else {
      ctx.log('warn', `CI verification failed on attempt ${attempt}. ${ciVerification.failedCount} tests still failing.`);
      // Re-investigate for next iteration
      investigation = await ctx.task(investigateCIFailuresTask, {
        testType,
        ciRunId: ciVerification.runId,
        repoPath: '/home/ubuntu/duty-app'
      });
    }
  }

  // ============================================================================
  // PHASE 3: FINAL SUMMARY
  // ============================================================================

  const success = allTestsPassing;
  const testsFixed = fixHistory
    .filter(h => h.phase === 'remediation')
    .flatMap(h => h.result.testsFixed || []);

  return {
    success,
    allTestsPassing,
    totalAttempts: attempt,
    testsFixed,
    fixHistory,
    summary: {
      status: success ? 'All tests passing' : 'Max attempts reached, some tests still failing',
      totalRemediations: fixHistory.filter(h => h.phase === 'remediation').length,
      testsFixedCount: testsFixed.length,
      finalTestStatus: fixHistory[fixHistory.length - 1]?.result
    },
    metadata: {
      processId: 'duty-app/e2e-test-debugging',
      timestamp: startTime,
      duration: ctx.now() - startTime
    }
  };
}

// ============================================================================
// TASK DEFINITIONS
// ============================================================================

/**
 * Investigate CI failures
 */
export const investigateCIFailuresTask = defineTask('investigate-ci-failures', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Investigate CI Failures',
  description: 'Check GitHub Actions, download reports, identify failing tests',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Expert CI/CD and E2E test debugger',
      task: 'Investigate failing E2E tests in the duty-app CI pipeline',
      context: {
        testType: args.testType,
        ciRunId: args.ciRunId,
        repoPath: args.repoPath
      },
      instructions: [
        'Navigate to /home/ubuntu/duty-app directory',
        'Run `gh run list --limit 10` to see recent CI runs',
        'If ciRunId is provided, use it. Otherwise, find the most recent failed "Deploy & Test Pipeline" run',
        'Run `gh run view <run-id>` to see the run summary',
        'Identify which jobs failed (Desktop E2E, Mobile E2E, Performance)',
        'Check if test artifacts are available and download them if possible',
        'Look at test-results directory for any local test results',
        'Read CI-FAILURE-ANALYSIS.md, TEST-FAILURE-ANALYSIS.md, and NEXT-STEPS.md for context',
        'Summarize: How many tests failed? Which categories? What are the error messages?',
        'Provide specific test names and failure reasons'
      ],
      outputFormat: 'JSON with failure details, test names, error messages, and artifact locations'
    },
    outputSchema: {
      type: 'object',
      required: ['hasFailures', 'failedTestCount', 'failuresByCategory'],
      properties: {
        hasFailures: { type: 'boolean' },
        failedTestCount: { type: 'number' },
        failuresByCategory: {
          type: 'object',
          properties: {
            desktop: { type: 'number' },
            mobile: { type: 'number' },
            performance: { type: 'number' }
          }
        },
        failedTests: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              category: { type: 'string' },
              error: { type: 'string' },
              stackTrace: { type: 'string' }
            }
          }
        },
        ciRunId: { type: 'string' },
        artifactsDownloaded: { type: 'boolean' },
        context: { type: 'string' }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  },

  labels: ['agent', 'investigation', 'ci-analysis']
}));

/**
 * Analyze failures in detail
 */
export const analyzeFailuresTask = defineTask('analyze-failures', (args, taskCtx) => ({
  kind: 'agent',
  title: `Analyze Failures - Attempt ${args.attempt}`,
  description: 'Deep analysis of test failures to determine root causes',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Expert test failure analyst specializing in Playwright E2E tests',
      task: 'Perform deep root cause analysis of test failures',
      context: {
        investigation: args.investigation,
        fixHistory: args.fixHistory,
        attempt: args.attempt,
        testType: args.testType
      },
      instructions: [
        'Review the investigation results and all failed tests',
        'For each failed test, determine the root cause (not just the symptom)',
        'Categorize failures: auth issues, timing issues, selector issues, test data issues, environment issues, etc.',
        'Check if there are patterns across multiple test failures',
        'Look at previous fix attempts in fixHistory to avoid repeating failed approaches',
        'Read the test files to understand what they are testing',
        'Check test setup files (staging-auth.setup.ts, playwright.config.ts)',
        'Check if this is related to any known issues mentioned in documentation',
        'Prioritize fixes by impact (fixes that will resolve multiple tests)',
        'Provide specific, actionable fix recommendations'
      ],
      outputFormat: 'JSON with root cause analysis, fix priorities, and specific action items'
    },
    outputSchema: {
      type: 'object',
      required: ['rootCauses', 'fixPriorities', 'recommendations'],
      properties: {
        rootCauses: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              description: { type: 'string' },
              affectedTests: { type: 'array', items: { type: 'string' } },
              severity: { type: 'string', enum: ['critical', 'major', 'minor'] }
            }
          }
        },
        fixPriorities: {
          type: 'array',
          items: { type: 'string' }
        },
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string' },
              rationale: { type: 'string' },
              files: { type: 'array', items: { type: 'string' } },
              estimatedImpact: { type: 'string' }
            }
          }
        }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  },

  labels: ['agent', 'analysis', `attempt-${args.attempt}`]
}));

/**
 * Apply fixes
 */
export const applyFixesTask = defineTask('apply-fixes', (args, taskCtx) => ({
  kind: 'agent',
  title: `Apply Fixes - Attempt ${args.attempt}`,
  description: 'Implement fixes based on analysis',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Expert developer specializing in E2E test debugging and Playwright',
      task: 'Apply targeted fixes to resolve test failures',
      context: {
        analysis: args.analysis,
        fixHistory: args.fixHistory,
        attempt: args.attempt,
        testType: args.testType
      },
      instructions: [
        'Based on the analysis, implement the highest priority fixes first',
        'Make minimal, targeted changes - fix root causes, not symptoms',
        'Update test files, configuration, or application code as needed',
        'If fixing selectors, ensure they are robust and follow best practices',
        'If fixing timing issues, use proper waits (not arbitrary sleep)',
        'If fixing auth issues, check auth setup and storage state',
        'If fixing test data, update seed scripts or fixtures',
        'Test your changes carefully before completing',
        'Document what was fixed and why in the output',
        'Flag if changes are risky or require human review'
      ],
      outputFormat: 'JSON with files modified, fix description, and review requirements'
    },
    outputSchema: {
      type: 'object',
      required: ['filesModified', 'fixDescription', 'testsFixed'],
      properties: {
        filesModified: {
          type: 'array',
          items: { type: 'string' }
        },
        fixDescription: { type: 'string' },
        summary: { type: 'string' },
        testsFixed: {
          type: 'array',
          items: { type: 'string' }
        },
        requiresReview: { type: 'boolean' },
        reviewReason: { type: 'string' }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  },

  labels: ['agent', 'remediation', `attempt-${args.attempt}`]
}));

/**
 * Verify fixes locally
 */
export const verifyLocallyTask = defineTask('verify-locally', (args, taskCtx) => ({
  kind: 'agent',
  title: `Verify Locally - Attempt ${args.attempt}`,
  description: 'Run tests locally to verify fixes work',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'QA engineer',
      task: 'Run E2E tests locally to verify fixes',
      context: {
        testType: args.testType,
        attempt: args.attempt
      },
      instructions: [
        'Navigate to /home/ubuntu/duty-app',
        'Based on testType, run the appropriate tests locally:',
        '  - If testType is "desktop" or "all": run `npm run test:e2e` (or subset of tests)',
        '  - If testType is "mobile": run `npm run test:e2e:mobile`',
        '  - If testType is "performance": run `npm run test:perf`',
        'NOTE: Staging tests require real Firebase, so focus on local emulator tests if possible',
        'Capture test output and results',
        'Report: How many tests passed? How many failed? Any new failures?',
        'If tests pass locally, that is a good sign (though CI may still differ)'
      ],
      outputFormat: 'JSON with test results and pass/fail status'
    },
    outputSchema: {
      type: 'object',
      required: ['passed', 'totalTests', 'passedTests', 'failedTests'],
      properties: {
        passed: { type: 'boolean' },
        totalTests: { type: 'number' },
        passedTests: { type: 'number' },
        failedTests: { type: 'number' },
        testOutput: { type: 'string' },
        failedTestNames: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  },

  labels: ['agent', 'verification', 'local', `attempt-${args.attempt}`]
}));

/**
 * Commit changes
 */
export const commitChangesTask = defineTask('commit-changes', (args, taskCtx) => ({
  kind: 'agent',
  title: `Commit Changes - Attempt ${args.attempt}`,
  description: 'Commit and push test fixes to trigger CI',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'DevOps engineer',
      task: 'Commit and push test fixes',
      context: {
        attempt: args.attempt,
        fixDescription: args.fixDescription,
        filesModified: args.filesModified
      },
      instructions: [
        'Navigate to /home/ubuntu/duty-app',
        'Run `git status` to see changes',
        'Stage the modified files',
        'Create a commit with a clear message describing the fixes',
        'Commit message should follow format: "fix: <description>" and include Co-Authored-By',
        'Push to the main branch to trigger CI',
        'Use the /commit skill if available, or do it manually',
        'Return the commit SHA and push status'
      ],
      outputFormat: 'JSON with commit details and push status'
    },
    outputSchema: {
      type: 'object',
      required: ['success', 'commitSha', 'pushed'],
      properties: {
        success: { type: 'boolean' },
        commitSha: { type: 'string' },
        commitMessage: { type: 'string' },
        pushed: { type: 'boolean' },
        pushedBranch: { type: 'string' }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  },

  labels: ['agent', 'commit', `attempt-${args.attempt}`]
}));

/**
 * Verify in CI
 */
export const verifyCITask = defineTask('verify-ci', (args, taskCtx) => ({
  kind: 'agent',
  title: `Verify in CI - Attempt ${args.attempt}`,
  description: 'Wait for CI to complete and check if tests pass',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'CI/CD monitoring specialist',
      task: 'Monitor CI run and verify test results',
      context: {
        attempt: args.attempt,
        testType: args.testType
      },
      instructions: [
        'Navigate to /home/ubuntu/duty-app',
        'Run `gh run list --limit 5` to see recent runs',
        'Find the CI run triggered by the recent push',
        'Monitor the run status: `gh run watch <run-id>`',
        'Wait for the run to complete (this may take 10-20 minutes)',
        'Once complete, run `gh run view <run-id>` to see results',
        'Check which jobs passed/failed',
        'Determine: Did ALL tests pass? If not, how many still failing?',
        'Download any new failure artifacts if available',
        'Report the final status'
      ],
      outputFormat: 'JSON with CI results and test status'
    },
    outputSchema: {
      type: 'object',
      required: ['allPassed', 'runId', 'runUrl'],
      properties: {
        allPassed: { type: 'boolean' },
        runId: { type: 'string' },
        runUrl: { type: 'string' },
        totalTests: { type: 'number' },
        passedTests: { type: 'number' },
        failedTests: { type: 'number' },
        failedCount: { type: 'number' },
        jobResults: {
          type: 'object',
          properties: {
            desktop: { type: 'string', enum: ['passed', 'failed', 'skipped'] },
            mobile: { type: 'string', enum: ['passed', 'failed', 'skipped'] },
            performance: { type: 'string', enum: ['passed', 'failed', 'skipped'] }
          }
        }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  },

  labels: ['agent', 'verification', 'ci', `attempt-${args.attempt}`]
}));
