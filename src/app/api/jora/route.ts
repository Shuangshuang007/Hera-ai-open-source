import { NextResponse } from 'next/server';
import { fetchJoraJobsWithPlaywright } from '@/utils/joraPlaywright';
import { Job } from '@/types/job';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobTitle = searchParams.get('jobTitle') || '';
  const city = searchParams.get('city') || '';
  const limit = parseInt(searchParams.get('limit') || '60');
  const appendToTerminal = (msg: string) => console.log(msg);

  try {
    const jobs = await fetchJoraJobsWithPlaywright({
      jobTitle,
      city,
      limit,
      appendToTerminal
    });
    return NextResponse.json({ jobs });
  } catch (error: any) {
    console.error('Error fetching Jora jobs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Jora jobs' },
      { status: 500 }
    );
  }
} 