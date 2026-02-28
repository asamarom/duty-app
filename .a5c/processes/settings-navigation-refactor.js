/**
 * @process settings-navigation-refactor
 * @description TDD process for refactoring Settings page and bottom navigation
 * @inputs { requirementId: string, interactive: boolean }
 * @outputs { success: boolean, testsPassing: boolean, e2eTestsPassing: boolean, productMdUpdated: boolean }
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

/**
 * Settings Page & Navigation Refactoring Process - TDD Methodology
 *
 * Requirements:
 * 1. Remove "Access Control" section from Settings page (irrelevant)
 * 2. Create tabs in Settings page header to switch between:
 *    - Personal Profile (language + logout)
 *    - Units Management (moved from /units)
 *    - Approvals (moved from /approvals)
 * 3. Display app version at bottom of Settings page with version management strategy
 * 4. Move "Reports" from 3-dot menu to bottom navigation panel
 * 5. Move "Settings" from 3-dot menu to bottom navigation panel
 * 6. Bottom panel: exactly 5 buttons (Dashboard, Personnel, Equipment, Reports, Settings)
 *
 * Flow:
 * 1. Plan architecture and component structure
 * 2. Write E2E tests (Red phase)
 * 3. Write unit tests (Red phase)
 * 4. Implement changes (Green phase)
 * 5. Run tests - verify passing
 * 6. Refactor and polish
 * 7. Update translations (i18n)
 * 8. Update PRODUCT.md
 * 9. Verify CI integration
 */
