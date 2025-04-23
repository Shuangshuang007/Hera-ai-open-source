import { IndeedService } from './index';
import { SearchParams } from './models/search';

async function testIndeedSearch() {
  console.log('开始测试 Indeed 搜索...');
  
  const service = new IndeedService();
  
  try {
    // 初始化服务
    await service.init();
    console.log('服务初始化成功');
    
    // 准备搜索参数
    const searchParams: SearchParams = {
      keywords: 'software engineer',
      location: 'San Francisco, CA',
      radius: 50,
      jobType: ['Full-time'],
      experience: ['Entry Level', 'Mid Level'],
      sort: 'date',
      fromAge: 7
    };
    
    console.log('开始搜索职位...');
    console.log('搜索参数:', JSON.stringify(searchParams, null, 2));
    
    // 执行搜索
    const jobs = await service.searchJobs(searchParams);
    
    console.log(`找到 ${jobs.length} 个职位`);
    console.log('前5个职位:');
    jobs.slice(0, 5).forEach((job, index) => {
      console.log(`\n职位 ${index + 1}:`);
      console.log('标题:', job.title);
      console.log('公司:', job.company);
      console.log('地点:', job.location);
      console.log('薪资:', job.salary || '未提供');
      console.log('发布日期:', job.postedDate || '未提供');
      console.log('匹配分数:', job.matchScore || '未计算');
      console.log('URL:', job.url);
    });
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  } finally {
    // 关闭服务
    await service.close();
    console.log('服务已关闭');
  }
}

// 运行测试
testIndeedSearch().catch(console.error); 