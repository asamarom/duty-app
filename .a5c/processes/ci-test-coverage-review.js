/**
 * @process ci-test-coverage-review
 * @description Comprehensive CI review, test mapping, mock analysis, gap filling, and quality verification
 * @skill code-coverage specializations/qa-testing-automation/skills/code-coverage/SKILL.md
 * @skill playwright-e2e specializations/qa-testing-automation/skills/playwright-e2e/SKILL.md
 * @skill jest-testing specializations/qa-testing-automation/skills/jest-testing/SKILL.md
 * @agent test-architect specializations/qa-testing-automation/agents/test-architect/AGENT.md
 * @agent test-strategist specializations/qa-testing-automation/agents/test-strategist/AGENT.md
 * @agent quality-gatekeeper specializations/qa-testing-automation/agents/quality-gatekeeper/AGENT.md
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

export async function process(inputs, ctx) {
  const {
    projectPath = '/home/ubuntu/duty-app',
    outputDir = 'ci-test-review-output',
    targetCoverage = 85,
    stagingVerification = true
  } = inputs;

  const startTime = ctx.now();
  const artifacts = [];

  ctx.log('info', '🚀 Starting CI & Test Coverage Review Process');
  ctx.log('info', `Project: ${projectPath}`);
  ctx.log('info', `Target Coverage: ${targetCoverage}%`);
  ctx.log('info', `Staging Verification: ${stagingVerification}`);

  // ============================================================================
  // PHASE 1: CI PIPELINE ANALYSIS
  // ============================================================================

  ctx.log('info', '📋 Phase 1: Analyzing CI pipeline configuration');

  const ciAnalysis = await ctx.task(analyzeCIPipelineTask, {
    projectPath,
    outputDir
  });

  artifacts.push(ciAnalysis.reportPath);

  // Optional breakpoint to review CI analysis
  await ctx.breakpoint({
    id: 'review-ci-analysis',
    question: `CI Pipeline Analysis Complete. Found:
- ${ciAnalysis.jobs.length} CI jobs
- ${ciAnalysis.testStages.length} test stages
- ${ciAnalysis.qualityChecks.length} quality checks

Review the CI analysis report at: ${ciAnalysis.reportPath}

Would you like to proceed with test mapping?`,
    options: [
      { value: 'proceed', label: 'Proceed with test mapping' },
      { value: 'review', label: 'Let me review the report first' }
    ]
  });

  // ============================================================================
  // PHASE 2: TEST MAPPING & INVENTORY
  // ============================================================================

  ctx.log('info', '🗺️ Phase 2: Mapping all tests in the project');

  const testMapping = await ctx.task(mapAllTestsTask, {
    projectPath,
    outputDir
  });

  artifacts.push(testMapping.reportPath);

  ctx.log('info', `✅ Test Mapping Complete:`);
  ctx.log('info', `  - E2E Tests: ${testMapping.e2eTests.length}`);
  ctx.log('info', `  - Unit Tests: ${testMapping.unitTests.length}`);
  ctx.log('info', `  - Integration Tests: ${testMapping.integrationTests.length}`);
  ctx.log('info', `  - Total Tests: ${testMapping.totalTests}`);

  // ============================================================================
  // PHASE 3: MOCK DISCOVERY & ANALYSIS
  // ============================================================================

  ctx.log('info', '🔍 Phase 3: Finding and analyzing all mocks');

  const mockAnalysis = await ctx.task(findAndAnalyzeMocksTask, {
    projectPath,
    testMapping,
    outputDir
  });

  artifacts.push(mockAnalysis.reportPath);

  ctx.log('info', `✅ Mock Analysis Complete:`);
  ctx.log('info', `  - Total Mocks: ${mockAnalysis.totalMocks}`);
  ctx.log('info', `  - Justifiable Mocks: ${mockAnalysis.justifiableMocks.length}`);
  ctx.log('info', `  - Replaceable Mocks: ${mockAnalysis.replaceableMocks.length}`);
  ctx.log('info', `  - Unnecessary Mocks: ${mockAnalysis.unnecessaryMocks.length}`);

  // ============================================================================
  // PHASE 4: COVERAGE ANALYSIS
  // ============================================================================

  ctx.log('info', '📊 Phase 4: Analyzing test coverage');

  const coverageAnalysis = await ctx.task(analyzeCoverageTask, {
    projectPath,
    testMapping,
    targetCoverage,
    outputDir
  });

  artifacts.push(coverageAnalysis.reportPath);

  ctx.log('info', `✅ Coverage Analysis Complete:`);
  ctx.log('info', `  - Current Coverage: ${coverageAnalysis.currentCoverage}%`);
  ctx.log('info', `  - Target Coverage: ${targetCoverage}%`);
  ctx.log('info', `  - Gap: ${coverageAnalysis.gap}%`);
  ctx.log('info', `  - Uncovered Files: ${coverageAnalysis.uncoveredFiles.length}`);

  // ============================================================================
  // PHASE 5: COMPREHENSIVE TEST & MOCK REPORT GENERATION
  // ============================================================================

  ctx.log('info', '📄 Phase 5: Generating comprehensive report');

  const comprehensiveReport = await ctx.task(generateComprehensiveReportTask, {
    projectPath,
    ciAnalysis,
    testMapping,
    mockAnalysis,
    coverageAnalysis,
    outputDir
  });

  artifacts.push(comprehensiveReport.reportPath);

  // Breakpoint to review the comprehensive report
  const reportReview = await ctx.breakpoint({
    id: 'review-comprehensive-report',
    question: `📊 Comprehensive Test & Mock Report Generated!

**Summary:**
- CI Pipeline: ${ciAnalysis.jobs.length} jobs, ${ciAnalysis.testStages.length} test stages
- Total Tests: ${testMapping.totalTests}
  - E2E: ${testMapping.e2eTests.length}
  - Unit: ${testMapping.unitTests.length}
  - Integration: ${testMapping.integrationTests.length}
- Total Mocks: ${mockAnalysis.totalMocks}
  - Replaceable: ${mockAnalysis.replaceableMocks.length}
  - Unnecessary: ${mockAnalysis.unnecessaryMocks.length}
- Coverage: ${coverageAnalysis.currentCoverage}% (Target: ${targetCoverage}%)
- Coverage Gap: ${coverageAnalysis.gap}%

Report available at: ${comprehensiveReport.reportPath}

What would you like to do next?`,
    options: [
      { value: 'fill-gaps', label: 'Fill test gaps and fix mocks (Recommended)' },
      { value: 'fill-gaps-only', label: 'Only fill test gaps (keep mocks as-is)' },
      { value: 'fix-mocks-only', label: 'Only fix/replace mocks' },
      { value: 'stop', label: 'Stop here - I\'ll review the report' }
    ]
  });

  if (reportReview === 'stop') {
    ctx.log('info', '✅ Process completed. Review the report and re-run when ready.');
    return {
      success: true,
      phase: 'reporting-complete',
      artifacts,
      report: comprehensiveReport
    };
  }

  // ============================================================================
  // PHASE 6: GAP IDENTIFICATION & PRIORITIZATION
  // ============================================================================

  ctx.log('info', '🎯 Phase 6: Identifying and prioritizing test gaps');

  const gapIdentification = await ctx.task(identifyTestGapsTask, {
    projectPath,
    testMapping,
    coverageAnalysis,
    mockAnalysis,
    targetCoverage,
    strategy: reportReview, // 'fill-gaps', 'fill-gaps-only', 'fix-mocks-only'
    outputDir
  });

  artifacts.push(gapIdentification.reportPath);

  ctx.log('info', `✅ Gap Identification Complete:`);
  ctx.log('info', `  - Missing Tests: ${gapIdentification.missingTests.length}`);
  ctx.log('info', `  - Mocks to Fix: ${gapIdentification.mocksToFix.length}`);
  ctx.log('info', `  - Priority High: ${gapIdentification.priorityHigh.length}`);
  ctx.log('info', `  - Priority Medium: ${gapIdentification.priorityMedium.length}`);
  ctx.log('info', `  - Priority Low: ${gapIdentification.priorityLow.length}`);

  // ============================================================================
  // PHASE 7: ITERATIVE GAP FILLING & MOCK FIXING
  // ============================================================================

  ctx.log('info', '🔨 Phase 7: Filling test gaps and fixing mocks (Iterative TDD)');

  const gapFilling = await ctx.task(fillGapsAndFixMocksTask, {
    projectPath,
    gapIdentification,
    mockAnalysis,
    testMapping,
    targetCoverage,
    strategy: reportReview,
    outputDir
  });

  artifacts.push(...gapFilling.artifacts);

  ctx.log('info', `✅ Gap Filling Complete:`);
  ctx.log('info', `  - Tests Added: ${gapFilling.testsAdded}`);
  ctx.log('info', `  - Mocks Fixed: ${gapFilling.mocksFixed}`);
  ctx.log('info', `  - Mocks Removed: ${gapFilling.mocksRemoved}`);
  ctx.log('info', `  - New Coverage: ${gapFilling.newCoverage}%`);

  // ============================================================================
  // PHASE 8: PREPARE FOR STAGING VERIFICATION
  // ============================================================================

  ctx.log('info', '📦 Phase 8: Preparing for staging verification');
  ctx.log('info', 'Skipping local test run - will verify on staging environment');

  // Create placeholder for consistency with downstream tasks
  const localVerification = {
    allPassed: null, // Not run locally
    passed: 0,
    failed: 0,
    failedTests: [],
    reportPath: null,
    skipped: true
  };

  // ============================================================================
  // PHASE 9: STAGING VERIFICATION (Optional)
  // ============================================================================

  if (stagingVerification) {
    ctx.log('info', '🌐 Phase 9: Verifying on staging environment');

    const stagingDeploy = await ctx.task(deployToStagingTask, {
      projectPath,
      outputDir
    });

    artifacts.push(stagingDeploy.deploymentUrl);

    const stagingTests = await ctx.task(runStagingTestsTask, {
      projectPath,
      stagingUrl: stagingDeploy.deploymentUrl,
      outputDir
    });

    artifacts.push(stagingTests.reportPath);

    if (!stagingTests.allPassed) {
      ctx.log('error', '❌ Staging tests failed!');

      await ctx.breakpoint({
        id: 'staging-tests-failed',
        question: `⚠️ Staging Tests Failed!

${stagingTests.failed} tests failed on staging.

Failed tests:
${stagingTests.failedTests.slice(0, 5).map(t => `  - ${t}`).join('\n')}

This indicates environment-specific issues. Manual investigation required.`,
        options: [
          { value: 'acknowledge', label: 'Acknowledge - I\'ll investigate' }
        ]
      });

      return {
        success: false,
        phase: 'staging-verification-failed',
        artifacts,
        stagingUrl: stagingDeploy.deploymentUrl,
        failedTests: stagingTests.failedTests
      };
    }

    ctx.log('info', '✅ All staging tests passed!');
  }

  // ============================================================================
  // PHASE 10: FINAL REPORT & RECOMMENDATIONS
  // ============================================================================

  ctx.log('info', '📊 Phase 10: Generating final report with recommendations');

  const finalReport = await ctx.task(generateFinalReportTask, {
    projectPath,
    ciAnalysis,
    testMapping,
    mockAnalysis,
    coverageAnalysis,
    gapIdentification,
    gapFilling,
    localVerification,
    stagingTests: stagingVerification ? stagingTests : null,
    targetCoverage,
    outputDir
  });

  artifacts.push(finalReport.reportPath);

  ctx.log('info', '✅ CI & Test Coverage Review Complete!');
  ctx.log('info', '');
  ctx.log('info', '📊 Final Summary:');
  ctx.log('info', `  - Initial Coverage: ${coverageAnalysis.currentCoverage}%`);
  ctx.log('info', `  - Final Coverage: ${gapFilling.newCoverage}%`);
  ctx.log('info', `  - Tests Added: ${gapFilling.testsAdded}`);
  ctx.log('info', `  - Mocks Fixed: ${gapFilling.mocksFixed}`);
  ctx.log('info', `  - Mocks Removed: ${gapFilling.mocksRemoved}`);
  if (stagingVerification) {
    ctx.log('info', `  - Staging Tests: ${stagingTests.allPassed ? '✅ PASSED' : '❌ FAILED'}`);
  }
  ctx.log('info', '');
  ctx.log('info', `📄 Final Report: ${finalReport.reportPath}`);

  const elapsedTime = ctx.now() - startTime;
  ctx.log('info', `⏱️ Total Time: ${Math.round(elapsedTime / 1000 / 60)} minutes`);

  return {
    success: true,
    phase: 'completed',
    artifacts,
    summary: {
      initialCoverage: coverageAnalysis.currentCoverage,
      finalCoverage: gapFilling.newCoverage,
      testsAdded: gapFilling.testsAdded,
      mocksFixed: gapFilling.mocksFixed,
      mocksRemoved: gapFilling.mocksRemoved,
      stagingTestsPassed: stagingVerification ? stagingTests.allPassed : null
    },
    finalReport: finalReport.reportPath
  };
}

// ============================================================================
// TASK DEFINITIONS
// ============================================================================

const analyzeCIPipelineTask = defineTask('analyze-ci-pipeline', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Analyze CI Pipeline Configuration',
  agent: {
    name: 'ci-analyzer',
    prompt: {
      role: 'CI/CD specialist',
      task: 'Analyze the GitHub Actions CI pipeline configuration',
      context: {
        projectPath: args.projectPath,
        workflowPath: '.github/workflows/ci-and-deploy.yml'
      },
      instructions: [
        'Read and parse the CI workflow file (.github/workflows/ci-and-deploy.yml)',
        'Identify all jobs, stages, and their dependencies',
        'Map all test-related steps (typecheck, lint, unit-tests, rules-tests, E2E tests)',
        'Identify quality checks and gates',
        'Document the deployment flow (staging → production)',
        'Note any missing quality checks or gaps in the pipeline',
        'Generate a detailed CI pipeline analysis report in markdown format',
        `Save the report to ${args.outputDir}/ci-pipeline-analysis.md`
      ],
      outputFormat: 'JSON with structure: { jobs: array, testStages: array, qualityChecks: array, gaps: array, reportPath: string }'
    },
    outputSchema: {
      type: 'object',
      required: ['jobs', 'testStages', 'qualityChecks', 'reportPath'],
      properties: {
        jobs: { type: 'array' },
        testStages: { type: 'array' },
        qualityChecks: { type: 'array' },
        gaps: { type: 'array' },
        reportPath: { type: 'string' }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const mapAllTestsTask = defineTask('map-all-tests', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Map All Tests in Project',
  agent: {
    name: 'test-mapper',
    prompt: {
      role: 'QA test mapper',
      task: 'Create comprehensive inventory of all tests in the project',
      context: {
        projectPath: args.projectPath,
        e2eTestsPath: 'e2e/**/*.spec.ts',
        unitTestsPath: 'src/**/*.test.{ts,tsx}'
      },
      instructions: [
        'Use Glob to find all E2E test files (e2e/**/*.spec.ts)',
        'Use Glob to find all unit/integration test files (src/**/*.test.{ts,tsx})',
        'Read each test file and extract:',
        '  - Test file path',
        '  - Test suites (describe blocks)',
        '  - Individual test cases (test/it blocks)',
        '  - Test categories (E2E, unit, integration)',
        '  - Dependencies and imports',
        '  - Coverage areas (what the test covers)',
        'Categorize tests by:',
        '  - Type (E2E, unit, integration)',
        '  - Feature area (auth, equipment, transfers, settings, etc.)',
        '  - User role (admin, leader, user, unauth)',
        '  - Platform (desktop, mobile)',
        'Generate a comprehensive test inventory report',
        `Save the report to ${args.outputDir}/test-inventory.md`,
        'Return structured JSON with all test details'
      ],
      outputFormat: 'JSON with structure: { e2eTests: array, unitTests: array, integrationTests: array, totalTests: number, reportPath: string, testsByFeature: object, testsByRole: object }'
    },
    outputSchema: {
      type: 'object',
      required: ['e2eTests', 'unitTests', 'integrationTests', 'totalTests', 'reportPath'],
      properties: {
        e2eTests: { type: 'array' },
        unitTests: { type: 'array' },
        integrationTests: { type: 'array' },
        totalTests: { type: 'number' },
        reportPath: { type: 'string' },
        testsByFeature: { type: 'object' },
        testsByRole: { type: 'object' }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const findAndAnalyzeMocksTask = defineTask('find-analyze-mocks', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Find and Analyze All Mocks',
  agent: {
    name: 'mock-analyzer',
    prompt: {
      role: 'Testing specialist focused on mock analysis',
      task: 'Find all mocks in the codebase and analyze whether they are necessary',
      context: {
        projectPath: args.projectPath,
        testMapping: args.testMapping
      },
      instructions: [
        'Use Grep to find all files containing vi.mock, jest.mock, or mock() calls',
        'For each mock found:',
        '  - Identify what is being mocked (module, function, service)',
        '  - Understand WHY it\'s being mocked (external API, Firebase, complex dependency)',
        '  - Determine if the mock is JUSTIFIABLE:',
        '    * Justifiable: External APIs, paid services, Firebase Auth (in unit tests), time/dates, random values',
        '    * Replaceable: Internal functions, simple utilities, hooks that could use real implementation',
        '    * Unnecessary: Over-mocking that makes tests brittle or less realistic',
        '  - Check if there\'s a better alternative (test helpers, factories, real implementation)',
        'Read each file containing mocks to understand the context',
        'Categorize mocks into:',
        '  - justifiableMocks: Mocks that should stay (with justification)',
        '  - replaceableMocks: Mocks that can be replaced with real implementations',
        '  - unnecessaryMocks: Mocks that should be removed entirely',
        'For replaceable mocks, suggest alternatives',
        'Generate a detailed mock analysis report',
        `Save the report to ${args.outputDir}/mock-analysis.md`,
        'Return structured JSON with all mock details and categorization'
      ],
      outputFormat: 'JSON with structure: { totalMocks: number, justifiableMocks: array, replaceableMocks: array, unnecessaryMocks: array, mocksByFile: object, reportPath: string }'
    },
    outputSchema: {
      type: 'object',
      required: ['totalMocks', 'justifiableMocks', 'replaceableMocks', 'unnecessaryMocks', 'reportPath'],
      properties: {
        totalMocks: { type: 'number' },
        justifiableMocks: { type: 'array' },
        replaceableMocks: { type: 'array' },
        unnecessaryMocks: { type: 'array' },
        mocksByFile: { type: 'object' },
        reportPath: { type: 'string' }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const analyzeCoverageTask = defineTask('analyze-coverage', (args, taskCtx) => ({
  kind: 'node',
  title: 'Analyze Test Coverage',
  script: `
    import { execSync } from 'child_process';
    import { writeFileSync } from 'fs';
    import { join } from 'path';

    const projectPath = ${JSON.stringify(args.projectPath)};
    const targetCoverage = ${args.targetCoverage};
    const outputDir = ${JSON.stringify(args.outputDir)};
    const testMapping = ${JSON.stringify(args.testMapping)};

    console.log('Running coverage analysis...');

    // Run vitest with coverage
    try {
      execSync('npm run test:run -- --coverage', {
        cwd: projectPath,
        stdio: 'inherit'
      });
    } catch (error) {
      console.warn('Coverage command failed, but continuing...');
    }

    // Parse coverage report (assuming JSON reporter)
    let coverageData = { lines: { pct: 0 }, statements: { pct: 0 }, functions: { pct: 0 }, branches: { pct: 0 } };
    try {
      const coverageJson = JSON.parse(
        require('fs').readFileSync(join(projectPath, 'coverage/coverage-summary.json'), 'utf8')
      );
      coverageData = coverageJson.total || coverageData;
    } catch (e) {
      console.warn('Could not parse coverage data, using defaults');
    }

    const currentCoverage = Math.round(
      (coverageData.lines.pct + coverageData.statements.pct + coverageData.functions.pct + coverageData.branches.pct) / 4
    );

    const gap = Math.max(0, targetCoverage - currentCoverage);

    // Identify uncovered files
    const uncoveredFiles = [];
    // This would parse the coverage report to find files with low/no coverage
    // For now, we'll estimate based on test mapping

    const report = \`# Test Coverage Analysis

## Current Coverage: \${currentCoverage}%
- Lines: \${coverageData.lines.pct}%
- Statements: \${coverageData.statements.pct}%
- Functions: \${coverageData.functions.pct}%
- Branches: \${coverageData.branches.pct}%

## Target Coverage: \${targetCoverage}%

## Gap: \${gap}%

## Files Needing Coverage
\${uncoveredFiles.map(f => \`- \${f}\`).join('\\n') || '(See coverage/index.html for detailed file-by-file coverage)'}

## Recommendations
\${gap > 0 ? \`Need to add tests to increase coverage by \${gap}%\` : 'Coverage target met!'}
\`;

    const reportPath = join(outputDir, 'coverage-analysis.md');
    writeFileSync(reportPath, report);

    const result = {
      currentCoverage,
      targetCoverage,
      gap,
      coverageData,
      uncoveredFiles,
      reportPath
    };

    writeFileSync(
      'tasks/${taskCtx.effectId}/output.json',
      JSON.stringify(result, null, 2)
    );

    console.log(\`Coverage: \${currentCoverage}%, Gap: \${gap}%\`);
  `,
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const generateComprehensiveReportTask = defineTask('generate-comprehensive-report', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Generate Comprehensive Test & Mock Report',
  agent: {
    name: 'report-generator',
    prompt: {
      role: 'Technical documentation specialist',
      task: 'Generate a comprehensive report combining CI, test, mock, and coverage analysis',
      context: {
        projectPath: args.projectPath,
        ciAnalysis: args.ciAnalysis,
        testMapping: args.testMapping,
        mockAnalysis: args.mockAnalysis,
        coverageAnalysis: args.coverageAnalysis,
        outputDir: args.outputDir
      },
      instructions: [
        'Read all the individual reports generated so far:',
        `  - CI Pipeline Analysis: ${args.ciAnalysis.reportPath}`,
        `  - Test Inventory: ${args.testMapping.reportPath}`,
        `  - Mock Analysis: ${args.mockAnalysis.reportPath}`,
        `  - Coverage Analysis: ${args.coverageAnalysis.reportPath}`,
        'Combine all findings into a single comprehensive report with sections:',
        '  1. Executive Summary',
        '  2. CI Pipeline Review',
        '  3. Test Inventory',
        '  4. Mock Analysis',
        '  5. Coverage Analysis',
        '  6. Identified Gaps',
        '  7. Recommendations',
        'Use clear formatting, tables, and visualizations where appropriate',
        'Highlight critical issues and high-priority recommendations',
        'Include actionable next steps',
        `Save the comprehensive report to ${args.outputDir}/COMPREHENSIVE-TEST-REPORT.md`,
        'Return the path to the report'
      ],
      outputFormat: 'JSON with structure: { reportPath: string, summary: object }'
    },
    outputSchema: {
      type: 'object',
      required: ['reportPath'],
      properties: {
        reportPath: { type: 'string' },
        summary: { type: 'object' }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const identifyTestGapsTask = defineTask('identify-test-gaps', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Identify Test Gaps and Prioritize',
  agent: {
    name: 'gap-identifier',
    prompt: {
      role: 'QA strategist',
      task: 'Identify missing tests and prioritize based on strategy',
      context: {
        projectPath: args.projectPath,
        testMapping: args.testMapping,
        coverageAnalysis: args.coverageAnalysis,
        mockAnalysis: args.mockAnalysis,
        targetCoverage: args.targetCoverage,
        strategy: args.strategy
      },
      instructions: [
        'Analyze the codebase to find components, hooks, and functions with no or insufficient tests',
        'Cross-reference with coverage data to identify uncovered code paths',
        'Based on the strategy, create a prioritized list:',
        `  - Strategy: ${args.strategy}`,
        '  - If "fill-gaps" or "fill-gaps-only": Focus on missing tests for uncovered code',
        '  - If "fill-gaps" or "fix-mocks-only": Include mocks to fix/replace',
        'Prioritize gaps by:',
        '  - HIGH: Critical business logic, authentication, data integrity',
        '  - MEDIUM: UI components, user flows, feature completeness',
        '  - LOW: Edge cases, error handling, minor utilities',
        'For each gap, specify:',
        '  - What needs testing',
        '  - Type of test needed (unit, integration, E2E)',
        '  - Estimated complexity',
        '  - Suggested approach',
        'For mocks to fix, specify:',
        '  - Current mock location',
        '  - Why it should be replaced',
        '  - Suggested alternative (real implementation, factory, test helper)',
        'Generate a gap identification report',
        `Save to ${args.outputDir}/test-gaps.md`,
        'Return structured JSON with prioritized gaps'
      ],
      outputFormat: 'JSON with structure: { missingTests: array, mocksToFix: array, priorityHigh: array, priorityMedium: array, priorityLow: array, reportPath: string }'
    },
    outputSchema: {
      type: 'object',
      required: ['missingTests', 'mocksToFix', 'priorityHigh', 'reportPath'],
      properties: {
        missingTests: { type: 'array' },
        mocksToFix: { type: 'array' },
        priorityHigh: { type: 'array' },
        priorityMedium: { type: 'array' },
        priorityLow: { type: 'array' },
        reportPath: { type: 'string' }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const fillGapsAndFixMocksTask = defineTask('fill-gaps-fix-mocks', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Fill Test Gaps and Fix Mocks (TDD Iterative)',
  agent: {
    name: 'test-developer',
    prompt: {
      role: 'TDD expert and test developer',
      task: 'Write missing tests and fix/replace mocks following TDD principles',
      context: {
        projectPath: args.projectPath,
        gapIdentification: args.gapIdentification,
        mockAnalysis: args.mockAnalysis,
        testMapping: args.testMapping,
        targetCoverage: args.targetCoverage,
        strategy: args.strategy
      },
      instructions: [
        'Follow TDD principles: Red-Green-Refactor for each gap',
        'Work through gaps in priority order (High → Medium → Low)',
        'For each missing test:',
        '  1. Write the test first (it should fail)',
        '  2. Run the test to confirm it fails for the right reason',
        '  3. Write minimal code to make it pass (if implementation missing)',
        '  4. Run the test to confirm it passes',
        '  5. Refactor if needed',
        '  6. Move to next gap',
        'For mocks to fix (based on strategy):',
        '  - If replaceable: Replace with real implementation or test factory',
        '  - If unnecessary: Remove the mock and use real code',
        '  - If justifiable: Document why it stays and ensure it\'s minimal',
        'Follow existing test patterns in the project:',
        '  - E2E tests: Use Playwright, follow patterns in e2e/*.spec.ts',
        '  - Unit tests: Use Vitest, follow patterns in src/**/*.test.tsx',
        '  - Use existing test helpers and utilities',
        'After each test is written:',
        '  - Run it locally to verify it passes',
        '  - Update coverage metrics',
        'Track progress:',
        '  - Tests added',
        '  - Mocks fixed',
        '  - Mocks removed',
        '  - New coverage percentage',
        'Continue until target coverage is reached or all high-priority gaps filled',
        'Generate artifacts documenting what was added/changed',
        `Save summary to ${args.outputDir}/gap-filling-summary.md`,
        'Return structured JSON with results'
      ],
      outputFormat: 'JSON with structure: { testsAdded: number, mocksFixed: number, mocksRemoved: number, newCoverage: number, artifacts: array }'
    },
    outputSchema: {
      type: 'object',
      required: ['testsAdded', 'mocksFixed', 'mocksRemoved', 'newCoverage'],
      properties: {
        testsAdded: { type: 'number' },
        mocksFixed: { type: 'number' },
        mocksRemoved: { type: 'number' },
        newCoverage: { type: 'number' },
        artifacts: { type: 'array' }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const runLocalTestsTask = defineTask('run-local-tests', (args, taskCtx) => ({
  kind: 'node',
  title: 'Run All Local Tests',
  script: `
    import { execSync } from 'child_process';
    import { writeFileSync } from 'fs';
    import { join } from 'path';

    const projectPath = ${JSON.stringify(args.projectPath)};
    const outputDir = ${JSON.stringify(args.outputDir)};

    console.log('Running all local tests...');

    let allPassed = true;
    let passed = 0;
    let failed = 0;
    let failedTests = [];

    // Run unit tests
    try {
      console.log('Running unit tests...');
      execSync('npm run test:run', { cwd: projectPath, stdio: 'inherit' });
      console.log('✅ Unit tests passed');
    } catch (error) {
      console.error('❌ Unit tests failed');
      allPassed = false;
      failed++;
      failedTests.push('Unit tests');
    }

    // Run E2E tests
    try {
      console.log('Running E2E tests...');
      execSync('npm run test:e2e', { cwd: projectPath, stdio: 'inherit' });
      console.log('✅ E2E tests passed');
      passed++;
    } catch (error) {
      console.error('❌ E2E tests failed');
      allPassed = false;
      failed++;
      failedTests.push('E2E tests');
    }

    // Run rules tests
    try {
      console.log('Running Firestore rules tests...');
      execSync('npm run test:rules', { cwd: projectPath, stdio: 'inherit' });
      console.log('✅ Rules tests passed');
      passed++;
    } catch (error) {
      console.error('❌ Rules tests failed');
      allPassed = false;
      failed++;
      failedTests.push('Firestore rules tests');
    }

    const report = \`# Local Test Results

## Summary
- **Status**: \${allPassed ? '✅ ALL PASSED' : '❌ FAILURES DETECTED'}
- **Passed**: \${passed}
- **Failed**: \${failed}

\${failedTests.length > 0 ? \`## Failed Tests
\${failedTests.map(t => \`- \${t}\`).join('\\n')}
\` : ''}

## Next Steps
\${allPassed ? 'All tests passed! Ready for staging verification.' : 'Fix failing tests before proceeding to staging.'}
\`;

    const reportPath = join(outputDir, 'local-test-results.md');
    writeFileSync(reportPath, report);

    const result = {
      allPassed,
      passed,
      failed,
      failedTests,
      reportPath
    };

    writeFileSync(
      'tasks/${taskCtx.effectId}/output.json',
      JSON.stringify(result, null, 2)
    );

    console.log(\`Local tests: \${allPassed ? 'PASSED' : 'FAILED'}\`);
  `,
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const debugAndFixTestsTask = defineTask('debug-fix-tests', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Debug and Fix Failing Tests',
  agent: {
    name: 'test-debugger',
    prompt: {
      role: 'Test debugging specialist',
      task: 'Debug and fix failing tests',
      context: {
        projectPath: args.projectPath,
        failedTests: args.failedTests,
        testResults: args.testResults
      },
      instructions: [
        'For each failing test:',
        '  1. Read the test file',
        '  2. Run the test in isolation to see the exact error',
        '  3. Analyze the error message and stack trace',
        '  4. Identify the root cause (implementation bug, test bug, environment issue)',
        '  5. Fix the issue (either test or implementation)',
        '  6. Re-run the test to verify the fix',
        '  7. Document what was fixed',
        'Common issues to check:',
        '  - Async/await problems',
        '  - Mock misconfigurations',
        '  - Missing test setup/teardown',
        '  - Environment variables',
        '  - Import/dependency issues',
        '  - Timing/race conditions',
        'Track all fixes made',
        `Save debugging notes to ${args.outputDir}/test-debugging-notes.md`,
        'Return structured JSON with results'
      ],
      outputFormat: 'JSON with structure: { testsFixed: number, artifacts: array }'
    },
    outputSchema: {
      type: 'object',
      required: ['testsFixed'],
      properties: {
        testsFixed: { type: 'number' },
        artifacts: { type: 'array' }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const deployToStagingTask = defineTask('deploy-to-staging', (args, taskCtx) => ({
  kind: 'node',
  title: 'Deploy to Staging',
  script: `
    import { execSync } from 'child_process';
    import { writeFileSync } from 'fs';

    const projectPath = ${JSON.stringify(args.projectPath)};

    console.log('Deploying to Vercel staging...');

    try {
      // Use vercel CLI to deploy
      const deploymentUrl = execSync(
        'vercel deploy --token=$VERCEL_TOKEN',
        {
          cwd: projectPath,
          env: { ...process.env, VERCEL_TOKEN: process.env.VERCEL_TOKEN }
        }
      ).toString().trim();

      console.log(\`Deployed to: \${deploymentUrl}\`);

      const result = {
        deploymentUrl,
        timestamp: new Date().toISOString()
      };

      writeFileSync(
        'tasks/${taskCtx.effectId}/output.json',
        JSON.stringify(result, null, 2)
      );
    } catch (error) {
      console.error('Deployment failed:', error.message);
      throw error;
    }
  `,
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const runStagingTestsTask = defineTask('run-staging-tests', (args, taskCtx) => ({
  kind: 'node',
  title: 'Run E2E Tests on Staging',
  script: `
    import { execSync } from 'child_process';
    import { writeFileSync } from 'fs';
    import { join } from 'path';

    const projectPath = ${JSON.stringify(args.projectPath)};
    const stagingUrl = ${JSON.stringify(args.stagingUrl)};
    const outputDir = ${JSON.stringify(args.outputDir)};

    console.log(\`Running E2E tests on staging: \${stagingUrl}\`);

    let allPassed = true;
    let passed = 0;
    let failed = 0;
    let failedTests = [];

    try {
      execSync('npm run test:e2e:staging', {
        cwd: projectPath,
        stdio: 'inherit',
        env: { ...process.env, STAGING_URL: stagingUrl }
      });
      console.log('✅ Staging E2E tests passed');
      allPassed = true;
      passed = 1;
    } catch (error) {
      console.error('❌ Staging E2E tests failed');
      allPassed = false;
      failed = 1;
      failedTests.push('Staging E2E tests');
    }

    const report = \`# Staging Test Results

## Summary
- **Status**: \${allPassed ? '✅ ALL PASSED' : '❌ FAILURES DETECTED'}
- **Staging URL**: \${stagingUrl}
- **Passed**: \${passed}
- **Failed**: \${failed}

\${failedTests.length > 0 ? \`## Failed Tests
\${failedTests.map(t => \`- \${t}\`).join('\\n')}
\` : ''}
\`;

    const reportPath = join(outputDir, 'staging-test-results.md');
    writeFileSync(reportPath, report);

    const result = {
      allPassed,
      passed,
      failed,
      failedTests,
      reportPath,
      stagingUrl
    };

    writeFileSync(
      'tasks/${taskCtx.effectId}/output.json',
      JSON.stringify(result, null, 2)
    );

    console.log(\`Staging tests: \${allPassed ? 'PASSED' : 'FAILED'}\`);
  `,
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

const generateFinalReportTask = defineTask('generate-final-report', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Generate Final Report with Recommendations',
  agent: {
    name: 'final-report-generator',
    prompt: {
      role: 'Technical documentation specialist and QA strategist',
      task: 'Generate comprehensive final report with all results and recommendations',
      context: {
        projectPath: args.projectPath,
        ciAnalysis: args.ciAnalysis,
        testMapping: args.testMapping,
        mockAnalysis: args.mockAnalysis,
        coverageAnalysis: args.coverageAnalysis,
        gapIdentification: args.gapIdentification,
        gapFilling: args.gapFilling,
        localVerification: args.localVerification,
        stagingTests: args.stagingTests,
        targetCoverage: args.targetCoverage,
        outputDir: args.outputDir
      },
      instructions: [
        'Create a comprehensive final report that includes:',
        '  1. Executive Summary',
        '     - Overall outcome (success/partial/failed)',
        '     - Key metrics (coverage improvement, tests added, mocks fixed)',
        '     - Critical issues found and resolved',
        '  2. CI Pipeline Status',
        '     - Current pipeline configuration',
        '     - Quality gates in place',
        '     - Recommendations for improvement',
        '  3. Test Coverage Journey',
        '     - Initial coverage',
        '     - Final coverage',
        '     - Gaps filled',
        '     - Remaining gaps (if any)',
        '  4. Mock Analysis Results',
        '     - Mocks analyzed',
        '     - Mocks fixed/replaced',
        '     - Mocks removed',
        '     - Remaining justifiable mocks',
        '  5. Tests Added',
        '     - List of new tests with descriptions',
        '     - Coverage areas addressed',
        '  6. Verification Results',
        '     - Local test results',
        '     - Staging test results (if applicable)',
        '  7. Recommendations',
        '     - Immediate actions',
        '     - Short-term improvements',
        '     - Long-term quality strategy',
        '  8. Next Steps',
        '     - What to do next',
        '     - How to maintain quality',
        'Use clear formatting with tables, badges, and visualizations',
        'Highlight achievements and successes',
        'Be honest about remaining gaps or issues',
        `Save the final report to ${args.outputDir}/FINAL-CI-TEST-REVIEW-REPORT.md`,
        'Return the path to the report'
      ],
      outputFormat: 'JSON with structure: { reportPath: string, summary: object, recommendations: array }'
    },
    outputSchema: {
      type: 'object',
      required: ['reportPath'],
      properties: {
        reportPath: { type: 'string' },
        summary: { type: 'object' },
        recommendations: { type: 'array' }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));
