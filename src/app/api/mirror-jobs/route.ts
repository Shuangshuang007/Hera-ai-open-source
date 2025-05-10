import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { getKnowledgeGraph } from '@/utils/knowledgeGraph';
import { fetchJoraJobsWithPlaywright } from '@/utils/joraPlaywright';

// 定义职位接口
interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  requirements?: string[];
  benefits?: string[];
  jobType?: string;
  experience?: string;
  postedDate?: string;
  platform: string;
  url: string;
  tags?: string[];
}

interface JobSearchParams {
  jobTitle: string;
  city: string;
  skills: string[];
  seniority: string;
  openToRelocate: boolean;
  page: number;
  limit: number;
  appendToTerminal?: (message: string) => void;
}

// 根据职位类型选择合适的平台
function selectPlatforms(jobTitle: string, city: string): string[] {
  const platforms = new Set<string>();
  
  // 添加基础平台
  platforms.add('LinkedIn');
  platforms.add('Indeed');
  
  // 添加本地平台
  platforms.add('Seek');
  platforms.add('Jora');
  
  // 添加Adzuna作为补充平台
  platforms.add('Adzuna');
  
  // 如果是财会类职位,添加专业平台
  if (jobTitle.toLowerCase().includes('accountant') || 
      jobTitle.toLowerCase().includes('finance') ||
      jobTitle.toLowerCase().includes('accounting')) {
    platforms.add('eFinancialCareers');
  }
  
  // 确保至少有5个平台
  const platformList = Array.from(platforms);
  if (platformList.length < 5) {
    const additionalPlatforms = ['Adzuna', 'eFinancialCareers', 'Seek', 'Jora'];
    for (const platform of additionalPlatforms) {
      if (!platformList.includes(platform)) {
        platformList.push(platform);
      }
      if (platformList.length >= 5) break;
    }
  }
  
  return platformList;
}

// 定义平台特定的抓取函数
async function fetchLinkedInJobs(params: JobSearchParams): Promise<Job[]> {
  try {
    const { jobTitle, city, skills, seniority, page, limit } = params;
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(jobTitle)}&location=${encodeURIComponent(city)}&start=${(page - 1) * limit}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      }
    });
    
    const $ = cheerio.load(response.data);
    const jobs: Job[] = [];
    
    $('.jobs-search__results-list li').each((i, element) => {
      if (jobs.length >= limit) return false;
      
      const title = $(element).find('.base-search-card__title').text().trim();
      const company = $(element).find('.base-search-card__subtitle').text().trim();
      const location = $(element).find('.job-search-card__location').text().trim();
      const description = $(element).find('.job-search-card__snippet').text().trim();
      const url = $(element).find('a.base-card__full-link').attr('href') || '';
      
      // 确保 URL 是完整的
      const fullUrl = url.startsWith('http') ? url : `https://www.linkedin.com${url}`;
      
      // 提取职位类型和经验要求
      const metadata = $(element).find('.job-search-card__metadata-item').text().trim();
      const jobType = metadata.includes('Full-time') ? 'Full-time' :
                     metadata.includes('Part-time') ? 'Part-time' :
                     metadata.includes('Contract') ? 'Contract' :
                     metadata.includes('Internship') ? 'Internship' : undefined;
      
      const experience = metadata.includes('Entry level') ? 'Entry level' :
                        metadata.includes('Mid-Senior level') ? 'Mid-Senior level' :
                        metadata.includes('Senior level') ? 'Senior level' :
                        metadata.includes('Associate') ? 'Associate' : undefined;
      
      // 提取薪资信息
      const salaryMatch = metadata.match(/\$[\d,]+(?:\.\d{2})?(?:\s*-\s*\$[\d,]+(?:\.\d{2})?)?/);
      const salary = salaryMatch ? salaryMatch[0] : undefined;
      
      // 提取发布日期
      const postedDate = $(element).find('time').attr('datetime') || 
                        $(element).find('.job-search-card__listdate').text().trim();
      
      // 提取技能标签
      const tags: string[] = [];
      $(element).find('.job-search-card__skill-tag').each((_, tag) => {
        const tagText = $(tag).text().trim();
        if (tagText) tags.push(tagText);
      });
      
      // 提取要求和福利
      const requirements: string[] = [];
      const benefits: string[] = [];
      
      $(element).find('.job-search-card__requirements li').each((_, req) => {
        requirements.push($(req).text().trim());
      });
      
      $(element).find('.job-search-card__benefits li').each((_, benefit) => {
        benefits.push($(benefit).text().trim());
      });
      
      if (title && company && location) {
        const jobId = Buffer.from(`linkedin-${title}-${company}-${location}`).toString('base64');
        
        const job: Job = {
          id: jobId,
          title,
          company,
          location,
          description,
          salary,
          requirements,
          benefits,
          jobType,
          experience,
          postedDate,
          tags,
          platform: 'LinkedIn',
          url: fullUrl
        };
        jobs.push(job);
      }
    });
    
    console.log(`Found ${jobs.length} LinkedIn jobs for ${jobTitle} in ${city}`);
    return jobs;
  } catch (error) {
    console.error('Error fetching LinkedIn jobs:', error);
    return [];
  }
}

