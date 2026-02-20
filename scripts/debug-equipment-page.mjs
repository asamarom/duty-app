import { chromium } from 'playwright';

async function debug() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const baseUrl = 'https://duty-c2rufq75a-asas-projects-25ed4645.vercel.app';
  
  console.log('Logging in...');
  await page.goto(baseUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Login
  await page.locator('[data-testid="test-user-select"]').click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: /admin/i }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /sign in as test user/i }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  console.log('Current URL:', page.url());
  
  // Check console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser error:', msg.text());
    }
  });
  
  // Navigate to equipment
  console.log('\nNavigating to equipment page...');
  await page.goto(baseUrl + '/equipment');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
  
  // Get page content
  const content = await page.content();
  const hasSpinner = content.includes('טוען') || content.includes('Loading');
  const hasError = content.includes('error') || content.includes('שגיאה');
  
  console.log('Has spinner:', hasSpinner);
  console.log('Has error:', hasError);
  
  // Check for specific elements
  const hasTable = await page.locator('[role="table"]').count() > 0;
  const hasEmptyState = await page.locator('text=/אין ציוד|No equipment/i').count() > 0;
  
  console.log('Has table:', hasTable);
  console.log('Has empty state:', hasEmptyState);
  
  // Take screenshot
  await page.screenshot({ path: 'scripts/debug-equipment.png', fullPage: true });
  console.log('Screenshot saved');
  
  await browser.close();
}

debug().catch(console.error);
