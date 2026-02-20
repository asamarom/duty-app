import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testEquipmentPage() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const baseUrl = 'http://localhost:8080';

  console.log('Loading auth page and logging in...');
  await page.goto(baseUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Click the test user selector button
  console.log('Clicking test user selector...');
  await page.locator('[data-testid="test-user-select"]').click();
  await page.waitForTimeout(500);

  // Select admin from the dropdown menu
  console.log('Selecting admin user...');
  await page.getByRole('option', { name: /admin/i }).first().click();
  await page.waitForTimeout(500);

  // Now click the sign in button
  console.log('Clicking sign in button...');
  await page.getByRole('button', { name: /sign in as test user/i }).click();

  // Wait for navigation
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  console.log('Logged in, current URL:', page.url());

  // Check HTML dir
  let htmlDir = await page.locator('html').getAttribute('dir');
  console.log('Dashboard - HTML dir:', htmlDir);

  console.log('Taking screenshot of dashboard...');
  await page.screenshot({ path: join(__dirname, 'localhost-dashboard.png'), fullPage: true });

  // Navigate to equipment
  console.log('Navigating to equipment page...');
  await page.goto(baseUrl + '/equipment');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  htmlDir = await page.locator('html').getAttribute('dir');
  console.log('Equipment page - HTML dir:', htmlDir);

  console.log('Taking screenshot of equipment page...');
  await page.screenshot({ path: join(__dirname, 'localhost-equipment.png'), fullPage: true });

  // Analyze alignment
  console.log('\nAnalyzing RTL alignment on equipment page...');

  // Check table headers
  const thElements = await page.locator('th').all();
  if (thElements.length > 0) {
    const firstTh = thElements[0];
    const textAlign = await firstTh.evaluate(el => window.getComputedStyle(el).textAlign);
    const direction = await firstTh.evaluate(el => window.getComputedStyle(el).direction);
    console.log('Table header - text-align:', textAlign, ', direction:', direction);
  }

  // Check table cells
  const tdElements = await page.locator('td').all();
  if (tdElements.length > 0) {
    const firstTd = tdElements[0];
    const textAlign = await firstTd.evaluate(el => window.getComputedStyle(el).textAlign);
    const direction = await firstTd.evaluate(el => window.getComputedStyle(el).direction);
    console.log('Table cell - text-align:', textAlign, ', direction:', direction);
  }

  // Check for specific elements with problematic classes
  const problematicElements = await page.evaluate(() => {
    const results = [];

    // Check all elements for non-RTL classes
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      const classes = el.className;
      if (typeof classes === 'string') {
        const hasProblematicClass =
          /\bml-\d+\b/.test(classes) ||
          /\bmr-\d+\b/.test(classes) ||
          /\bpl-\d+\b/.test(classes) ||
          /\bpr-\d+\b/.test(classes) ||
          /\btext-left\b/.test(classes);

        if (hasProblematicClass) {
          results.push({
            tag: el.tagName,
            classes: classes,
            text: el.textContent?.trim().substring(0, 40)
          });
        }
      }
    });

    return results.slice(0, 10);
  });

  console.log('\nElements with non-RTL-aware classes:', problematicElements.length);
  if (problematicElements.length > 0) {
    console.log(JSON.stringify(problematicElements, null, 2));
  } else {
    console.log('✓ No non-RTL-aware classes found!');
  }

  await browser.close();

  console.log('\n✓ Screenshots saved to scripts/');
  console.log('  - localhost-dashboard.png');
  console.log('  - localhost-equipment.png');
}

testEquipmentPage().catch(console.error);