// Seek 职位抓取函数
export async function fetchSeekJobs(params: JobSearchParams): Promise<Job[]> {
  const { jobTitle, city, skills, seniority, page, limit = 60, appendToTerminal = console.log } = params;
  try {
    // 修改 URL 构建逻辑
    const formattedJobTitle = jobTitle.toLowerCase().replace(/\s+/g, '-');
    const formattedCity = city.toLowerCase();
    const searchUrl = `https://www.seek.com.au/${formattedJobTitle}-jobs/in-${formattedCity}`;
    
    appendToTerminal(`🌐 Fetching jobs from Seek for: ${jobTitle}, ${city}`);
    appendToTerminal(`GET ${searchUrl}`);
    
    const startTime = performance.now();
    const response = await axios.get(searchUrl, {
      params: {
        page: page,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-AU,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.seek.com.au'
      },
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: (status) => status < 400,
      proxy: false
    });
    
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    appendToTerminal(`✓ Response received in ${duration}ms`);
    
    if (!response.data) {
      throw new Error('Empty response from Seek');
    }

    // 检查是否需要登录
    if (response.data.includes('login') || response.data.includes('sign in')) {
      appendToTerminal('⚠️ Seek requires login to view more jobs. Please log in to your Seek account.');
      return [];
    }
    
    const $ = cheerio.load(response.data);
    const jobs: Job[] = [];
    
    // 更新选择器以匹配最新的 Seek 页面结构
    $('article[data-automation="normalJob"], [data-automation="searchArticle"]').each((i, element) => {
      if (jobs.length >= limit) return false;
      
      const title = $(element).find('[data-automation="jobTitle"], .jobTitle-link, .job-title').text().trim();
      const company = $(element).find('[data-automation="jobCompany"], .company-name, .job-company').text().trim();
      const location = $(element).find('[data-automation="jobLocation"], .location, .job-location').text().trim();
      const description = $(element).find('[data-automation="jobShortDescription"], .job-description, .job-short-description').text().trim();
      const url = $(element).find('a[data-automation="jobTitle"], a.jobTitle-link, a.job-link').attr('href') || '';
      
      // 提取职位类型
      const jobTypeElement = $(element).find('[data-automation="jobWorkType"], .work-type, .job-work-type');
      const jobType = jobTypeElement.length ? jobTypeElement.text().trim() : undefined;
      
      // 提取薪资信息
      const salaryElement = $(element).find('[data-automation="jobSalary"], .salary, .job-salary');
      const salary = salaryElement.length ? salaryElement.text().trim() : undefined;
      
      // 提取发布日期
      const dateElement = $(element).find('[data-automation="jobListingDate"], .listing-date, .job-date');
      const postedDate = dateElement.length ? dateElement.text().trim() : undefined;
      
      // 提取技能标签
      const tags: string[] = [];
      $(element).find('[data-automation="jobTag"], .job-tag, .skill-tag').each((_, tag) => {
        const tagText = $(tag).text().trim();
        if (tagText) tags.push(tagText);
      });
      
      if (title && company && location) {
        const jobId = Buffer.from(`seek-${title}-${company}-${location}`).toString('base64');
        
        const job: Job = {
          id: jobId,
          title,
          company,
          location,
          description,
          salary,
          jobType,
          postedDate,
          tags,
          platform: 'Seek',
          url: url.startsWith('http') ? url : `https://www.seek.com.au${url}`,
          source: 'official'
        };
        jobs.push(job);
      }
    });
    
    appendToTerminal(`✅ Found ${jobs.length} job titles from Seek`);
    return jobs;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    appendToTerminal(`✗ Error fetching Seek jobs: ${errorMessage}`);
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as any;
      appendToTerminal(`Status code: ${axiosError.response?.status}`);
      appendToTerminal(`Response data: ${JSON.stringify(axiosError.response?.data)}`);
    }
    console.error('Error fetching Seek jobs:', error);
    return [];
  }
}

