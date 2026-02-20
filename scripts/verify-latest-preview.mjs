#!/usr/bin/env node
import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getLatestPreviewUrl() {
  try {
    // Use GitHub API to get latest deployment
    const response = execSync(
      'gh api repos/asamarom/duty-app/deployments --jq \'.[0].payload.web_url\' 2>/dev/null || echo ""',
      { encoding: 'utf-8' }
    ).trim();

    if (response && response.startsWith('http')) {
      return response;
    }
  } catch (e) {
    // Fallback: try to parse from git commit
  }

  // Fallback to manual URL if automated detection fails
  return null;
}

async function verifyPreview(baseUrl) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('requestfailed', request => {
    errors.push(`${request.url()} - ${request.failure()?.errorText}`);
  });

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Verifying Latest Preview Deployment                 ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log(`Testing URL: ${baseUrl}\n`);

  try {
    // Load auth page
    console.log('1️⃣  Loading auth page...');
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasTestMode = await page.locator('text=/TEST MODE/i').count() > 0;
    const hasTestUserSelect = await page.locator('[data-testid="test-user-select"]').count() > 0;

    console.log(`   ${hasTestMode ? '✅' : '❌'} TEST MODE section: ${hasTestMode ? 'Found' : 'NOT FOUND'}`);
    console.log(`   ${hasTestUserSelect ? '✅' : '❌'} Test user selector: ${hasTestUserSelect ? 'Found' : 'NOT FOUND'}\n`);

    if (!hasTestUserSelect) {
      console.log('❌ Cannot proceed without test user selector\n');
      await browser.close();
      return false;
    }

    // Login
    console.log('2️⃣  Testing login...');
    await page.locator('[data-testid="test-user-select"]').click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: /admin/i }).first().click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /sign in as test user/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    const loggedIn = !currentUrl.includes('/auth') && !currentUrl.includes('/signup-request');
    console.log(`   ${loggedIn ? '✅' : '❌'} Login: ${loggedIn ? 'Success' : 'Failed'}`);
    console.log(`   Current URL: ${currentUrl}\n`);

    if (!loggedIn) {
      await page.screenshot({ path: join(__dirname, 'failed-login.png'), fullPage: true });
      console.log('   📸 Screenshot saved: scripts/failed-login.png\n');
      await browser.close();
      return false;
    }

    // Test equipment page
    console.log('3️⃣  Testing equipment page...');
    await page.goto(baseUrl + '/equipment');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Check for database errors
    const hasNewlineError = errors.some(err => err.includes('%0A'));
    console.log(`   ${hasNewlineError ? '❌' : '✅'} Database config: ${hasNewlineError ? 'Has newline error' : 'Correct'}`);

    const hasTable = await page.locator('[role="table"]').count() > 0;
    const hasEmptyState = await page.locator('text=/אין ציוד|No equipment/i').count() > 0;
    const isLoading = await page.locator('text=/טוען|Loading/i').count() > 0;

    console.log(`   ${hasTable || hasEmptyState ? '✅' : '❌'} Page loaded: ${hasTable ? 'Has equipment table' : hasEmptyState ? 'Empty state shown' : 'Still loading'}`);
    console.log(`   ${isLoading ? '⚠️' : '✅'}  Loading state: ${isLoading ? 'Still loading' : 'Complete'}\n`);

    const htmlDir = await page.locator('html').getAttribute('dir');
    console.log(`   ${htmlDir === 'rtl' ? '✅' : '❌'} RTL: ${htmlDir === 'rtl' ? 'Correct' : 'Incorrect'}\n`);

    await page.screenshot({ path: join(__dirname, 'preview-equipment-page.png'), fullPage: true });
    console.log('   📸 Screenshot: scripts/preview-equipment-page.png\n');

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   Summary                                              ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const success = loggedIn && !hasNewlineError && (hasTable || hasEmptyState) && htmlDir === 'rtl';
    console.log(success ? '🎉 Preview deployment verified successfully!\n' : '⚠️  Issues detected. Check details above.\n');

    await browser.close();
    return success;

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    await browser.close();
    return false;
  }
}

// Main
const args = process.argv.slice(2);
let url = args[0];

if (!url) {
  console.log('Attempting to auto-detect latest preview URL...');
  url = await getLatestPreviewUrl();

  if (!url) {
    console.error('❌ Could not auto-detect preview URL.');
    console.error('Usage: node verify-latest-preview.mjs <preview-url>');
    process.exit(1);
  }
  console.log(`Found: ${url}\n`);
}

const success = await verifyPreview(url);
process.exit(success ? 0 : 1);
