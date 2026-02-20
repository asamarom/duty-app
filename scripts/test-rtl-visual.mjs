import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loginAsTestUser(page, baseUrl) {
  console.log('Logging in as test admin...');
  await page.goto(baseUrl);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // Click the test login button (it's in a collapsible section)
  const testLoginButton = page.getByRole('button', { name: /test login/i });
  const hasTestLogin = await testLoginButton.count() > 0;

  if (!hasTestLogin) {
    // Try to find a collapsible or expandable section
    const expandButton = page.locator('button, [role="button"]').filter({ hasText: /test|demo|development/i }).first();
    if (await expandButton.count() > 0) {
      await expandButton.click();
      await page.waitForTimeout(500);
    }
  }

  await testLoginButton.click({ timeout: 5000 });

  // Select admin user
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: /admin/i }).click();

  // Click login
  await page.getByRole('button', { name: /^login$/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(new RegExp('^' + baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/?$'), { timeout: 10000 });
  console.log('Logged in successfully');
}

async function testRTL() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Use the preview deployment URL (from Vercel preview deployments)
  const baseUrl = 'https://duty-fayhcj91c-asas-projects-25ed4645.vercel.app';

  // Login first
  await loginAsTestUser(page, baseUrl);

  // Check current language
  let htmlDir = await page.locator('html').getAttribute('dir');
  console.log('Initial HTML dir attribute:', htmlDir);

  console.log('Taking screenshot in initial language mode...');
  await page.screenshot({ path: join(__dirname, 'screenshot-before-toggle.png'), fullPage: false });

  // Try to find and click language toggle
  console.log('Looking for language toggle...');

  // Look for language button in the header
  const languageButton = page.locator('button[aria-label*="language"], button:has-text("EN"), button:has-text("עב")').first();
  const hasLanguageToggle = await languageButton.count() > 0;

  if (hasLanguageToggle) {
    console.log('Found language toggle, clicking...');
    await languageButton.click();
    await page.waitForTimeout(1000);

    htmlDir = await page.locator('html').getAttribute('dir');
    console.log('After toggle - HTML dir:', htmlDir);
  } else {
    console.log('No language toggle button found, checking sidebar/menu...');
    // Try to find in sidebar
    const sidebarToggle = page.locator('[role="button"]:has-text("EN"), [role="button"]:has-text("עב")').first();
    if (await sidebarToggle.count() > 0) {
      await sidebarToggle.click();
      await page.waitForTimeout(1000);
      htmlDir = await page.locator('html').getAttribute('dir');
      console.log('After sidebar toggle - HTML dir:', htmlDir);
    }
  }

  console.log('Taking screenshot after language switch...');
  await page.screenshot({ path: join(__dirname, 'screenshot-after-toggle.png'), fullPage: false });

  // Navigate to equipment page
  console.log('Navigating to equipment page...');
  await page.goto(baseUrl + '/equipment');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  htmlDir = await page.locator('html').getAttribute('dir');
  console.log('Equipment page - HTML dir:', htmlDir);

  console.log('Taking screenshot of equipment page...');
  await page.screenshot({ path: join(__dirname, 'screenshot-equipment.png'), fullPage: true });

  // Check for specific RTL issues
  console.log('\nAnalyzing RTL alignment...');

  // Check computed styles of key elements
  const tableHeaders = page.locator('th').first();
  if (await tableHeaders.count() > 0) {
    const textAlign = await tableHeaders.evaluate(el => window.getComputedStyle(el).textAlign);
    console.log('Table header text-align:', textAlign);
  }

  // Get first few table cells and check their alignment
  const cells = await page.locator('td').first().count();
  if (cells > 0) {
    const cellAlign = await page.locator('td').first().evaluate(el => window.getComputedStyle(el).textAlign);
    console.log('Table cell text-align:', cellAlign);
  }

  // Check for non-RTL-aware classes in the equipment page
  const badClasses = await page.evaluate(() => {
    const selectors = [
      '[class*=" ml-"]', '[class*=" mr-"]',
      '[class*=" pl-"]', '[class*=" pr-"]',
      '[class*=" text-left"]',
      '[class^="ml-"]', '[class^="mr-"]',
      '[class^="pl-"]', '[class^="pr-"]',
      '[class^="text-left"]'
    ];

    const elements = [];
    selectors.forEach(selector => {
      try {
        const found = Array.from(document.querySelectorAll(selector));
        elements.push(...found);
      } catch (e) {
        // Skip invalid selectors
      }
    });

    return Array.from(new Set(elements)).slice(0, 15).map(el => ({
      tag: el.tagName,
      classes: el.className,
      text: el.textContent?.trim().slice(0, 50)
    }));
  });

  console.log('\nElements with potential non-RTL-aware classes found:', badClasses.length);
  if (badClasses.length > 0) {
    console.log(JSON.stringify(badClasses, null, 2));
  }

  await browser.close();

  console.log('\nScreenshots saved to:');
  console.log('  - scripts/screenshot-before-toggle.png');
  console.log('  - scripts/screenshot-after-toggle.png');
  console.log('  - scripts/screenshot-equipment.png');
}

testRTL().catch(console.error);
