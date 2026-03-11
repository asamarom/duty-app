/**
 * @process fill-test-mocks
 * @description Systematically fill all relevant mocks in test files to improve test quality and maintainability
 */

import pkg from '@a5c-ai/babysitter-sdk';
const { defineTask } = pkg;

export async function process(inputs, ctx) {
  const { projectRoot = '/home/ubuntu/duty-app' } = inputs;

  // Task 1: Analyze existing test mocks
  const analysis = await ctx.task(analyzeTestMocksTask, { projectRoot });

  // Task 2: Fill incomplete mocks
  const mocksFilled = await ctx.task(fillIncompleteMocksTask, { analysis, projectRoot });

  // Task 3: Verify tests still pass
  const verification = await ctx.task(verifyTestsTask, { mocksFilled, projectRoot });

  // Task 4: Document mocking patterns
  const documentation = await ctx.task(documentMockingPatternsTask, {
    analysis,
    mocksFilled,
    verification,
    projectRoot
  });

  return {
    success: true,
    analysis,
    mocksFilled,
    verification,
    documentation,
    metadata: {
      processId: 'fill-test-mocks',
      timestamp: ctx.now()
    }
  };
}

export const analyzeTestMocksTask = defineTask('analyze-test-mocks', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Analyze existing test mocks',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Test Quality Engineer',
      task: 'Analyze all test files to identify incomplete or placeholder mocks that need to be filled',
      context: {
        projectRoot: args.projectRoot,
        testPatterns: ['**/__tests__/**/*.test.tsx', '**/__tests__/**/*.test.ts', '**/*.test.tsx', '**/*.test.ts'],
        mockPatterns: ['vi.fn()', 'jest.fn()', 'mock implementation']
      },
      instructions: [
        'Find all test files using glob patterns',
        'Read each test file and identify mock usage',
        'Classify mocks as: complete (with implementation), incomplete (empty vi.fn()), or placeholder',
        'Identify mocks that need realistic implementations based on usage in tests',
        'Look for patterns like: vi.fn() without mockReturnValue, vi.fn() without mockImplementation',
        'Check for inconsistent mocking patterns across similar tests',
        'Prioritize mocks that affect test reliability and coverage',
        'Return comprehensive analysis as JSON'
      ],
      outputFormat: 'JSON with incompleteMocks, mockPatterns, prioritizedFixes'
    },
    outputSchema: {
      type: 'object',
      required: ['incompleteMocks', 'totalTestFiles', 'mockPatterns'],
      properties: {
        totalTestFiles: { type: 'number' },
        incompleteMocks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              file: { type: 'string' },
              line: { type: 'number' },
              mockName: { type: 'string' },
              usage: { type: 'string' },
              priority: { type: 'string', enum: ['high', 'medium', 'low'] }
            }
          }
        },
        mockPatterns: { type: 'array', items: { type: 'string' } },
        prioritizedFixes: { type: 'array', items: { type: 'string' } }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

export const fillIncompleteMocksTask = defineTask('fill-incomplete-mocks', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Fill incomplete mocks with realistic implementations',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Test Implementation Engineer',
      task: 'Fill all incomplete mocks with realistic, type-safe implementations',
      context: {
        analysis: args.analysis,
        projectRoot: args.projectRoot,
        goal: 'Improve test quality and maintainability with complete mock implementations'
      },
      instructions: [
        'For each incomplete mock identified in the analysis:',
        '  1. Read the test file to understand the context and usage',
        '  2. Determine the expected behavior from test assertions',
        '  3. Create realistic mock implementations that match TypeScript types',
        '  4. Use mockReturnValue for simple values, mockImplementation for functions',
        '  5. Ensure mocks return appropriate types (Promises, objects, arrays, etc.)',
        '  6. Add mock implementations that cover all test scenarios',
        '  7. Use mockResolvedValue for async operations',
        '  8. Follow existing mocking patterns in the codebase',
        'Work through high-priority mocks first',
        'Group related mock fixes by test file for efficient commits',
        'Run tests after each file to ensure no regressions',
        'Commit each file separately with descriptive messages',
        'Return summary of all fixes applied'
      ],
      outputFormat: 'JSON with filesModified, mocksFixed, testsPass, commits'
    },
    outputSchema: {
      type: 'object',
      required: ['filesModified', 'mocksFixed', 'testsPass'],
      properties: {
        filesModified: { type: 'array', items: { type: 'string' } },
        mocksFixed: { type: 'number' },
        testsPass: { type: 'boolean' },
        commits: { type: 'array', items: { type: 'string' } },
        failedTests: { type: 'array', items: { type: 'string' } }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

export const verifyTestsTask = defineTask('verify-tests', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Verify all tests pass with filled mocks',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'QA Engineer',
      task: 'Run comprehensive test suite to verify all mocks work correctly',
      context: {
        mocksFilled: args.mocksFilled,
        projectRoot: args.projectRoot
      },
      instructions: [
        'Run full unit test suite: npm run test:run',
        'Verify all tests pass with no failures',
        'Check for any new warnings or console errors',
        'Run coverage report to ensure coverage is maintained or improved',
        'If any tests fail:',
        '  1. Investigate the failure',
        '  2. Fix the mock implementation',
        '  3. Re-run tests',
        '  4. Commit the fix',
        'Push all changes to main branch',
        'Track CI to ensure tests pass in CI environment',
        'Return verification results as JSON'
      ],
      outputFormat: 'JSON with allTestsPass, coverage, ciStatus, commitSha'
    },
    outputSchema: {
      type: 'object',
      required: ['allTestsPass', 'coverage'],
      properties: {
        allTestsPass: { type: 'boolean' },
        totalTests: { type: 'number' },
        passedTests: { type: 'number' },
        failedTests: { type: 'number' },
        coverage: { type: 'string' },
        ciStatus: { type: 'string' },
        commitSha: { type: 'string' }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

export const documentMockingPatternsTask = defineTask('document-mocking-patterns', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Document mocking patterns and best practices',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Technical Writer',
      task: 'Create documentation for test mocking patterns and best practices',
      context: {
        allResults: args,
        projectRoot: args.projectRoot
      },
      instructions: [
        'Create or update TESTING.md with mocking best practices',
        'Document common mocking patterns used in the codebase:',
        '  - Firebase Firestore mocking (onSnapshot, getDocs, etc.)',
        '  - React hook mocking (useContext, custom hooks)',
        '  - Component mocking',
        '  - Async operation mocking',
        'Provide examples of well-implemented mocks',
        'Include TypeScript typing patterns for mocks',
        'Document common pitfalls and how to avoid them',
        'Add section on when to use vi.fn() vs mockImplementation vs mockReturnValue',
        'Commit documentation with descriptive message',
        'Return summary as JSON'
      ],
      outputFormat: 'JSON with docsCreated, examplesProvided, commitSha'
    },
    outputSchema: {
      type: 'object',
      required: ['docsCreated'],
      properties: {
        docsCreated: { type: 'array', items: { type: 'string' } },
        examplesProvided: { type: 'number' },
        commitSha: { type: 'string' }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));
