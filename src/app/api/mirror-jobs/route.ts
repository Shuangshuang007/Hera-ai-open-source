import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { getKnowledgeGraph } from '@/utils/knowledgeGraph';
import { fetchJoraJobsWithPlaywright } from '@/utils/joraPlaywright';
import { chromium } from 'playwright';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1',
});

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
  source?: string;
  summary: string;
  detailedSummary: string;
  matchScore: number | undefined;
  matchAnalysis: string;
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

// Adzuna 城市与州映射表
const cityStateMap: Record<string, { state: string, city: string }> = {
  'Melbourne': { state: 'victoria', city: 'melbourne' },
  'Sydney': { state: 'new-south-wales', city: 'sydney' },
  'Brisbane': { state: 'queensland', city: 'brisbane' },
  'Perth': { state: 'western-australia', city: 'perth' },
  'Adelaide': { state: 'south-australia', city: 'adelaide' },
  'Canberra': { state: 'australian-capital-territory', city: 'canberra' },
  'Hobart': { state: 'tasmania', city: 'hobart' },
  'Darwin': { state: 'northern-territory', city: 'darwin' }
};

// Adzuna城市location code映射表
const adzunaLocationCodes: Record<string, string> = {
  'Melbourne': '98127',
  'Sydney': '98095',
  'Perth': '98111',
  'Brisbane': '98140',
  'Hobart': '98115',
  'Canberra': '98122',
};

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
  
  // 确保至少有5个平台
  const platformList = Array.from(platforms);
  if (platformList.length < 5) {
    const additionalPlatforms = ['Adzuna', 'Seek', 'Jora'];
    for (const platform of additionalPlatforms) {
      if (!platformList.includes(platform)) {
        platformList.push(platform);
      }
      if (platformList.length >= 5) break;
    }
  }
  
  return platformList;
}

