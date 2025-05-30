import { NextResponse } from 'next/server';
import { fetchAdzunaJobsWithPlaywright } from '@/utils/adzunaPlaywright';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobTitle = searchParams.get('jobTitle') || '';
    const city = searchParams.get('city') || '';
    const limit = parseInt(searchParams.get('limit') || '60');

    console.log('Fetching Adzuna jobs with params:', { jobTitle, city, limit });

    const jobs = await fetchAdzunaJobsWithPlaywright(jobTitle, city, limit);
    // 打印前3条job的url字段
    if (jobs && jobs.length > 0) {
      console.log('Adzuna jobs sample URLs:', jobs.slice(0, 3).map(j => j.url));
    }
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Error in Adzuna API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Adzuna jobs' },
      { status: 500 }
    );
  }
} 