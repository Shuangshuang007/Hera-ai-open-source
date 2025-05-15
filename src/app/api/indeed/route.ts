import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

interface IndeedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: string;
  platform: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobTitle = searchParams.get('jobTitle') || '';
    const city = searchParams.get('city') || '';
    const limit = 60; // 固定限制为60个职位

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();
    const jobs: IndeedJob[] = [];
    let currentPage = 0;
    const jobsPerPage = 10;

    while (jobs.length < limit) {
      const start = currentPage * jobsPerPage;
      const searchUrl = `https://au.indeed.com/jobs?q=${encodeURIComponent(jobTitle)}&l=${encodeURIComponent(city)}&radius=50${start > 0 ? `&start=${start}` : ''}`;
      
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000 + Math.random() * 3000);

      // 模拟滚动加载
      for (let i = 0; i < 3; i++) {
        await page.mouse.wheel(0, 800);
        await page.waitForTimeout(1000 + Math.random() * 2000);
      }

      // 等待职位列表加载
      await page.waitForSelector('div.job_seen_beacon, div[data-testid="jobCard"]', { timeout: 30000 });
      
      // 获取职位列表
      const jobCards = await page.$$('div.job_seen_beacon, div[data-testid="jobCard"]');
      
      if (jobCards.length === 0) {
        break; // 如果没有更多职位，退出循环
      }

      for (let i = 0; i < Math.min(jobCards.length, limit - jobs.length); i++) {
        const card = jobCards[i];
        const title = await card.$eval('h2.jobTitle span, [data-testid="jobTitle"]', el => el.textContent?.trim() || '');
        const company = await card.$eval('.companyName, [data-testid="companyName"]', el => el.textContent?.trim() || '');
        const location = await card.$eval('.companyLocation, [data-testid="text-location"]', el => el.textContent?.trim() || '');
        const summary = await card.$eval('.job-snippet, [data-testid="job-snippet"]', el => el.textContent?.trim() || '');
        const detailUrl = await card.$eval('a.jcs-JobTitle, a[data-testid="jobTitle"]', el => el.getAttribute('href') || '');
        
        let url = '';
        let source = 'indeed';
        
        if (detailUrl) {
          const detailPage = await context.newPage();
          await detailPage.goto(`https://au.indeed.com${detailUrl}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await detailPage.waitForTimeout(1000 + Math.random() * 2000);
          
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

        // 生成唯一ID
        const jobId = Buffer.from(`indeed-${title}-${company}-${location}`).toString('base64');
        
        // 检查是否已存在相同ID的职位
        const isDuplicate = jobs.some(job => job.id === jobId);
        if (!isDuplicate) {
        jobs.push({
            id: jobId,
          title,
          company,
          location,
          description: summary,
          url,
          source,
            platform: 'Indeed'
        });
      }
      }

      currentPage++;
      if (jobs.length >= limit) {
        break;
      }
    }

      await browser.close();
    return NextResponse.json({ jobs: jobs.slice(0, limit) });
  } catch (error: unknown) {
    console.error('Error in Indeed crawler:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch Indeed jobs', 
      detail: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 