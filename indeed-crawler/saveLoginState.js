const { chromium } = require('playwright');

(async () => {
  // 使用用户数据目录
  const browser = await chromium.launch({
    headless: false,
    args: [],
    userDataDir: './user-data-dir'
  });
  const page = await browser.newPage();
  await page.goto('https://secure.indeed.com/auth');
  console.log('请在浏览器中手动登录Indeed，登录完成后关闭浏览器窗口即可。');
})(); 