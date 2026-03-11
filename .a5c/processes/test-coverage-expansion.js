/**
 * @process test-coverage-expansion
 * @description Systematic test coverage expansion to reach 85% target
 */

import { defineProcess, defineTask } from '@a5c-ai/babysitter-sdk';

export const process = defineProcess({
  id: 'test-coverage-expansion',
  title: 'Test Coverage Expansion to 85%',
  description: 'Systematically expand test coverage from 67.4% to 85% by adding tests for high-impact targets',

  tasks: [
    defineTask('useEquipment-tests', (args, taskCtx) => ({
      kind: 'agent',
      title: 'Add useEquipment hook tests (47% → 80%)',

      agent: {
        name: 'general-purpose',
        prompt: {
          role: 'Senior Test Engineer',
          task: 'Write comprehensive unit tests for useEquipment hook to reach 80%+ coverage, then commit and verify CI',
          context: {
            currentCoverage: '47.5%',
            targetCoverage: '80%+',
            uncoveredLines: '177-685, 706-707',
            hookLocation: 'src/hooks/useEquipment.tsx',
            currentOverallCoverage: '67.4%'
          },
          instructions: [
            'Read src/hooks/useEquipment.tsx to understand all functionality',
            'Check for existing useEquipment tests to avoid duplication',
            'Focus on uncovered lines 177-685 and 706-707',
            'Write tests for: equipment filtering (status, battalion, unit), transfer requests, quantity calculations, assignment logic',
            'Create or expand test file following existing test patterns (see src/hooks/__tests__/useUnits.test.tsx as reference)',
            'Run tests locally with npm test to verify they pass',
            'Run coverage report with npm test -- --coverage',
            'Create git commit with message describing coverage improvement',
            'Push to main branch',
            'Track CI with gh run list and wait for completion',
            'Verify unit tests pass in CI (E2E flakes are expected)',
            'Return coverage metrics and CI status'
          ],
          outputFormat: 'JSON with testsAdded, coverageAfter, ciPassed, commitSha'
        },
        outputSchema: {
          type: 'object',
          required: ['testsAdded', 'coverageAfter', 'ciPassed'],
          properties: {
            testsAdded: { type: 'number' },
            coverageAfter: { type: 'string' },
            ciPassed: { type: 'boolean' },
            commitSha: { type: 'string' }
          }
        }
      },

      io: {
        inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
        outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
      }
    })),

    defineTask('useUnitsManagement-tests', (args, taskCtx) => ({
      kind: 'agent',
      title: 'Complete useUnitsManagement hook tests (60% → 85%)',

      agent: {
        name: 'general-purpose',
        prompt: {
          role: 'Senior Test Engineer',
          task: 'Complete useUnitsManagement hook tests to reach 85%+ coverage, then commit and verify CI',
          context: {
            currentCoverage: '60%',
            targetCoverage: '85%+',
            uncoveredLines: '64-65, 78-79, 164-165, 170-179',
            hookLocation: 'src/hooks/useUnitsManagement.tsx',
            previousTask: args.previousResult
          },
          instructions: [
            'Read src/hooks/useUnitsManagement.tsx',
            'Check existing tests in src/hooks/__tests__/useUnitsManagement.test.tsx',
            'Add tests for uncovered CRUD operations and error handling',
            'Run tests locally to verify',
            'Run coverage report',
            'Commit and push',
            'Track and verify CI',
            'Return metrics'
          ],
          outputFormat: 'JSON'
        },
        outputSchema: {
          type: 'object',
          required: ['testsAdded', 'coverageAfter', 'ciPassed'],
          properties: {
            testsAdded: { type: 'number' },
            coverageAfter: { type: 'string' },
            ciPassed: { type: 'boolean' },
            commitSha: { type: 'string' }
          }
        }
      },

      io: {
        inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
        outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
      }
    })),

    defineTask('use-toast-tests', (args, taskCtx) => ({
      kind: 'agent',
      title: 'Add use-toast hook tests (33% → 75%)',

      agent: {
        name: 'general-purpose',
        prompt: {
          role: 'Senior Test Engineer',
          task: 'Write use-toast hook tests to reach 75%+ coverage, then commit and verify CI',
          context: {
            currentCoverage: '33.33%',
            targetCoverage: '75%+',
            hookLocation: 'src/hooks/use-toast.ts',
            previousTask: args.previousResult
          },
          instructions: [
            'Read src/hooks/use-toast.ts',
            'Write tests for toast creation, dismissal, variants, multiple toasts',
            'Create test file following project patterns',
            'Run tests and coverage',
            'Commit and push',
            'Verify CI',
            'Return metrics'
          ],
          outputFormat: 'JSON'
        },
        outputSchema: {
          type: 'object',
          required: ['testsAdded', 'coverageAfter', 'ciPassed'],
          properties: {
            testsAdded: { type: 'number' },
            coverageAfter: { type: 'string' },
            ciPassed: { type: 'boolean' },
            commitSha: { type: 'string' }
          }
        }
      },

      io: {
        inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
        outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
      }
    })),

    defineTask('check-coverage-target', (args, taskCtx) => ({
      kind: 'agent',
      title: 'Check if 85% target reached',

      agent: {
        name: 'general-purpose',
        prompt: {
          role: 'Senior Test Engineer',
          task: 'Check if 85% coverage target is reached, continue with more tests if needed',
          context: {
            target: '85%',
            previousTasks: [args.task1, args.task2, args.task3]
          },
          instructions: [
            'Run npm test -- --coverage to get current coverage',
            'Check if overall coverage >= 85%',
            'If < 85%, identify next targets (useUserBattalion, UI components, ApprovalManagement)',
            'If < 85%, write and commit additional tests until target is reached',
            'Keep adding tests systematically until 85% is achieved',
            'Return final status'
          ],
          outputFormat: 'JSON'
        },
        outputSchema: {
          type: 'object',
          required: ['targetReached', 'finalCoverage'],
          properties: {
            targetReached: { type: 'boolean' },
            finalCoverage: { type: 'string' },
            additionalTestsAdded: { type: 'number' }
          }
        }
      },

      io: {
        inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
        outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
      }
    })),

    defineTask('final-report', (args, taskCtx) => ({
      kind: 'agent',
      title: 'Generate final coverage report',

      agent: {
        name: 'general-purpose',
        prompt: {
          role: 'Senior Test Engineer',
          task: 'Create comprehensive final report documenting all coverage improvements to 85%',
          context: {
            allTasks: args
          },
          instructions: [
            'Review all tasks completed',
            'Run final coverage report',
            'Document all improvements per component',
            'List all test files created',
            'Count total tests added',
            'Create markdown report in ci-test-review-output/PHASE-3-COMPLETE.md',
            'Commit and push final report',
            'Return summary'
          ],
          outputFormat: 'JSON'
        },
        outputSchema: {
          type: 'object',
          required: ['finalCoverage', 'totalTestsAdded', 'reportPath'],
          properties: {
            finalCoverage: { type: 'string' },
            totalTestsAdded: { type: 'number' },
            reportPath: { type: 'string' }
          }
        }
      },

      io: {
        inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
        outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
      }
    }))
  ]
});
