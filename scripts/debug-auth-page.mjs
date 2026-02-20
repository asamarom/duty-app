import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function debugAuthPage() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:8080');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  console.log('Page HTML structure:');
  const testModeSection = await page.locator('[data-testid], .test, #test, [class*="test"]').all();
  console.log('Found', testModeSection.length, 'test-related elements');

  // Get all interactive elements
  const buttons = await page.locator('button').all();
  console.log('\nButtons found:', buttons.length);
  for (let i = 0; i < Math.min(buttons.length, 10); i++) {
    const text = await buttons[i].textContent();
    const disabled = await buttons[i].isDisabled();
    const testId = await buttons[i].getAttribute('data-testid');
    console.log(`  ${i}: "${text?.trim()}" (disabled: ${disabled}, testId: ${testId})`);
  }

  const selects = await page.locator('select').all();
  console.log('\nSelect elements found:', selects.length);

  const inputs = await page.locator('input').all();
  console.log('Input elements found:', inputs.length);

  // Check for combobox role
  const comboboxes = await page.locator('[role="combobox"]').all();
  console.log('Combobox elements found:', comboboxes.length);

  // Try to find the test login section
  const html = await page.content();
  const hasTestMode = html.includes('TEST MODE') || html.includes('test user') || html.includes('Test User');
  console.log('\nPage contains test mode text:', hasTestMode);

  await page.screenshot({ path: join(__dirname, 'auth-page-debug.png'), fullPage: true });
  console.log('\nScreenshot saved to: scripts/auth-page-debug.png');

  await browser.close();
}

debugAuthPage().catch(console.error);
