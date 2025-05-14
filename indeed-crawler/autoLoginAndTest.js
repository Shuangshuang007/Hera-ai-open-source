const { chromium } = require('playwright');
const http = require('http');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 打开Indeed登录页（澳洲站）
  await page.goto('https://secure.indeed.com/auth');

  // 给你时间手动登录
  console.log('请在浏览器中手动登录Indeed，登录完成后回到终端按回车继续...');
  process.stdin.once('data', async () => {
    await context.storageState({ path: 'state.json' });
    console.log('登录状态已保存到 state.json');

    // 自动测试API
    console.log('开始测试Indeed API...');
    const options = {
      hostname: 'localhost',
      port: 4002,
      path: '/api/indeed?jobTitle=software%20engineer&city=sydney&limit=5',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('API测试结果:');
        console.log(data);
        process.exit(0);
      });
    });

    req.on('error', (error) => {
      console.error('API测试失败:', error);
      process.exit(1);
    });

    req.end();
  });
})(); 