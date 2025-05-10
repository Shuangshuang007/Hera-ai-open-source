import { NextResponse } from 'next/server';
import playwright from 'playwright-extra';
import StealthPlugin from 'playwright-extra-plugin-stealth';

// 使用Stealth插件
playwright.use(StealthPlugin());

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobTitle = searchParams.get('jobTitle') || '';
  const city = searchParams.get('city') || '';
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    // 启动浏览器
    const browser = await playwright.chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-AU',
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    // 构建SEEK搜索URL
    const searchUrl = `https://www.seek.com.au/${jobTitle}-jobs/in-${city}`;
    console.log('Searching SEEK URL:', searchUrl);

    // 访问搜索页面
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 等待职位卡片加载
    await page.waitForSelector('[data-automation="normalJob"]', { timeout: 10000 });

    // 获取所有职位卡片
    const jobElements = await page.$$('[data-automation="normalJob"]');
    console.log(`Found ${jobElements.length} job cards`);

    const jobs = [];
    for (let i = 0; i < Math.min(jobElements.length, limit); i++) {
      try {
        const jobElement = jobElements[i];
        
        // 提取基本信息
        const title = await jobElement.$eval('[data-automation="jobTitle"]', el => el.textContent?.trim() || '');
        const company = await jobElement.$eval('[data-automation="jobCompany"]', el => el.textContent?.trim() || '');
        const location = await jobElement.$eval('[data-automation="jobLocation"]', el => el.textContent?.trim() || '');
        const description = await jobElement.$eval('[data-automation="jobShortDescription"]', el => el.textContent?.trim() || '');
        
        // 获取详情页URL
        const detailUrl = await jobElement.$eval('a[data-automation="jobTitle"]', el => el.href);
        
        // 打开详情页获取申请链接
        const detailPage = await context.newPage();
        await detailPage.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // 等待申请按钮加载
        await detailPage.waitForSelector('[data-automation="job-detail-apply"]', { timeout: 10000 });
        
        // 获取申请链接
        const applyUrl = await detailPage.$eval('[data-automation="job-detail-apply"]', el => el.href);
        
        // 判断来源
        const source = applyUrl && !applyUrl.includes('seek.com.au') ? 'company' : 'seek';
        console.log(`[SEEK] ${title} | applyUrl: ${applyUrl} | source: ${source}`);
        
        if (source === 'company') {
          jobs.push({
            title,
            company,
            location,
            description,
            url: applyUrl,
            source,
            platform: 'seek'
          });
        }

        await detailPage.close();
      } catch (error) {
        console.error('Error processing job:', error);
        continue;
      }
    }

    await browser.close();
    return NextResponse.json({ jobs });

  } catch (error) {
    console.error('Error in SEEK scraper:', error);
    return NextResponse.json({ error: 'Failed to fetch SEEK jobs' }, { status: 500 });
  }
} 