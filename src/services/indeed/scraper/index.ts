import { IndeedBrowser } from '../browser';
import { SearchParams } from '../models/search';
import { IndeedJobListing } from '../models/job';
import { Job } from '@/types/job';

export class IndeedScraper {
  private browser: IndeedBrowser;

  constructor() {
    this.browser = new IndeedBrowser();
  }

  async init() {
    await this.browser.init();
  }

  async close() {
    await this.browser.close();
  }

  async scrapeJobs(params: SearchParams): Promise<Job[]> {
    try {
      const listings = await this.browser.searchJobs(params);
      const jobs: Job[] = [];

      for (const listing of listings) {
        const job = await this.scrapeJobDetails(listing);
        if (job) {
          jobs.push(job);
        }
      }

      return jobs;
    } catch (error) {
      console.error('Error scraping jobs:', error);
      throw error;
    }
  }

  private async scrapeJobDetails(listing: IndeedJobListing): Promise<Job | null> {
    try {
      // 这里需要实现职位详情的抓取逻辑
      // 暂时返回基本数据
      return {
        id: this.generateJobId(listing),
        title: listing.title,
        company: listing.company,
        location: listing.location,
        url: listing.link,
        platform: 'indeed',
        description: listing.description,
        salary: listing.salary,
        postedDate: listing.postedDate,
        // 其他字段保持默认值
      };
    } catch (error) {
      console.error(`Error scraping job details for ${listing.title}:`, error);
      return null;
    }
  }

  private generateJobId(listing: IndeedJobListing): string {
    // 使用职位标题和公司名称生成唯一ID
    return Buffer.from(`${listing.title}-${listing.company}`).toString('base64');
  }
} 