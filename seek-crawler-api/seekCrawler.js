require('dotenv').config();
const { chromium } = require('playwright');
const fetch = require('node-fetch');

async function fetchSeekJobs(jobTitle = 'software-engineer', city = 'melbourne', limit = 10) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-AU',
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();
  const searchUrl = `https://www.seek.com.au/${jobTitle}-jobs/in-${city}`;
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('[data-automation="normalJob"]', { timeout: 20000, state: 'attached' });
  const jobElements = await page.$$('[data-automation="normalJob"]');
  const jobs = [];
  for (let i = 0; i < Math.min(jobElements.length, limit); i++) {
    try {
      const jobElement = jobElements[i];
      const title = await jobElement.$eval('[data-automation="jobTitle"]', el => el.textContent?.trim() || '');
      const company = await jobElement.$eval('[data-automation="jobCompany"]', el => el.textContent?.trim() || '');
      const location = await jobElement.$eval('[data-automation="jobLocation"]', el => el.textContent?.trim() || '');
      const description = await jobElement.$eval('[data-automation="jobShortDescription"]', el => el.textContent?.trim() || '');
      const detailUrl = await jobElement.$eval('a[data-automation="jobTitle"]', el => el.href);
      const detailPage = await context.newPage();
      await detailPage.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      try {
        await detailPage.waitForSelector('[data-automation="job-detail-apply"]', { timeout: 20000 });
      } catch (e) {
        console.error('详情页等待申请按钮超时:', detailUrl, e);
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
      job.requirements = requirements;
      // === GPT summary生成 ===
      try {
        const gptPrompt = `请为以下职位生成简明的职位概要（Job Summary）、详细分段概要（Who we are, Who we are looking for, Benefits and Offerings），并给出一个0-100的匹配分数和匹配分析。\n\n职位信息：\nTitle: ${title}\nCompany: ${company}\nLocation: ${location}\nDescription: ${fullDescription}`;
        const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SEEK_JOB_SUMMARY_KEY}`
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
          const content = gptData.choices[0].message.content;
          const summaryMatch = content.match(/Job Summary[:：]?([\s\S]*?)\n\n/);
          job.summary = summaryMatch ? summaryMatch[1].trim() : '';
          const detailedMatch = content.match(/Who we are[\s\S]*?[:：]([\s\S]*?)\n\n/);
          job.detailedSummary = detailedMatch ? detailedMatch[1].trim() : '';
          const matchScoreMatch = content.match(/Match Score[:：]?(\d{1,3})/);
          job.matchScore = matchScoreMatch ? parseInt(matchScoreMatch[1]) : undefined;
          const matchAnalysisMatch = content.match(/Match Analysis[:：]?([\s\S]*)/);
          job.matchAnalysis = matchAnalysisMatch ? matchAnalysisMatch[1].trim() : '';
        }
      } catch (e) {
        job.summary = '';
        job.detailedSummary = '';
        job.matchScore = undefined;
        job.matchAnalysis = '';
      }
      // === END GPT summary生成 ===
      jobs.push(job);
      await detailPage.close();
    } catch (error) {
      continue;
    }
  }
  await browser.close();
  return jobs;
}

module.exports = { fetchSeekJobs }; 