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

export async function fetchJoraJobsWithPlaywright(options: JoraPlaywrightOptions): Promise<Job[]> {
  const { jobTitle, city, limit = 20, appendToTerminal = () => {} } = options;
  let browser: Browser | null = null;
  let page: Page | null = null;
  try {
    appendToTerminal('🌐 Launching browser for Jora...');
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();

    // 直接访问职位搜索页
    function capitalizeWords(str: string) {
      return str.replace(/\b\w/g, c => c.toUpperCase());
    }
    const formattedTitle = capitalizeWords(jobTitle).replace(/\s+/g, '-');
    const formattedCity = capitalizeWords(city).replace(/\s+/g, '-');
    const searchUrl = `https://au.jora.com/${formattedTitle}-jobs-in-${formattedCity}-VIC?disallow=true&sp=recent_homepage&pt=unseen`;
    appendToTerminal(`🔍 Navigating to search page: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 抓取职位列表HTML
    appendToTerminal('🔎 Scraping job list from Jora...');
    const html = await page.content();
    const $ = cheerio.load(html);
    const jobs: Job[] = [];
    $('.job-card').each((i, element) => {
      if (jobs.length >= limit) return false;
      const title = $(element).find('.job-title').text().trim();
      const company = $(element).find('.company-name').text().trim();
      const location = $(element).find('.location').text().trim();
      const description = $(element).find('.job-description').text().trim();
      const url = $(element).find('a.job-link').attr('href') || '';
      const tags: string[] = [];
      $(element).find('.job-tags .tag').each((_, tag) => {
        const tagText = $(tag).text().trim();
        if (tagText) tags.push(tagText);
      });
      const dateElement = $(element).find('.posted-date');
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
    appendToTerminal(`✓ Found ${jobs.length} jobs on Jora.`);
    return jobs;
  } catch (err: any) {
    appendToTerminal(`✗ Error fetching Jora jobs: ${err.message}`);
    return [];
  } finally {
    if (browser) await browser.close();
  }
} 