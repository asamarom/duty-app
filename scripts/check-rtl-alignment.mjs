import { chromium } from 'playwright';

async function checkAlignment() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const baseUrl = 'https://duty-g1l52odux-asas-projects-25ed4645.vercel.app';
  
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
  
  // Go to equipment page
  await page.goto(baseUrl + '/equipment');
  await page.waitForTimeout(8000);
  
  console.log('Checking RTL alignment on Equipment Page:\n');
  
  // Check top tabs (if they exist)
  const tabs = page.locator('[role="tablist"]').first();
  if (await tabs.count() > 0) {
    const tabsBox = await tabs.boundingBox();
    const tabsText = await tabs.locator('[role="tab"]').first().textContent();
    console.log('📑 Top Tabs:');
    console.log(`   Text: "${tabsText?.trim()}"`);
    console.log(`   Position: x=${Math.round(tabsBox?.x || 0)} (${tabsBox?.x > 640 ? 'RIGHT side' : 'LEFT side'})`);
    console.log(`   Alignment: ${tabsBox?.x > 640 ? 'RIGHT-aligned ✅' : 'LEFT-aligned ❌'}\n`);
  }
  
  // Check page title
  const pageTitle = page.locator('h1, h2').first();
  if (await pageTitle.count() > 0) {
    const titleBox = await pageTitle.boundingBox();
    const titleText = await pageTitle.textContent();
    const titleStyle = await pageTitle.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return { textAlign: styles.textAlign, direction: styles.direction };
    });
    console.log('📌 Page Title:');
    console.log(`   Text: "${titleText?.trim()}"`);
    console.log(`   CSS text-align: ${titleStyle.textAlign}`);
    console.log(`   CSS direction: ${titleStyle.direction}`);
    console.log(`   Position: x=${Math.round(titleBox?.x || 0)}`);
    console.log(`   Alignment: ${titleStyle.textAlign === 'start' || titleStyle.textAlign === 'right' ? 'RIGHT-aligned ✅' : 'LEFT-aligned ❌'}\n`);
  }
  
  // Check total card (stats card)
  const totalCard = page.locator('text=/סה"כ|Total/i').first();
  if (await totalCard.count() > 0) {
    const cardParent = totalCard.locator('..').first();
    const cardBox = await cardParent.boundingBox();
    const cardText = await totalCard.textContent();
    const cardStyle = await cardParent.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return { textAlign: styles.textAlign, direction: styles.direction };
    });
    console.log('📊 Total Card:');
    console.log(`   Text: "${cardText?.trim()}"`);
    console.log(`   CSS text-align: ${cardStyle.textAlign}`);
    console.log(`   Position: x=${Math.round(cardBox?.x || 0)}`);
    console.log(`   Alignment: ${cardStyle.textAlign === 'start' || cardStyle.textAlign === 'right' ? 'RIGHT-aligned ✅' : 'LEFT-aligned ❌'}\n`);
  }
  
  // Check search box
  const searchBox = page.locator('input[placeholder*="חיפוש"], input[type="search"]').first();
  if (await searchBox.count() > 0) {
    const searchBoxBox = await searchBox.boundingBox();
    const searchPlaceholder = await searchBox.getAttribute('placeholder');
    const searchStyle = await searchBox.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return { 
        textAlign: styles.textAlign, 
        direction: styles.direction,
        paddingLeft: styles.paddingLeft,
        paddingRight: styles.paddingRight 
      };
    });
    console.log('🔍 Search Box:');
    console.log(`   Placeholder: "${searchPlaceholder}"`);
    console.log(`   CSS text-align: ${searchStyle.textAlign}`);
    console.log(`   CSS direction: ${searchStyle.direction}`);
    console.log(`   Padding: left=${searchStyle.paddingLeft}, right=${searchStyle.paddingRight}`);
    console.log(`   Position: x=${Math.round(searchBoxBox?.x || 0)}`);
    console.log(`   Alignment: ${searchStyle.textAlign === 'start' || searchStyle.textAlign === 'right' ? 'RIGHT-aligned ✅' : 'LEFT-aligned ❌'}\n`);
  }
  
  // Take annotated screenshot
  await page.screenshot({ path: 'scripts/rtl-alignment-check.png', fullPage: true });
  console.log('📸 Screenshot saved: scripts/rtl-alignment-check.png');
  
  await browser.close();
}

checkAlignment().catch(console.error);