export async function process(inputs, ctx) {
  const {
    requirementId = 'UI-SETTINGS-REFACTOR-1',
    interactive = true
  } = inputs;

  ctx.log('Starting Settings & Navigation Refactoring Process (TDD)');
  ctx.log(`Requirement ID: ${requirementId}`);
  ctx.log(`Interactive mode: ${interactive}`);

  // ============================================================================
  // PHASE 1: PLANNING - Analyze and design architecture
  // ============================================================================

  ctx.log('\n=== PHASE 1: PLANNING - Architecture & Design ===');

  const planResult = await ctx.task(planArchitectureTask, {
    requirementId,
    currentSettings: 'src/pages/SettingsPage.tsx',
    currentNav: 'src/components/layout/MobileNav.tsx'
  });

  ctx.log(`Plan created: ${planResult.componentsToCreate.length} new components, ${planResult.componentsToModify.length} to modify`);
  ctx.log(`Version strategy: ${planResult.versionStrategy}`);

  // Breakpoint: Review architecture plan
  if (interactive) {
    await ctx.breakpoint({
      question: `Architecture plan ready:\n\n` +
        `Components to create: ${planResult.componentsToCreate.join(', ')}\n` +
        `Components to modify: ${planResult.componentsToModify.join(', ')}\n` +
        `Version management: ${planResult.versionStrategy}\n\n` +
        `Review the plan and approve to continue?`,
      title: 'Architecture Plan Review',
      context: {
        runId: ctx.runId,
        files: [
          { path: 'tasks/plan-architecture/architecture-plan.md', format: 'markdown', label: 'Architecture Plan' },
          { path: 'tasks/plan-architecture/component-structure.json', format: 'json', label: 'Component Structure' }
        ]
      }
    });
  }

  // ============================================================================
  // PHASE 2: RED - Write E2E Tests (Failing)
  // ============================================================================

  ctx.log('\n=== PHASE 2: RED - Write E2E Tests ===');

  const e2eTestResult = await ctx.task(writeE2eTestsTask, {
    requirementId,
    plan: planResult
  });

  ctx.log(`E2E test written: ${e2eTestResult.testFilePath}`);
  ctx.log(`Test scenarios: ${e2eTestResult.testScenarios.length}`);

  // Run E2E tests (should fail)
  const initialE2eRun = await ctx.task(runE2eTestsTask, {
    testFile: e2eTestResult.testFilePath,
    expectFailure: true
  });

  ctx.log(`Initial E2E run: ${initialE2eRun.passed ? 'PASSED' : 'FAILED'} (${initialE2eRun.passedCount}/${initialE2eRun.totalCount})`);

  if (initialE2eRun.passed) {
    ctx.log('⚠️  Warning: E2E tests passed immediately - feature may already exist or tests incorrect');

    if (interactive) {
      await ctx.breakpoint({
        question: 'E2E tests passed on first run. Review tests to ensure they correctly validate the new requirements.',
        title: 'Unexpected E2E Test Success',
        context: {
          runId: ctx.runId,
          files: [
            { path: e2eTestResult.testFilePath, format: 'code', label: 'E2E Test' },
            { path: `tasks/${ctx.effectId}/test-results.json`, format: 'json', label: 'Test Results' }
          ]
        }
      });
    }
  }

  // ============================================================================
  // PHASE 3: RED - Write Unit Tests (Failing)
  // ============================================================================

  ctx.log('\n=== PHASE 3: RED - Write Unit Tests ===');

  const unitTestResult = await ctx.task(writeUnitTestsTask, {
    requirementId,
    plan: planResult,
    componentsToTest: planResult.componentsToCreate.concat(planResult.componentsToModify)
  });

  ctx.log(`Unit tests written: ${unitTestResult.testFiles.length} files`);
  ctx.log(`Total test cases: ${unitTestResult.totalTestCases}`);

  // Run unit tests (should fail)
  const initialUnitRun = await ctx.task(runUnitTestsTask, {
    testFiles: unitTestResult.testFiles,
    expectFailure: true
  });

  ctx.log(`Initial unit test run: ${initialUnitRun.passed ? 'PASSED' : 'FAILED'} (${initialUnitRun.passedCount}/${initialUnitRun.totalCount})`);

  // ============================================================================
  // PHASE 4: GREEN - Implement Changes
  // ============================================================================

  ctx.log('\n=== PHASE 4: GREEN - Implementation ===');

  // Step 4.1: Create version management strategy
  const versionResult = await ctx.task(implementVersionManagementTask, {
    strategy: planResult.versionStrategy,
    currentVersion: '0.0.0'
  });

  ctx.log(`Version management implemented: ${versionResult.versionFile}`);

  // Step 4.2: Create Settings tabs component
  const tabsResult = await ctx.task(createSettingsTabsTask, {
    plan: planResult,
    tabs: ['profile', 'units', 'approvals']
  });

  ctx.log(`Settings tabs created: ${tabsResult.componentPath}`);

  // Step 4.3: Refactor Settings page with tabs
  const settingsRefactorResult = await ctx.task(refactorSettingsPageTask, {
    plan: planResult,
    tabsComponent: tabsResult.componentPath,
    removeAccessControl: true,
    addVersion: true
  });

  ctx.log(`Settings page refactored: ${settingsRefactorResult.changesCount} changes`);

  // Step 4.4: Update bottom navigation
  const navRefactorResult = await ctx.task(refactorBottomNavTask, {
    plan: planResult,
    addButtons: ['reports', 'settings'],
    removeFromMore: ['reports', 'settings']
  });

  ctx.log(`Bottom nav refactored: ${navRefactorResult.changesCount} changes`);

  // Step 4.5: Update translations (i18n)
  const i18nResult = await ctx.task(updateTranslationsTask, {
    newKeys: planResult.translationKeys
  });

  ctx.log(`Translations updated: ${i18nResult.keysAdded} keys added`);

  // ============================================================================
  // PHASE 5: GREEN - Run Tests (Should Pass)
  // ============================================================================

  ctx.log('\n=== PHASE 5: GREEN - Verify Tests Pass ===');

  // Run unit tests
  const finalUnitRun = await ctx.task(runUnitTestsTask, {
    testFiles: unitTestResult.testFiles,
    expectFailure: false
  });

  ctx.log(`Final unit test run: ${finalUnitRun.passed ? 'PASSED ✓' : 'FAILED ✗'} (${finalUnitRun.passedCount}/${finalUnitRun.totalCount})`);

  if (!finalUnitRun.passed) {
    ctx.log(`❌ ${finalUnitRun.failedCount} unit tests still failing`);

    if (interactive) {
      await ctx.breakpoint({
        question: `${finalUnitRun.failedCount} unit test(s) still failing after implementation. Review failures and decide: iterate on fixes, revise tests, or investigate?`,
        title: 'Unit Tests Failing',
        context: {
          runId: ctx.runId,
          files: [
            { path: `tasks/${ctx.effectId}/test-results.json`, format: 'json', label: 'Test Results' },
            { path: `tasks/${ctx.effectId}/failures.md`, format: 'markdown', label: 'Failure Details' }
          ]
        }
      });
    }

    // Attempt to fix failing tests
    const fixResult = await ctx.task(fixFailingTestsTask, {
      failures: finalUnitRun.failures,
      testType: 'unit'
    });

    // Retry unit tests
    const retryUnitRun = await ctx.task(runUnitTestsTask, {
      testFiles: unitTestResult.testFiles,
      expectFailure: false
    });

    if (!retryUnitRun.passed) {
      throw new Error(`Unit tests still failing after retry (${retryUnitRun.failedCount}/${retryUnitRun.totalCount}). Manual intervention needed.`);
    }
  }

  // Run E2E tests
  const finalE2eRun = await ctx.task(runE2eTestsTask, {
    testFile: e2eTestResult.testFilePath,
    expectFailure: false
  });

  ctx.log(`Final E2E run: ${finalE2eRun.passed ? 'PASSED ✓' : 'FAILED ✗'} (${finalE2eRun.passedCount}/${finalE2eRun.totalCount})`);

  if (!finalE2eRun.passed) {
    ctx.log(`❌ ${finalE2eRun.failedCount} E2E tests still failing`);

    if (interactive) {
      await ctx.breakpoint({
        question: `${finalE2eRun.failedCount} E2E test(s) still failing. Review and decide next steps.`,
        title: 'E2E Tests Failing',
        context: {
          runId: ctx.runId,
          files: [
            { path: `tasks/${ctx.effectId}/e2e-results.json`, format: 'json', label: 'E2E Results' },
            { path: e2eTestResult.testFilePath, format: 'code', label: 'E2E Test File' }
          ]
        }
      });
    }

    // Attempt to fix E2E failures
    const fixE2eResult = await ctx.task(fixFailingTestsTask, {
      failures: finalE2eRun.failures,
      testType: 'e2e'
    });

    // Retry E2E tests
    const retryE2eRun = await ctx.task(runE2eTestsTask, {
      testFile: e2eTestResult.testFilePath,
      expectFailure: false
    });

    if (!retryE2eRun.passed) {
      throw new Error(`E2E tests still failing after retry (${retryE2eRun.failedCount}/${retryE2eRun.totalCount}). Manual intervention needed.`);
    }
  }

  // ============================================================================
  // PHASE 6: REFACTOR - Polish and optimize
  // ============================================================================

  ctx.log('\n=== PHASE 6: REFACTOR - Polish & Optimize ===');

  const refactorResult = await ctx.task(refactorAndPolishTask, {
    modifiedFiles: [
      settingsRefactorResult.modifiedFiles,
      navRefactorResult.modifiedFiles,
      tabsResult.componentPath
    ].flat()
  });

  ctx.log(`Refactoring complete: ${refactorResult.optimizations} optimizations applied`);

  // Run tests again after refactoring
  const postRefactorUnitRun = await ctx.task(runUnitTestsTask, {
    testFiles: unitTestResult.testFiles,
    expectFailure: false
  });

  const postRefactorE2eRun = await ctx.task(runE2eTestsTask, {
    testFile: e2eTestResult.testFilePath,
    expectFailure: false
  });

  if (!postRefactorUnitRun.passed || !postRefactorE2eRun.passed) {
    throw new Error('Tests broken during refactoring phase. Reverting refactoring changes...');
  }

  ctx.log('All tests passing after refactoring ✓');

  // ============================================================================
  // PHASE 7: Update PRODUCT.md
  // ============================================================================

  ctx.log('\n=== PHASE 7: Update PRODUCT.md ===');

  const productMdUpdate = await ctx.task(updateProductMdTask, {
    requirementId,
    description: 'Settings page refactored with tabs (Profile, Units, Approvals). Bottom nav updated with Reports and Settings buttons.',
    e2eTestFile: e2eTestResult.testFilePath,
    unitTestFiles: unitTestResult.testFiles
  });

  ctx.log(`PRODUCT.md updated: ${productMdUpdate.updated}`);
  ctx.log(`Requirement added: [${requirementId}]`);

  // ============================================================================
  // PHASE 8: Verify CI Integration
  // ============================================================================

  ctx.log('\n=== PHASE 8: Verify CI Integration ===');

  const ciVerification = await ctx.task(verifyCiIntegrationTask, {
    e2eTestFile: e2eTestResult.testFilePath,
    unitTestFiles: unitTestResult.testFiles
  });

  ctx.log(`CI integration verified: ${ciVerification.integrated}`);
  ctx.log(`Tests will run in CI: ${ciVerification.willRunInCi}`);

  // ============================================================================
  // FINAL: Summary and Approval
  // ============================================================================

  if (interactive) {
    await ctx.breakpoint({
      question: `Settings & Navigation Refactoring Complete! 🎉\n\n` +
        `✓ Settings page refactored with 3 tabs (Profile, Units, Approvals)\n` +
        `✓ Access Control section removed\n` +
        `✓ App version displayed at bottom\n` +
        `✓ Bottom nav updated: 5 buttons (Dashboard, Personnel, Equipment, Reports, Settings)\n` +
        `✓ Reports & Settings moved from 3-dot menu to bottom nav\n` +
        `✓ ${unitTestResult.totalTestCases} unit tests passing\n` +
        `✓ ${e2eTestResult.testScenarios.length} E2E test scenarios passing\n` +
        `✓ Translations updated (${i18nResult.keysAdded} keys)\n` +
        `✓ PRODUCT.md updated with [${requirementId}]\n` +
        `✓ CI integration verified\n\n` +
        `Review changes and approve for commit?`,
      title: 'Refactoring Complete',
      context: {
        runId: ctx.runId,
        files: [
          { path: 'src/pages/SettingsPage.tsx', format: 'code', label: 'Updated Settings Page' },
          { path: 'src/components/layout/MobileNav.tsx', format: 'code', label: 'Updated Bottom Nav' },
          { path: e2eTestResult.testFilePath, format: 'code', label: 'E2E Tests' },
          { path: 'PRODUCT.md', format: 'markdown', label: 'PRODUCT.md' }
        ]
      }
    });
  }

  return {
    success: true,
    testsPassing: postRefactorUnitRun.passed,
    e2eTestsPassing: postRefactorE2eRun.passed,
    productMdUpdated: productMdUpdate.updated,
    requirementId,
    stats: {
      unitTests: unitTestResult.totalTestCases,
      e2eScenarios: e2eTestResult.testScenarios.length,
      componentsCreated: planResult.componentsToCreate.length,
      componentsModified: planResult.componentsToModify.length,
      translationsAdded: i18nResult.keysAdded
    }
  };
}

