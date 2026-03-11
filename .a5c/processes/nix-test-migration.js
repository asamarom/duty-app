/**
 * @process nix-test-migration
 * @description Migrate tests to run in Nix image for reproducible test environment
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

export async function process(inputs, ctx) {
  const { projectRoot = '/home/ubuntu/duty-app' } = inputs;

  // Task 1: Analyze current setup
  const analysis = await ctx.task(analyzeCurrentSetupTask, { projectRoot });

  // Task 2: Create Nix configuration
  const nixConfig = await ctx.task(createNixConfigTask, { analysis, projectRoot });

  // Task 3: Create test scripts
  const scripts = await ctx.task(createNixTestScriptsTask, { nixConfig, projectRoot });

  // Task 4: Update CI workflow
  const ciUpdate = await ctx.task(updateCIWorkflowTask, { scripts, projectRoot });

  // Task 5: Documentation
  const docs = await ctx.task(documentationTask, { analysis, nixConfig, scripts, ciUpdate, projectRoot });

  return {
    success: true,
    analysis,
    nixConfig,
    scripts,
    ciUpdate,
    docs,
    metadata: {
      processId: 'nix-test-migration',
      timestamp: ctx.now()
    }
  };
}

export const analyzeCurrentSetupTask = defineTask('analyze-current-setup', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Analyze current test setup and dependencies',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'DevOps Engineer',
      task: 'Analyze the current test setup to understand dependencies and requirements for Nix migration',
      context: {
        projectRoot: args.projectRoot,
        testTypes: ['vitest unit tests', 'playwright E2E tests'],
        currentSetup: 'Node.js with npm, Firebase emulators for unit tests, Playwright browsers for E2E'
      },
      instructions: [
        'Read package.json to understand test dependencies',
        'Check vitest.config.ts and playwright.config.ts for test configurations',
        'Identify all test-related dependencies: Node.js version, npm packages, browsers, Firebase emulators',
        'Document current test commands and their requirements',
        'List environment variables needed for tests',
        'Identify any system dependencies (e.g., browsers, Java for Firebase emulators)',
        'Return comprehensive analysis as JSON'
      ],
      outputFormat: 'JSON with nodejsVersion, testDependencies, systemDependencies, testCommands, envVars'
    },
    outputSchema: {
      type: 'object',
      required: ['nodejsVersion', 'testDependencies', 'systemDependencies'],
      properties: {
        nodejsVersion: { type: 'string' },
        testDependencies: { type: 'array', items: { type: 'string' } },
        systemDependencies: { type: 'array', items: { type: 'string' } },
        testCommands: { type: 'array', items: { type: 'string' } },
        envVars: { type: 'array', items: { type: 'string' } }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

export const createNixConfigTask = defineTask('create-nix-config', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Create Nix flake and development shell',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Nix Expert',
      task: 'Create Nix flake configuration for reproducible test environment',
      context: {
        analysis: args.analysis,
        projectRoot: args.projectRoot,
        goal: 'Reproducible test environment with all dependencies'
      },
      instructions: [
        'Create flake.nix with inputs (nixpkgs, flake-utils)',
        'Define devShell with all required dependencies: Node.js, npm, Playwright browsers, Firebase CLI',
        'Include system packages needed for tests (chromium, firefox, webkit for Playwright)',
        'Set up environment variables for test execution',
        'Add shell hooks to install npm dependencies and Playwright browsers on shell entry',
        'Create .envrc for direnv integration (optional)',
        'Test the flake builds successfully with nix flake check (if Nix is available)',
        'Commit the Nix configuration files',
        'Return configuration details as JSON'
      ],
      outputFormat: 'JSON with flakeCreated, devShellWorks, filesCreated'
    },
    outputSchema: {
      type: 'object',
      required: ['flakeCreated', 'filesCreated'],
      properties: {
        flakeCreated: { type: 'boolean' },
        devShellWorks: { type: 'boolean' },
        filesCreated: { type: 'array', items: { type: 'string' } },
        commitSha: { type: 'string' }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

export const createNixTestScriptsTask = defineTask('create-nix-test-scripts', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Create scripts to run tests in Nix environment',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'DevOps Engineer',
      task: 'Create wrapper scripts to run tests in Nix environment',
      context: {
        nixConfig: args.nixConfig,
        projectRoot: args.projectRoot
      },
      instructions: [
        'Create scripts/test-in-nix.sh for running unit tests in Nix shell',
        'Create scripts/test-e2e-in-nix.sh for running E2E tests in Nix shell',
        'Scripts should: enter nix develop, run tests, exit with test exit code',
        'Make scripts executable (chmod +x)',
        'Update package.json to add convenience npm scripts (test:nix, test:e2e:nix)',
        'Test that scripts work correctly (if Nix is available)',
        'Commit the scripts and package.json changes',
        'Return status as JSON'
      ],
      outputFormat: 'JSON with scriptsCreated, npmScriptsAdded, commitSha'
    },
    outputSchema: {
      type: 'object',
      required: ['scriptsCreated'],
      properties: {
        scriptsCreated: { type: 'array', items: { type: 'string' } },
        testsPass: { type: 'boolean' },
        npmScriptsAdded: { type: 'array', items: { type: 'string' } },
        commitSha: { type: 'string' }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

export const updateCIWorkflowTask = defineTask('update-ci-workflow', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Update GitHub Actions to use Nix',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'CI/CD Engineer',
      task: 'Update GitHub Actions workflow to run tests in Nix environment',
      context: {
        currentWorkflow: '.github/workflows/ci.yml',
        nixScripts: args.scripts,
        projectRoot: args.projectRoot
      },
      instructions: [
        'Read current .github/workflows/ci.yml',
        'Add Nix installation step using cachix/install-nix-action@v27',
        'Update test steps to use nix develop for running tests',
        'Ensure Nix store caching for faster CI runs',
        'Keep backward compatibility - workflow should still work without Nix if needed',
        'Commit workflow changes with descriptive message',
        'Push to main branch',
        'Track CI with gh run list and wait for completion',
        'Verify tests pass in CI',
        'Return status as JSON'
      ],
      outputFormat: 'JSON with workflowUpdated, ciPassed, commitSha'
    },
    outputSchema: {
      type: 'object',
      required: ['workflowUpdated'],
      properties: {
        workflowUpdated: { type: 'boolean' },
        ciPassed: { type: 'boolean' },
        commitSha: { type: 'string' }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));

export const documentationTask = defineTask('documentation', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Document Nix test setup',

  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Technical Writer',
      task: 'Create comprehensive documentation for the Nix test setup',
      context: {
        allResults: args,
        projectRoot: args.projectRoot
      },
      instructions: [
        'Create or update CONTRIBUTING.md with Nix setup instructions',
        'Document: installing Nix (with direnv optional), entering dev shell, running tests in Nix',
        'Add troubleshooting section for common issues',
        'Update README.md with Nix information and quick start',
        'Document benefits: reproducibility, consistent environments, isolated dependencies',
        'Provide examples of running tests locally and in CI',
        'Commit documentation with descriptive message',
        'Return summary as JSON'
      ],
      outputFormat: 'JSON with docsCreated, commitSha'
    },
    outputSchema: {
      type: 'object',
      required: ['docsCreated'],
      properties: {
        docsCreated: { type: 'array', items: { type: 'string' } },
        commitSha: { type: 'string' }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`
  }
}));
