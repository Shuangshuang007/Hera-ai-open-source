import { Job } from '@/types/job';

interface PlatformResult {
  platform: string;
  jobs: Job[];
  total: number;
  page: number;
  totalPages: number;
}

// Platform search URL builder function
export function buildSearchUrl(platform: string, jobTitle: string, skills: string[], city: string): string {
  const encodedTitle = encodeURIComponent(jobTitle);
  const encodedCity = encodeURIComponent(city);
  const encodedSkills = encodeURIComponent(skills.join(' '));

  switch (platform.toLowerCase()) {
    case 'linkedin':
      return `https://www.linkedin.com/jobs/search/?keywords=${encodedTitle}%20${encodedSkills}&location=${encodedCity}`;
    case 'seek':
      return `https://www.seek.com.au/${encodedTitle}-jobs/in-${encodedCity}`;
    case 'jora':
      return `https://au.jora.com/jobs?q=${encodedTitle}%20${encodedSkills}&l=${encodedCity}`;
    case 'efinancialcareers':
      return `https://www.efinancialcareers.com/jobs-${encodedCity}-${encodedTitle}`;
    case 'indeed':
      return `https://au.indeed.com/jobs?q=${encodedTitle}%20${encodedSkills}&l=${encodedCity}`;
    case 'Boss直聘':
      return `https://www.zhipin.com/job_detail/?query=${encodedTitle}&city=${encodedCity}`;
    case '智联招聘':
      return `https://sou.zhaopin.com/?jl=${encodedCity}&kw=${encodedTitle}`;
    case '前程无忧':
      return `https://search.51job.com/list/${encodedCity},000000,0000,00,9,99,${encodedTitle},2,1.html`;
    case '猎聘网':
      return `https://www.liepin.com/zhaopin/?key=${encodedTitle}&dqs=${encodedCity}`;
    default:
      return '';
  }
}

// Get recommended platforms
function getRecommendedPlatforms(jobTitle: string, city: string): string[] {
  const defaultPlatforms = ['LinkedIn', 'Seek', 'Indeed'];
  // Add platform recommendation logic based on job title
  return defaultPlatforms;
}

// Generate search URL
function generateSearchUrls(jobTitle: string, skills: string[], city: string): Array<{platform: string, url: string}> {
  const platforms = getRecommendedPlatforms(jobTitle, city);
  return platforms.map(platform => ({
    platform,
    url: buildSearchUrl(platform, jobTitle, skills, city)
  }));
}

// Get job data from platform
export async function fetchJobsFromPlatform(
  platform: string, 
  jobTitle: string, 
  city: string, 
  skills: string[] = [], 
  page: number = 1, 
  limit: number = 50,
  appendToTerminal?: (message: string) => void
): Promise<{ jobs: Job[], total: number, page: number, totalPages: number }> {
  try {
    const normalizedCity = city;
    const startTime = Date.now();
    
    const response = await fetch(`/api/mirror-jobs?platform=${platform}&jobTitle=${encodeURIComponent(jobTitle)}&city=${encodeURIComponent(normalizedCity)}&page=${page}&limit=${limit}`);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (!response.ok) {
      throw new Error('Failed to fetch jobs');
    }
    
    const data = await response.json();
    appendToTerminal?.(`Found ${data.total} jobs in ${platform}`);
    appendToTerminal?.(`GET /api/mirror-jobs?platform=${platform}&jobTitle=${encodeURIComponent(jobTitle)}&city=${encodeURIComponent(normalizedCity)}&page=${page}&limit=${limit} ${response.status} in ${duration}ms`);
    
    const jobs = data.jobs.map((job: any) => {
      if (platform === 'Adzuna' || platform === 'Seek') {
        // Keep the url field returned from backend
        return {
          ...job,
          platform,
          tags: skills
        };
      } else {
        return {
      ...job,
      platform,
      url: buildSearchUrl(platform, jobTitle, skills, normalizedCity),
      tags: skills
        };
      }
    });
    
    return {
      jobs,
      total: data.total,
      page: data.page,
      totalPages: data.totalPages
    };
  } catch (error) {
    console.error('Error fetching jobs:', error);
    appendToTerminal?.(`❌ Error fetching jobs from ${platform}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      jobs: [],
      total: 0,
      page: 1,
      totalPages: 0
    };
  }
}

// Batch apply for jobs
export async function handleBatchLinkedInApply(jobs: Job[]) {
  try {
    // Store applied job IDs
    const appliedJobs = JSON.parse(localStorage.getItem('appliedJobs') || '[]');
    
    // Open URL for each selected job
    jobs.forEach(job => {
      if (job.url) {
        window.open(job.url, '_blank');
        // Add to applied jobs list
        if (!appliedJobs.includes(job.id)) {
          appliedJobs.push(job.id);
        }
      }
    });
    
    // Update applied jobs list
    localStorage.setItem('appliedJobs', JSON.stringify(appliedJobs));
  } catch (error) {
    console.error('Error applying to jobs:', error);
  }
}

// Get job data
export async function fetchJobs(page: number = 1, limit: number = 50): Promise<{ jobs: Job[], total: number, page: number, totalPages: number }> {
  console.log('Starting fetchJobs...');
  
  // Get user profile
  const userProfileStr = localStorage.getItem('userProfile');
  const userProfile = userProfileStr ? JSON.parse(userProfileStr) : {};
  const userProfileCity = userProfile.city;
  const localStorageCity = localStorage.getItem('city');
  
  console.log('Debug Info:', {
    userProfileCity,
    localStorageCity,
    userProfile
  });
  
  // Parse data
  const parsedData = {
    jobTitle: localStorage.getItem('jobTitle') || '',
    city: localStorageCity || userProfileCity || 'Melbourne',
    skills: JSON.parse(localStorage.getItem('skills') || '[]')
  };
  
  console.log('Parsed data:', parsedData);
  
  // Get recommended platforms
  const recommendedPlatforms = getRecommendedPlatforms(parsedData.jobTitle, parsedData.city);
  console.log('Recommended platforms:', recommendedPlatforms);
  
  // Generate search URL
  const searchUrls = generateSearchUrls(parsedData.jobTitle, parsedData.skills, parsedData.city);
  console.log('Generated URLs:', searchUrls);
  
  // Get job data from each platform
  const platformJobsPromises = searchUrls.map(async ({ platform }) => {
    console.log(`Fetching jobs for platform: ${platform} with city: ${parsedData.city}`);
    try {
      const result = await fetchJobsFromPlatform(platform, parsedData.jobTitle, parsedData.city, parsedData.skills, page, limit);
      return {
        platform,
        jobs: result.jobs,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages
      };
    } catch (error) {
      console.error(`Error fetching jobs from ${platform}:`, error);
      return {
        platform,
        jobs: [],
        total: 0,
        page: 1,
        totalPages: 0
      };
    }
  });
  
  // Wait for job data from all platforms
  const platformResults = await Promise.all(platformJobsPromises);
  
  // Combine job data from all platforms
  const allJobs = platformResults.flatMap(result => result.jobs);
  
  // Calculate total job count and total page count
  const total = platformResults.reduce((sum: number, result: PlatformResult) => sum + result.total, 0);
  const totalPages = Math.ceil(total / limit);
  
  return {
    jobs: allJobs,
    total,
    page,
    totalPages
  };
} 