// 添加 GPT 分析函数
async function analyzeJobWithGPT(job: Job): Promise<Job> {
  try {
    // 如果已经有分析结果，直接返回
    if (job.matchScore !== undefined && job.summary && job.detailedSummary && job.matchAnalysis) {
      return job;
    }

    const prompt = `Analyze the following job posting and provide a structured response:

Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description}

Please provide your analysis in the following EXACT format:

SUMMARY:
[Provide a brief summary of the role]

WHO WE ARE:
[Describe the company and team]

WHO WE ARE LOOKING FOR:
[List key requirements and qualifications]

BENEFITS:
[List main benefits and perks]

MATCH SCORE: [number between 0-100]

ANALYSIS:
[Provide detailed analysis of the role and candidate fit]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a job analysis expert. Always respond in the exact format specified, with clear section headers and consistent structure.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const content = completion.choices[0].message.content || '';

    // 使用更健壮的解析逻辑
    const sections = content.split('\n\n');
    const parsedData: Record<string, string> = {};

    for (const section of sections) {
      const lines = section.split('\n');
      const header = lines[0].trim();
      const content = lines.slice(1).join('\n').trim();

      if (header.includes('SUMMARY:')) {
        parsedData.summary = content;
      } else if (header.includes('WHO WE ARE:')) {
        parsedData.detailedSummary = content;
      } else if (header.includes('MATCH SCORE:')) {
        // 修复：直接从 header 中提取分数
        const scoreMatch = header.match(/MATCH SCORE:\s*(\d+)/);
        parsedData.matchScore = scoreMatch ? scoreMatch[1] : '';
      } else if (header.includes('ANALYSIS:')) {
        parsedData.matchAnalysis = content;
      }
    }

    // 更新职位信息
    job.summary = parsedData.summary || `${job.title} position at ${job.company} in ${job.location}.`;
    job.detailedSummary = parsedData.detailedSummary || '';
    job.matchScore = parsedData.matchScore ? parseInt(parsedData.matchScore) : 60; // 设置默认值为 60
    job.matchAnalysis = parsedData.matchAnalysis || 'Analysis unavailable.';

    return job;
  } catch (error) {
    // 提供基本的错误恢复
    job.summary = `${job.title} position at ${job.company} in ${job.location}.`;
    job.detailedSummary = job.description ? job.description.substring(0, 200) + '...' : '';
    job.matchScore = 60; // 设置默认值为 60
    job.matchAnalysis = 'Analysis unavailable due to processing error.';
    return job;
  }
}

// 修改 fetchLinkedInJobs 函数
async function fetchLinkedInJobs(params: JobSearchParams): Promise<Job[]> {
  const { jobTitle, city, skills, seniority, page: pageNum, limit } = params;
  
  // 使用 userDataDir 方式，完整复用浏览器登录态
  const browser = await chromium.launchPersistentContext(process.cwd() + '/linkedin-user-data-linkedin', {
    headless: false,
    args: [
      '--window-size=1400,900',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    ],
    viewport: { width: 1400, height: 900 },
    locale: 'en-US',
    timezoneId: 'Australia/Sydney',
    geolocation: { longitude: 144.9631, latitude: -37.8136 },
    permissions: ['geolocation']
  });

  // 防检测脚本
  await browser.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    
  const browserPage = await browser.newPage();
    const jobs: Job[] = [];
    
  try {
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(jobTitle)}&location=${encodeURIComponent(city)}&start=${(pageNum - 1) * limit}`;
    
    await browserPage.goto(searchUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // 自动关闭 LinkedIn 登录弹窗
    try {
      const closeBtn = await browserPage.$('button[aria-label="Dismiss"], button[aria-label="Close"]');
      if (closeBtn) {
        await closeBtn.click();
        await browserPage.waitForTimeout(1000);
      }
    } catch (e) {
    }
    
    // 等待职位列表加载
    await browserPage.waitForSelector('.jobs-search__results-list', { 
      timeout: 60000,
      state: 'attached'
    });
      
    // 等待一下确保页面完全加载
    await browserPage.waitForTimeout(5000);
    
    // 获取所有职位卡片
    const jobElements = await browserPage.$$('.jobs-search__results-list li');

    for (let i = 0; i < Math.min(jobElements.length, limit); i++) {
      try {
        const jobElement = jobElements[i];
        
        // 等待元素可见
        await jobElement.waitForElementState('visible', { timeout: 10000 });
        
        let title = '';
        let company = '';
        let location = '';
        let url = '';
      
        // 提取基本信息
        try {
          title = await jobElement.$eval('h3.base-search-card__title', (el: Element) => el.textContent?.trim() || '');
        } catch (error) {
        }
        
        try {
          company = await jobElement.$eval('h4.base-search-card__subtitle', (el: Element) => el.textContent?.trim() || '');
        } catch (error) {
        }
        
        try {
          location = await jobElement.$eval('.job-search-card__location', (el: Element) => el.textContent?.trim() || '');
        } catch (error) {
        }
        
        try {
          url = await jobElement.$eval('a.base-card__full-link', (el: Element) => (el as HTMLAnchorElement).href);
        } catch (error) {
        }
        
        // 检查 GPT API 调用
      if (title && company && location) {
        const jobId = Buffer.from(`linkedin-${title}-${company}-${location}`).toString('base64');
          
        // 使用 GPT 生成职位描述
        const prompt = `Generate a concise job description for the following position:
Title: ${title}
Company: ${company}
Location: ${location}

Please provide a brief summary of what this role likely entails based on the title and company.`;

          try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
              },
              body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                  {
                    role: 'system',
                    content: 'You are a helpful assistant that generates concise job descriptions based on available information.'
                  },
                  {
                    role: 'user',
                    content: prompt
                  }
                ],
                max_tokens: 200,
                temperature: 0.7
              })
            });

            const data = await response.json();
            const description = data.choices[0].message.content.trim();
        
        const job: Job = {
          id: jobId,
          title,
          company,
          location,
          description,
              platform: 'LinkedIn',
              url,
              summary: '',
              detailedSummary: '',
              matchScore: undefined,
              matchAnalysis: ''
            };
            jobs.push(job);
          } catch (error) {
            // 如果 GPT 生成失败，使用基本信息作为描述
            const job: Job = {
              id: jobId,
              title,
              company,
              location,
              description: `${title} position at ${company} in ${location}.`,
          platform: 'LinkedIn',
              url,
              summary: '',
              detailedSummary: '',
              matchScore: undefined,
              matchAnalysis: ''
        };
        jobs.push(job);
          }
        } else {
      }
      } catch (error) {
        continue;
      }
    }
    
    // 在获取职位信息后添加 GPT 分析
    for (const job of jobs) {
      if (job.title && job.company && job.location) {
        await analyzeJobWithGPT(job);
      }
    }

    return jobs;
  } catch (error) {
    return [];
  } finally {
    await browser.close();
  }
}

