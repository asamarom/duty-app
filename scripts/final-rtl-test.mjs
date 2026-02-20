import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function finalRTLTest() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('=== RTL VERIFICATION TEST ===\n');

  // Login
  console.log('1. Loading and logging in...');
  await page.goto('http://localhost:8080');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await page.locator('[data-testid="test-user-select"]').click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: /admin/i }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /sign in as test user/i }).click();

  // Wait for dashboard to actually load (not just redirect)
  console.log('2. Waiting for dashboard to load...');
  await page.waitForURL('http://localhost:8080/', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  // Wait for actual dashboard content
  await page.waitForSelector('text=/לוח בקרה|dashboard/i', { timeout: 10000 });
  await page.waitForTimeout(2000);

  const dashboardUrl = page.url();
  console.log('   Current URL:', dashboardUrl);

  let htmlDir = await page.locator('html').getAttribute('dir');
  console.log('   HTML dir:', htmlDir);

  await page.screenshot({ path: join(__dirname, 'final-dashboard.png'), fullPage: true });
  console.log('   ✓ Screenshot saved\n');

  // Navigate to equipment
  console.log('3. Navigating to equipment page...');
  await page.click('a[href="/equipment"], button:has-text("ציוד"), button:has-text("Equipment")');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  const equipmentUrl = page.url();
  console.log('   Current URL:', equipmentUrl);

  htmlDir = await page.locator('html').getAttribute('dir');
  console.log('   HTML dir:', htmlDir);

  await page.screenshot({ path: join(__dirname, 'final-equipment.png'), fullPage: true });
  console.log('   ✓ Screenshot saved\n');

  // Detailed RTL analysis
  console.log('4. Analyzing RTL implementation...\n');

  // Check title alignment
  const title = await page.locator('h1, h2').first();
  if (await title.count() > 0) {
    const titleStyles = await title.evaluate(el => ({
      textAlign: window.getComputedStyle(el).textAlign,
      direction: window.getComputedStyle(el).direction
    }));
    console.log('   Page title styles:', titleStyles);
  }

  // Check table alignment
  const th = await page.locator('th').first();
  if (await th.count() > 0) {
    const thStyles = await th.evaluate(el => ({
      textAlign: window.getComputedStyle(el).textAlign,
      direction: window.getComputedStyle(el).direction
    }));
    console.log('   Table header styles:', thStyles);
  }

  const td = await page.locator('td').first();
  if (await td.count() > 0) {
    const tdStyles = await td.evaluate(el => ({
      textAlign: window.getComputedStyle(el).textAlign,
      direction: window.getComputedStyle(el).direction
    }));
    console.log('   Table cell styles:', tdStyles);
  }

  // Scan for non-RTL classes
  const nonRTLClasses = await page.evaluate(() => {
    const problematic = [];
    const elements = document.querySelectorAll('*');

    elements.forEach(el => {
      const classes = el.className;
      if (typeof classes === 'string') {
        // Match standalone classes only (with word boundaries)
        const hasMLClass = /\bml-\d+\b/.test(classes);
        const hasMRClass = /\bmr-\d+\b/.test(classes);
        const hasPLClass = /\bpl-\d+\b/.test(classes);
        const hasPRClass = /\bpr-\d+\b/.test(classes);
        const hasTextLeft = /\btext-left\b/.test(classes);

        if (hasMLClass || hasMRClass || hasPLClass || hasPRClass || hasTextLeft) {
          problematic.push({
            tag: el.tagName,
            id: el.id || '',
            classes: classes.split(' ').filter(c =>
              /^(ml|mr|pl|pr|text-left)/.test(c)
            ).join(' '),
            text: el.textContent?.trim().substring(0, 30)
          });
        }
      }
    });

    return problematic;
  });

  console.log('\n5. Non-RTL-aware classes found:', nonRTLClasses.length);
  if (nonRTLClasses.length > 0) {
    console.log('\n   ⚠️  ISSUES FOUND:');
    nonRTLClasses.slice(0, 15).forEach((el, i) => {
      console.log(`\n   ${i + 1}. <${el.tag}${el.id ? ` id="${el.id}"` : ''}>`);
      console.log(`      Classes: ${el.classes}`);
      console.log(`      Text: "${el.text}..."`);
    });
  } else {
    console.log('   ✓ No non-RTL-aware classes found!');
  }

  await browser.close();

  console.log('\n=== TEST COMPLETE ===');
  console.log('Screenshots saved:');
  console.log('  - scripts/final-dashboard.png');
  console.log('  - scripts/final-equipment.png');
}

finalRTLTest().catch(console.error);
