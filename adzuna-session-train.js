const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launchPersistentContext('./adzuna-user-data', { headless: false });
  const page = await browser.newPage();
  await page.goto('https://www.adzuna.com.au/jobs/in/victoria/melbourne?q=Software%20Engineer');
  console.log('Please manually close all cookie/email popups and keep the page open for 1 minute...');
  await page.waitForTimeout(60000); // Keep page open for 1 minute
  await browser.close();
  console.log('Adzuna session training completed, you can close the window.');
})(); 