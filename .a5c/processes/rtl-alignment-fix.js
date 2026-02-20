/**
 * @process rtl-alignment-fix
 * @description TDD process for fixing RTL alignment issues across all pages
 * @inputs { pages: string[], requirementId: string }
 * @outputs { success: boolean, testsPassing: boolean, productMdUpdated: boolean }
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

/**
 * RTL Alignment Fix Process - TDD Methodology
 *
 * Flow:
 * 1. Write E2E test for RTL alignment verification (Red phase)
 * 2. Run test - should fail initially
 * 3. Audit codebase for RTL issues
 * 4. Fix alignment issues (Green phase)
 * 5. Run tests - should pass
 * 6. Update PRODUCT.md with new requirement
 * 7. Verify tests run in CI
 */
export async function process(inputs, ctx) {
  const {
    pages = ['all'], // 'all' or specific page names
    requirementId = 'I18N-4'
  } = inputs;

  ctx.log('Starting RTL Alignment Fix Process (TDD)');
  ctx.log(`Target pages: ${pages.join(', ')}`);
  ctx.log(`Requirement ID: ${requirementId}`);

  // ============================================================================
  // PHASE 1: RED - Write Failing Test
  // ============================================================================

  ctx.log('\n=== PHASE 1: RED - Write Failing E2E Test ===');

  const testWriteResult = await ctx.task(writeRtlTestTask, {
    pages,
    requirementId
  });

  ctx.log(`Test written: ${testWriteResult.testFilePath}`);
  ctx.log(`Test cases: ${testWriteResult.testCases.length}`);

  // ============================================================================
  // PHASE 2: Run Test (Should Fail)
  // ============================================================================

  ctx.log('\n=== PHASE 2: Run Test (Expect Failure) ===');

  const initialTestRun = await ctx.task(runE2eTestTask, {
    testFile: testWriteResult.testFilePath,
    expectFailure: true
  });

  ctx.log(`Initial test run: ${initialTestRun.passed ? 'PASSED' : 'FAILED'} (${initialTestRun.passedCount}/${initialTestRun.totalCount})`);

  if (initialTestRun.passed) {
    ctx.log('⚠️  Warning: Test passed immediately - issue may not exist or test may be incorrect');

    await ctx.breakpoint({
      question: 'RTL test passed on first run - this means either the issue doesn\'t exist, or the test is not correctly written. Review the test and decide how to proceed.',
      title: 'Test Passed Unexpectedly',
      context: {
        runId: ctx.runId,
        files: [
          { path: testWriteResult.testFilePath, format: 'code', label: 'E2E Test' },
          { path: `tasks/${ctx.effectId}/test-results.json`, format: 'json', label: 'Test Results' }
        ]
      }
    });
  }

  // ============================================================================
  // PHASE 3: Audit Codebase for RTL Issues
  // ============================================================================

  ctx.log('\n=== PHASE 3: Audit Codebase for RTL Issues ===');

  const auditResult = await ctx.task(auditRtlIssuesTask, {
    pages,
    testFailures: initialTestRun.failures
  });

  ctx.log(`Files with issues: ${auditResult.issueFiles.length}`);
  ctx.log(`Total issues found: ${auditResult.totalIssues}`);

  // Breakpoint: Review audit findings
  await ctx.breakpoint({
    question: `RTL audit complete. Found ${auditResult.totalIssues} issues across ${auditResult.issueFiles.length} files. Review the findings and approve fixes?`,
    title: 'RTL Audit Results',
    context: {
      runId: ctx.runId,
      files: [
        { path: 'tasks/audit-rtl/audit-report.md', format: 'markdown', label: 'Audit Report' },
        { path: 'tasks/audit-rtl/issues.json', format: 'json', label: 'Issues List' }
      ]
    }
  });

  // ============================================================================
  // PHASE 4: GREEN - Fix RTL Issues
  // ============================================================================

  ctx.log('\n=== PHASE 4: GREEN - Fix RTL Issues ===');

  const fixResult = await ctx.task(fixRtlIssuesTask, {
    issues: auditResult.issues,
    pages
  });

  ctx.log(`Files fixed: ${fixResult.filesFixed.length}`);
  ctx.log(`Total changes: ${fixResult.totalChanges}`);

  // ============================================================================
  // PHASE 5: Run Test (Should Pass Now)
  // ============================================================================

  ctx.log('\n=== PHASE 5: Run Test (Expect Success) ===');

  const finalTestRun = await ctx.task(runE2eTestTask, {
    testFile: testWriteResult.testFilePath,
    expectFailure: false
  });

  ctx.log(`Final test run: ${finalTestRun.passed ? 'PASSED ✓' : 'FAILED ✗'} (${finalTestRun.passedCount}/${finalTestRun.totalCount})`);

  if (!finalTestRun.passed) {
    ctx.log('❌ Tests still failing after fixes');

    await ctx.breakpoint({
      question: `RTL fixes applied but ${finalTestRun.failedCount} test(s) still failing. Review failures and decide: iterate on fixes, revise tests, or investigate further?`,
      title: 'Tests Still Failing',
      context: {
        runId: ctx.runId,
        files: [
          { path: 'tasks/fix-rtl/fix-summary.md', format: 'markdown', label: 'Fix Summary' },
          { path: `tasks/${ctx.effectId}/test-results.json`, format: 'json', label: 'Test Results' }
        ]
      }
    });

    // Attempt iteration
    const retryFixResult = await ctx.task(fixRtlIssuesTask, {
      issues: finalTestRun.failures.map(f => ({
        file: f.file || 'unknown',
        issue: f.message,
        line: f.line || 0
      })),
      pages,
      isRetry: true
    });

    ctx.log(`Retry fix: ${retryFixResult.filesFixed.length} files updated`);

    // Run test again
    const retryTestRun = await ctx.task(runE2eTestTask, {
      testFile: testWriteResult.testFilePath,
      expectFailure: false
    });

    if (!retryTestRun.passed) {
      throw new Error(`RTL tests still failing after retry. Manual intervention needed.`);
    }
  }

  // ============================================================================
  // PHASE 6: Update PRODUCT.md
  // ============================================================================

  ctx.log('\n=== PHASE 6: Update PRODUCT.md ===');

  const productMdUpdate = await ctx.task(updateProductMdTask, {
    requirementId,
    description: 'RTL alignment for all pages in Hebrew mode',
    testFile: testWriteResult.testFilePath
  });

  ctx.log(`PRODUCT.md updated: ${productMdUpdate.updated}`);
  ctx.log(`Requirement added: [${requirementId}]`);

  // ============================================================================
  // PHASE 7: Verify CI Integration
  // ============================================================================

  ctx.log('\n=== PHASE 7: Verify CI Integration ===');

  const ciVerification = await ctx.task(verifyCiIntegrationTask, {
    testFile: testWriteResult.testFilePath
  });

  ctx.log(`CI integration verified: ${ciVerification.integrated}`);
  ctx.log(`Test will run in CI: ${ciVerification.willRunInCi}`);

  // ============================================================================
  // FINAL: Review and Approval
  // ============================================================================

  await ctx.breakpoint({
    question: `RTL Alignment Fix complete!\n\n✓ E2E test written and passing\n✓ ${fixResult.filesFixed.length} files fixed\n✓ PRODUCT.md updated with [${requirementId}]\n✓ CI integration verified\n\nReview changes and approve for commit?`,
    title: 'RTL Fix Complete',
    context: {
      runId: ctx.runId,
      files: [
        { path: testWriteResult.testFilePath, format: 'code', label: 'E2E Test' },
        { path: 'PRODUCT.md', format: 'markdown', label: 'PRODUCT.md' },
        { path: 'tasks/final-summary.md', format: 'markdown', label: 'Summary' }
      ]
    }
  });

  return {
    success: finalTestRun.passed,
    testsPassing: finalTestRun.passed,
    productMdUpdated: productMdUpdate.updated,
    testFile: testWriteResult.testFilePath,
    filesFixed: fixResult.filesFixed,
    totalChanges: fixResult.totalChanges,
    requirementId
  };
}

