import { chromium } from 'playwright';

async function debug() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  page.on('pageerror', error => {
    errors.push(`Page error: ${error.message}`);
  });
  
  page.on('requestfailed', request => {
    errors.push(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
  });
  
  const baseUrl = 'https://duty-g1l52odux-asas-projects-25ed4645.vercel.app';
  
  console.log('=== Testing new preview deployment ===');
  console.log('URL:', baseUrl);
  
  await page.goto(baseUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  await page.locator('[data-testid="test-user-select"]').click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: /admin/i }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /sign in as test user/i }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  console.log('✅ Logged in. URL:', page.url());
  
  await page.goto(baseUrl + '/equipment');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
  
  console.log('\n=== Checking for newline in database URL ===');
  const hasNewlineError = errors.some(err => err.includes('%0A'));
  console.log('Has newline in project ID:', hasNewlineError ? '❌ YES' : '✅ NO');
  
  if (hasNewlineError) {
    console.log('\nSample error:');
    console.log(errors.find(err => err.includes('%0A')));
  }
  
  const hasTable = await page.locator('[role="table"]').count() > 0;
  const hasEmptyState = await page.locator('text=/אין ציוד|No equipment/i').count() > 0;
  const isLoading = await page.locator('text=/טוען|Loading/i').count() > 0;
  
  console.log('\nPage state:');
  console.log('  Has table:', hasTable ? '✅' : '❌');
  console.log('  Has empty state:', hasEmptyState ? '✅' : '❌');
  console.log('  Still loading:', isLoading ? '⚠️  YES' : '✅ NO');
  
  await page.screenshot({ path: 'scripts/new-preview-equipment.png', fullPage: true });
  console.log('\n✅ Screenshot saved: scripts/new-preview-equipment.png');
  
  await browser.close();
}

debug().catch(console.error);
