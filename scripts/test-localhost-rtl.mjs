import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testLocalhost() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const baseUrl = 'http://localhost:8080';

  console.log('Loading auth page...');
  await page.goto(baseUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  let htmlDir = await page.locator('html').getAttribute('dir');
  console.log('Auth page - HTML dir:', htmlDir || 'null (default LTR)');

  console.log('Taking screenshot of auth page...');
  await page.screenshot({ path: join(__dirname, 'localhost-auth.png'), fullPage: true });

  // Look for language toggle on auth page
  console.log('Looking for language toggle on auth page...');
  const languageButtons = await page.locator('button, [role="button"]').all();
  for (const btn of languageButtons) {
    const text = await btn.textContent();
    console.log('  Found button:', text?.trim().slice(0, 50));
  }

  // Try clicking English/Hebrew toggle if it exists
  const enButton = page.locator('text=EN, text=English').first();
  const heButton = page.locator('text=עב, text=עברית, text=Hebrew').first();

  if (await enButton.count() > 0 || await heButton.count() > 0) {
    console.log('Found language toggle, switching...');
    const toggleButton = await enButton.count() > 0 ? enButton : heButton;
    await toggleButton.click();
    await page.waitForTimeout(1000);

    htmlDir = await page.locator('html').getAttribute('dir');
    console.log('After toggle - HTML dir:', htmlDir);

    await page.screenshot({ path: join(__dirname, 'localhost-auth-after-toggle.png'), fullPage: true });
  }

  await browser.close();

  console.log('\nScreenshots saved to scripts/');
}

testLocalhost().catch(console.error);
