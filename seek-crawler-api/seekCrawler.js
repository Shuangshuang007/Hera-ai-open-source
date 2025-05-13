require('dotenv').config();
const { chromium } = require('playwright');
const fetch = require('node-fetch');

async function fetchSeekJobs(jobTitle = 'software-engineer', city = 'melbourne', limit = 60) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-AU',
    viewport: { width: 1920, height: 1080 },
  });
  const jobs = [];
  let pageNum = 1;
  let hasMore = true;
  while (jobs.length < limit && hasMore) {
    const page = await context.newPage();
    const searchUrl = `https://www.seek.com.au/${jobTitle}-jobs/in-${city}${pageNum > 1 ? `?page=${pageNum}` : ''}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try {
      await page.waitForSelector('[data-automation="normalJob"]', { timeout: 20000, state: 'attached' });
    } catch (e) {
      await page.close();
      break;
    }
    const jobElements = await page.$$('[data-automation="normalJob"]');
    if (jobElements.length === 0) {
      hasMore = false;
      await page.close();
      break;
    }
    for (let i = 0; i < jobElements.length && jobs.length < limit; i++) {
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

        // Add GPT call
        if (title && company && location) {
          try {
            console.log('Starting GPT call...');
            const prompt = `Generate a concise job description for the following position:
Title: ${title}
Company: ${company}
Location: ${location}
Description: ${fullDescription}

Please provide:
1. A brief summary of the role
2. Detailed sections (Who we are, Who we are looking for, Benefits)
3. A match score (0-100) and analysis`;

            console.log('Sending request to OpenAI API...');
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                // SEEK Summary OpenAI Key
                'Authorization': 'Bearer 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'
              },
              body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                  {
                    role: 'system',
                    content: 'You are a helpful assistant that generates concise job descriptions and match analysis.'
                  },
                  {
                    role: 'user',
                    content: prompt
                  }
                ],
                max_tokens: 400,
                temperature: 0.7
              })
            });

            console.log('Received OpenAI API response...');
            const data = await response.json();
            console.log('API response data:', data);

            if (data.choices && data.choices[0] && data.choices[0].message) {
              const content = data.choices[0].message.content;
              console.log('GPT generated content:', content);
              
              // Parse GPT response
              const summaryMatch = content.match(/(?:Summary|Job Summary|Role Summary)[:：]?([\s\S]*?)(?=\n\n|$)/i);
              job.summary = summaryMatch ? summaryMatch[1].trim() : '';
              
              const detailedMatch = content.match(/(?:Who We Are|Who we are)[\s\S]*?[:：]([\s\S]*?)(?=\n\n|$)/i);
              job.detailedSummary = detailedMatch ? detailedMatch[1].trim() : '';
              
              // Improved matchScore extraction: search globally for Match Score or Score
              const matchScoreMatch = content.match(/Match Score[:：]?\s*(\d{1,3})/i) || content.match(/Score[:：]?\s*(\d{1,3})/i);
              job.matchScore = matchScoreMatch ? parseInt(matchScoreMatch[1]) : undefined;
              
              const matchAnalysisMatch = content.match(/(?:Analysis|Match Analysis)[:：]?([\s\S]*)/i);
              job.matchAnalysis = matchAnalysisMatch ? matchAnalysisMatch[1].trim() : '';

              console.log('Parsed results:', {
                summary: job.summary,
                detailedSummary: job.detailedSummary,
                matchScore: job.matchScore,
                matchAnalysis: job.matchAnalysis
              });
            } else {
              console.error('GPT response format incorrect:', data);
            }
          } catch (error) {
            console.error('GPT call failed:', error);
            // If GPT generation fails, use basic info as description
            job.summary = `${title} position at ${company} in ${location}.`;
            job.detailedSummary = '';
            job.matchScore = undefined;
            job.matchAnalysis = '';
          }
        }

        jobs.push(job);
        await detailPage.close();
      } catch (error) {
        continue;
      }
    }
    await page.close();
    if (jobElements.length < 20) hasMore = false;
    pageNum++;
  }
  await browser.close();
  return jobs;
}

module.exports = { fetchSeekJobs }; 