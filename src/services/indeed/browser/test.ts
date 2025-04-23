import { IndeedBrowser } from './index';
import { SearchParams } from '../models/search';

async function testIndeedSearch() {
  const browser = new IndeedBrowser();
  
  try {
    console.log('初始化浏览器...');
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
    
    console.log('开始搜索职位...');
    const jobs = await browser.searchJobs(searchParams);
    
    console.log(`找到 ${jobs.length} 个职位`);
    jobs.forEach((job, index) => {
      console.log(`\n职位 ${index + 1}:`);
      console.log(`标题: ${job.title}`);
      console.log(`公司: ${job.company}`);
      console.log(`地点: ${job.location}`);
      if (job.salary) console.log(`薪资: ${job.salary}`);
      if (job.postedDate) console.log(`发布日期: ${job.postedDate}`);
      console.log(`链接: ${job.link}`);
    });
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  } finally {
    console.log('关闭浏览器...');
    await browser.close();
  }
}

// 运行测试
testIndeedSearch().catch(console.error); 