const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { chromium } = require('playwright');
const fetch = require('node-fetch');

// 验证环境变量
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set');
  process.exit(1);
}

// 添加 GPT 分析函数
async function analyzeJobWithGPT(job) {
  try {
    const prompt = `Analyze the following job posting and provide a structured response in JSON format.\n\nJob Info:\nTitle: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nDescription: ${job.fullDescription}\n\nPlease respond with a JSON object with the following fields:\n{\n  \"summary\": string,\n  \"detailedSummary\": string,\n  \"matchScore\": number (0-100),\n  \"matchAnalysis\": string\n}`;

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
            content: 'You are a job analysis expert. Always respond ONLY with a valid JSON object as specified.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid GPT response format');
    }

    let parsed;
    try {
      parsed = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      throw new Error('Failed to parse GPT JSON response');
    }

    // 强制分数范围
    let score = typeof parsed.matchScore === 'number' ? Math.max(0, Math.min(100, parsed.matchScore)) : undefined;

    job.summary = parsed.summary || `${job.title} position at ${job.company} in ${job.location}.`;
    job.detailedSummary = parsed.detailedSummary || '';
    job.matchScore = score;
    job.matchAnalysis = parsed.matchAnalysis || 'Analysis unavailable.';

    return job;
  } catch (error) {
    console.error('[SEEK] GPT analysis failed:', error);
    // 提供基本的错误恢复
    job.summary = `${job.title} position at ${job.company} in ${job.location}.`;
    job.detailedSummary = job.fullDescription ? job.fullDescription.substring(0, 200) + '...' : '';
    job.matchScore = undefined;
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