// Seek 职位抓取函数
export async function fetchSeekJobs(params: JobSearchParams): Promise<Job[]> {
  const { jobTitle, city, skills, seniority, page: pageNum, limit = 60, appendToTerminal = console.log } = params;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const browserPage = await context.newPage();
  const jobs: Job[] = [];

  try {
    const formattedJobTitle = jobTitle.toLowerCase().replace(/\s+/g, '-');
    const formattedCity = city.toLowerCase();
    const searchUrl = `https://www.seek.com.au/${formattedJobTitle}-jobs/in-${formattedCity}`;
    
    appendToTerminal(`🌐 Fetching jobs from Seek for: ${jobTitle}, ${city}`);
    appendToTerminal(`GET ${searchUrl}`);
    
    await browserPage.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // 等待职位列表加载
    await browserPage.waitForSelector('[data-automation="normalJob"]', { timeout: 10000 });
    
    // 获取所有职位卡片
    const jobElements = await browserPage.$$('[data-automation="normalJob"]');
    
    for (let i = 0; i < Math.min(jobElements.length, limit); i++) {
      try {
        const jobElement = jobElements[i];
        
        // 提取基本信息
        const title = await jobElement.$eval('[data-automation="jobTitle"]', (el: Element) => el.textContent?.trim() || '');
        const company = await jobElement.$eval('[data-automation="jobCompany"]', (el: Element) => el.textContent?.trim() || '');
        const location = await jobElement.$eval('[data-automation="jobLocation"]', (el: Element) => el.textContent?.trim() || '');
        
        // 获取详情页URL
        const detailUrl = await jobElement.$eval('a[data-automation="jobTitle"]', (el: Element) => (el as HTMLAnchorElement).href);
      
        // 打开详情页获取申请链接和描述
        const detailPage = await context.newPage();
        await detailPage.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
        // 等待申请按钮加载
        await detailPage.waitForSelector('[data-automation="job-detail-apply"]', { timeout: 10000 });
      
        // 获取申请链接
        const applyUrl = await detailPage.$eval('[data-automation="job-detail-apply"]', (el: Element) => (el as HTMLAnchorElement).href);
      
        // 获取职位描述
        let description = '';
        try {
          description = await detailPage.$eval('[data-automation="jobAdDetails"]', el => el.textContent?.trim() || '');
        } catch (e) {
          description = '';
        }

        // 直接从 description 中分割 requirements
        let requirements: string[] = [];
        if (typeof description === 'string' && description.length > 0) {
          requirements = description.split('\n').map((s: string) => s.trim()).filter(Boolean);
        } else {
          requirements = [];
        }

        // === 新增：用 GPT 生成 summary、detailedSummary、matchScore、matchAnalysis ===
        let summary = '';
        let detailedSummary = '';
        let matchScore: number | undefined = undefined;
        let matchAnalysis = '';
        try {
          const gptPrompt = `请为以下职位生成简明的职位概要（Job Summary）、详细分段概要（Who we are, Who we are looking for, Benefits and Offerings），并给出一个0-100的匹配分数和匹配分析。\n\n职位信息：\nTitle: ${title}\nCompany: ${company}\nLocation: ${location}\nDescription: ${description}`;
          const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [
                { role: 'system', content: '你是一个招聘助手，擅长为职位生成概要和匹配分析。' },
                { role: 'user', content: gptPrompt }
              ],
              max_tokens: 400,
              temperature: 0.7
            })
          });
          const gptData = await gptRes.json();
          if (gptData.choices && gptData.choices[0] && gptData.choices[0].message && gptData.choices[0].message.content) {
            // 解析 GPT 返回内容
            const content = gptData.choices[0].message.content;
            // 简单分段解析
            const summaryMatch = content.match(/Job Summary[:：]?([\s\S]*?)\n\n/);
            summary = summaryMatch ? summaryMatch[1].trim() : '';
            const detailedMatch = content.match(/Who we are[\s\S]*?[:：]([\s\S]*?)\n\n/);
            detailedSummary = detailedMatch ? detailedMatch[1].trim() : '';
            const matchScoreMatch = content.match(/Match Score[:：]?(\d{1,3})/);
            matchScore = matchScoreMatch ? parseInt(matchScoreMatch[1]) : undefined;
            const matchAnalysisMatch = content.match(/Match Analysis[:：]?([\s\S]*)/);
            matchAnalysis = matchAnalysisMatch ? matchAnalysisMatch[1].trim() : '';
          }
        } catch (e) {
          // GPT 失败兜底
          summary = '';
          detailedSummary = '';
          matchScore = undefined;
          matchAnalysis = '';
        }
        // === END GPT 生成 ===

        // 判断来源
        const source = applyUrl && !applyUrl.includes('seek.com.au') ? 'company' : 'seek';
      
      if (title && company && location) {
        const jobId = Buffer.from(`seek-${title}-${company}-${location}`).toString('base64');
        
        const job: Job = {
          id: jobId,
          title,
          company,
          location,
          description,
          url: applyUrl,
          platform: 'Seek',
          source,
          requirements,
          summary,
          detailedSummary,
          matchScore,
          matchAnalysis
        };
        jobs.push(job);
      }
        
        await detailPage.close();
      } catch (error) {
        continue;
      }
    }
    
    // 在获取职位信息后添加 GPT 分析
    for (const job of jobs) {
      if (job.title && job.company && job.location) {
        await analyzeJobWithGPT(job);
      }
    }

    return jobs;
  } catch (error) {
    return [];
  } finally {
    await browser.close();
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
          url: url.startsWith('http') ? url : `https://au.indeed.com${url}`,
          summary: '',
          detailedSummary: '',
          matchScore: undefined,
          matchAnalysis: ''
        };
        jobs.push(job);
      }
    });
    
    // 对Indeed每个职位调用GPT分析
    for (const job of jobs) {
      if (job.title && job.company && job.location && job.description) {
        await analyzeJobWithGPT(job);
      }
    }
    // 统一由前端输出 Indeed 职位数，这里不再打印
    return jobs;
  } catch (error) {
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
    // 对Jora每个职位调用GPT分析
    for (const job of data.jobs) {
      if (job.title && job.company && job.location && job.description) {
        await analyzeJobWithGPT(job);
      }
    }
    return data.jobs;
  } catch (error: any) {
    console.error('Error fetching Jora jobs:', error);
    return [];
  }
}