// Indeed 职位抓取函数
async function fetchIndeedJobs(params: JobSearchParams): Promise<Job[]> {
  try {
    const { jobTitle, city, skills, seniority, page, limit } = params;
    const searchUrl = `https://au.indeed.com/jobs?q=${encodeURIComponent(jobTitle)}&l=${encodeURIComponent(city)}&start=${(page - 1) * limit}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive'
      }
    });
    
    const $ = cheerio.load(response.data);
    const jobs: Job[] = [];
    
    $('.job_seen_beacon').each((i, element) => {
      if (jobs.length >= limit) return false;
      
      const title = $(element).find('.jobTitle').text().trim();
      const company = $(element).find('.companyName').text().trim();
      const location = $(element).find('.companyLocation').text().trim();
      const description = $(element).find('.job-snippet').text().trim();
      const url = $(element).find('a.jcs-JobTitle').attr('href') || '';
      
      // 提取薪资信息
      const salaryElement = $(element).find('.salary-snippet');
      const salary = salaryElement.length ? salaryElement.text().trim() : undefined;
      
      // 提取职位类型
      const jobTypeElement = $(element).find('.metadata:contains("job type")');
      const jobType = jobTypeElement.length ? jobTypeElement.text().trim() : undefined;
      
      // 提取发布日期
      const dateElement = $(element).find('.date');
      const postedDate = dateElement.length ? dateElement.text().trim().replace('Posted', '').trim() : undefined;
      
      // 提取要求和福利
      const requirements: string[] = [];
      const benefits: string[] = [];
      
      $(element).find('.jobCardReqList li').each((_, req) => {
        requirements.push($(req).text().trim());
      });
      
      $(element).find('.jobCardBenefitsList li').each((_, benefit) => {
        benefits.push($(benefit).text().trim());
      });
      
      if (title && company && location) {
        const jobId = Buffer.from(`indeed-${title}-${company}-${location}`).toString('base64');
        
        const job: Job = {
          id: jobId,
          title,
          company,
          location,
          description,
          salary,
          requirements,
          benefits,
          jobType,
          postedDate,
          platform: 'Indeed',
          url: url.startsWith('http') ? url : `https://au.indeed.com${url}`
        };
        jobs.push(job);
      }
    });
    
    console.log(`Found ${jobs.length} Indeed jobs for ${jobTitle} in ${city}`);
    return jobs;
  } catch (error) {
    console.error('Error fetching Indeed jobs:', error);
    return [];
  }
}

