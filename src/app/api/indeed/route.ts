import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobTitle = searchParams.get('jobTitle') || '';
    const city = searchParams.get('city') || '';
    const limit = parseInt(searchParams.get('limit') || '20');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const jobs = [];
    try {
      // 构建Indeed搜索URL
      const searchUrl = `https://au.indeed.com/jobs?q=${encodeURIComponent(jobTitle)}&l=${encodeURIComponent(city)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // 多选择器尝试
      let jobCards = await page.$$('a.tapItem');
      if (jobCards.length === 0) {
        jobCards = await page.$$('div.job_seen_beacon');
      }
      if (jobCards.length === 0) {
        // 输出页面HTML便于调试
        const html = await page.content();
        console.error('No job cards found. Page HTML:', html.slice(0, 1000));
        throw new Error('No job cards found on Indeed search page');
      }
      for (let i = 0; i < Math.min(jobCards.length, limit); i++) {
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
          await detailPage.goto(`https://au.indeed.com${detailUrl}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
          // 优先查找Apply now按钮的href
          const applyBtn = await detailPage.$('button[contenthtml="Apply now"], button[aria-label*="Apply now"]');
          if (applyBtn) {
            const btnHref = await applyBtn.getAttribute('href');
            if (btnHref) {
              url = btnHref;
              // 判断是否为官网链接
              if (!url.includes('indeed.com')) {
                source = 'company';
              }
            }
          }
          // fallback: 若未找到按钮href，则用详情页链接
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
      }
    } finally {
      await browser.close();
    }
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Error in Indeed API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Indeed jobs' },
      { status: 500 }
    );
  }
} 