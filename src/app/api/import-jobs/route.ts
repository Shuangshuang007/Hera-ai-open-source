import { NextResponse } from 'next/server';

let importedJobs: any[] = [];

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

export async function POST(request: Request) {
  const { jobs } = await request.json();
  if (Array.isArray(jobs)) {
    importedJobs = jobs;
  }
  return NextResponse.json({ success: true, count: Array.isArray(jobs) ? jobs.length : 0 }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  });
}

export async function GET() {
  return NextResponse.json({ jobs: importedJobs }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  });
} 