const { chromium } = require('playwright');

async function fetchSeekJobs(jobTitle = 'software-engineer', city = 'melbourne', limit = 10) {
  const browser = await chromium.launch({ headless: true });
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
      const applyUrl = await detailPage.$eval('[data-automation="job-detail-apply"]', el => el.href);
      const source = applyUrl.includes('seek.com.au') ? 'seek' : 'company';
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
      jobs.push({
        title,
        company,
        location,
        description,
        fullDescription,
        requirements,
        url: applyUrl,
        source,
        platform: 'seek'
      });
      await detailPage.close();
    } catch (error) {
      continue;
    }
  }
  await browser.close();
  return jobs;
}

module.exports = { fetchSeekJobs }; 