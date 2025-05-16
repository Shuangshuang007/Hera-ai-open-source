import { fetchJoraJobsWithPlaywright } from './joraPlaywright';

async function testJora() {
  console.log('Starting Jora test...');
  
  try {
    const jobs = await fetchJoraJobsWithPlaywright({
      jobTitle: 'Software Engineer',
      city: 'Melbourne',
      limit: 10,
      appendToTerminal: (msg) => console.log(msg)
    });
    
    console.log('\nResults:');
    console.log(`Total jobs found: ${jobs.length}`);
    if (jobs.length > 0) {
      console.log('\nSample job:');
      console.log(JSON.stringify(jobs[0], null, 2));
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testJora(); 