import { IndeedScraper } from './scraper';
import { SearchParams } from './models/search';
import { Job } from '@/types/job';

export class IndeedService {
  private scraper: IndeedScraper;

  constructor() {
    this.scraper = new IndeedScraper();
  }

  async init() {
    await this.scraper.init();
  }

  async close() {
    await this.scraper.close();
  }

  async searchJobs(params: SearchParams): Promise<Job[]> {
    try {
      return await this.scraper.scrapeJobs(params);
    } catch (error) {
      console.error('Error in IndeedService.searchJobs:', error);
      throw error;
    }
  }
} 