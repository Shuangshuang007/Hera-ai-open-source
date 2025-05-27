const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launchPersistentContext('./linkedin-user-data', {
    headless: false,
    args: ['--window-size=1400,900'],
    viewport: { width: 1400, height: 900 }
  });
  const page = await browser.newPage();
  await page.goto('https://www.linkedin.com/login');
  console.log('Please log in to LinkedIn manually in the popup browser until your avatar appears in the top right corner.');
  await page.waitForTimeout(120000); // 2 minutes for manual login
  await page.goto('https://www.linkedin.com/feed/');
  await page.waitForTimeout(20000); // Wait another 20 seconds
  await browser.close();
})(); 