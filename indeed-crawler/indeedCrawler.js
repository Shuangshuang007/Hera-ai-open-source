const express = require('express');
const { chromium } = require('playwright');

const app = express();
const port = 4002;

app.get('/api/indeed', async (req, res) => {
  const jobTitle = req.query.jobTitle || '';
  const city = req.query.city || '';
  const limit = parseInt(req.query.limit || '10');
  let browser;
  try {
    browser = await chromium.launch({ 
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials'
      ],
      userDataDir: './user-data-dir'
    });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-AU',
      timezoneId: 'Australia/Sydney',
      geolocation: { longitude: 151.2093, latitude: -33.8688 },
      permissions: ['geolocation']
    });

    // 添加额外的headers
    await context.setExtraHTTPHeaders({
      'Accept-Language': 'en-AU,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    });

    const page = await context.newPage();
    
    // 设置页面超时
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    // 访问Indeed主页
    await page.goto('https://au.indeed.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000 + Math.random() * 3000);

    // 构建搜索URL
    const searchUrl = `https://au.indeed.com/jobs?q=${encodeURIComponent(jobTitle)}&l=${encodeURIComponent(city)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000 + Math.random() * 3000);

    // 模拟滚动加载
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 800);
      await page.waitForTimeout(1000 + Math.random() * 2000);
    }

    // 等待职位列表加载
    await page.waitForSelector('a.tapItem, div.job_seen_beacon', { timeout: 30000 });
    
    // 获取职位列表
    let jobCards = await page.$$('a.tapItem');
    if (jobCards.length === 0) {
      jobCards = await page.$$('div.job_seen_beacon');
    }
    
    const jobs = [];
    for (let i = 0; i < Math.min(jobCards.length, limit); i++) {
      try {
        const card = jobCards[i];
        const title = await card.$eval('h2.jobTitle span', el => el.textContent?.trim() || '');
        const company = await card.$eval('.companyName', el => el.textContent?.trim() || '');
        const location = await card.$eval('.companyLocation', el => el.textContent?.trim() || '');
        const summary = await card.$eval('.job-snippet', el => el.textContent?.trim() || '');
        const detailUrl = await card.getAttribute('href');
        
        let url = '';
        let source = 'indeed';
        
        if (detailUrl) {
          const detailPage = await context.newPage();
          await detailPage.goto(`https://au.indeed.com${detailUrl}`, { waitUntil: 'domcontentloaded' });
          await detailPage.waitForTimeout(2000 + Math.random() * 2000);
          
          // 滚动详情页
          for (let j = 0; j < 2; j++) {
            await detailPage.mouse.wheel(0, 600);
            await detailPage.waitForTimeout(1000 + Math.random() * 2000);
          }
          
          const applyBtn = await detailPage.$('button[contenthtml="Apply now"], button[aria-label*="Apply now"]');
          if (applyBtn) {
            const btnHref = await applyBtn.getAttribute('href');
            if (btnHref) {
              url = btnHref;
              if (!url.includes('indeed.com')) {
                source = 'company';
              }
            }
          }
          
          if (!url) {
            url = `https://au.indeed.com${detailUrl}`;
          }
          
          await detailPage.close();
        }

        jobs.push({
          title,
          company,
          location,
          description: summary,
          url,
          source,
          platform: 'Indeed',
        });

        await page.waitForTimeout(1000 + Math.random() * 2000);
      } catch (error) {
        console.error('Error processing job card:', error);
        continue;
      }
    }

    await browser.close();
    res.json({ jobs });
  } catch (error) {
    console.error('Error in Indeed crawler:', error);
    if (browser) await browser.close();
    res.status(500).json({ error: 'Failed to fetch Indeed jobs', detail: error.message });
  }
});

app.listen(port, () => {
  console.log(`Indeed Playwright API listening at http://localhost:${port}`);
}); 