import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { getKnowledgeGraph } from '@/utils/knowledgeGraph';
import { fetchJoraJobsWithPlaywright } from '@/utils/joraPlaywright';
import { chromium } from 'playwright';

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
  const { jobTitle, city, skills, seniority, page: pageNum, limit } = params;
  console.log('Starting LinkedIn job fetch with params:', { jobTitle, city, pageNum, limit });
  
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
    console.log('Navigating to LinkedIn URL:', searchUrl);
    
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
        console.log('Closed LinkedIn sign-in popup.');
      }
    } catch (e) {
      console.log('No popup to close or failed to close popup:', e);
    }
    
    console.log('Page loaded, waiting for job list...');
    
    // 等待职位列表加载
    await browserPage.waitForSelector('.jobs-search__results-list', { 
      timeout: 60000,
      state: 'attached'
    });
      
    // 等待一下确保页面完全加载
    await browserPage.waitForTimeout(5000);
    
    console.log('Job list found, getting job cards...');
      
    // 获取所有职位卡片
    const jobElements = await browserPage.$$('.jobs-search__results-list li');
    console.log(`Found ${jobElements.length} LinkedIn job cards`);

    // 添加调试代码
    const pageContent = await browserPage.content();
    console.log('Page HTML structure:', pageContent.substring(0, 1000)); // 只打印前1000个字符

    for (let i = 0; i < Math.min(jobElements.length, limit); i++) {
      try {
        console.log(`Processing job ${i + 1}/${Math.min(jobElements.length, limit)}`);
        const jobElement = jobElements[i];
        
        // 添加调试信息
        console.log('Job element HTML:', await jobElement.innerHTML());
        
        // 等待元素可见
        await jobElement.waitForElementState('visible', { timeout: 10000 });
        
        let title = '';
        let company = '';
        let location = '';
        let url = '';
      
        // 提取基本信息
        try {
          title = await jobElement.$eval('h3.base-search-card__title', (el: Element) => el.textContent?.trim() || '');
          console.log('Title:', title);
        } catch (error) {
          console.error('Error getting title:', error);
        }
        
        try {
          company = await jobElement.$eval('h4.base-search-card__subtitle', (el: Element) => el.textContent?.trim() || '');
          console.log('Company:', company);
        } catch (error) {
          console.error('Error getting company:', error);
        }
        
        try {
          location = await jobElement.$eval('.job-search-card__location', (el: Element) => el.textContent?.trim() || '');
          console.log('Location:', location);
        } catch (error) {
          console.error('Error getting location:', error);
        }
        
        try {
          url = await jobElement.$eval('a.base-card__full-link', (el: Element) => (el as HTMLAnchorElement).href);
          console.log('URL:', url);
        } catch (error) {
          console.error('Error getting URL:', error);
        }
        
        // 检查 GPT API 调用
      if (title && company && location) {
        const jobId = Buffer.from(`linkedin-${title}-${company}-${location}`).toString('base64');
          console.log('Generated jobId:', jobId);
          
          // 使用 GPT 生成职位描述
          const prompt = `Generate a concise job description for the following position:
Title: ${title}
Company: ${company}
Location: ${location}

Please provide a brief summary of what this role likely entails based on the title and company.`;

          try {
            console.log('Calling GPT API with prompt:', prompt);
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
            console.log('GPT API response:', data);
            const description = data.choices[0].message.content.trim();
            console.log('Generated description:', description);
        
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
            console.log('Successfully added job:', jobId);
          } catch (error) {
            console.error('Error generating job description:', error);
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
            console.log('Added job with fallback description:', jobId);
          }
        } else {
          console.log('Skipping job due to missing required fields');
      }
      } catch (error) {
        console.error('Error processing LinkedIn job:', error);
        continue;
      }
    }
    
    console.log(`Successfully fetched ${jobs.length} LinkedIn jobs for ${jobTitle} in ${city}`);
    return jobs;
  } catch (error) {
    console.error('Error fetching LinkedIn jobs:', error);
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
    console.log(`Found ${jobElements.length} Seek job cards`);
    
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
        console.error('Error processing Seek job:', error);
        continue;
      }
    }
    
    console.log(`Successfully fetched ${jobs.length} Seek jobs for ${jobTitle} in ${city}`);
    return jobs;
  } catch (error) {
    console.error('Error fetching Seek jobs:', error);
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
    
    // 统一由前端输出 Indeed 职位数，这里不再打印
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
          url: url.startsWith('http') ? url : `https://www.efinancialcareers.com${url}`,
          summary: '',
          detailedSummary: '',
          matchScore: undefined,
          matchAnalysis: ''
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
    return jobs.slice(0, limit);
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

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Error in mirror-jobs API:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
} 