// ============================================================================
// TASK DEFINITIONS
// ============================================================================

export const writeRtlTestTask = defineTask('write-rtl-test', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Write E2E test for RTL alignment',
  description: 'Create Playwright E2E test to verify RTL text-align for all pages',

  agent: {
    name: 'e2e-test-writer',
    prompt: {
      role: 'E2E test engineer writing Playwright tests',
      task: 'Write comprehensive E2E test to verify RTL text alignment across all pages in Hebrew mode',
      context: {
        pages: args.pages,
        requirementId: args.requirementId,
        existingTest: 'e2e/i18n.spec.ts',
        framework: 'Playwright',
        testUsers: ['admin', 'leader', 'user']
      },
      instructions: [
        'Extend the existing e2e/i18n.spec.ts file with new test case',
        `Add test case: [${args.requirementId}] should have correct text-align (text-start) for all page content in Hebrew RTL mode`,
        'Test should: 1) Login as test-admin, 2) Switch to Hebrew, 3) Visit all major pages (dashboard, personnel, equipment, transfers, reports, settings, units)',
        'For each page: check that main content containers use text-start (not text-left), which respects RTL',
        'Check common elements: headers (h1, h2), paragraphs, cards, tables, forms, buttons with text',
        'Use Playwright selectors to find elements with text-left, ml-, mr-, pl-, pr- classes which are NOT RTL-aware',
        'Use page.evaluate() to check computed styles: getComputedStyle(el).textAlign should be "right" in RTL Hebrew mode',
        'Test should be comprehensive but focused on text alignment issues',
        'Follow existing test patterns in the codebase',
        'Use async/await properly with Playwright API'
      ],
      outputFormat: 'JSON with test file path, test code, and test case descriptions'
    },
    outputSchema: {
      type: 'object',
      required: ['testFilePath', 'testCode', 'testCases'],
      properties: {
        testFilePath: { type: 'string' },
        testCode: { type: 'string' },
        testCases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              pages: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

export const runE2eTestTask = defineTask('run-e2e-test', (args, taskCtx) => ({
  kind: 'agent',
  title: `Run E2E test${args.expectFailure ? ' (expect failure)' : ''}`,
  description: 'Execute Playwright E2E test for RTL alignment',

  agent: {
    name: 'e2e-test-runner',
    prompt: {
      role: 'Test execution engineer',
      task: 'Run Playwright E2E test and report results',
      context: {
        testFile: args.testFile,
        expectFailure: args.expectFailure,
        command: 'npm run test:e2e'
      },
      instructions: [
        `Execute: npm run test:e2e -- ${args.testFile}`,
        'Capture test output including pass/fail status',
        'For failures: capture error messages, line numbers, and failure reasons',
        'For successes: confirm test passed',
        args.expectFailure ? 'Note: Test SHOULD fail initially (TDD Red phase)' : 'Test should pass now (TDD Green phase)',
        'Return structured results with counts and details'
      ],
      outputFormat: 'JSON with test results, pass/fail counts, and failures'
    },
    outputSchema: {
      type: 'object',
      required: ['passed', 'totalCount', 'passedCount', 'failedCount'],
      properties: {
        passed: { type: 'boolean' },
        totalCount: { type: 'number' },
        passedCount: { type: 'number' },
        failedCount: { type: 'number' },
        failures: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              test: { type: 'string' },
              message: { type: 'string' },
              file: { type: 'string' },
              line: { type: 'number' }
            }
          }
        }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

export const auditRtlIssuesTask = defineTask('audit-rtl-issues', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Audit codebase for RTL issues',
  description: 'Find all instances of non-RTL-aware CSS classes',

  agent: {
    name: 'rtl-auditor',
    prompt: {
      role: 'Code auditor specializing in RTL/internationalization',
      task: 'Audit React/TypeScript codebase for RTL alignment issues',
      context: {
        pages: args.pages,
        testFailures: args.testFailures,
        targetClasses: ['text-left', 'text-right', 'ml-', 'mr-', 'pl-', 'pr-', 'left-', 'right-'],
        correctClasses: ['text-start', 'text-end', 'ms-', 'me-', 'ps-', 'pe-', 'start-', 'end-']
      },
      instructions: [
        'Search all .tsx files in src/ directory',
        'Find instances of non-RTL-aware Tailwind classes: text-left, text-right, ml-, mr-, pl-, pr-, left-, right-',
        'These should be replaced with RTL-aware equivalents: text-start, text-end, ms-, me-, ps-, pe-, start-, end-',
        'Focus on page files, component files, and layout files',
        'For each issue: record file path, line number, current class, and suggested fix',
        'Prioritize issues in main content areas (not decorative elements)',
        'Create comprehensive audit report with all findings',
        'Group issues by file for easier fixing'
      ],
      outputFormat: 'JSON with issues list grouped by file'
    },
    outputSchema: {
      type: 'object',
      required: ['issues', 'issueFiles', 'totalIssues'],
      properties: {
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              file: { type: 'string' },
              line: { type: 'number' },
              currentClass: { type: 'string' },
              suggestedFix: { type: 'string' },
              context: { type: 'string' }
            }
          }
        },
        issueFiles: { type: 'array', items: { type: 'string' } },
        totalIssues: { type: 'number' }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

export const fixRtlIssuesTask = defineTask('fix-rtl-issues', (args, taskCtx) => ({
  kind: 'agent',
  title: `Fix RTL issues${args.isRetry ? ' (retry)' : ''}`,
  description: 'Replace non-RTL-aware classes with RTL-aware equivalents',

  agent: {
    name: 'rtl-fixer',
    prompt: {
      role: 'Frontend developer fixing RTL issues',
      task: 'Fix RTL alignment issues by replacing non-RTL-aware Tailwind classes',
      context: {
        issues: args.issues,
        pages: args.pages,
        isRetry: args.isRetry || false,
        replacements: {
          'text-left': 'text-start',
          'text-right': 'text-end',
          'ml-': 'ms-',
          'mr-': 'me-',
          'pl-': 'ps-',
          'pr-': 'pe-',
          'left-': 'start-',
          'right-': 'end-'
        }
      },
      instructions: [
        'For each issue in the issues list:',
        '  1. Read the file',
        '  2. Find the exact line with the non-RTL-aware class',
        '  3. Replace with the RTL-aware equivalent',
        '  4. Preserve all other classes and formatting',
        '  5. Write the updated file',
        'Replacements: text-left→text-start, text-right→text-end, ml-→ms-, mr-→me-, pl-→ps-, pr-→pe-, left-→start-, right-→end-',
        'Be careful with class names that contain these patterns but are not the full class (e.g., "hover:text-left"→"hover:text-start")',
        'Test edge cases: classes with variants (sm:ml-4→sm:ms-4), negative values (-ml-2→-ms-2), arbitrary values (ml-[10px]→ms-[10px])',
        'After fixing each file, verify the syntax is correct',
        'Keep track of all changes made',
        args.isRetry ? 'This is a retry - focus on previously failing test cases' : 'First pass - fix all identified issues'
      ],
      outputFormat: 'JSON with list of fixed files and change summary'
    },
    outputSchema: {
      type: 'object',
      required: ['filesFixed', 'totalChanges'],
      properties: {
        filesFixed: { type: 'array', items: { type: 'string' } },
        totalChanges: { type: 'number' },
        changesByFile: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              file: { type: 'string' },
              changes: { type: 'number' },
              replacements: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    line: { type: 'number' },
                    before: { type: 'string' },
                    after: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

export const updateProductMdTask = defineTask('update-product-md', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Update PRODUCT.md with RTL requirement',
  description: 'Add new I18N requirement to PRODUCT.md',

  agent: {
    name: 'documentation-updater',
    prompt: {
      role: 'Technical documentation writer',
      task: 'Update PRODUCT.md with new RTL alignment requirement',
      context: {
        requirementId: args.requirementId,
        description: args.description,
        testFile: args.testFile,
        section: 'Localization'
      },
      instructions: [
        'Read the existing PRODUCT.md file',
        'Find the "## Localization" section (around line 59-65)',
        `Add new requirement after existing I18N requirements:`,
        `- [${args.requirementId}] **RTL Text Alignment**: All page content uses text-start/text-end (not text-left/text-right) to ensure proper RTL alignment in Hebrew mode.`,
        `  - [${args.requirementId}.1] Main content containers use RTL-aware margin/padding classes (ms-, me-, ps-, pe- instead of ml-, mr-, pl-, pr-).`,
        `  - [${args.requirementId}.2] Text alignment respects document direction (dir attribute).`,
        `  - [${args.requirementId}.3] E2E test verifies text alignment across all pages in Hebrew mode.`,
        'Preserve existing formatting and numbering',
        'Keep the requirement concise and testable',
        'Reference the E2E test file for verification'
      ],
      outputFormat: 'JSON with updated status and requirement text'
    },
    outputSchema: {
      type: 'object',
      required: ['updated', 'requirementText'],
      properties: {
        updated: { type: 'boolean' },
        requirementText: { type: 'string' },
        lineNumber: { type: 'number' }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

export const verifyCiIntegrationTask = defineTask('verify-ci-integration', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Verify CI integration',
  description: 'Confirm E2E test will run in CI pipeline',

  agent: {
    name: 'ci-verifier',
    prompt: {
      role: 'CI/CD engineer',
      task: 'Verify that the RTL E2E test will run in the CI pipeline',
      context: {
        testFile: args.testFile,
        ciConfig: 'package.json scripts, .github/workflows, playwright.config.ts'
      },
      instructions: [
        'Check that the test file follows the pattern that CI expects (e2e/*.spec.ts)',
        'Verify test is not skipped or excluded in playwright.config.ts',
        'Check that npm run test:e2e will include this test',
        'Verify test will run on appropriate CI triggers (PR, push to main)',
        'Confirm test has no dependencies that are missing in CI environment',
        'Return verification status and any issues found'
      ],
      outputFormat: 'JSON with integration status'
    },
    outputSchema: {
      type: 'object',
      required: ['integrated', 'willRunInCi'],
      properties: {
        integrated: { type: 'boolean' },
        willRunInCi: { type: 'boolean' },
        ciCommand: { type: 'string' },
        issues: { type: 'array', items: { type: 'string' } }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));
