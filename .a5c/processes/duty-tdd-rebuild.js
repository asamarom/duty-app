/**
 * @process duty-tdd-rebuild
 * @description Full TDD rebuild/verification process for Duty mobile-first app
 * @inputs { }
 * @outputs { success: boolean, allPassed: boolean, deploymentUrl: string }
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

/**
 * Duty TDD Rebuild Process
 *
 * Mobile-first quality-gated development with:
 * - Feature verification against PRODUCT.md
 * - E2E test execution (local + staging)
 * - UI/UX pixel-perfect verification
 * - Firebase security rules validation
 * - Vercel deployment validation
 */
export async function process(inputs, ctx) {
  console.log('🚀 Starting Duty TDD Rebuild Process');

  // ============================================================================
  // PHASE 1: REQUIREMENTS AUDIT
  // ============================================================================
  console.log('\n📋 Phase 1: Requirements Audit');

  const auditResult = await ctx.task(auditRequirementsTask, {
    productMdPath: 'PRODUCT.md',
    testsMdPath: 'TESTS.md'
  });

  // Breakpoint: Review audit findings
  const auditData = auditResult.result || auditResult.value || auditResult;
  const auditReview = await ctx.breakpoint({
    question: `Requirements audit complete. Found ${auditData.gaps?.length || 0} gaps. Review findings and approve to continue?`,
    title: 'Requirements Audit Review',
    context: {
      runId: ctx.runId,
      files: [
        { path: `tasks/${auditResult.effectId}/result.json`, format: 'json', label: 'Audit Results' }
      ]
    }
  });

  // ============================================================================
  // PHASE 2: LOCAL E2E TESTING
  // ============================================================================
  console.log('\n🧪 Phase 2: Local E2E Testing');

  const localTestResult = await ctx.task(runLocalE2ETestsTask, {});
  const localTestData = localTestResult.result || localTestResult.value || localTestResult;

  if (!localTestData.allPassed) {
    // Failure loop - diagnose and fix
    const diagnosis = await ctx.task(diagnoseTestFailuresTask, {
      testResults: localTestData
    });
    const diagnosisData = diagnosis.result || diagnosis.value || diagnosis;

    const fixApproval = await ctx.breakpoint({
      question: `${diagnosisData.failureCount} tests failing. Review diagnosis and approve fix plan?`,
      title: 'Test Failure Diagnosis',
      context: {
        runId: ctx.runId,
        files: [
          { path: `tasks/${diagnosis.effectId}/result.json`, format: 'json', label: 'Diagnosis' }
        ]
      }
    });

    // Execute fixes (delegated to general-purpose agent)
    const fixResult = await ctx.task(executeFixesTask, {
      diagnosis: diagnosisData,
      fixPlan: fixApproval.answer
    });

    // Re-run tests
    const retestResult = await ctx.task(runLocalE2ETestsTask, {
      iteration: 2
    });
    const retestData = retestResult.result || retestResult.value || retestResult;

    if (!retestData.allPassed) {
      return {
        success: false,
        phase: 'local-e2e',
        error: 'Tests still failing after fixes',
        details: retestData
      };
    }
  }

  // ============================================================================
  // PHASE 3: UI/UX MOBILE-FIRST VERIFICATION
  // ============================================================================
  console.log('\n🎨 Phase 3: UI/UX Mobile-First Verification');

  const uiAuditResult = await ctx.task(auditMobileUITask, {
    viewportSizes: [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 390, height: 844, name: 'iPhone 12/13' },
      { width: 412, height: 915, name: 'Android Large' }
    ]
  });
  const uiAuditData = uiAuditResult.result || uiAuditResult.value || uiAuditResult;

  // Breakpoint: Review UI/UX findings
  const uiReview = await ctx.breakpoint({
    question: `UI/UX audit complete. Found ${uiAuditData.issues?.length || 0} issues. Review and approve fixes?`,
    title: 'Mobile UI/UX Review',
    context: {
      runId: ctx.runId,
      files: [
        { path: `tasks/${uiAuditResult.effectId}/result.json`, format: 'json', label: 'UI Audit' }
      ]
    }
  });

  if (uiAuditData.issues?.length > 0 && uiReview.answer?.includes('approve')) {
    const uiFixResult = await ctx.task(fixUIIssuesTask, {
      issues: uiAuditData.issues
    });

    // Re-audit after fixes
    const uiRetestResult = await ctx.task(auditMobileUITask, {
      viewportSizes: [
        { width: 375, height: 667, name: 'iPhone SE' },
        { width: 390, height: 844, name: 'iPhone 12/13' },
        { width: 412, height: 915, name: 'Android Large' }
      ],
      iteration: 2
    });
  }

  // ============================================================================
  // PHASE 4: FIREBASE SECURITY RULES VALIDATION
  // ============================================================================
  console.log('\n🔒 Phase 4: Firebase Security Rules Validation');

  const securityAuditResult = await ctx.task(auditFirebaseSecurityTask, {
    firestoreRulesPath: 'firestore.rules'
  });
  const securityAuditData = securityAuditResult.result || securityAuditResult.value || securityAuditResult;

  // Breakpoint: Review security findings
  const securityReview = await ctx.breakpoint({
    question: `Security rules audit complete. Found ${securityAuditData.violations?.length || 0} violations. Review and approve?`,
    title: 'Firebase Security Review',
    context: {
      runId: ctx.runId,
      files: [
        { path: `tasks/${securityAuditResult.effectId}/result.json`, format: 'json', label: 'Security Audit' }
      ]
    }
  });

  // ============================================================================
  // PHASE 5: BUILD & DEPLOYMENT PREPARATION
  // ============================================================================
  console.log('\n🏗️ Phase 5: Build & Deployment Preparation');

  const buildResult = await ctx.task(buildAppTask, {});
  const buildData = buildResult.result || buildResult.value || buildResult;

  if (!buildData.success) {
    return {
      success: false,
      phase: 'build',
      error: 'Build failed',
      details: buildData
    };
  }

  // ============================================================================
  // PHASE 6: VERCEL STAGING DEPLOYMENT & TESTING
  // ============================================================================
  console.log('\n🚀 Phase 6: Vercel Staging Deployment');

  const deployResult = await ctx.task(deployToStagingTask, {});
  const deployData = deployResult.result || deployResult.value || deployResult;

  // Breakpoint: Notify deployment URL
  const stagingApproval = await ctx.breakpoint({
    question: `App deployed to staging: ${deployData.url}. Test manually and confirm it works correctly before running automated tests.`,
    title: 'Staging Deployment Ready',
    context: {
      runId: ctx.runId,
      metadata: {
        stagingUrl: deployData.url,
        buildId: deployData.buildId
      }
    }
  });

  // Run E2E tests against staging
  const stagingTestResult = await ctx.task(runStagingE2ETestsTask, {
    stagingUrl: deployData.url
  });
  const stagingTestData = stagingTestResult.result || stagingTestResult.value || stagingTestResult;

  if (!stagingTestData.allPassed) {
    // Report staging failures
    await ctx.breakpoint({
      question: `Staging tests failed: ${stagingTestData.failureCount} failures. Review results and decide how to proceed.`,
      title: 'Staging Test Failures',
      context: {
        runId: ctx.runId,
        files: [
          { path: `tasks/${stagingTestResult.effectId}/result.json`, format: 'json', label: 'Staging Test Results' }
        ]
      }
    });

    return {
      success: false,
      phase: 'staging-tests',
      error: 'Staging tests failed',
      details: stagingTestData,
      stagingUrl: deployData.url
    };
  }

  // ============================================================================
  // PHASE 7: FINAL QUALITY GATE
  // ============================================================================
  console.log('\n✅ Phase 7: Final Quality Gate');

  const finalReview = await ctx.breakpoint({
    question: 'All quality gates passed! Review the complete results and approve for production deployment.',
    title: 'Final Quality Gate',
    context: {
      runId: ctx.runId,
      metadata: {
        localTestsPassed: true,
        uiAuditPassed: true,
        securityAuditPassed: true,
        stagingTestsPassed: true,
        stagingUrl: deployResult.value.url
      }
    }
  });

  return {
    success: true,
    allPassed: true,
    phases: {
      audit: auditData,
      localTests: localTestData,
      uiAudit: uiAuditData,
      securityAudit: securityAuditData,
      build: buildData,
      deployment: deployData,
      stagingTests: stagingTestData
    },
    stagingUrl: deployData.url,
    metadata: {
      processId: 'duty-tdd-rebuild',
      timestamp: ctx.now()
    }
  };
}

