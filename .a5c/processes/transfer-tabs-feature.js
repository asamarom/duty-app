/**
 * @process transfer-tabs-feature
 * @description TDD workflow for implementing transfer tabs with incoming/outgoing/history
 * @inputs { feature: string, requirements: array, targetQuality: number, maxIterations: number }
 * @outputs { success: boolean, iterations: number, finalQuality: number, approved: boolean }
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

/**
 * Transfer Tabs Feature Implementation Process
 *
 * Implements transfer tabs with:
 * - Incoming transfers (for signature_approved users and personal users)
 * - Outgoing transfers (for cancellation by sender only)
 * - History tab (completed transfers)
 *
 * Uses TDD approach with E2E quality gates.
 */
export async function process(inputs, ctx) {
  const {
    feature = 'Transfer Tabs with Incoming, Outgoing, and History',
    requirements = [],
    targetQuality = 90,
    maxIterations = 3
  } = inputs;

  ctx.log('Starting Transfer Tabs Feature Implementation');
  ctx.log(`Target Quality: ${targetQuality}, Max Iterations: ${maxIterations}`);

  // ============================================================================
  // PHASE 1: PLANNING AND REQUIREMENTS ANALYSIS
  // ============================================================================

  ctx.log('Phase 1: Planning and Requirements Analysis');

  const planningTask = defineTask('analyze-and-plan', (args, taskCtx) => ({
    kind: 'agent',
    title: 'Analyze codebase and create implementation plan',
    agent: {
      name: 'general-purpose',
      prompt: {
        role: 'Senior React/TypeScript developer with expertise in Firebase and TDD',
        task: 'Analyze the current transfer implementation and create a detailed plan for adding incoming/outgoing/history tabs',
        context: {
          feature: args.feature,
          requirements: args.requirements,
          currentFiles: [
            'src/components/equipment/TransfersList.tsx',
            'src/hooks/useAssignmentRequests.tsx',
            'e2e/transfers.spec.ts',
            'PRODUCT.md'
          ],
          methodology: 'Test-Driven Development (TDD)',
          notes: 'The app already has a transfers tab with incoming/history. We need to add an outgoing tab and implement proper permission checks.'
        },
        instructions: [
          'Read and analyze the current TransfersList.tsx component',
          'Read and analyze useAssignmentRequests hook to understand data structure',
          'Review existing E2E tests in e2e/transfers.spec.ts',
          'Check PRODUCT.md for transfer requirements [XFER-*]',
          'Identify what changes are needed for incoming/outgoing/history tabs',
          'Define test cases for each tab and permission scenario',
          'Create implementation steps following TDD approach',
          'Consider RTL layout requirements',
          'Output structured plan with test cases and implementation steps'
        ],
        outputFormat: 'JSON with plan, testCases, implementationSteps, and risks'
      },
      outputSchema: {
        type: 'object',
        required: ['approach', 'testCases', 'implementationSteps'],
        properties: {
          approach: { type: 'string' },
          testCases: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'description', 'scenario'],
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                scenario: { type: 'string' }
              }
            }
          },
          implementationSteps: {
            type: 'array',
            items: { type: 'string' }
          },
          dataChanges: {
            type: 'array',
            items: { type: 'string' }
          },
          risks: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    },
    io: {
      inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
      outputJsonPath: `tasks/${taskCtx.effectId}/plan.json`
    }
  }));

  const planResult = await ctx.task(planningTask, { feature, requirements });

  // Breakpoint: Review plan
  await ctx.breakpoint({
    question: 'Does this implementation plan look correct?',
    title: 'Review Implementation Plan',
    context: {
      runId: ctx.runId,
      plan: planResult
    },
    files: [
      `tasks/${planningTask.name}/plan.json`
    ]
  });

  const plan = planResult;

  // ============================================================================
  // PHASE 2: TDD IMPLEMENTATION LOOP
  // ============================================================================

  let iteration = 0;
  let qualityScore = 0;
  const iterationResults = [];

  while (iteration < maxIterations && qualityScore < targetQuality) {
    iteration++;
    ctx.log(`Phase 2: TDD Iteration ${iteration}/${maxIterations}`);

    // Step 1: Write/update tests
    const testTask = defineTask(`write-tests-${iteration}`, (args, taskCtx) => ({
      kind: 'agent',
      title: `Write E2E tests for iteration ${iteration}`,
      agent: {
        name: 'general-purpose',
        prompt: {
          role: 'QA Engineer and Playwright test expert',
          task: `Write Playwright E2E tests for transfer tabs feature (iteration ${iteration})`,
          context: {
            plan: args.plan,
            iteration: iteration,
            existingTests: 'e2e/transfers.spec.ts',
            testUsers: 'test-admin@e2e.local, test-leader@e2e.local, test-user@e2e.local',
            requirements: args.requirements
          },
          instructions: [
            'Read existing e2e/transfers.spec.ts to understand test patterns',
            'Read e2e/utils/test-auth.ts to understand login helpers',
            'Write new test cases for incoming/outgoing/history tabs',
            'Test permission scenarios (signature_approved for unit transfers)',
            'Test personal user can only accept to themselves',
            'Test outgoing cancellation permissions',
            'Test RTL layout compatibility',
            'Follow existing test patterns and naming conventions',
            'Add tests to e2e/transfers.spec.ts file'
          ],
          outputFormat: 'Summary of tests added'
        },
        outputSchema: {
          type: 'object',
          required: ['testsAdded', 'summary'],
          properties: {
            testsAdded: { type: 'number' },
            testFiles: {
              type: 'array',
              items: { type: 'string' }
            },
            summary: { type: 'string' }
          }
        }
      },
      io: {
        outputJsonPath: `tasks/${taskCtx.effectId}/test-result.json`
      }
    }));

    const testResult = await ctx.task(testTask, { plan, requirements });

    // Step 2: Run tests (expect failures initially)
    ctx.log('Running tests (expecting failures initially)...');
    try {
      await ctx.shell('npm run test:e2e -- --reporter=json > test-initial-output.json 2>&1 || true');
    } catch (err) {
      ctx.log('Tests failed as expected (Red phase)');
    }

    // Step 3: Implement code
    const implTask = defineTask(`implement-${iteration}`, (args, taskCtx) => ({
      kind: 'agent',
      title: `Implement transfer tabs (iteration ${iteration})`,
      agent: {
        name: 'general-purpose',
        prompt: {
          role: 'Senior React/TypeScript developer',
          task: `Implement transfer tabs feature to make tests pass (iteration ${iteration})`,
          context: {
            plan: args.plan,
            iteration: iteration,
            testResult: args.testResult,
            files: [
              'src/components/equipment/TransfersList.tsx',
              'src/hooks/useAssignmentRequests.tsx',
              'src/i18n/translations.ts'
            ]
          },
          instructions: [
            'Read current TransfersList.tsx implementation',
            'Read useAssignmentRequests hook to understand available data',
            'Add outgoing transfers filtering logic to the hook',
            'Update TransfersList.tsx to show three tabs: Incoming, Outgoing, History',
            'Implement permission checks for accepting transfers',
            'Implement cancel functionality for outgoing transfers',
            'Add translations for new UI elements',
            'Ensure RTL compatibility using logical CSS properties',
            'Follow existing code patterns and conventions',
            'Make sure all new tests pass'
          ],
          outputFormat: 'Summary of changes made'
        },
        outputSchema: {
          type: 'object',
          required: ['filesModified', 'summary'],
          properties: {
            filesModified: {
              type: 'array',
              items: { type: 'string' }
            },
            changesSummary: { type: 'string' },
            summary: { type: 'string' }
          }
        }
      },
      io: {
        outputJsonPath: `tasks/${taskCtx.effectId}/impl-result.json`
      }
    }));

    const implResult = await ctx.task(implTask, { plan, testResult, requirements });

    // Step 4: Run tests again (should pass now)
    let testsPassed = false;
    ctx.log('Running tests (expecting success now)...');
    try {
      await ctx.shell('npm run test:e2e -- --reporter=json > test-final-output.json 2>&1');
      testsPassed = true;
      ctx.log('✓ Tests passed! (Green phase)');
    } catch (err) {
      ctx.log(`Tests failed in iteration ${iteration}, will refine`);
    }

    // Step 5: Quality scoring
    const scoreTask = defineTask(`quality-score-${iteration}`, (args, taskCtx) => ({
      kind: 'agent',
      title: `Assess quality (iteration ${iteration})`,
      agent: {
        name: 'general-purpose',
        prompt: {
          role: 'Senior QA engineer and code reviewer',
          task: `Review implementation quality for iteration ${iteration}`,
          context: {
            iteration: iteration,
            testsPassed: args.testsPassed,
            implementation: args.implResult,
            files: [
              'src/components/equipment/TransfersList.tsx',
              'src/hooks/useAssignmentRequests.tsx',
              'e2e/transfers.spec.ts'
            ]
          },
          instructions: [
            'Read the modified files',
            'Check if all requirements are met',
            'Verify permission checks are correct',
            'Check RTL compatibility',
            'Review code quality and patterns',
            'Check if tests are comprehensive',
            'Score quality from 0-100 across multiple dimensions',
            'Provide actionable feedback for next iteration'
          ],
          outputFormat: 'JSON with quality score and feedback'
        },
        outputSchema: {
          type: 'object',
          required: ['overallScore', 'dimensions', 'feedback'],
          properties: {
            overallScore: { type: 'number', minimum: 0, maximum: 100 },
            dimensions: {
              type: 'object',
              properties: {
                functionality: { type: 'number' },
                codeQuality: { type: 'number' },
                testCoverage: { type: 'number' },
                rtlCompatibility: { type: 'number' },
                permissions: { type: 'number' }
              }
            },
            feedback: {
              type: 'array',
              items: { type: 'string' }
            },
            nextSteps: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      },
      io: {
        outputJsonPath: `tasks/${taskCtx.effectId}/quality-score.json`
      }
    }));

    const scoreResult = await ctx.task(scoreTask, { testsPassed, implResult });
    qualityScore = scoreResult.overallScore;

    const iterResult = {
      iteration,
      testResult,
      implResult,
      testsPassed,
      qualityScore,
      feedback: scoreResult.feedback
    };

    iterationResults.push(iterResult);

    ctx.log(`Iteration ${iteration} complete. Quality Score: ${qualityScore}/${targetQuality}`);

    // Breakpoint: Review iteration (if not final)
    if (iteration < maxIterations && qualityScore < targetQuality) {
      await ctx.breakpoint({
        question: `Quality score: ${qualityScore}/${targetQuality}. Continue to next iteration?`,
        title: `Review Iteration ${iteration} Results`,
        context: {
          runId: ctx.runId,
          iteration: iteration,
          qualityScore: qualityScore,
          feedback: scoreResult.feedback
        },
        files: [
          `tasks/quality-score-${iteration}/quality-score.json`
        ]
      });
    }
  }

  // ============================================================================
  // PHASE 3: FINAL VERIFICATION
  // ============================================================================

  ctx.log('Phase 3: Final Verification');

  // Run full E2E test suite
  ctx.log('Running full E2E test suite...');
  await ctx.shell('npm run test:e2e -- --reporter=html');

  // Type check
  ctx.log('Running TypeScript type checking...');
  try {
    await ctx.shell('npm run typecheck 2>&1');
  } catch (err) {
    ctx.log('Type checking had issues, continuing...');
  }

  // Lint check
  ctx.log('Running ESLint...');
  try {
    await ctx.shell('npm run lint 2>&1');
  } catch (err) {
    ctx.log('Linting had issues, continuing...');
  }

  // Final review
  const finalReviewTask = defineTask('final-review', (args, taskCtx) => ({
    kind: 'agent',
    title: 'Final implementation review',
    agent: {
      name: 'general-purpose',
      prompt: {
        role: 'Tech lead and senior architect',
        task: 'Perform final review of transfer tabs implementation',
        context: {
          feature: args.feature,
          iterations: args.iteration,
          finalQuality: args.qualityScore,
          targetQuality: args.targetQuality,
          iterationResults: args.iterationResults
        },
        instructions: [
          'Review all implementation changes',
          'Verify all requirements are met',
          'Check test coverage',
          'Verify RTL compatibility',
          'Review code quality',
          'Provide final verdict (approve/reject)',
          'List any remaining concerns'
        ],
        outputFormat: 'JSON with verdict and summary'
      },
      outputSchema: {
        type: 'object',
        required: ['verdict', 'summary'],
        properties: {
          verdict: { type: 'string', enum: ['approve', 'reject'] },
          summary: { type: 'string' },
          strengths: {
            type: 'array',
            items: { type: 'string' }
          },
          concerns: {
            type: 'array',
            items: { type: 'string' }
          },
          recommendations: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    },
    io: {
      outputJsonPath: `tasks/${taskCtx.effectId}/final-review.json`
    }
  }));

  const finalReview = await ctx.task(finalReviewTask, {
    feature,
    iteration,
    qualityScore,
    targetQuality,
    iterationResults
  });

  // Final approval breakpoint
  const approved = await ctx.breakpoint({
    question: `Implementation complete. Quality: ${qualityScore}/${targetQuality}. Approve for merge?`,
    title: 'Final Approval',
    context: {
      runId: ctx.runId,
      finalQuality: qualityScore,
      targetQuality: targetQuality,
      finalReview: finalReview
    },
    files: [
      `tasks/final-review/final-review.json`
    ]
  });

  // Return final result
  return {
    success: qualityScore >= targetQuality,
    feature: feature,
    iterations: iteration,
    finalQuality: qualityScore,
    targetQuality: targetQuality,
    converged: qualityScore >= targetQuality,
    approved: approved,
    iterationResults: iterationResults,
    finalReview: finalReview
  };
}
