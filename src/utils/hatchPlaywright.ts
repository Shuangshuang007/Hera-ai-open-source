import { chromium, BrowserContext, Page } from 'playwright';
import { Job } from '../types/job';
import { appendToTerminal } from '../utils/terminal';
import fs from 'fs';
import path from 'path';

const SESSION_PATH = path.resolve(__dirname, '../../hatch-session.json');
const HATCH_EMAIL = process.env.HATCH_EMAIL || '';
const HATCH_PASSWORD = process.env.HATCH_PASSWORD || '';

async function ensureHatchLogin(context: BrowserContext): Promise<void> {
  const page = await context.newPage();
  await page.goto('https://www.hatch.team/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.fill('input[type="email"]', HATCH_EMAIL);
  await page.fill('input[type="password"]', HATCH_PASSWORD);
  await page.click('button:has-text("Log in")');
  await page.waitForNavigation({ timeout: 30000 });
  // 登录成功后保存 session
  await context.storageState({ path: SESSION_PATH });
  await page.close();
}

export async function fetchHatchJobsWithPlaywright(jobTitle: string, city: string): Promise<Job[]> {
  appendToTerminal(`Hatch平台抓取启动：岗位=${jobTitle}，城市=${city}`);
  let context: BrowserContext;
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials'
    ]
  });

  try {
    if (fs.existsSync(SESSION_PATH)) {
      context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        javaScriptEnabled: true
      });
      appendToTerminal('Hatch: 已加载本地登录会话');
    } else {
      context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        javaScriptEnabled: true
      });
      appendToTerminal('Hatch: 未检测到本地会话，自动登录...');
      await ensureHatchLogin(context);
    }

    // 注入初始化脚本
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    const page = await context.newPage();
    appendToTerminal(`Hatch平台：跳转到职位搜索页...`);
    await page.goto('https://www.hatch.team/app/candidate/roles/search', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // 检查是否跳转到登录页（session失效）
    if (page.url().includes('/login')) {
      appendToTerminal('Hatch: 会话失效，重新登录...');
      await page.close();
      await context.close();
      context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        javaScriptEnabled: true
      });
      await ensureHatchLogin(context);
      // 重新打开页面
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      });
      const page2 = await context.newPage();
      await page2.goto('https://www.hatch.team/app/candidate/roles/search', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      appendToTerminal('Hatch平台：重新登录后已跳转到职位搜索页');
      return await extractHatchJobs(page2, jobTitle, city);
    }

    // 正常流程
    appendToTerminal('Hatch平台：已进入职位搜索页，开始抓取职位卡片');
    return await extractHatchJobs(page, jobTitle, city);
  } catch (error) {
    appendToTerminal(`Error fetching jobs from Hatch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  } finally {
    await browser.close();
  }
}

async function extractHatchJobs(page: Page, jobTitle: string, city: string): Promise<Job[]> {
  // TODO: 自动点击Filter并选择条件，可根据实际页面结构补充
  await page.waitForSelector('.role-card', {
    timeout: 30000,
    state: 'attached'
  });
  const jobElements = await page.$$('.role-card');
  appendToTerminal(`Found ${jobElements.length} job elements`);
  const jobs: Job[] = [];
  let idCounter = 1;
  for (const jobElement of jobElements) {
    try {
      const title = await jobElement.$eval('.role-title', (el: Element) => el.textContent?.trim() || '');
      const company = await jobElement.$eval('.company-name', (el: Element) => el.textContent?.trim() || '');
      const location = await jobElement.$eval('.location', (el: Element) => el.textContent?.trim() || '');
      const salary = await jobElement.$eval('.salary', (el: Element) => el.textContent?.trim() || '').catch(() => '');
      const description = await jobElement.$eval('.role-description', (el: Element) => el.textContent?.trim() || '').catch(() => '');
      const url = await jobElement.$eval('a', (el: Element) => (el as HTMLAnchorElement).href).catch(() => '');
      const logo = await jobElement.$eval('img', (el: Element) => (el as HTMLImageElement).src).catch(() => '');
      if (title && company) {
        jobs.push({
          id: `hatch-${idCounter++}`,
          title,
          company,
          location,
          salary,
          description,
          url,
          platform: 'hatch',
          postedDate: new Date().toISOString(),
          jobType: 'Full-time',
          requirements: [],
          benefits: [],
          summary: logo ? `logo: ${logo}` : undefined
        });
      }
    } catch (error) {
      appendToTerminal(`Error processing job element: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  appendToTerminal(`Successfully fetched ${jobs.length} jobs from Hatch`);
  return jobs;
} 