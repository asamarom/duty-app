import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function takeScreenshot() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const url = 'https://duty-fayhcj91c-asas-projects-25ed4645.vercel.app';
  console.log('Navigating to:', url);
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  console.log('Page title:', await page.title());
  console.log('Page URL:', page.url());

  const screenshot = join(__dirname, 'preview-auth-page.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  console.log('Screenshot saved to:', screenshot);

  await browser.close();
}

takeScreenshot().catch(console.error);
