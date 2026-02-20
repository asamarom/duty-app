import { chromium } from 'playwright';

async function check() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const baseUrl = 'https://duty-g1l52odux-asas-projects-25ed4645.vercel.app';
  
  console.log('Testing equipment page...\n');
  
  // Login
  await page.goto(baseUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  await page.locator('[data-testid="test-user-select"]').click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: /admin/i }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /sign in as test user/i }).click();
  await page.waitForTimeout(5000);
  
  console.log('✅ Logged in to:', page.url());
  
  // Go to equipment
  await page.goto(baseUrl + '/equipment', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
  
  const htmlDir = await page.locator('html').getAttribute('dir');
  const hasTable = await page.locator('[role="table"]').count() > 0;
  const hasEmpty = await page.locator('text=/אין ציוד|No equipment/i').count() > 0;
  const isLoading = await page.locator('text=/טוען|Loading/i').count() > 0;
  
  console.log('\nEquipment Page:');
  console.log('  RTL (dir=rtl):', htmlDir === 'rtl' ? '✅' : '❌', htmlDir);
  console.log('  Has table:', hasTable ? '✅' : '❌');
  console.log('  Has empty state:', hasEmpty ? '✅' : '❌');
  console.log('  Still loading:', isLoading ? '⚠️' : '✅');
  
  await page.screenshot({ path: 'scripts/equipment-final.png', fullPage: true });
  console.log('\n📸 Screenshot: scripts/equipment-final.png');
  
  await browser.close();
  
  if (htmlDir === 'rtl' && (hasTable || hasEmpty) && !isLoading) {
    console.log('\n🎉 SUCCESS: Equipment page working with RTL!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Issues detected');
    process.exit(1);
  }
}

check().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
