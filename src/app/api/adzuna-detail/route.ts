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
    // Playwright persistent session + anti-detection parameters
    const browser = await chromium.launchPersistentContext(process.cwd() + '/adzuna-user-data', {
      headless: false, // Set to false for first run, can be changed to true later
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
    // Auto-fill email and submit Email Alert
    if (userEmail) {
      try {
        await page.waitForSelector('input#ea_email', { timeout: 2000 });
        await page.fill('input#ea_email', userEmail);
        await page.keyboard.press('Enter'); // Press Enter to submit
        await page.waitForTimeout(1000);    // Wait for "Alert created" popup
        await page.mouse.click(10, 10);     // Click empty space to close popup
        await page.waitForTimeout(500);
      } catch (e) {
        // Ignore if no popup
      }
    }
    // Auto-close Email Alert popup
    try {
      await page.waitForSelector('a.ea_close', { timeout: 2000 });
      const noThanksBtn = await page.$('a.ea_close');
      if (noThanksBtn) {
        await noThanksBtn.click();
        await page.waitForTimeout(500);
      }
    } catch (e) {
      // Ignore if no popup
    }
    // Save page HTML for debugging
    const pageHtml = await page.content();
    require('fs').writeFileSync('adzuna-detail-debug.html', pageHtml);
    // Scrape detail content
    const html = await page.$eval('.adp-body', el => el.innerHTML);
    await browser.close();
    return NextResponse.json({ html });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch detail', detail: String(error) }, { status: 500 });
  }
} 