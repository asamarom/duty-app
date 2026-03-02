/**
 * @process ui-bugs-fix
 * @description Fix UI bugs in duty-app settings and responsiveness
 * @inputs { projectPath: string, issues: string[] }
 * @outputs { success: boolean, summary: string }
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

/**
 * UI Bugs Fix Process
 *
 * Fixes multiple UI issues in the duty-app:
 * 1. Narrow screen responsiveness across different screens
 * 2. Settings screen duplicate version text and unwanted scrolling
 * 3. Settings screen showing "common.authenticated" instead of translated text
 * 4. Slim profile section - needs more profile information
 * 5. Units tab showing template placeholders instead of actual values
 * 6. Approvals tab showing template placeholder instead of actual count
 */
export async function process(inputs, ctx) {
  const { projectPath, issues } = inputs;

  ctx.log('Starting UI Bugs Fix Process');
  ctx.log(`Project: ${projectPath}`);
  ctx.log(`Issues to fix: ${issues.length}`);

  // ============================================================================
  // PHASE 1: Analysis and Investigation
  // ============================================================================

  ctx.log('\n=== PHASE 1: Analyze Issues ===');

  const analysisTask = defineTask('analyze-issues', (args) => ({
    kind: 'agent',
    title: 'Analyze UI issues and root causes',
    agent: {
      name: 'general-purpose',
      prompt: {
        role: 'UI/UX debugging specialist',
        task: 'Analyze the reported UI bugs and identify root causes',
        context: {
          issues,
          files: [
            'src/pages/SettingsPage.tsx',
            'src/components/settings/SettingsTabs.tsx',
            'src/components/settings/ProfileTab.tsx',
            'src/components/settings/UnitsTab.tsx',
            'src/components/settings/ApprovalsTab.tsx',
            'src/i18n/translations.ts',
          ],
        },
        instructions: [
          'Read all the relevant files mentioned in context',
          'For issue about "common.authenticated": Check how translations are used - the Badge shows literal text',
          'For issues about template placeholders: Check the translation function calls - they use template syntax like {battalions}, {companies}, {count}',
          'For duplicate version: Identify why version appears twice and why there is unwanted scrolling',
          'For slim profile: Review ProfileTab.tsx and suggest additional profile fields',
          'For responsiveness: Check responsive CSS classes and identify screens needing better narrow screen support',
          'Provide a structured analysis with specific file locations and line numbers for each issue',
        ],
        outputFormat: 'JSON',
      },
      outputSchema: {
        type: 'object',
        required: ['analysis', 'rootCauses', 'fixStrategy'],
        properties: {
          analysis: {
            type: 'object',
            description: 'Detailed analysis of each issue',
          },
          rootCauses: {
            type: 'array',
            items: { type: 'string' },
          },
          fixStrategy: {
            type: 'object',
            description: 'Strategy for fixing each issue',
          },
        },
      },
    },
  }));

  const analysisResult = await ctx.task(analysisTask, {});
  ctx.log('Analysis completed');
  ctx.log(`Root causes identified: ${analysisResult.rootCauses.length}`);

  // Breakpoint: Review analysis
  const analysisApproval = await ctx.breakpoint('review-analysis', {
    question: 'Review the analysis of UI bugs. Does the analysis correctly identify the root causes?',
    context: {
      analysis: analysisResult.analysis,
      rootCauses: analysisResult.rootCauses,
      fixStrategy: analysisResult.fixStrategy,
    },
  });

  if (!analysisApproval.approved) {
    throw new Error('Analysis not approved. Please restart the process with more context.');
  }

  // ============================================================================
  // PHASE 2: Fix Translation Issues (Issues #3, #5, #6)
  // ============================================================================

  ctx.log('\n=== PHASE 2: Fix Translation Issues ===');

  const translationFixTask = defineTask('fix-translation-issues', (args) => ({
    kind: 'agent',
    title: 'Fix translation template rendering issues',
    agent: {
      name: 'general-purpose',
      prompt: {
        role: 'React TypeScript developer',
        task: 'Fix translation issues in Settings components',
        context: {
          analysis: analysisResult.analysis,
          issues: [
            'ProfileTab.tsx line 33: Badge shows "common.authenticated" literal text instead of translated value',
            'UnitsTab.tsx lines 64-68: Translation function t() is being called with template syntax but values are not being interpolated correctly',
            'ApprovalsTab.tsx line 117: Translation function t() with {count} placeholder not being interpolated',
          ],
          translationContext: {
            note: 'The useLanguage() hook provides a t() function that accepts a key and optional params object for interpolation',
            example: 't("settings.unitStats", { battalions: "5", companies: "10", platoons: "15" })',
          },
        },
        instructions: [
          'Read the relevant component files',
          'Understand how the t() translation function works in the codebase',
          'Fix ProfileTab.tsx: Change to properly translate the text - the badge should show the translation value, not the key',
          'Fix UnitsTab.tsx: The t() call on lines 64-68 needs to pass parameters correctly for template interpolation',
          'Fix ApprovalsTab.tsx: The t() call on line 117 needs to pass the count parameter correctly',
          'Ensure all changes maintain type safety and existing functionality',
          'Make the necessary edits using the Edit tool',
        ],
        outputFormat: 'Summary of changes made',
      },
    },
  }));

  const translationFixResult = await ctx.task(translationFixTask, {});
  ctx.log('Translation issues fixed');

  // ============================================================================
  // PHASE 3: Fix Duplicate Version and Scrolling (Issue #2)
  // ============================================================================

  ctx.log('\n=== PHASE 3: Fix Version Display and Scrolling ===');

  const versionFixTask = defineTask('fix-version-scrolling', (args) => ({
    kind: 'agent',
    title: 'Fix duplicate version text and unwanted scrolling',
    agent: {
      name: 'general-purpose',
      prompt: {
        role: 'React TypeScript developer',
        task: 'Fix duplicate version display and scrolling issues in Settings page',
        context: {
          analysis: analysisResult.analysis,
          issue: 'SettingsPage.tsx shows version at line 46-50, and ProfileTab.tsx also shows version at lines 105-114, causing duplication',
        },
        instructions: [
          'Read SettingsPage.tsx and ProfileTab.tsx',
          'Remove the duplicate version display - keep it only in one place (preferably in ProfileTab as a card)',
          'Check for any CSS issues causing unwanted scrolling with no content',
          'Ensure the page layout is clean and doesnt create unnecessary scroll areas',
          'Make the necessary edits using the Edit tool',
        ],
        outputFormat: 'Summary of changes made',
      },
    },
  }));

  const versionFixResult = await ctx.task(versionFixTask, {});
  ctx.log('Version and scrolling issues fixed');

  // ============================================================================
  // PHASE 4: Enhance Profile Section (Issue #4)
  // ============================================================================

  ctx.log('\n=== PHASE 4: Enhance Profile Section ===');

  const profileEnhanceTask = defineTask('enhance-profile-section', (args) => ({
    kind: 'agent',
    title: 'Enhance profile section with more information',
    agent: {
      name: 'general-purpose',
      prompt: {
        role: 'React TypeScript developer with UX focus',
        task: 'Enhance the profile section with additional useful information',
        context: {
          analysis: analysisResult.analysis,
          currentFields: ['User email', 'Admin mode toggle (for admins)', 'Language selector', 'Version info'],
          suggestions: [
            'Add user role/permissions display',
            'Add unit assignment information',
            'Add last login timestamp',
            'Add account creation date',
            'Make better use of card space with improved layout',
          ],
        },
        instructions: [
          'Read ProfileTab.tsx and understand the current layout',
          'Check what user information is available from useAuth() and useEffectiveRole() hooks',
          'Add 2-3 additional relevant profile fields that would be useful for military personnel',
          'Ensure the additions fit well with the existing tactical/military theme',
          'Maintain responsive design for narrow screens',
          'Update relevant translation keys if needed in translations.ts',
          'Make the necessary edits using the Edit tool',
        ],
        outputFormat: 'Summary of changes made',
      },
    },
  }));

  const profileEnhanceResult = await ctx.task(profileEnhanceTask, {});
  ctx.log('Profile section enhanced');

  // ============================================================================
  // PHASE 5: Fix Responsive Design (Issue #1)
  // ============================================================================

  ctx.log('\n=== PHASE 5: Fix Responsive Design ===');

  const responsiveFixTask = defineTask('fix-responsive-design', (args) => ({
    kind: 'agent',
    title: 'Fix narrow screen responsiveness across screens',
    agent: {
      name: 'general-purpose',
      prompt: {
        role: 'Frontend developer specializing in responsive design',
        task: 'Improve responsive design for narrow screens across the application',
        context: {
          analysis: analysisResult.analysis,
          areas: [
            'Settings page and tabs',
            'Profile cards',
            'Units management cards',
            'Approvals cards',
          ],
        },
        instructions: [
          'Read the Settings components and identify responsive design issues',
          'Check for hardcoded widths, oversized padding/margins on mobile',
          'Ensure text truncation and wrapping work well on narrow screens',
          'Check that cards stack properly and dont overflow',
          'Ensure touch targets are appropriately sized for mobile',
          'Use Tailwind responsive classes (sm:, md:, lg:) appropriately',
          'Test specific issues: long email addresses, unit names, badge text',
          'Make the necessary edits using the Edit tool',
        ],
        outputFormat: 'Summary of changes made',
      },
    },
  }));

  const responsiveFixResult = await ctx.task(responsiveFixTask, {});
  ctx.log('Responsive design issues fixed');

  // ============================================================================
  // PHASE 6: Manual Verification
  // ============================================================================

  ctx.log('\n=== PHASE 6: Manual Verification ===');

  const verificationResult = await ctx.breakpoint('manual-verification', {
    question: 'Please manually test the fixes in the browser. Check all 6 issues have been resolved.',
    context: {
      testChecklist: [
        '1. Test on narrow screen (320px-640px width) - all screens should be responsive',
        '2. Settings page - no duplicate version text, no unwanted scrolling',
        '3. Settings profile - "Authenticated" badge shows translated text, not "common.authenticated"',
        '4. Settings profile - shows additional useful profile information',
        '5. Units tab - shows actual numbers instead of {battalions}, {companies}, {platoons}',
        '6. Approvals tab - shows actual count instead of {count}',
      ],
      instructions: [
        'Run: npm run dev',
        'Navigate to Settings page',
        'Switch between tabs',
        'Resize browser to narrow width',
        'Check all translations are working',
      ],
    },
  });

  // ============================================================================
  // PHASE 7: Fix Remaining Issues (if needed)
  // ============================================================================

  if (!verificationResult.approved) {
    ctx.log('\n=== PHASE 7: Fix Remaining Issues ===');

    const remainingFixTask = defineTask('fix-remaining-issues', (args) => ({
      kind: 'agent',
      title: 'Fix any remaining issues found during verification',
      agent: {
        name: 'general-purpose',
        prompt: {
          role: 'React TypeScript developer',
          task: 'Fix remaining issues identified during manual testing',
          context: {
            feedback: verificationResult.feedback || 'Issues found during testing',
          },
          instructions: [
            'Address the specific issues mentioned in the verification feedback',
            'Make necessary corrections',
            'Ensure all 6 original issues are fully resolved',
          ],
          outputFormat: 'Summary of fixes applied',
        },
      },
    }));

    const remainingFixResult = await ctx.task(remainingFixTask, {});
    ctx.log('Remaining issues fixed');

    // Re-verification
    const reVerification = await ctx.breakpoint('re-verification', {
      question: 'Please re-test all fixes. Are all issues now resolved?',
      context: {
        note: 'This is the final verification. All 6 issues should be completely fixed.',
      },
    });

    if (!reVerification.approved) {
      throw new Error('Issues still remain after fixes. Please review manually and restart if needed.');
    }
  }

  // ============================================================================
  // PHASE 8: Final Summary
  // ============================================================================

  ctx.log('\n=== PHASE 8: Generate Final Summary ===');

  const summaryTask = defineTask('generate-summary', (args) => ({
    kind: 'agent',
    title: 'Generate final summary of all fixes',
    agent: {
      name: 'general-purpose',
      prompt: {
        role: 'Technical writer',
        task: 'Generate a comprehensive summary of all UI bug fixes',
        context: {
          originalIssues: issues,
        },
        instructions: [
          'Review all task results from this process',
          'Create a summary of what was fixed',
          'List all files that were modified',
          'Provide before/after descriptions for each fix',
          'Include testing notes',
        ],
        outputFormat: 'Markdown formatted summary',
      },
    },
  }));

  const summaryResult = await ctx.task(summaryTask, {});
  ctx.log('Summary generated');

  return {
    success: true,
    summary: summaryResult,
    message: 'All UI bugs have been successfully fixed',
  };
}
