const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { fetchSeekJobs } = require('./seekCrawler');

async function testSeekJobs() {
  try {
    console.log('开始测试 SEEK 职位抓取...');
    const jobs = await fetchSeekJobs('software-engineer', 'melbourne', 2);
    
    console.log(`成功抓取 ${jobs.length} 个职位`);
    
    jobs.forEach((job, index) => {
      console.log(`\n职位 ${index + 1}:`);
      console.log('标题:', job.title);
      console.log('公司:', job.company);
      console.log('地点:', job.location);
      console.log('描述:', job.description);
      console.log('完整描述:', job.fullDescription);
      console.log('要求:', job.requirements);
      console.log('URL:', job.url);
      console.log('来源:', job.source);
      console.log('平台:', job.platform);
      console.log('概要:', job.summary);
      console.log('详细概要:', job.detailedSummary);
      console.log('匹配分数:', job.matchScore);
      console.log('匹配分析:', job.matchAnalysis);
    });
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testSeekJobs(); 