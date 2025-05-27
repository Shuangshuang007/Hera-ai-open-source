// company-job-detail-scraper.js
// For batch scraping company website job detail page content
// 用法：node scripts/company-job-detail-scraper.js url1 url2 url3 ...

const { chromium } = require('playwright');

async function scrapeJobDetail(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let result = { url, jobSummary: '', requirements: '', error: null };
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // 尝试抓取常见的职位描述区域
    const jobSummary = await page.evaluate(() => {
      // 常见的职位描述选择器
      const selectors = [
        'article',
        '.job-description',
        '#jobDescriptionText',
        '.description',
        '.job-desc',
        '.description__text',
        '.content',
        'main',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.length > 50) return el.innerText.trim();
      }
      // fallback: 全文
      return document.body.innerText.trim().slice(0, 2000);
    });
    result.jobSummary = jobSummary;
    // 尝试抓取常见的要求区域
    const requirements = await page.evaluate(() => {
      const reqSelectors = [
        'ul',
        '.requirements',
        '.job-requirements',
        '.qualifications',
        '.skills',
      ];
      for (const sel of reqSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.length > 20) return el.innerText.trim();
      }
      return '';
    });
    result.requirements = requirements;
  } catch (e) {
    result.error = e.message;
  }
  await browser.close();
  return result;
}

async function main() {
  const urls = process.argv.slice(2);
  if (urls.length === 0) {
    console.log('请在命令行参数中输入职位详情页URL列表');
    process.exit(1);
  }
  const results = [];
  for (const url of urls) {
    console.log(`抓取: ${url}`);
    const detail = await scrapeJobDetail(url);
    results.push(detail);
    console.log(detail);
  }
  // 可选：输出为 JSON 文件
  // require('fs').writeFileSync('company-job-details.json', JSON.stringify(results, null, 2));
}

main(); 