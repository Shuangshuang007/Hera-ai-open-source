import { chromium } from 'playwright';
import { Job } from '@/types/job';

// 更新城市到location code的映射
const cityToLocationCode: { [key: string]: string[] } = {
  'sydney': ['98095'],
  'melbourne': ['98127', '98511'], // Melbourne有两个location code
  'brisbane': ['98644'],
  'perth': ['98111'],
  'adelaide': ['98518'],
  'hobart': ['98426'],
  'darwin': ['98523'],
  'canberra': ['98122'],
  'gold coast': ['98536'],
  'newcastle': ['98545']
};

export async function fetchAdzunaJobsWithPlaywright(
  jobTitle: string,
  city: string,
  limit: number = 60
): Promise<Job[]> {
  console.log('Starting Adzuna job scraping...');
  const browser = await chromium.launch({ 
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080'
    ]
  });
  const jobs: Job[] = [];
  let currentPage = 1;

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-AU',
      timezoneId: 'Australia/Sydney',
      geolocation: { longitude: 151.2093, latitude: -33.8688 }, // Sydney coordinates
      permissions: ['geolocation']
    });

    // 设置全局超时
    context.setDefaultTimeout(60000);
    context.setDefaultNavigationTimeout(60000);

    const page = await context.newPage();

    // 获取location code
    const locationCodes = cityToLocationCode[city.toLowerCase()] || [city.toLowerCase()];
    console.log(`Using location codes for ${city}: ${locationCodes.join(', ')}`);

    // 格式化搜索URL
    const formattedTitle = jobTitle.replace(/\s+/g, '+').toLowerCase();
    
    // 对每个location code进行搜索
    for (const locationCode of locationCodes) {
      const baseUrl = `https://www.adzuna.com.au/search?q=${formattedTitle}&loc=${locationCode}`;
      console.log(`Fetching jobs from Adzuna with URL: ${baseUrl}`);

      while (jobs.length < limit) {
        const pageUrl = currentPage === 1 ? baseUrl : `${baseUrl}&p=${currentPage}`;
        console.log(`Fetching page ${currentPage} from Adzuna...`);
        
        try {
          // 使用domcontentloaded等待页面基本加载
          await page.goto(pageUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
          });

          // 等待页面加载完成
          await page.waitForLoadState('networkidle', { timeout: 30000 });
          
          // 等待页面主要内容加载
          await page.waitForSelector('.search-result__job', { 
            timeout: 30000,
            state: 'attached'
          });

          console.log(`Scraping job list from Adzuna page ${currentPage}...`);
          const jobElements = await page.$$('.search-result__job');
          console.log(`Found ${jobElements.length} potential job elements on Adzuna page ${currentPage}`);

          if (jobElements.length === 0) {
            console.log('No more jobs found on Adzuna, stopping pagination');
            break;
          }

          for (const element of jobElements) {
            if (jobs.length >= limit) {
              console.log(`Reached job limit of ${limit} on Adzuna, stopping pagination`);
              break;
            }

            try {
              const title = await element.$eval('.job-title', el => el.textContent?.trim() || '');
              const company = await element.$eval('.company-name', el => el.textContent?.trim() || '');
              const location = await element.$eval('.location', el => el.textContent?.trim() || '');
              const description = await element.$eval('.job-description', el => el.textContent?.trim() || '');
              const url = await element.$eval('a.job-link', el => el.getAttribute('href') || '');
              
              // 提取薪资信息
              const salaryElement = await element.$('.salary');
              const salary = salaryElement ? await salaryElement.textContent() : undefined;

              // 提取职位类型
              const jobTypeElement = await element.$('.job-type');
              const jobType = jobTypeElement ? await jobTypeElement.textContent() : undefined;

              // 提取发布日期
              const dateElement = await element.$('.posted-date');
              const postedDate = dateElement ? await dateElement.textContent() : undefined;

              // 提取标签
              const tagElements = await element.$$('.job-tag');
              const tags = await Promise.all(
                tagElements.map(tag => tag.textContent())
              );

              if (title && company && location) {
                const jobId = Buffer.from(`adzuna-${title}-${company}-${location}`).toString('base64');
                
                const job: Job = {
                  id: jobId,
                  title,
                  company,
                  location,
                  description,
                  salary: salary || undefined,
                  jobType: jobType || undefined,
                  postedDate: postedDate || undefined,
                  tags: tags.filter(Boolean) as string[],
                  platform: 'Adzuna',
                  url: url.startsWith('http') ? url : `https://www.adzuna.com.au${url}`
                };
                
                jobs.push(job);
              }
            } catch (error) {
              console.error('Error processing Adzuna job element:', error);
              continue;
            }
          }

          console.log(`Fetched ${jobs.length} jobs from Adzuna page ${currentPage}`);
          
          if (jobs.length < limit) {
            currentPage++;
            console.log(`Navigating to Adzuna page ${currentPage}: ${pageUrl}`);
          } else {
            break;
          }
        } catch (error) {
          console.error(`Error loading Adzuna page ${currentPage}:`, error);
          break;
        }
      }

      // 如果已经达到limit,跳出location code循环
      if (jobs.length >= limit) {
        break;
      }
    }

    console.log(`Total jobs fetched from Adzuna: ${jobs.length}`);
    if (jobs.length > 0) {
      console.log('Sample job from Adzuna:', jobs[jobs.length - 1].title);
    }

    return jobs;
  } catch (error) {
    console.error('Error in Adzuna job scraping:', error);
    return [];
  } finally {
    await browser.close();
  }
} 