// Adzuna 职位抓取函数
async function fetchAdzunaJobs(jobTitle: string, city: string, limit: number = 40, startPage: number = 1): Promise<Job[]> {
  try {
    const loc = adzunaLocationCodes[city] || encodeURIComponent(city);
    const browser = await chromium.launch({ headless: false });
    const jobs: Job[] = [];
    let pageCount = 0;
    let currentPage = startPage;
    while (jobs.length < limit && pageCount < 5) {
    const page = await browser.newPage();
      const searchUrl = `https://www.adzuna.com.au/search?ac_where=1&loc=${loc}&q=${encodeURIComponent(jobTitle)}&p=${currentPage}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // 自动处理cookie弹窗
    try {
      const acceptBtn = await page.$('button:text("ACCEPT ALL")');
      if (acceptBtn) {
        await acceptBtn.click();
        await page.waitForTimeout(500);
      } else {
        const fallbackBtn = await page.$('button[aria-label*="Accept"], button[mode="primary"]');
        if (fallbackBtn) await fallbackBtn.click();
      }
    } catch (e) {}
    // 自动填写email弹窗
    try {
      const emailInput = await page.$('input[type="email"]');
      if (emailInput) {
        const email = process.env.DEFAULT_EMAIL || 'test@example.com';
        await emailInput.fill(email);
        await emailInput.press('Enter');
        await page.waitForTimeout(500);
        await page.mouse.click(10, 10);
        await page.waitForTimeout(500);
      }
      const emailBtn = await page.$('button:has-text("No, thanks")');
      if (emailBtn) {
        await emailBtn.click();
        await page.waitForTimeout(500);
      }
    } catch (e) {}
    // 解析职位卡片，跳过前两个sponsor广告，提取description
      const pageJobs: Job[] = await page.$$eval('article', (cards) => {
        return Array.from(cards).slice(2, 10).map(card => {
        const titleEl = card.querySelector('h2 a');
        const companyEl = card.querySelector('.ui-company');
        const locationEl = card.querySelector('.ui-location');
        const salaryEl = card.querySelector('.ui-salary');
        let description = '';
        const descEl = card.querySelector('.max-snippet-height');
        if (descEl) {
          description = descEl.textContent?.trim() || '';
        }
        const anchor = titleEl as HTMLAnchorElement | null;
        return {
          id: anchor ? anchor.href : Math.random().toString(36).slice(2),
          title: anchor && anchor.textContent ? anchor.textContent.trim() : '',
          company: companyEl && companyEl.textContent ? companyEl.textContent.trim() : '',
          location: locationEl && locationEl.textContent ? locationEl.textContent.trim() : '',
          salary: salaryEl && salaryEl.textContent ? salaryEl.textContent.trim() : undefined,
          platform: 'Adzuna',
          url: anchor ? anchor.href : '',
          description,
          summary: '',
          detailedSummary: '',
          matchScore: undefined,
          matchAnalysis: ''
        };
      });
    });
      jobs.push(...pageJobs);
      await page.close();
      pageCount++;
      currentPage++;
    }
    await browser.close();
    // 对Adzuna每个职位调用GPT分析
    for (const job of jobs) {
      if (job.title && job.company && job.location && job.description) {
        await analyzeJobWithGPT(job);
      }
    }
    return jobs.slice(0, limit);
  } catch (error) {
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
  const platform = searchParams.get('platform') || '';
  const limit = parseInt(searchParams.get('limit') || '60');
  const page = parseInt(searchParams.get('page') || '1');

  console.log('mirror-jobs API called with:', {
    jobTitle,
    city,
    skills: [],
    seniority: '',
    openToRelocate: false,
    page,
    limit
  });

  try {
    let jobs: Job[] = [];
    
    // 测试 Adzuna 和 SEEK
    if (platform === 'Adzuna' || !platform) {
      console.log('Starting Adzuna job fetch...');
      try {
          const adzunaJobs = await fetchAdzunaJobs(jobTitle, city, limit, page);
        console.log('Adzuna jobs fetched:', adzunaJobs.length, adzunaJobs.slice(0, 1));
        jobs = [...jobs, ...adzunaJobs];
      } catch (adzunaError) {
        console.error('Adzuna fetch error:', adzunaError);
      }
    }

    if (platform === 'Seek' || !platform) {
      console.log('Starting Seek job fetch...');
      try {
        const seekJobs = await fetchSeekJobs({
          jobTitle,
          city,
          skills: [],
          seniority: '',
          openToRelocate: false,
          page,
          limit
        });
        console.log('Seek jobs fetched:', seekJobs.length, seekJobs.slice(0, 1));
        jobs = [...jobs, ...seekJobs];
      } catch (seekError) {
        console.error('Seek fetch error:', seekError);
      }
    }

    if (platform === 'Jora' || !platform) {
      console.log('Starting Jora job fetch...');
      try {
        const joraJobs = await fetchJoraJobs({
          jobTitle,
          city,
          skills: [],
          seniority: '',
          openToRelocate: false,
          page,
          limit
        });
        console.log('Jora jobs fetched:', joraJobs.length, joraJobs.slice(0, 1));
        jobs = [...jobs, ...joraJobs];
      } catch (joraError) {
        console.error('Jora fetch error:', joraError);
      }
    }

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Error in mirror-jobs API:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
} 