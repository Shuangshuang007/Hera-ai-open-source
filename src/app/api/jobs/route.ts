import { NextResponse } from 'next/server';

// 模拟职位数据结构
interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  source: "SEEK" | "Indeed" | "LinkedIn";
  postedTime?: string;
  recommendedReason?: string;
  isRemote?: boolean;
  isGptRecommended?: boolean;
  isFeatured?: boolean;
}

// 构造搜索 URL
function constructSearchUrls(jobTitle: string, city: string) {
  const encodedJobTitle = encodeURIComponent(jobTitle);
  const encodedCity = encodeURIComponent(city);

  return {
    seek: `https://www.seek.com.au/${encodedJobTitle}-jobs/in-${encodedCity}`,
    indeed: `https://au.indeed.com/jobs?q=${encodedJobTitle}&l=${encodedCity}`,
    linkedin: `https://www.linkedin.com/jobs/search?keywords=${encodedJobTitle}&location=${encodedCity}`,
  };
}

// 模拟从各平台获取数据
async function fetchJobsFromPlatform(platform: string, url: string): Promise<JobPosting[]> {
  // TODO: 实现实际的抓取逻辑
  // 这里先返回模拟数据
  return Array(10).fill(null).map((_, index) => ({
    id: `${platform}-${index + 1}`,
    title: `${platform} Job ${index + 1}`,
    company: `Company ${index + 1}`,
    location: 'Melbourne, VIC',
    url: `https://example.com/job/${index + 1}`,
    source: platform as "SEEK" | "Indeed" | "LinkedIn",
    postedTime: '2d ago',
    isRemote: Math.random() > 0.5,
    isGptRecommended: Math.random() > 0.7,
    isFeatured: Math.random() > 0.8,
  }));
}

// 去重逻辑
function deduplicateJobs(jobs: JobPosting[]): JobPosting[] {
  const seen = new Set();
  return jobs.filter(job => {
    const key = `${job.title}-${job.company}-${job.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function POST(request: Request) {
  try {
    const { jobTitle, city } = await request.json();
    
    if (!jobTitle || !city) {
      return NextResponse.json(
        { error: 'Job title and city are required' },
        { status: 400 }
      );
    }

    const urls = constructSearchUrls(jobTitle, city);
    
    // 并行获取所有平台的数据
    const [seekJobs, indeedJobs, linkedinJobs] = await Promise.all([
      fetchJobsFromPlatform('SEEK', urls.seek),
      fetchJobsFromPlatform('Indeed', urls.indeed),
      fetchJobsFromPlatform('LinkedIn', urls.linkedin),
    ]);

    // 合并所有职位
    let allJobs = [...seekJobs, ...indeedJobs, ...linkedinJobs];
    
    // 去重
    allJobs = deduplicateJobs(allJobs);

    // 按平台优先级和原始顺序排序
    const sortedJobs = allJobs.sort((a, b) => {
      const platformPriority = {
        SEEK: 1,
        LinkedIn: 2,
        Indeed: 3,
      };
      return platformPriority[a.source] - platformPriority[b.source];
    });

    // 只返回前 10 条结果
    const topJobs = sortedJobs.slice(0, 10);

    return NextResponse.json({ jobs: topJobs });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
} 