const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launchPersistentContext('./linkedin-user-data', {
    headless: false,
    args: ['--window-size=1400,900'],
    viewport: { width: 1400, height: 900 }
  });
  const page = await browser.newPage();
  await page.goto('https://www.linkedin.com/login');
  console.log('请在弹出的浏览器中手动登录 LinkedIn，直到右上角出现你的头像。');
  await page.waitForTimeout(120000); // 2分钟手动登录
  await page.goto('https://www.linkedin.com/feed/');
  await page.waitForTimeout(20000); // 再等20秒
  await browser.close();
})(); 