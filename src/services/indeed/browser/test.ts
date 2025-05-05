import { IndeedBrowser } from './index';
import { SearchParams } from '../models/search';

async function testIndeedSearch() {
  const browser = new IndeedBrowser();
  
  try {
    console.log('Initializing browser...');
    await browser.init();
    
    const searchParams: SearchParams = {
      keywords: 'software engineer',
      location: 'San Francisco, CA',
      radius: 25,
      jobType: ['fulltime'],
      experience: ['entry_level', 'mid_level'],
      sort: 'date',
      fromAge: 7
    };
    
    console.log('Starting job search...');
    const jobs = await browser.searchJobs(searchParams);
    
    console.log(`Found ${jobs.length} jobs`);
    jobs.forEach((job, index) => {
      console.log(`\nJob ${index + 1}:`);
      console.log(`Title: ${job.title}`);
      console.log(`Company: ${job.company}`);
      console.log(`Location: ${job.location}`);
      if (job.salary) console.log(`Salary: ${job.salary}`);
      if (job.postedDate) console.log(`Posted Date: ${job.postedDate}`);
      console.log(`Link: ${job.link}`);
    });
    
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    console.log('Closing browser...');
    await browser.close();
  }
}

// 运行测试
testIndeedSearch().catch(console.error); 