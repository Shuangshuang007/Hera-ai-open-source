import { chromium } from 'playwright';
import { Job } from '@/types/job';

// 更新城市到location code的映射
const cityToLocationCode: { [key: string]: string[] } = {
  'sydney': ['98095'],
  'melbourne': ['98127'],
  'brisbane': ['98644'],
  'perth': ['98111'],
  'adelaide': ['98518'],
  'hobart': ['98426'],
  'darwin': ['98523'],
  'canberra': ['98122'],
  'gold coast': ['98536'],
  'newcastle': ['98545']
};

// 添加Hatch平台支持
const HATCH_CITIES = ['melbourne', 'sydney', 'perth'];

// 通用弹窗处理函数，增加多次尝试和缓冲
async function dismissAllPopups(page: any) {
  for (let i = 0; i < 3; i++) {
    let dismissed = false;
    // 关闭 Cookie 弹窗
    try {
      const cookieBtn = await page.$('button:has-text("Accept All")');
      if (cookieBtn) {
        await cookieBtn.click();
        console.log('✓ Cookie popup dismissed');
        dismissed = true;
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // 忽略
    }
    // 关闭 Email alert 弹窗
    try {
      const emailBtn = await page.$('button:has-text("No, thanks")');
      if (emailBtn) {
        await emailBtn.click();
        console.log('✓ Email alert popup dismissed');
        dismissed = true;
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // 忽略
    }
    if (!dismissed) break; // 如果本轮没有弹窗，提前结束
  }
}

// 定义appendToTerminal函数
function appendToTerminal(message: string) {
  console.log(message);
}

export async function fetchAdzunaJobsWithPlaywright(jobTitle: string, city: string): Promise<Job[]> {
  appendToTerminal(`Adzuna平台简化抓取启动：岗位=${jobTitle}，城市=${city}`);
  const jobs: Job[] = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    // 构建Adzuna搜索URL
    const cityCode = cityToLocationCode[city.toLowerCase()] || '98127';
    let currentPage = 1;
    const targetJobCount = 60;

    while (jobs.length < targetJobCount) {
      const pageUrl = `https://www.adzuna.com.au/search?ac_where=1&loc=${cityCode}&q=${encodeURIComponent(jobTitle)}&page=${currentPage}`;
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await dismissAllPopups(page); // 每次翻页都自动关闭弹窗
      await page.waitForSelector('article[data-aid]', { timeout: 10000 });
      const jobElements = await page.$$('article[data-aid]');
      
      if (jobElements.length === 0) {
        appendToTerminal(`Adzuna平台：第${currentPage}页没有找到更多职位，停止抓取`);
        break;
      }

      appendToTerminal(`Adzuna平台：第${currentPage}页发现${jobElements.length}个职位卡片`);
      let idCounter = jobs.length + 1;
      
      // 跳过前两个赞助广告
      const startIndex = currentPage === 1 ? 2 : 0;
      
      for (let i = startIndex; i < jobElements.length; i++) {
        if (jobs.length >= targetJobCount) break;
        
        try {
          const jobElement = jobElements[i];
          const title = await jobElement.$eval('h2 a', (el: Element) => el.textContent?.trim() || '');
          const url = await jobElement.$eval('h2 a', (el: Element) => (el as HTMLAnchorElement).href);
          const company = await jobElement.$eval('.ui-company', (el: Element) => el.textContent?.trim() || '');
          const location = await jobElement.$eval('.ui-location', (el: Element) => el.textContent?.trim() || '');
          const salary = await jobElement.$eval('.ui-salary', (el: Element) => el.textContent?.trim() || '').catch(() => '');
          const description = await jobElement.$eval('.max-snippet-height', (el: Element) => el.textContent?.trim() || '').catch(() => '');
          
          jobs.push({
            id: `adzuna-${idCounter++}`,
            title,
            company,
            location,
            url,
            platform: 'Adzuna',
            salary,
            description
          });
        } catch (error) {
          appendToTerminal(`Adzuna职位卡片解析失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      currentPage++;
      await page.waitForTimeout(1000); // 添加短暂延迟，避免请求过快
    }

    appendToTerminal(`Adzuna平台：最终返回${jobs.length}条职位数据`);
    return jobs;
  } catch (error) {
    appendToTerminal(`Adzuna抓取异常: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  } finally {
    await browser.close();
  }
}

export async function fetchJobsFromAllPlatforms(jobTitle: string, city: string) {
  // 只保留Adzuna平台抓取逻辑
  appendToTerminal(`Selected platform: adzuna`);
  const allJobs: Job[] = [];
  const errors: string[] = [];
  try {
    const jobs = await fetchAdzunaJobsWithPlaywright(jobTitle, city);
      allJobs.push(...jobs);
    } catch (error) {
    const errorMessage = `Error fetching jobs from adzuna: ${error instanceof Error ? error.message : 'Unknown error'}`;
      appendToTerminal(errorMessage);
      errors.push(errorMessage);
    }
  return { jobs: allJobs, errors };
}

// 主入口：直接运行时测试Adzuna抓取
if (require.main === module) {
  fetchAdzunaJobsWithPlaywright('Software Engineer', 'Melbourne').then(jobs => {
    console.log('抓取到的职位数量:', jobs.length);
    if (jobs.length > 0) {
      console.log('示例职位:', jobs[0]);
    }
  }).catch(console.error);
} 