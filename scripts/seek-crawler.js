const { chromium } = require('playwright');

const jobTitle = process.argv[2] || 'software-engineer';
const city = process.argv[3] || 'melbourne';
const limit = parseInt(process.argv[4] || '10');

(async () => {
  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-AU',
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();
    const searchUrl = `https://www.seek.com.au/${jobTitle}-jobs/in-${city}`;
    console.log('Searching SEEK URL:', searchUrl);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('[data-automation="normalJob"]', { timeout: 10000, state: 'attached' });
    const jobElements = await page.$$('[data-automation="normalJob"]');
    console.log(`Found ${jobElements.length} job cards`);
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
        await detailPage.waitForSelector('[data-automation="job-detail-apply"]', { timeout: 10000 });
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
        console.error('Error processing job:', error);
        continue;
      }
    }
    await browser.close();
    console.log(JSON.stringify({ jobs }, null, 2));
  } catch (error) {
    console.error('Error in SEEK crawler:', error);
    process.exit(1);
  }
})(); 