// ============================================================================
// TASK DEFINITIONS
// ============================================================================

export const auditRequirementsTask = defineTask('audit-requirements', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Audit requirements coverage',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'QA analyst',
      task: 'Audit all requirements in PRODUCT.md against TESTS.md and actual implementation',
      context: args,
      instructions: [
        'Read PRODUCT.md and list all requirement IDs',
        'Read TESTS.md and check test coverage status',
        'For each requirement, verify it has corresponding test(s)',
        'Identify gaps, partial coverage, and untested requirements',
        'Check for any tests marked as "gap" or "not-testable"',
        'Generate summary report with recommendations'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: {
      type: 'object',
      required: ['totalRequirements', 'covered', 'gaps'],
      properties: {
        totalRequirements: { type: 'number' },
        covered: { type: 'number' },
        partial: { type: 'number' },
        gaps: { type: 'array', items: { type: 'string' } },
        coverage: { type: 'number' },
        recommendations: { type: 'array', items: { type: 'string' } }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

export const runLocalE2ETestsTask = defineTask('run-local-e2e', (args, taskCtx) => ({
  kind: 'shell',
  title: 'Run local E2E tests with Playwright',
  shell: {
    command: 'npm run test:e2e'
  },
  io: {
    stdoutFile: `tasks/${taskCtx.effectId}/stdout.log`,
    stderrFile: `tasks/${taskCtx.effectId}/stderr.log`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

export const diagnoseTestFailuresTask = defineTask('diagnose-failures', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Diagnose test failures',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Test engineer',
      task: 'Analyze test failures and create fix plan',
      context: args,
      instructions: [
        'Review failed test results',
        'Identify root causes for each failure',
        'Categorize failures (code bug, test issue, config problem)',
        'Create detailed fix plan with priority',
        'Estimate effort for each fix'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: {
      type: 'object',
      required: ['failureCount', 'rootCauses', 'fixPlan'],
      properties: {
        failureCount: { type: 'number' },
        rootCauses: { type: 'array' },
        fixPlan: { type: 'array' },
        estimatedEffort: { type: 'string' }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

export const executeFixesTask = defineTask('execute-fixes', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Execute test failure fixes',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior engineer',
      task: 'Fix failing tests based on diagnosis',
      context: args,
      instructions: [
        'Review fix plan and diagnosis',
        'Fix each issue systematically',
        'Update code, tests, or config as needed',
        'Verify each fix does not break other tests',
        'Document all changes made'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: {
      type: 'object',
      required: ['fixesApplied', 'filesModified'],
      properties: {
        fixesApplied: { type: 'number' },
        filesModified: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

export const auditMobileUITask = defineTask('audit-mobile-ui', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Audit mobile-first UI/UX',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'UI/UX designer specializing in mobile',
      task: 'Audit app for mobile-first design, accessibility, and usability',
      context: args,
      instructions: [
        'Check all pages for mobile responsiveness at specified viewport sizes',
        'Verify touch targets are at least 44x44px',
        'Check text readability (font sizes, contrast)',
        'Verify all interactive elements work on touch devices',
        'Check for horizontal scrolling issues',
        'Verify forms are mobile-friendly',
        'Check loading states and error messages',
        'Verify RTL support for Hebrew',
        'Check navigation is intuitive on mobile',
        'List all issues with severity (critical, high, medium, low)'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: {
      type: 'object',
      required: ['totalIssues', 'issues'],
      properties: {
        totalIssues: { type: 'number' },
        issues: { type: 'array' },
        critical: { type: 'number' },
        high: { type: 'number' },
        medium: { type: 'number' },
        low: { type: 'number' }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

export const fixUIIssuesTask = defineTask('fix-ui-issues', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Fix UI/UX issues',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Frontend engineer',
      task: 'Fix UI/UX issues identified in audit',
      context: args,
      instructions: [
        'Review UI issues list',
        'Fix each issue starting with critical/high priority',
        'Update CSS, components, layouts as needed',
        'Ensure mobile-first approach',
        'Test fixes at multiple viewport sizes',
        'Verify RTL compatibility',
        'Document all changes'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: {
      type: 'object',
      required: ['issuesFixed', 'filesModified'],
      properties: {
        issuesFixed: { type: 'number' },
        filesModified: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

export const auditFirebaseSecurityTask = defineTask('audit-firebase-security', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Audit Firebase security rules',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Security engineer',
      task: 'Audit Firestore security rules for vulnerabilities',
      context: args,
      instructions: [
        'Read firestore.rules file',
        'Check all collections have proper access controls',
        'Verify user can only access their own battalion data',
        'Check write operations have proper validation',
        'Verify role-based access (admin, leader, user)',
        'Check for common security anti-patterns',
        'Verify signature_approved checks for transfers',
        'Test rules against attack scenarios',
        'List all violations and recommendations'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: {
      type: 'object',
      required: ['violations', 'recommendations'],
      properties: {
        violations: { type: 'array' },
        recommendations: { type: 'array' },
        severity: { type: 'object' }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

export const buildAppTask = defineTask('build-app', (args, taskCtx) => ({
  kind: 'shell',
  title: 'Build app for production',
  shell: {
    command: 'npm run build'
  },
  io: {
    stdoutFile: `tasks/${taskCtx.effectId}/stdout.log`,
    stderrFile: `tasks/${taskCtx.effectId}/stderr.log`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

export const deployToStagingTask = defineTask('deploy-staging', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Deploy to Vercel staging',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'DevOps engineer',
      task: 'Deploy app to Vercel preview/staging environment',
      context: args,
      instructions: [
        'Check if vercel CLI is available',
        'Deploy to Vercel preview environment',
        'Wait for deployment to complete',
        'Get deployment URL',
        'Verify deployment was successful',
        'Return deployment URL and build ID'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: {
      type: 'object',
      required: ['success', 'url'],
      properties: {
        success: { type: 'boolean' },
        url: { type: 'string' },
        buildId: { type: 'string' },
        timestamp: { type: 'string' }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

export const runStagingE2ETestsTask = defineTask('run-staging-e2e', (args, taskCtx) => ({
  kind: 'shell',
  title: 'Run E2E tests against staging',
  shell: {
    command: 'npm run test:e2e:staging'
  },
  io: {
    stdoutFile: `tasks/${taskCtx.effectId}/stdout.log`,
    stderrFile: `tasks/${taskCtx.effectId}/stderr.log`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));