// Jora 职位抓取函数
async function fetchJoraJobs(params: JobSearchParams): Promise<Job[]> {
  try {
    console.log('Fetching Jora jobs with limit:', params.limit);
    const response = await fetch(
      `/api/jora?jobTitle=${encodeURIComponent(params.jobTitle)}&city=${encodeURIComponent(params.city)}&limit=${params.limit || 60}`
    );
    if (!response.ok) {
      throw new Error(`Jora API error: ${response.statusText}`);
    }
    const data = await response.json();
    console.log('Received Jora jobs:', data.jobs.length);
    return data.jobs;
  } catch (error: any) {
    console.error('Error fetching Jora jobs:', error);
    return [];
  }
}

// eFinancialCareers 职位抓取函数
async function fetchEFinancialCareersJobs(params: JobSearchParams): Promise<Job[]> {
  try {
    const { jobTitle, city, skills, seniority, page, limit } = params;
    const searchUrl = `https://www.efinancialcareers.com/jobs-${encodeURIComponent(jobTitle)}-in-${encodeURIComponent(city)}`;
    
    const response = await axios.get(searchUrl, {
      params: {
        page: page,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive'
      }
    });
    
    const $ = cheerio.load(response.data);
    const jobs: Job[] = [];
    
    $('.job-card').each((i, element) => {
      if (jobs.length >= limit) return false;
      
      const title = $(element).find('.job-card__title').text().trim();
      const company = $(element).find('.job-card__company').text().trim();
      const location = $(element).find('.job-card__location').text().trim();
      const description = $(element).find('.job-card__description').text().trim();
      const url = $(element).find('a.job-card__link').attr('href') || '';
      
      // 提取薪资信息
      const salaryElement = $(element).find('.job-card__salary');
      const salary = salaryElement.length ? salaryElement.text().trim() : undefined;
      
      // 提取职位类型
      const jobTypeElement = $(element).find('.job-card__type');
      const jobType = jobTypeElement.length ? jobTypeElement.text().trim() : undefined;
      
      // 提取发布日期
      const dateElement = $(element).find('.job-card__date');
      const postedDate = dateElement.length ? dateElement.text().trim() : undefined;
      
      // 提取技能标签
      const tags: string[] = [];
      $(element).find('.job-card__tags .tag').each((_, tag) => {
        const tagText = $(tag).text().trim();
        if (tagText) tags.push(tagText);
      });
      
      // 提取要求和福利
      const requirements: string[] = [];
      const benefits: string[] = [];
      
      $(element).find('.job-card__requirements li').each((_, req) => {
        requirements.push($(req).text().trim());
      });
      
      $(element).find('.job-card__benefits li').each((_, benefit) => {
        benefits.push($(benefit).text().trim());
      });
      
      if (title && company && location) {
        const jobId = Buffer.from(`efinancialcareers-${title}-${company}-${location}`).toString('base64');
        
        const job: Job = {
          id: jobId,
          title,
          company,
          location,
          description,
          salary,
          requirements,
          benefits,
          jobType,
          postedDate,
          tags,
          platform: 'eFinancialCareers',
          url: url.startsWith('http') ? url : `https://www.efinancialcareers.com${url}`
        };
        jobs.push(job);
      }
    });
    
    console.log(`Found ${jobs.length} eFinancialCareers jobs for ${jobTitle} in ${city}`);
    return jobs;
  } catch (error) {
    console.error('Error fetching eFinancialCareers jobs:', error);
    return [];
  }
}

// Adzuna 职位抓取函数
async function fetchAdzunaJobs(jobTitle: string, city: string, limit: number = 60): Promise<Job[]> {
  try {
    console.log('Fetching Adzuna jobs with params:', { jobTitle, city, limit });
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002'}/api/adzuna?jobTitle=${encodeURIComponent(jobTitle)}&city=${encodeURIComponent(city)}&limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`Adzuna API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Received ${data.jobs?.length || 0} jobs from Adzuna`);
    return data.jobs || [];
  } catch (error) {
    console.error('Error fetching Adzuna jobs:', error);
    return [];
  }
}

