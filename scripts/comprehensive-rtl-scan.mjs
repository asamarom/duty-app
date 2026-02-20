import { chromium } from 'playwright';

async function comprehensiveScan() {
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
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('        COMPREHENSIVE RTL ALIGNMENT SCAN');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const issues = [];
  
  // Helper to check alignment
  const checkElement = async (selector, name) => {
    const el = page.locator(selector).first();
    if (await el.count() === 0) return null;
    
    const box = await el.boundingBox();
    const text = await el.textContent().catch(() => '');
    const styles = await el.evaluate(el => {
      const s = window.getComputedStyle(el);
      return {
        textAlign: s.textAlign,
        direction: s.direction,
        justifyContent: s.justifyContent,
        float: s.float,
        marginLeft: s.marginLeft,
        marginRight: s.marginRight,
        paddingLeft: s.paddingLeft,
        paddingRight: s.paddingRight
      };
    });
    
    const isRTL = styles.direction === 'rtl';
    const isRightAligned = styles.textAlign === 'right' || 
                          (styles.textAlign === 'start' && isRTL) ||
                          styles.justifyContent === 'flex-end';
    const position = box?.x || 0;
    const isOnRight = position > 600;
    
    return {
      name,
      text: text?.trim().substring(0, 50),
      position,
      isOnRight,
      isRightAligned,
      styles,
      hasIssue: !isRightAligned && !isOnRight
    };
  };
  
  // Scan all major elements
  const elements = [
    { selector: '[role="tablist"]', name: 'Tabs Container' },
    { selector: '[role="tab"]', name: 'Individual Tab' },
    { selector: 'h1', name: 'Page Title (h1)' },
    { selector: 'h2', name: 'Section Title (h2)' },
    { selector: 'input[type="search"], input[placeholder*="חיפוש"]', name: 'Search Input' },
    { selector: 'button:has-text("הוספה"), button:has-text("Add")', name: 'Add Button' },
    { selector: '.card, [class*="card"]', name: 'Card Container' },
    { selector: 'table, [role="table"]', name: 'Table' },
    { selector: 'th, [role="columnheader"]', name: 'Table Header' },
    { selector: '[role="navigation"]', name: 'Navigation' },
    { selector: 'nav', name: 'Nav Element' },
    { selector: '.flex.items-center.justify-between', name: 'Flex Container (space-between)' },
    { selector: 'button[class*="ml-"], button[class*="mr-"]', name: 'Button with margin' },
    { selector: 'div[class*="text-left"], div[class*="text-right"]', name: 'Div with text alignment' },
  ];
  
  for (const { selector, name } of elements) {
    const result = await checkElement(selector, name);
    if (result) {
      const icon = result.hasIssue ? '❌' : '✅';
      console.log(`${icon} ${result.name}`);
      console.log(`   Text: "${result.text}"`);
      console.log(`   Position: x=${Math.round(result.position)} ${result.isOnRight ? '(RIGHT)' : '(LEFT)'}`);
      console.log(`   text-align: ${result.styles.textAlign}, direction: ${result.styles.direction}`);
      if (result.styles.justifyContent !== 'normal') {
        console.log(`   justify-content: ${result.styles.justifyContent}`);
      }
      if (result.styles.float !== 'none') {
        console.log(`   float: ${result.styles.float}`);
      }
      if (result.hasIssue) {
        console.log(`   ⚠️  ISSUE: Should be right-aligned for RTL`);
        issues.push(result);
      }
      console.log('');
    }
  }
  
  // Check for hardcoded left/right classes
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('        CHECKING FOR NON-RTL-AWARE CLASSES');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const problematicClasses = await page.evaluate(() => {
    const issues = [];
    const elements = document.querySelectorAll('*');
    
    for (const el of elements) {
      const classes = el.className;
      if (typeof classes !== 'string') continue;
      
      const problematic = classes.match(/(^|\s)(ml-|mr-|pl-|pr-|text-left|text-right|float-left|float-right|left-|right-)[\w-]*/g);
      if (problematic && problematic.length > 0) {
        const text = el.textContent?.trim().substring(0, 30) || '';
        issues.push({
          tag: el.tagName.toLowerCase(),
          classes: problematic.join(', '),
          text: text
        });
      }
    }
    return issues.slice(0, 20); // Limit to first 20
  });
  
  if (problematicClasses.length > 0) {
    console.log('Found non-RTL-aware classes:\n');
    problematicClasses.forEach(({ tag, classes, text }) => {
      console.log(`❌ <${tag}> "${text}"`);
      console.log(`   Classes: ${classes}\n`);
    });
  } else {
    console.log('✅ No non-RTL-aware classes found!\n');
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('                      SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`Total issues found: ${issues.length + problematicClasses.length}`);
  console.log(`Alignment issues: ${issues.length}`);
  console.log(`Non-RTL classes: ${problematicClasses.length}\n`);
  
  await page.screenshot({ path: 'scripts/comprehensive-rtl-scan.png', fullPage: true });
  console.log('📸 Screenshot saved: scripts/comprehensive-rtl-scan.png\n');
  
  await browser.close();
  
  // Output issues as JSON for processing
  if (issues.length > 0 || problematicClasses.length > 0) {
    const fs = await import('fs');
    fs.writeFileSync('scripts/rtl-issues.json', JSON.stringify({
      alignmentIssues: issues,
      classIssues: problematicClasses
    }, null, 2));
    console.log('📄 Issues saved to: scripts/rtl-issues.json\n');
  }
}

comprehensiveScan().catch(console.error);
