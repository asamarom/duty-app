import { chromium } from 'playwright';

async function check() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('[Browser]', msg.text()));
  
  const baseUrl = 'https://duty-g1l52odux-asas-projects-25ed4645.vercel.app';
  
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
  await page.waitForTimeout(5000);
  
  // Get UID from page
  const uid = await page.evaluate(() => {
    return window.localStorage.getItem('firebase:authUser:AIzaSyBCEsDWXYAP-2I6JnbO5rgmdUCCx_7qEd4:[DEFAULT]');
  });
  
  console.log('\n=== Auth State ===');
  console.log('UID data:', uid ? JSON.parse(uid).uid : 'No UID found');
  console.log('Current URL:', page.url());
  
  await browser.close();
}

check().catch(console.error);