// 交错排序函数
function interleaveJobs(jobsByPlatform: { [key: string]: Job[] }, maxJobs: number = 200): Job[] {
  const platforms = Object.keys(jobsByPlatform);
  const result: Job[] = [];
  const batchSize = 5;
  
  // 计算每个平台需要取出的批次数量
  const batches = Math.ceil(maxJobs / (platforms.length * batchSize));
  
  for (let batch = 0; batch < batches; batch++) {
    for (const platform of platforms) {
      const start = batch * batchSize;
      const end = start + batchSize;
      const platformJobs = jobsByPlatform[platform].slice(start, end);
      result.push(...platformJobs);
      
      // 如果已经达到最大职位数，就停止
      if (result.length >= maxJobs) {
        return result.slice(0, maxJobs);
      }
    }
  }
  
  return result;
}

// 过滤30天内的职位
function filterRecentJobs(jobs: Job[]): Job[] {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return jobs.filter(job => {
    if (!job.postedDate) return true; // 如果没有日期信息，默认保留
    
    const postedDate = new Date(job.postedDate);
    return !isNaN(postedDate.getTime()) && postedDate >= thirtyDaysAgo;
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobTitle = searchParams.get('jobTitle') || '';
  const city = searchParams.get('city') || '';
  const skills = (searchParams.get('skills') || '').split(',').filter(Boolean);
  const seniority = searchParams.get('seniority') || '';
  const openToRelocate = searchParams.get('openToRelocate') === 'true';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '60');
  const platform = searchParams.get('platform') || '';

  console.log('mirror-jobs API called with:', {
    jobTitle,
    city,
    skills,
    seniority,
    openToRelocate,
    page,
    limit
  });

  if (!jobTitle || !city) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    const searchParams: JobSearchParams = {
      jobTitle,
      city,
      skills,
      seniority,
      openToRelocate,
      page,
      limit: 60 // 每个平台最多获取60个职位
    };

    // 根据职位类型选择合适的平台
    const platforms = selectPlatforms(jobTitle, city);
    const jobsByPlatform: { [key: string]: Job[] } = {};
    
    // 并行获取所有平台的职位
    const fetchPromises = platforms.map(async platform => {
      let jobs: Job[] = [];
      switch (platform.toLowerCase()) {
        case 'linkedin':
          jobs = await fetchLinkedInJobs(searchParams);
          break;
        case 'seek':
          jobs = await fetchSeekJobs(searchParams);
          break;
        case 'indeed':
          jobs = await fetchIndeedJobs(searchParams);
          break;
        case 'jora':
          jobs = await fetchJoraJobs(searchParams);
          break;
        case 'efinancialcareers':
          jobs = await fetchEFinancialCareersJobs(searchParams);
          break;
        case 'adzuna': {
          // 只要能抓取到真实职位就直接用真实数据
          const adzunaJobs = await fetchAdzunaJobs(jobTitle, city, limit);
          if (adzunaJobs && adzunaJobs.length > 0) {
            jobs = adzunaJobs;
          } else {
            // 若真实数据为0，可选：可加fallback逻辑（如有需要）
            jobs = [];
          }
          break;
        }
      }
      // 过滤30天内的职位
      jobs = filterRecentJobs(jobs);
      if (jobs.length > 0) {
        jobsByPlatform[platform] = jobs;
      }
    });
    
    await Promise.all(fetchPromises);
    
    // 交错排序所有平台的职位
    const allJobs = interleaveJobs(jobsByPlatform);
    
    // 实现分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedJobs = allJobs.slice(startIndex, endIndex);
    
    // 返回分页后的数据和总数
    return NextResponse.json({
      jobs: paginatedJobs,
      total: allJobs.length,
      page,
      totalPages: Math.ceil(allJobs.length / limit)
    });
  } catch (error) {
    console.error('Error in mirror-jobs API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
} 