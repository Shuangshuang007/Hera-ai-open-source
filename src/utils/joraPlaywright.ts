import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';
import { Job } from '@/types/job';

interface JoraPlaywrightOptions {
  jobTitle: string;
  city: string;
  limit?: number;
  appendToTerminal?: (msg: string) => void;
  // username: string;
  // password: string;
}

// 城市到州的映射
const cityToState: { [key: string]: string } = {
  'Sydney': 'NSW',
  'Melbourne': 'VIC',
  'Brisbane': 'QLD',
  'Perth': 'WA',
  'Adelaide': 'SA',
  'Hobart': 'TAS',
  'Darwin': 'NT',
  'Canberra': 'ACT'
};

export async function fetchJoraJobsWithPlaywright(options: JoraPlaywrightOptions): Promise<Job[]> {
  const { jobTitle, city, limit = 60, appendToTerminal = () => {} } = options;
  let browser: Browser | null = null;
  let page: Page | null = null;
  const allJobs: Job[] = [];

  try {
    console.log(`[JORA] fetchJoraJobsWithPlaywright called with jobTitle="${jobTitle}", city="${city}", limit=${limit}`);
    appendToTerminal(`[JORA] fetchJoraJobsWithPlaywright called with jobTitle="${jobTitle}", city="${city}", limit=${limit}`);
    appendToTerminal('🌐 Launching browser for Jora...');
    browser = await chromium.launch({ 
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ]
    });
    page = await browser.newPage();

    // 直接访问职位搜索页
    function capitalizeWords(str: string) {
      return str.replace(/\b\w/g, c => c.toUpperCase());
    }
    const formattedTitle = capitalizeWords(jobTitle).replace(/\s+/g, '-');
    const formattedCity = capitalizeWords(city).replace(/\s+/g, '-');
    const state = cityToState[city] || 'NSW'; // 默认使用NSW

    let pageNum = 0;
    let hasMoreJobs = true;

    // 持续抓取直到达到限制或没有更多职位
    while (hasMoreJobs && allJobs.length < limit) {
      const start = pageNum * 15; // Jora的默认分页大小
      const searchUrl = `https://au.jora.com/${formattedTitle}-jobs-in-${formattedCity}-${state}?disallow=true&sp=recent_homepage&pt=unseen&start=${start}`;
      
      appendToTerminal(`🔍 Navigating to page ${pageNum + 1}: ${searchUrl}`);
      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      await page.waitForTimeout(5000);

      // 只保留页面长度和标题调试（如需）
      // const pageContent = await page.content();
      // appendToTerminal(`[DEBUG] Page content length: ${pageContent.length}`);
      // appendToTerminal(`[DEBUG] Page title: ${await page.title()}`);

      appendToTerminal(`⏳ Waiting for job listings on page ${pageNum + 1}...`);
      try {
        await page.waitForSelector('article, .job-listing, .job-card, .result-card, .job', { timeout: 10000 });
      } catch (error: any) {
        appendToTerminal(`[JORA] Selector wait failed: ${error?.message || 'Unknown error'}`);
        await page.screenshot({ path: `jora_debug_${pageNum}.png` });
        appendToTerminal(`[JORA] Saved debug screenshot to jora_debug_${pageNum}.png`);
      }
      appendToTerminal(`🔎 Scraping job list from page ${pageNum + 1}...`);
      const html = await page.content();
      const $ = cheerio.load(html);
      const jobs: Job[] = [];
      const jobElements = $('article, .job-listing, .job-card, .result-card, .job, [data-testid="job-card"]');
      appendToTerminal(`[JORA] Found ${jobElements.length} job elements on page ${pageNum + 1}`);

      // 如果没找到职位，输出页面结构以便调试
      if (jobElements.length === 0) {
        appendToTerminal('[DEBUG] No job elements found. Page structure:');
        appendToTerminal($('body').html()?.substring(0, 1000) || 'Empty body');
      }

      jobElements.each((i, element) => {
        const $element = $(element);
        const title = $element.find('.job-title, .title, h3, .job-name').text().trim();
        const company = $element.find('.company-name, .company, .employer, .job-company').text().trim();
        const location = $element.find('.location, .job-location, .area, .job-area').text().trim();
        const description = $element.find('.job-description, .description, .summary, .job-summary').text().trim();
        const url = $element.find('a').attr('href') || '';
        
        // 提取标签
        const tags: string[] = [];
        $element.find('.job-tags .tag, .tags .tag, .skills .skill, .job-skills .skill').each((_, tag) => {
          const tagText = $(tag).text().trim();
          if (tagText) tags.push(tagText);
        });

        // 提取发布日期
        const dateElement = $element.find('.posted-date, .date, .listing-date, .job-date');
        const postedDate = dateElement.length ? dateElement.text().trim() : undefined;

        if (title && company && location) {
          const jobId = Buffer.from(`jora-${title}-${company}-${location}`).toString('base64');
          jobs.push({
            id: jobId,
            title,
            company,
            location,
            description: description || '',
            tags,
            postedDate,
            platform: 'Jora',
            url: url.startsWith('http') ? url : `https://au.jora.com${url}`
          });
        }
      });

      appendToTerminal(`[JORA] Fetched ${jobs.length} jobs from page ${pageNum + 1}`);
      
      // 如果没有找到职位，说明已经到达最后一页
      if (jobs.length === 0) {
        appendToTerminal('Reached last page, stopping pagination');
        hasMoreJobs = false;
      } else {
        // 将当前页面的职位添加到总列表中
        allJobs.push(...jobs);
        pageNum++;
      }

      // 如果已经达到限制，停止抓取
      if (allJobs.length >= limit) {
        appendToTerminal(`Reached job limit of ${limit}, stopping pagination`);
        break;
      }

      // 等待一段时间再抓取下一页
      await page.waitForTimeout(1000);
    }

    appendToTerminal(`[JORA] Total jobs fetched from Jora: ${allJobs.length}`);
    console.log(`[JORA] Total jobs fetched from Jora: ${allJobs.length}`);
    if (allJobs.length > 0) {
      const sampleJob = allJobs[Math.floor(allJobs.length / 2)];
      appendToTerminal(`[JORA] Sample job: ${sampleJob.title} at ${sampleJob.company}`);
      console.log(`[JORA] Sample job: ${sampleJob.title} at ${sampleJob.company}`);
    }

    return allJobs.slice(0, limit);
  } catch (err: any) {
    appendToTerminal(`[JORA] ✗ Error fetching Jora jobs: ${err.message}`);
    console.log(`[JORA] ✗ Error fetching Jora jobs: ${err.message}`);
    if (page) {
      const html = await page.content();
      appendToTerminal('[JORA] Page content at error:');
      appendToTerminal(html.substring(0, 500) + '...');
      console.log('[JORA] Page content at error:', html.substring(0, 500) + '...');
      // 保存错误页面截图
      await page.screenshot({ path: 'jora_error.png' });
      appendToTerminal('[JORA] 📸 Saved error screenshot to jora_error.png');
      console.log('[JORA] 📸 Saved error screenshot to jora_error.png');
    }
    return [];
  } finally {
    if (browser) await browser.close();
  }
} 