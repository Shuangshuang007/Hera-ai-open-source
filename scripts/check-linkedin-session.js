const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launchPersistentContext('./linkedin-user-data', {
    headless: false,
    args: ['--window-size=1400,900'],
    viewport: { width: 1400, height: 900 }
  });
  const page = await browser.newPage();
  await page.goto('https://www.linkedin.com/jobs/', { waitUntil: 'networkidle' });

  // Check if there is an avatar in the top right corner (personal menu), otherwise not logged in
  const isSignedIn = await page.$('img.global-nav__me-photo, .global-nav__me-photo');
  const isSignInBtn = await page.$('a.nav__button-secondary, a[data-tracking-control-name="guest_homepage-basic_nav-header-signin"]');

  if (isSignedIn) {
    console.log('✅ LinkedIn session is valid, logged in!');
  } else if (isSignInBtn) {
    console.log('❌ LinkedIn session is invalid, please log in again!');
  } else {
    console.log('⚠️ Unable to determine LinkedIn login status, please check the top right corner manually.');
  }

  // Wait for manual observation
  await page.waitForTimeout(15000);
  await browser.close();
})(); 