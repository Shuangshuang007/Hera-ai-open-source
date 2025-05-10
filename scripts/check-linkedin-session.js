const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launchPersistentContext('./linkedin-user-data', {
    headless: false,
    args: ['--window-size=1400,900'],
    viewport: { width: 1400, height: 900 }
  });
  const page = await browser.newPage();
  await page.goto('https://www.linkedin.com/jobs/', { waitUntil: 'networkidle' });

  // 检查右上角是否有头像（个人菜单），否则就是未登录
  const isSignedIn = await page.$('img.global-nav__me-photo, .global-nav__me-photo');
  const isSignInBtn = await page.$('a.nav__button-secondary, a[data-tracking-control-name="guest_homepage-basic_nav-header-signin"]');

  if (isSignedIn) {
    console.log('✅ LinkedIn session 有效，已登录！');
  } else if (isSignInBtn) {
    console.log('❌ LinkedIn session 无效，请重新登录！');
  } else {
    console.log('⚠️ 无法判断 LinkedIn 登录状态，请手动检查页面右上角。');
  }

  // 等待你手动观察
  await page.waitForTimeout(15000);
  await browser.close();
})(); 