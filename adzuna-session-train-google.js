const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launchPersistentContext('./adzuna-user-data', { headless: false });
  const page = await browser.newPage();

  // 1. Open Adzuna login page
  await page.goto('https://www.adzuna.com.au/login', { waitUntil: 'domcontentloaded' });
  console.log('Please click "Sign in with Google" and complete the login with your Google account. Press Enter to continue after login...');
  await new Promise(resolve => process.stdin.once('data', resolve));

  // 2. After login, redirect to search page with city code (Melbourne)
  await page.goto('https://www.adzuna.com.au/search?q=Software%20Engineer&loc=98551', { waitUntil: 'domcontentloaded' });
  console.log('Please manually close all cookie/email popups and keep the page open for 1 minute...');
  await page.waitForTimeout(60000);

  await browser.close();
  console.log('Adzuna session training completed, you can close the window.');
})(); 