import { chromium } from 'playwright';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keywords = searchParams.get('keywords');
  const location = searchParams.get('location');

  if (!keywords || !location) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}`);
    await page.waitForSelector('.jobs-search__results-list');

    const jobs = await page.evaluate(() => {
      const jobCards = document.querySelectorAll('.jobs-search__results-list > li');
      return Array.from(jobCards).map(card => {
        const titleElement = card.querySelector('.base-search-card__title');
        const companyElement = card.querySelector('.base-search-card__subtitle');
        const locationElement = card.querySelector('.job-search-card__location');
        const linkElement = card.querySelector('a.base-card__full-link');
        
        return {
          title: titleElement?.textContent?.trim() || '',
          company: companyElement?.textContent?.trim() || '',
          location: locationElement?.textContent?.trim() || '',
          link: linkElement?.getAttribute('href') || '',
          description: ''
        };
      });
    });

    return NextResponse.json({ jobs, total: jobs.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await browser.close();
  }
} 