const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launchPersistentContext('./adzuna-user-data', { headless: false });
  const page = await browser.newPage();
  await page.goto('https://www.adzuna.com.au/jobs/in/victoria/melbourne?q=Software%20Engineer');
  console.log('请手动关闭所有cookie/邮件弹窗，保持页面1分钟...');
  await page.waitForTimeout(60000); // 保持页面1分钟
  await browser.close();
  console.log('Adzuna session训练完成，可以关闭窗口。');
})(); 