import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const userEmail = searchParams.get('email');
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }
  try {
    // Playwright持久化session+反检测参数
    const browser = await chromium.launchPersistentContext(process.cwd() + '/adzuna-user-data', {
      headless: false, // 首次建议false，后续可改为true
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
      timezoneId: 'Australia/Sydney'
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // 自动填写邮箱并提交 Email Alert
    if (userEmail) {
      try {
        await page.waitForSelector('input#ea_email', { timeout: 2000 });
        await page.fill('input#ea_email', userEmail);
        await page.keyboard.press('Enter'); // 按回车提交
        await page.waitForTimeout(1000);    // 等待"Alert created"弹窗
        await page.mouse.click(10, 10);     // 点击空白处关闭弹窗
        await page.waitForTimeout(500);
      } catch (e) {
        // 没有弹窗时忽略
      }
    }
    // 自动关闭 Email Alert 弹窗
    try {
      await page.waitForSelector('a.ea_close', { timeout: 2000 });
      const noThanksBtn = await page.$('a.ea_close');
      if (noThanksBtn) {
        await noThanksBtn.click();
        await page.waitForTimeout(500);
      }
    } catch (e) {
      // 没有弹窗时忽略
    }
    // 保存页面HTML以便调试
    const pageHtml = await page.content();
    require('fs').writeFileSync('adzuna-detail-debug.html', pageHtml);
    // 抓取详情内容
    const html = await page.$eval('.adp-body', el => el.innerHTML);
    await browser.close();
    return NextResponse.json({ html });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch detail', detail: String(error) }, { status: 500 });
  }
} 