// ============================================================================
// TASK DEFINITIONS
// ============================================================================

export const planArchitectureTask = defineTask('plan-architecture', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Plan architecture and component structure',
  description: 'Analyze current code and design refactoring approach',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Software architect specializing in React and UI refactoring',
      task: 'Analyze current Settings page and navigation, design refactoring architecture',
      context: {
        currentSettings: args.currentSettings,
        currentNav: args.currentNav,
        requirements: {
          removeAccessControl: true,
          addTabs: ['profile', 'units', 'approvals'],
          addVersion: true,
          updateBottomNav: {
            add: ['reports', 'settings'],
            totalButtons: 5
          }
        }
      },
      instructions: [
        'Read the current SettingsPage.tsx and MobileNav.tsx files',
        'Analyze the structure and understand current implementation',
        'Design new component structure for Settings with tabs',
        'Plan how to integrate Units and Approvals pages into Settings tabs',
        'Design version management strategy (suggest: package.json version + build time)',
        'Plan bottom navigation changes (5 buttons total: Dashboard, Personnel, Equipment, Reports, Settings)',
        'Identify all components to create (e.g., SettingsTabs.tsx, ProfileTab.tsx, UnitsTab.tsx, ApprovalsTab.tsx)',
        'Identify all components to modify (SettingsPage.tsx, MobileNav.tsx)',
        'List all translation keys needed for tabs and new UI elements',
        'Create detailed implementation plan with step-by-step approach',
        'Consider RTL support for Hebrew language',
        'Ensure mobile-responsive design'
      ],
      outputFormat: 'JSON with component structure, implementation plan, and translation keys'
    },
    outputSchema: {
      type: 'object',
      required: ['componentsToCreate', 'componentsToModify', 'versionStrategy', 'translationKeys'],
      properties: {
        componentsToCreate: { type: 'array', items: { type: 'string' } },
        componentsToModify: { type: 'array', items: { type: 'string' } },
        versionStrategy: { type: 'string' },
        translationKeys: { type: 'array', items: { type: 'object' } },
        implementationSteps: { type: 'array', items: { type: 'string' } }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

export const writeE2eTestsTask = defineTask('write-e2e-tests', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Write E2E tests for Settings refactoring',
  description: 'Create comprehensive Playwright E2E tests',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'E2E test engineer writing Playwright tests',
      task: 'Write comprehensive E2E tests for Settings page refactoring and navigation changes',
      context: {
        requirementId: args.requirementId,
        plan: args.plan,
        framework: 'Playwright',
        existingTests: 'e2e/*.spec.ts'
      },
      instructions: [
        'Create new E2E test file: e2e/settings-navigation.spec.ts',
        'Write test scenarios for:',
        '  1. Settings page displays 3 tabs (Profile, Units, Approvals)',
        '  2. Profile tab shows language selector and logout',
        '  3. Units tab shows units management (check for key elements from UnitsPage)',
        '  4. Approvals tab shows approvals (check for key elements from ApprovalsPage)',
        '  5. Access Control section is NOT present',
        '  6. App version is displayed at bottom of settings',
        '  7. Bottom nav has exactly 5 buttons (Dashboard, Personnel, Equipment, Reports, Settings)',
        '  8. Reports button is in bottom nav (not in 3-dot menu)',
        '  9. Settings button is in bottom nav (not in 3-dot menu)',
        '  10. 3-dot menu does NOT contain Reports or Settings',
        '  11. Tab switching works correctly',
        '  12. All features work in Hebrew (RTL)',
        'Use Playwright best practices (data-testid, accessible selectors)',
        'Test as admin, leader, and regular user roles',
        'Verify mobile responsive layout',
        'Include screenshot comparisons for visual regression',
        'Follow existing test patterns in the codebase'
      ],
      outputFormat: 'JSON with test file path, test code, and scenario descriptions'
    },
    outputSchema: {
      type: 'object',
      required: ['testFilePath', 'testCode', 'testScenarios'],
      properties: {
        testFilePath: { type: 'string' },
        testCode: { type: 'string' },
        testScenarios: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' }
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

export const runE2eTestsTask = defineTask('run-e2e-tests', (args, taskCtx) => ({
  kind: 'agent',
  title: `Run E2E tests${args.expectFailure ? ' (expect failure)' : ''}`,
  description: 'Execute Playwright E2E tests',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Test execution engineer',
      task: 'Run Playwright E2E tests and report results',
      context: {
        testFile: args.testFile,
        expectFailure: args.expectFailure,
        command: 'npm run test:e2e'
      },
      instructions: [
        `Execute: npm run test:e2e -- ${args.testFile}`,
        'Capture complete test output',
        'For failures: capture error messages, screenshots, and failure reasons',
        'For successes: confirm test passed',
        args.expectFailure ? 'Note: Test SHOULD fail (TDD Red phase)' : 'Test should pass (TDD Green phase)',
        'Return structured results with pass/fail counts'
      ],
      outputFormat: 'JSON with test results and failure details'
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
              file: { type: 'string' }
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

export const writeUnitTestsTask = defineTask('write-unit-tests', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Write unit tests for new components',
  description: 'Create comprehensive unit tests with Testing Library',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Unit test engineer using React Testing Library',
      task: 'Write comprehensive unit tests for Settings refactoring components',
      context: {
        requirementId: args.requirementId,
        plan: args.plan,
        componentsToTest: args.componentsToTest,
        framework: 'Vitest + React Testing Library'
      },
      instructions: [
        'Create unit test files for each new component (*.test.tsx)',
        'Test SettingsTabs component:',
        '  - Renders all 3 tabs',
        '  - Tab switching works',
        '  - Active tab is highlighted',
        '  - RTL support',
        'Test ProfileTab component:',
        '  - Language selector renders',
        '  - Logout button present',
        '  - Language change triggers update',
        'Test UnitsTab component:',
        '  - Renders units management UI',
        '  - Admin/Leader access control',
        'Test ApprovalsTab component:',
        '  - Renders approvals UI',
        '  - Admin-only access',
        'Test updated SettingsPage:',
        '  - No Access Control section',
        '  - Version displayed at bottom',
        '  - Tabs component rendered',
        'Test updated MobileNav:',
        '  - 5 buttons in bottom nav',
        '  - Reports and Settings in main nav',
        '  - 3-dot menu excludes Reports/Settings',
        'Use testing-library best practices',
        'Mock Firebase and routing',
        'Test accessibility (a11y)',
        'Follow existing test patterns'
      ],
      outputFormat: 'JSON with test file paths and test case counts'
    },
    outputSchema: {
      type: 'object',
      required: ['testFiles', 'totalTestCases'],
      properties: {
        testFiles: { type: 'array', items: { type: 'string' } },
        totalTestCases: { type: 'number' },
        testsByComponent: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              component: { type: 'string' },
              testFile: { type: 'string' },
              testCount: { type: 'number' }
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

export const runUnitTestsTask = defineTask('run-unit-tests', (args, taskCtx) => ({
  kind: 'agent',
  title: `Run unit tests${args.expectFailure ? ' (expect failure)' : ''}`,
  description: 'Execute Vitest unit tests',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Test execution engineer',
      task: 'Run unit tests and report results',
      context: {
        testFiles: args.testFiles,
        expectFailure: args.expectFailure,
        command: 'npm run test:run'
      },
      instructions: [
        'Execute: npm run test:run',
        'Capture test output',
        'Report pass/fail counts',
        'For failures: capture error messages and stack traces',
        args.expectFailure ? 'Tests should fail (TDD Red phase)' : 'Tests should pass (TDD Green phase)',
        'Return structured results'
      ],
      outputFormat: 'JSON with test results'
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
              message: { type: 'string' }
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

export const implementVersionManagementTask = defineTask('implement-version-management', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Implement version management strategy',
  description: 'Create version display system',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Frontend developer',
      task: 'Implement app version management and display',
      context: {
        strategy: args.strategy,
        currentVersion: args.currentVersion
      },
      instructions: [
        'Create src/lib/version.ts to export version info',
        'Read version from package.json',
        'Add build timestamp generation',
        'Export { version, buildTime } from version.ts',
        'Update package.json version if needed',
        'Consider Vite env variables for build info',
        'Ensure version updates automatically with package.json changes'
      ],
      outputFormat: 'JSON with version file path'
    },
    outputSchema: {
      type: 'object',
      required: ['versionFile'],
      properties: {
        versionFile: { type: 'string' },
        currentVersion: { type: 'string' }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

export const createSettingsTabsTask = defineTask('create-settings-tabs', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Create SettingsTabs component',
  description: 'Build tabs component for Settings page',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'React developer',
      task: 'Create Settings tabs component with Profile, Units, and Approvals tabs',
      context: {
        plan: args.plan,
        tabs: args.tabs,
        uiLibrary: '@radix-ui/react-tabs (already available)'
      },
      instructions: [
        'Create src/components/settings/SettingsTabs.tsx',
        'Use Radix UI Tabs component (from @radix-ui/react-tabs)',
        'Create 3 tabs: Profile, Units, Approvals',
        'Create tab content components:',
        '  - src/components/settings/ProfileTab.tsx (language + logout)',
        '  - src/components/settings/UnitsTab.tsx (embed units management)',
        '  - src/components/settings/ApprovalsTab.tsx (embed approvals)',
        'Style with Tailwind CSS matching app design system',
        'Support RTL (Hebrew)',
        'Make mobile-responsive',
        'Use translation keys from i18n',
        'Add proper TypeScript types',
        'Follow existing component patterns'
      ],
      outputFormat: 'JSON with component path'
    },
    outputSchema: {
      type: 'object',
      required: ['componentPath'],
      properties: {
        componentPath: { type: 'string' },
        relatedFiles: { type: 'array', items: { type: 'string' } }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

export const refactorSettingsPageTask = defineTask('refactor-settings-page', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Refactor Settings page',
  description: 'Update Settings page with tabs and version',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'React developer',
      task: 'Refactor SettingsPage.tsx to use new tabs and remove Access Control',
      context: {
        plan: args.plan,
        tabsComponent: args.tabsComponent,
        removeAccessControl: args.removeAccessControl,
        addVersion: args.addVersion
      },
      instructions: [
        'Read current src/pages/SettingsPage.tsx',
        'Remove Access Control Card section (lines ~81-119)',
        'Remove language Card - it will be in ProfileTab',
        'Import and use SettingsTabs component',
        'Add app version display at bottom using src/lib/version.ts',
        'Update header/title as needed',
        'Maintain mobile-responsive design',
        'Preserve RTL support',
        'Update translations usage',
        'Test component compiles'
      ],
      outputFormat: 'JSON with changes summary'
    },
    outputSchema: {
      type: 'object',
      required: ['changesCount', 'modifiedFiles'],
      properties: {
        changesCount: { type: 'number' },
        modifiedFiles: { type: 'array', items: { type: 'string' } }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

export const refactorBottomNavTask = defineTask('refactor-bottom-nav', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Refactor bottom navigation',
  description: 'Update MobileNav with Reports and Settings buttons',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'React developer',
      task: 'Update MobileNav to add Reports and Settings to main nav (5 buttons total)',
      context: {
        plan: args.plan,
        addButtons: args.addButtons,
        removeFromMore: args.removeFromMore
      },
      instructions: [
        'Read current src/components/layout/MobileNav.tsx',
        'Update mainNavigation array to include Reports and Settings',
        'mainNavigation should have 5 items: Dashboard, Personnel, Equipment, Reports, Settings',
        'Import FileText icon for Reports',
        'Import Settings icon for Settings',
        'Remove Reports and Settings from moreItems array',
        'moreItems should only have: Units, Approvals (if admin)',
        'Update layout to fit 5 buttons nicely (may need smaller icons/text)',
        'Ensure mobile-responsive',
        'Preserve RTL support',
        'Test renders correctly'
      ],
      outputFormat: 'JSON with changes summary'
    },
    outputSchema: {
      type: 'object',
      required: ['changesCount', 'modifiedFiles'],
      properties: {
        changesCount: { type: 'number' },
        modifiedFiles: { type: 'array', items: { type: 'string' } },
        buttonsInNav: { type: 'number' }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

export const updateTranslationsTask = defineTask('update-translations', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Update i18n translations',
  description: 'Add new translation keys for tabs and UI',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Internationalization specialist',
      task: 'Add new translation keys for Settings tabs and UI elements',
      context: {
        newKeys: args.newKeys,
        translationFile: 'src/i18n/translations.ts'
      },
      instructions: [
        'Read src/i18n/translations.ts',
        'Add new keys for:',
        '  - settings.tabs.profile / הפרופיל שלי',
        '  - settings.tabs.units / יחידות',
        '  - settings.tabs.approvals / אישורים',
        '  - settings.version / Version / גרסה',
        '  - settings.profileTab.title / Profile Settings / הגדרות פרופיל',
        '  - settings.profileTab.language / Language / שפה',
        '  - settings.profileTab.logout / Sign Out / התנתק',
        'Ensure English and Hebrew translations',
        'Maintain existing key structure',
        'Follow existing translation patterns',
        'Test no duplicate keys'
      ],
      outputFormat: 'JSON with keys added count'
    },
    outputSchema: {
      type: 'object',
      required: ['keysAdded'],
      properties: {
        keysAdded: { type: 'number' },
        newKeys: { type: 'array', items: { type: 'string' } }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

export const fixFailingTestsTask = defineTask('fix-failing-tests', (args, taskCtx) => ({
  kind: 'agent',
  title: `Fix failing ${args.testType} tests`,
  description: 'Debug and fix test failures',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Test debugging specialist',
      task: 'Analyze and fix failing tests',
      context: {
        failures: args.failures,
        testType: args.testType
      },
      instructions: [
        'Analyze each test failure',
        'Identify root cause (implementation bug, test bug, missing mock, etc.)',
        'Fix implementation code if needed',
        'Fix test code if needed',
        'Update mocks/fixtures if needed',
        'Ensure fixes maintain test integrity',
        'Re-verify component behavior',
        'Document fixes made'
      ],
      outputFormat: 'JSON with fixes summary'
    },
    outputSchema: {
      type: 'object',
      required: ['fixesApplied'],
      properties: {
        fixesApplied: { type: 'number' },
        fixesByFile: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              file: { type: 'string' },
              issue: { type: 'string' },
              fix: { type: 'string' }
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

export const refactorAndPolishTask = defineTask('refactor-and-polish', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Refactor and polish implementation',
  description: 'Optimize code quality and UX',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior React developer and UX specialist',
      task: 'Refactor and polish Settings and navigation implementation',
      context: {
        modifiedFiles: args.modifiedFiles
      },
      instructions: [
        'Review all modified files',
        'Optimize component structure',
        'Improve code readability',
        'Add helpful comments where needed',
        'Ensure consistent styling',
        'Polish animations and transitions',
        'Verify accessibility (ARIA labels, keyboard nav)',
        'Check mobile UX on small screens',
        'Verify RTL layout in Hebrew',
        'Optimize performance (useMemo, useCallback if needed)',
        'Remove console.logs and debug code',
        'Ensure TypeScript types are correct',
        'Follow React best practices',
        'Maintain tests passing'
      ],
      outputFormat: 'JSON with optimizations count'
    },
    outputSchema: {
      type: 'object',
      required: ['optimizations'],
      properties: {
        optimizations: { type: 'number' },
        optimizationsByCategory: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              count: { type: 'number' },
              description: { type: 'string' }
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
  title: 'Update PRODUCT.md',
  description: 'Document new feature in PRODUCT.md',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Technical documentation writer',
      task: 'Update PRODUCT.md with Settings refactoring requirements',
      context: {
        requirementId: args.requirementId,
        description: args.description,
        e2eTestFile: args.e2eTestFile,
        unitTestFiles: args.unitTestFiles
      },
      instructions: [
        'Read existing PRODUCT.md',
        'Find appropriate section (UI/Navigation or create new "Settings" section)',
        `Add requirement [${args.requirementId}]:`,
        `  - Settings page refactored with tabs (Profile, Units, Approvals)`,
        `  - Access Control section removed (not relevant)`,
        `  - App version displayed at bottom of Settings`,
        `  - Bottom navigation updated: 5 buttons (Dashboard, Personnel, Equipment, Reports, Settings)`,
        `  - Reports and Settings moved from 3-dot menu to bottom nav`,
        `  - Comprehensive E2E and unit test coverage`,
        'Reference test files for verification',
        'Preserve existing formatting',
        'Keep requirement testable and clear'
      ],
      outputFormat: 'JSON with update status'
    },
    outputSchema: {
      type: 'object',
      required: ['updated', 'requirementText'],
      properties: {
        updated: { type: 'boolean' },
        requirementText: { type: 'string' },
        sectionAdded: { type: 'string' }
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
  description: 'Confirm tests will run in CI',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'CI/CD engineer',
      task: 'Verify that new tests will run in CI pipeline',
      context: {
        e2eTestFile: args.e2eTestFile,
        unitTestFiles: args.unitTestFiles
      },
      instructions: [
        'Check E2E test follows e2e/*.spec.ts pattern',
        'Check unit tests follow *.test.tsx pattern',
        'Verify not excluded in playwright.config.ts or vitest.config.ts',
        'Check npm scripts will include these tests',
        'Verify CI workflow (.github/workflows) runs tests',
        'Confirm no missing dependencies in CI environment',
        'Return verification status'
      ],
      outputFormat: 'JSON with CI integration status'
    },
    outputSchema: {
      type: 'object',
      required: ['integrated', 'willRunInCi'],
      properties: {
        integrated: { type: 'boolean' },
        willRunInCi: { type: 'boolean' },
        ciCommands: { type: 'array', items: { type: 'string' } }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));
