const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launchPersistentContext('./adzuna-user-data', { headless: false });
  const page = await browser.newPage();

  // 1. 打开Adzuna登录页
  await page.goto('https://www.adzuna.com.au/login', { waitUntil: 'domcontentloaded' });
  console.log('请点击"Sign in with Google"，并用你的Google账号完成登录。登录完成后按回车继续...');
  await new Promise(resolve => process.stdin.once('data', resolve));

  // 2. 登录后跳转到带城市code的搜索页（Melbourne）
  await page.goto('https://www.adzuna.com.au/search?q=Software%20Engineer&loc=98551', { waitUntil: 'domcontentloaded' });
  console.log('请手动关闭所有cookie/邮件弹窗，保持页面1分钟...');
  await page.waitForTimeout(60000);

  await browser.close();
  console.log('Adzuna session训练完成，可以关闭窗口。');
})(); 