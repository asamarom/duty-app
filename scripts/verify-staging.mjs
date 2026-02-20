import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function verifyStaging() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Check latest Vercel preview deployment
  // You can also pass URL as command line arg
  const baseUrl = process.argv[2] || 'https://duty-app-git-main-asas-projects-25ed4645.vercel.app';

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Verifying Staging Deployment                        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log(`Testing URL: ${baseUrl}\n`);

  try {
    // Step 1: Check if staging environment is configured
    console.log('1️⃣  Loading auth page...');
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for TEST MODE section
    const hasTestMode = await page.locator('text=/TEST MODE/i').count() > 0;
    console.log(`   ${hasTestMode ? '✅' : '❌'} TEST MODE section: ${hasTestMode ? 'Found' : 'NOT FOUND'}`);

    if (!hasTestMode) {
      console.log('\n⚠️  TEST MODE not found. This might mean:');
      console.log('   - Vercel env vars not set correctly');
      console.log('   - Using production config instead of staging');
      console.log('   - Need to trigger a new deployment\n');
    }

    // Check for test user selector
    const hasTestUserSelect = await page.locator('[data-testid="test-user-select"]').count() > 0;
    console.log(`   ${hasTestUserSelect ? '✅' : '❌'} Test user selector: ${hasTestUserSelect ? 'Found' : 'NOT FOUND'}\n`);

    if (!hasTestUserSelect && hasTestMode) {
      console.log('   ℹ️  Test mode detected but selector not found. Page might not be fully loaded.\n');
    }

    // Step 2: Check HTML direction
    console.log('2️⃣  Checking RTL configuration...');
    const htmlDir = await page.locator('html').getAttribute('dir');
    console.log(`   HTML dir attribute: ${htmlDir || 'null (default)'}`);
    console.log(`   ${htmlDir === 'rtl' ? '✅' : '⚠️'} RTL mode: ${htmlDir === 'rtl' ? 'Active' : 'Not active (might be in English mode)'}\n`);

    // Step 3: Take screenshot
    console.log('3️⃣  Taking screenshot...');
    await page.screenshot({ path: join(__dirname, 'staging-auth-page.png'), fullPage: true });
    console.log(`   ✅ Screenshot saved: scripts/staging-auth-page.png\n`);

    // Step 4: Try to login if test mode is available
    if (hasTestUserSelect) {
      console.log('4️⃣  Testing login with test user...');

      await page.locator('[data-testid="test-user-select"]').click();
      await page.waitForTimeout(300);

      const adminOption = page.getByRole('option', { name: /admin/i }).first();
      if (await adminOption.count() > 0) {
        await adminOption.click();
        await page.waitForTimeout(300);

        await page.getByRole('button', { name: /sign in as test user/i }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        const currentUrl = page.url();
        const loggedIn = !currentUrl.includes('/auth');
        console.log(`   ${loggedIn ? '✅' : '❌'} Login: ${loggedIn ? 'Success' : 'Failed'}`);
        console.log(`   Current URL: ${currentUrl}\n`);

        if (loggedIn) {
          // Navigate to equipment page
          console.log('5️⃣  Testing equipment page RTL...');
          await page.goto(baseUrl + '/equipment');
          await page.waitForLoadState('networkidle');

          // Wait for content to load (not just spinner)
          await page.waitForTimeout(3000);

          // Wait for either equipment list or empty state message
          try {
            await page.waitForSelector('[role="table"], [data-testid="empty-state"], text=/ציוד|Equipment/', { timeout: 10000 });
          } catch (e) {
            console.log('   ⚠️  Equipment page content may not have loaded');
          }

          const equipmentDir = await page.locator('html').getAttribute('dir');
          console.log(`   HTML dir: ${equipmentDir}`);
          console.log(`   ${equipmentDir === 'rtl' ? '✅' : '❌'} RTL: ${equipmentDir === 'rtl' ? 'Correct' : 'Incorrect'}\n`);

          await page.screenshot({ path: join(__dirname, 'staging-equipment-page.png'), fullPage: true });
          console.log(`   ✅ Screenshot saved: scripts/staging-equipment-page.png\n`);
        }
      }
    }

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   Verification Summary                                 ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log(`✅ Staging deployment accessible: ${baseUrl}`);
    console.log(`${hasTestMode ? '✅' : '❌'} Test mode enabled: ${hasTestMode}`);
    console.log(`${htmlDir === 'rtl' ? '✅' : '⚠️'} RTL configured: ${htmlDir === 'rtl'}\n`);

    if (hasTestMode && htmlDir === 'rtl') {
      console.log('🎉 Staging environment is correctly configured!\n');
    } else {
      console.log('⚠️  Some issues detected. Check the details above.\n');
    }

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  } finally {
    await browser.close();
  }
}

verifyStaging().catch(console.error);
