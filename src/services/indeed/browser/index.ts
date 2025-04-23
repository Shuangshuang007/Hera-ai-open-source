import puppeteer, { Browser, Page } from 'puppeteer';
import { SearchParams } from '../models/search';
import { IndeedJobListing } from '../models/job';

export class IndeedBrowser {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isLoggedIn: boolean = false;

  async init() {
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: {
        width: 1280,
        height: 800
      },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // 设置用户代理和语言
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    });

    // 初始化时检查登录状态
    await this.checkAndHandleLogin();
  }

  private async checkAndHandleLogin(): Promise<void> {
    if (!this.page) return;

    try {
      console.log('检查登录状态...');
      await this.page.goto('https://www.indeed.com', { waitUntil: 'networkidle0' });

      // 检查是否已登录
      const isLoggedIn = await this.page.evaluate(() => {
        // 检查是否存在登录按钮或用户头像
        const loginButton = document.querySelector('[data-gnav-element-name="SignIn"], .gnav-SignIn');
        return !loginButton;
      });

      if (!isLoggedIn) {
        console.log('需要登录 Indeed 账号...');
        // 点击登录按钮
        await this.page.click('[data-gnav-element-name="SignIn"], .gnav-SignIn');
        
        // 等待用户手动登录
        console.log('请在浏览器中手动完成登录...');
        // 等待登录完成，通过检查URL变化或特定元素出现
        await this.page.waitForNavigation({ timeout: 120000 }); // 给用户2分钟时间登录
        
        // 再次验证登录状态
        this.isLoggedIn = await this.page.evaluate(() => {
          return !document.querySelector('[data-gnav-element-name="SignIn"], .gnav-SignIn');
        });
        
        if (this.isLoggedIn) {
          console.log('登录成功！');
        } else {
          console.log('登录失败或超时');
        }
      } else {
        console.log('已经登录');
        this.isLoggedIn = true;
      }
    } catch (error) {
      console.error('登录过程出错:', error);
      this.isLoggedIn = false;
    }
  }

  async close() {
    if (this.page) {
      await this.page.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }

  private async handleVerification(): Promise<boolean> {
    if (!this.page) return false;

    try {
      // 检查是否存在验证页面
      const isVerificationPage = await this.page.evaluate(() => {
        return document.querySelector('form[action*="verify"]') !== null;
      });

      if (isVerificationPage) {
        console.log('检测到验证页面，等待人工处理...');
        // 等待用户手动处理验证
        await this.page.waitForNavigation({ timeout: 60000 });
        return true;
      }
    } catch (error) {
      console.error('处理验证页面时出错:', error);
    }
    return false;
  }

  private async handleCloudflareCheck(): Promise<boolean> {
    if (!this.page) return false;

    try {
      const pageTitle = await this.page.title();
      if (pageTitle.includes('Just a moment') || pageTitle.includes('Security check')) {
        console.log('检测到 Cloudflare 验证页面，等待验证完成...');
        
        // 等待页面标题改变
        await this.page.waitForFunction(
          () => {
            const title = document.title;
            return !title.includes('Just a moment') && !title.includes('Security check');
          },
          { timeout: 60000 }
        );
        
        // 额外等待一段时间确保页面完全加载
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('Cloudflare 验证完成');
        return true;
      }
    } catch (error) {
      console.error('处理 Cloudflare 验证时出错:', error);
    }
    return false;
  }

  async searchJobs(params: SearchParams): Promise<IndeedJobListing[]> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    // 确保已登录
    if (!this.isLoggedIn) {
      await this.checkAndHandleLogin();
      if (!this.isLoggedIn) {
        throw new Error('未登录 Indeed 账号');
      }
    }

    const url = this.buildSearchUrl(params);
    console.log('访问URL:', url);
    await this.page.goto(url, { waitUntil: 'networkidle0' });
    
    // 处理 Cloudflare 验证
    await this.handleCloudflareCheck();
    
    // 检查是否需要验证
    await this.handleVerification();
    
    // 添加随机延迟
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
    
    // 等待职位列表加载
    try {
      console.log('等待职位列表加载...');
      
      // 等待页面完全加载
      await this.page.waitForFunction(
        () => {
          // 检查页面是否已经完全加载
          return document.readyState === 'complete' && 
                 !document.title.includes('Just a moment');
        },
        { timeout: 30000 }
      );
      
      // 获取页面内容进行调试
      const pageContent = await this.page.content();
      console.log('页面内容预览:', pageContent.substring(0, 1000));
      
      // 更新选择器以匹配 Indeed 的新页面结构
      const selectors = [
        '.job_seen_beacon',
        '.jobsearch-ResultsList .result',
        '[data-testid="jobsearch-JobCard"]',
        '.job-card-container',
        '.jobCard',
        '[data-testid="job-card"]',
        '.resultContent',
        // 新增更多可能的选择器
        '[data-testid="jobCard"]',
        '.css-5lfssm',
        '[class*="job_seen_beacon"]'
      ];
      
      // 检查每个选择器是否存在
      for (const selector of selectors) {
        const exists = await this.page.evaluate((sel) => {
          const elements = document.querySelectorAll(sel);
          return {
            selector: sel,
            count: elements.length,
            exists: elements.length > 0
          };
        }, selector);
        console.log(`选择器 ${selector} 检查结果:`, exists);
      }
      
      // 等待任一选择器出现
      await this.page.waitForSelector(selectors.join(','), { timeout: 30000 });
      
      // 获取页面标题和URL，用于调试
      const pageTitle = await this.page.title();
      const currentUrl = this.page.url();
      console.log('当前页面标题:', pageTitle);
      console.log('当前页面URL:', currentUrl);
      
    } catch (error) {
      console.error('等待职位列表加载超时:', error);
      return [];
    }
    
    // 滚动页面以加载更多内容
    await this.scrollPage();
    
    // 提取职位列表
    return this.extractJobListings();
  }

  private buildSearchUrl(params: SearchParams): string {
    const baseUrl = 'https://www.indeed.com/jobs';
    const queryParams = new URLSearchParams({
      q: params.keywords,
      l: params.location,
      radius: params.radius.toString(),
      jt: params.jobType?.join(',') || '',
      explvl: params.experience?.join(',') || '',
      sort: params.sort || 'date',
      fromage: params.fromAge?.toString() || ''
    });
    
    return `${baseUrl}?${queryParams.toString()}`;
  }

  private async scrollPage() {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    // 实现页面滚动逻辑
    for (let i = 0; i < 3; i++) {
      // 随机滚动距离
      const scrollDistance = Math.floor(Math.random() * 500) + 500;
      await this.page.evaluate((distance) => {
        window.scrollBy(0, distance);
      }, scrollDistance);
      
      // 随机等待时间
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
    }
  }

  private async extractJobListings(): Promise<IndeedJobListing[]> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    return await this.page.evaluate(() => {
      const listings: IndeedJobListing[] = [];
      // 更新选择器以匹配 Indeed 的新页面结构
      const jobCards = document.querySelectorAll([
        '.job_seen_beacon',
        '.jobsearch-ResultsList .result',
        '[data-tn-component="organicJob"]',
        '[data-tn-component="jobCard"]'
      ].join(','));
      
      console.log(`找到 ${jobCards.length} 个职位卡片`);
      
      jobCards.forEach(card => {
        const title = card.querySelector([
          '[class*="jobTitle"]',
          '.title',
          '[data-tn-element="jobTitle"]'
        ].join(','))?.textContent?.trim();
        
        const company = card.querySelector([
          '[class*="companyName"]',
          '.company',
          '[data-tn-element="companyName"]'
        ].join(','))?.textContent?.trim();
        
        const location = card.querySelector([
          '[class*="companyLocation"]',
          '.location',
          '[data-tn-element="location"]'
        ].join(','))?.textContent?.trim();
        
        const salary = card.querySelector([
          '[class*="salary-snippet"]',
          '.salaryText',
          '[data-tn-element="salary"]'
        ].join(','))?.textContent?.trim();
        
        const postedDate = card.querySelector([
          '[class*="date"]',
          '.date',
          '[data-tn-element="date"]'
        ].join(','))?.textContent?.trim();
        
        const link = card.querySelector([
          'a[class*="jcs-JobTitle"]',
          'a.jobtitle',
          'a[data-tn-element="jobTitle"]'
        ].join(','))?.getAttribute('href');
        
        if (title && company && link) {
          listings.push({
            title,
            company,
            location: location || '',
            salary: salary || undefined,
            postedDate: postedDate || undefined,
            link: link.startsWith('http') ? link : `https://www.indeed.com${link}`
          });
        }
      });
      
      return listings;
    });
  }
} 