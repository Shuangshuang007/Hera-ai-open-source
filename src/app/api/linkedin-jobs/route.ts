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

    // 用 GPT 生成 summary
    const jobsWithSummary = await Promise.all(jobs.map(async (job) => {
      if (!job.title || !job.company || !job.location) return job;
      const prompt = `Generate a concise job summary for the following position.\nTitle: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}`;
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: 'You are a helpful assistant that generates concise job summaries.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 120,
            temperature: 0.7
          })
        });
        const data = await response.json();
        job.description = data.choices?.[0]?.message?.content?.trim() || '';
      } catch (e) {
        job.description = '';
      }
      return job;
    }));

    return NextResponse.json({ jobs: jobsWithSummary, total: jobsWithSummary.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await browser.close();
  }
} 