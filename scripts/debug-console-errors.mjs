import { chromium } from 'playwright';

async function debug() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  const consoleMessages = [];
  
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    errors.push(`Page error: ${error.message}`);
  });
  
  page.on('requestfailed', request => {
    errors.push(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
  });
  
  const baseUrl = 'https://duty-c2rufq75a-asas-projects-25ed4645.vercel.app';
  
  console.log('=== Logging in ===');
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
  
  console.log('Logged in. URL:', page.url());
  
  console.log('\n=== Navigating to equipment page ===');
  await page.goto(baseUrl + '/equipment');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
  
  console.log('\n=== Console Messages ===');
  consoleMessages.forEach(msg => console.log(msg));
  
  console.log('\n=== Errors ===');
  errors.forEach(err => console.log(err));
  
  await browser.close();
}

debug().catch(console.error);
