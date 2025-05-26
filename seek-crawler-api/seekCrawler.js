const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { chromium } = require('playwright');
const fetch = require('node-fetch');
const axios = require('axios');
const cheerio = require('cheerio');
const { OpenAI } = require('openai');

// 验证环境变量
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1',
});

// 添加 GPT 分析函数
async function analyzeJobWithGPT(job) {
  try {
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
    const parsedData = {};

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

async function fetchSeekJobs(jobTitle = 'software-engineer', city = 'melbourne', limit = 60) {
  // 搜索页用有头
  const searchBrowser = await chromium.launch({ headless: false });
  const searchContext = await searchBrowser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-AU',
    viewport: { width: 1920, height: 1080 },
  });
  const jobs = [];
  let pageNum = 1;
  let hasMore = true;
  while (jobs.length < limit && hasMore) {
    const searchPage = await searchContext.newPage();
    const searchUrl = `https://www.seek.com.au/${jobTitle}-jobs/in-${city}${pageNum > 1 ? `?page=${pageNum}` : ''}`;
    await searchPage.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try {
      await searchPage.waitForSelector('[data-automation="normalJob"]', { timeout: 20000, state: 'attached' });
    } catch (e) {
      await searchPage.close();
      break;
    }
    const jobElements = await searchPage.$$('[data-automation="normalJob"]');
    if (jobElements.length === 0) {
      hasMore = false;
      await searchPage.close();
      break;
    }
    // 详情页用无头
    const detailBrowser = await chromium.launch({ headless: true });
    const detailContext = await detailBrowser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-AU',
      viewport: { width: 1920, height: 1080 },
    });
    for (let i = 0; i < jobElements.length && jobs.length < limit; i++) {
      try {
        const jobElement = jobElements[i];
        const title = await jobElement.$eval('[data-automation="jobTitle"]', el => el.textContent?.trim() || '');
        const company = await jobElement.$eval('[data-automation="jobCompany"]', el => el.textContent?.trim() || '');
        const location = await jobElement.$eval('[data-automation="jobLocation"]', el => el.textContent?.trim() || '');
        const description = await jobElement.$eval('[data-automation="jobShortDescription"]', el => el.textContent?.trim() || '');
        const detailUrl = await jobElement.$eval('a[data-automation="jobTitle"]', el => el.href);
        const detailPage = await detailContext.newPage();
        await detailPage.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        try {
          await detailPage.waitForSelector('[data-automation="job-detail-apply"]', { timeout: 20000 });
        } catch (e) {
          await detailPage.close();
          continue;
        }
        const applyButton = await detailPage.$('[data-automation="job-detail-apply"]');
        let job = {
          title,
          company,
          location,
          description,
          fullDescription: '',
          requirements: '',
          url: '',
          source: '',
          platform: 'seek',
          summary: '',
          detailedSummary: '',
          matchScore: undefined,
          matchAnalysis: ''
        };
        if (applyButton) {
          const buttonText = await applyButton.textContent();
          const href = await applyButton.getAttribute('href');
          if (buttonText.trim() === 'Apply' && href.includes('?sol=')) {
            job.source = 'company';
          } else {
            job.source = 'seek';
          }
          job.url = `https://www.seek.com.au${href}`;
        }
        let fullDescription = '';
        try {
          fullDescription = await detailPage.$eval('[data-automation="jobAdDetails"]', el => el.innerText.trim());
        } catch (e) {
          try {
            fullDescription = await detailPage.$eval('.job-details', el => el.innerText.trim());
          } catch (e2) {
            fullDescription = '';
          }
        }
        let requirements = '';
        try {
          requirements = await detailPage.$eval('ul, .requirements, .job-requirements', el => el.innerText.trim());
        } catch (e) {
          requirements = '';
        }
        job.fullDescription = fullDescription;
        job.requirements = requirements ? requirements.split('\n').filter(r => r.trim()) : [];

        // Add GPT analysis
        if (title && company && location) {
          try {
            job = await analyzeJobWithGPT(job);
          } catch (error) {
            console.error('[SEEK] GPT analysis failed:', error);
            job.summary = `${job.title} position at ${job.company} in ${job.location}.`;
            job.detailedSummary = job.fullDescription ? job.fullDescription.substring(0, 200) + '...' : '';
            job.matchScore = undefined;
            job.matchAnalysis = 'Analysis unavailable due to processing error.';
          }
        }

        jobs.push(job);
        await detailPage.close();
      } catch (error) {
        continue;
      }
    }
    await detailBrowser.close();
    await searchPage.close();
    pageNum++;
  }
  await searchBrowser.close();

  return jobs;
}

module.exports = { fetchSeekJobs }; 