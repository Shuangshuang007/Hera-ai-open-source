const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const app = express();
const port = 4001;

app.get('/api/indeed', async (req, res) => {
  const jobTitle = req.query.jobTitle || '';
  const city = req.query.city || '';
  const limit = parseInt(req.query.limit || '10');
  let browser;
  try {
    console.log('Starting browser...');
    browser = await puppeteer.launch({ 
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ],
      defaultViewport: null
    });
    console.log('Browser started successfully');
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    
    console.log('Navigating to Indeed...');
    const searchUrl = `https://au.indeed.com/jobs?q=${encodeURIComponent(jobTitle)}&l=${encodeURIComponent(city)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('Page loaded');
    
    // 自动点击Allow按钮
    try {
      console.log('Looking for Allow button...');
      const allowBtn = await page.$('button:contains("Allow")');
      if (allowBtn) {
        console.log('Found Allow button, clicking...');
        await allowBtn.click();
      }
    } catch (e) {
      console.log('No Allow button found or error:', e.message);
    }
    
    // 处理人机验证（CAPTCHA）
    try {
      console.log('Looking for CAPTCHA...');
      const captchaBtn = await page.$('button:contains("I am human")');
      if (captchaBtn) {
        console.log('Found CAPTCHA, waiting for manual verification...');
        console.log('请手动完成人机验证，验证通过后按回车继续...');
        await new Promise(resolve => process.stdin.once('data', resolve));
      }
    } catch (e) {
      console.log('No CAPTCHA found or error:', e.message);
    }
    
    // 保存页面截图便于调试
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'indeed-debug.png', fullPage: true });
    console.log('Screenshot saved');
    
    await page.waitForTimeout(2000);
    console.log('Waiting for job cards...');
    await page.waitForSelector('a.tapItem, div.job_seen_beacon', { timeout: 30000 });
    console.log('Job cards found');
    
    let jobCards = await page.$$('a.tapItem');
    if (jobCards.length === 0) {
      jobCards = await page.$$('div.job_seen_beacon');
    }
    console.log(`Found ${jobCards.length} job cards`);
    
    const jobs = [];
    for (let i = 0; i < Math.min(jobCards.length, limit); i++) {
      try {
        const card = jobCards[i];
        const title = await card.$eval('h2.jobTitle span', el => el.textContent?.trim() || '');
        const company = await card.$eval('.companyName', el => el.textContent?.trim() || '');
        const location = await card.$eval('.companyLocation', el => el.textContent?.trim() || '');
        const summary = await card.$eval('.job-snippet', el => el.textContent?.trim() || '');
        const detailUrl = await card.evaluate(el => el.getAttribute('href'));
        let url = '';
        let source = 'indeed';
        if (detailUrl) {
          const detailPage = await browser.newPage();
          await detailPage.goto(`https://au.indeed.com${detailUrl}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
          const applyBtn = await detailPage.$('button[contenthtml="Apply now"], button[aria-label*="Apply now"]');
          if (applyBtn) {
            const btnHref = await applyBtn.evaluate(el => el.getAttribute('href'));
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
      } catch (error) {
        console.log('Error processing job card:', error.message);
        continue;
      }
    }
    await browser.close();
    console.log('Browser closed');
    res.json({ jobs });
  } catch (error) {
    console.error('Error:', error);
    if (browser) await browser.close();
    res.status(500).json({ error: 'Failed to fetch Indeed jobs', detail: error.message });
  }
});

app.listen(port, () => {
  console.log(`Indeed Puppeteer API listening at http://localhost:${port}`);
}); 