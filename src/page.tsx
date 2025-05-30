'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { type Job } from '@/types/job';  // Import Job type from types directory
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { handleBatchLinkedInApply, fetchJobsFromPlatform } from '@/utils/jobSearch';
import { generateSearchUrls } from '@/utils/platformMapping';
import { JobSummaryCard } from '@/components/JobSummaryCard';
import { JobDetailModal } from '@/components/JobDetailModal';
import { JobAssistant } from '@/components/JobAssistant';
import { useSearchParams, useRouter } from 'next/navigation';
import { HeraComputer } from '@/components/HeraComputer';
import { JobDetailPanel } from '@/components/JobDetailPanel';
import { chromium } from 'playwright';
import { fetchSeekJobs } from '@/app/api/mirror-jobs/route';
import { StorageManager } from '@/utils/storage';

interface JobResult {
  jobs: Job[];
  total: number;
  page: number;
  totalPages: number;
}

interface LinkedInJob {
  title: string;
  company: string;
  location: string;
  link: string;
  description: string;
}

// Add cache-related constants and types
const CACHE_KEY = 'job_search_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24小时过期

interface CacheData {
  jobs: Job[];
  timestamp: number;
  searchParams: {
    jobTitle: string;
    city: string;
    skills: string[];
  };
}

// Cache utility functions
const cacheUtils = {
  getCache: (): CacheData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data: CacheData = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is expired
      if (now - data.timestamp > CACHE_EXPIRY) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  },
  
  setCache: (jobs: Job[], searchParams: { jobTitle: string; city: string; skills: string[] }) => {
    try {
      const cacheData: CacheData = {
        jobs,
        timestamp: Date.now(),
        searchParams
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  },
  
  clearCache: () => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
};

// Scroll following logic (with type declaration)
function useSmartAutoScroll(ref: React.RefObject<HTMLDivElement>, dep: any[]) {
  const [isAuto, setIsAuto] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isAuto) {
      el.scrollTop = el.scrollHeight;
    }
    const onScroll = () => {
      // Distance from bottom less than 30px to auto scroll, otherwise user manually scroll
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 30) {
        setIsAuto(true);
      } else {
        setIsAuto(false);
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [ref, dep, isAuto]);
  useEffect(() => {
    if (isAuto && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [dep, isAuto, ref]);
}

const fetchLinkedInJobs = async (keywords: string, location: string, appendToTerminal: (message: string) => void) => {
  appendToTerminal('Fetching LinkedIn jobs data...');
  try {
    const response = await fetch(`/api/linkedin-jobs?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    appendToTerminal(`Successfully fetched ${data.jobs.length} LinkedIn jobs`);
    return data;
  } catch (error: any) {
    appendToTerminal(`✗ Failed to fetch LinkedIn jobs: ${error.message}`);
    throw error;
  }
};

const PROFILE_KEYWORDS = [
  // English expressions
  'find job', 'new job', 'change city', 'change industry', 'change salary', 'relocate', 'search new jobs', 'recommend jobs', 'apply jobs', 'switch role', 'change company',
  // Chinese expressions (keeping these for user interface)
  '找工作', '换工作', '换城市', '换行业', '换薪资', '调动', '搜新工作', '推荐职位', '投职位', '换岗位', '换公司',
  // Field names in English
  'first name', 'last name', 'email', 'phone', 'country', 'city', 'job title', 'seniority', 'open for relocation', 'expected salary', 'education', 'employment history', 'career priorities',
  // Field names in Chinese (keeping these for user interface)
  '姓名', '名字', '姓氏', '邮箱', '电话', '国家', '城市', '职位', '级别', '意向城市', '薪资', '学历', '教育', '工作经历', '就业经历', '职业偏好', '公司声誉', '薪酬', '地点', '平衡', '混合办公', '晋升', '价值观', '行业匹配', '职能匹配', '文化匹配'
];

export default function JobsPage() {
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [pagedJobs, setPagedJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [searchUrls, setSearchUrls] = useState<Array<{platform: string, url: string}>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);
  const jobsPerPage = 15;
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const router = useRouter();
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedJobRef, setSelectedJobRef] = useState<HTMLElement | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const [showScreenshotStream, setShowScreenshotStream] = useState(false);
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const screenshotRef = useRef<HTMLImageElement>(null);
  let wsRef = useRef<WebSocket | null>(null);

  // Get user configuration after component mounts
  useEffect(() => {
    const userProfileStr = localStorage.getItem('userProfile');
    if (userProfileStr) {
      try {
        const profile = JSON.parse(userProfileStr);
        setUserProfile(profile);
      } catch (error) {
        console.error('Error parsing user profile:', error);
      }
    }
  }, []);

  // Add terminal output function
  const appendToTerminal = useCallback((message: string) => {
    // If message is compilation related, keep original format
    if (message.includes('Compiling') || message.includes('Compiled')) {
      setTerminalOutput(prev => [...prev, message]);
      return;
    }

    // If message is API call parameter, format JSON
    if (typeof message === 'string' && message.includes('API called with:')) {
      try {
        const [prefix, paramsStr] = message.split('API called with:');
        const params = JSON.parse(paramsStr);
        const formattedParams = JSON.stringify(params, null, 2);
        setTerminalOutput(prev => [...prev, `${prefix}API called with:\n${formattedParams}`]);
        return;
      } catch (e) {
        // If parsing fails, use original message
        setTerminalOutput(prev => [...prev, message]);
        return;
      }
    }

    // Other messages are added directly
    setTerminalOutput(prev => [...prev, message]);
  }, []);

  // Listen for compilation messages
  useEffect(() => {
    const handleCompilationMessage = (event: MessageEvent) => {
      if (event.data.type === 'compilation') {
        appendToTerminal(event.data.message);
      }
    };

    window.addEventListener('message', handleCompilationMessage);
    return () => window.removeEventListener('message', handleCompilationMessage);
  }, [appendToTerminal]);

  // Get jobs after user configuration loads
  useEffect(() => {
    if (!userProfile) return;

    const fetchJobs = async () => {
      try {
        appendToTerminal("Starting fetchJobs process...");
        setIsLoading(true);
        
        const jobTitle = userProfile?.jobTitle?.[0];
        const city = userProfile?.city;
        const skillsStr = localStorage.getItem('skills');
        const skillsArray = skillsStr ? JSON.parse(skillsStr) : [];
        const skills = skillsArray.map((skill: any) => 
          typeof skill === 'object' ? skill.name : skill
        );
        const seniority = userProfile?.seniority || '';
        const openToRelocate = userProfile?.openForRelocation === 'yes';
        
        // Save search record
        if (jobTitle && city) {
          StorageManager.saveLastSearch(jobTitle, city);
        }
        
        // Check cache
        const cachedData = cacheUtils.getCache();
        if (cachedData && 
            cachedData.searchParams.jobTitle === jobTitle &&
            cachedData.searchParams.city === city &&
            JSON.stringify(cachedData.searchParams.skills) === JSON.stringify(skills)) {
          appendToTerminal('✓ Using cached job data');
          setAllJobs(cachedData.jobs);
          setTotalJobs(cachedData.jobs.length);
          setTotalPages(Math.ceil(cachedData.jobs.length / jobsPerPage));
          setPagedJobs(cachedData.jobs.slice(0, jobsPerPage));
          if (cachedData.jobs.length > 0) {
            setSelectedJob(cachedData.jobs[0]);
          }
          setIsLoading(false);
          return;
        }
        
        // If no cache or cache expired, continue with original fetch logic
        appendToTerminal('○ No valid cache found, fetching fresh data...');
        
        appendToTerminal('○ Sending API request to fetch jobs...');
        appendToTerminal('> Request payload:');
        appendToTerminal(JSON.stringify({ jobTitle, city, skills, seniority, openToRelocate }, null, 2));
        
        console.log('Parsed data:', { jobTitle, city, skills, seniority, openToRelocate });
        appendToTerminal('> Profile data: ' + jobTitle + ' in ' + city);
        appendToTerminal('> Skills: ' + (skills.length ? skills.join(', ') : 'None specified'));
        appendToTerminal('> Level: ' + seniority + ', Relocation: ' + (openToRelocate ? 'Yes' : 'No'));

        if (jobTitle && city) {
          // Generate platform-specific search URLs
          const urls = generateSearchUrls(jobTitle, skills, city);
          appendToTerminal('✓ Generated search URLs for all platforms');
          console.log('Generated URLs:', urls);
          setSearchUrls(urls);
          
          appendToTerminal('○ Fetching jobs from all platforms...');
          // Fetch jobs for all platforms
          const platformJobsPromises = urls.map(async ({ platform }) => {
            if (platform === 'LinkedIn') {
              const result = await fetchLinkedInJobs(jobTitle, city, appendToTerminal);
              return { platform, jobs: result.jobs.map((job: any) => ({ ...job, platform: 'LinkedIn', url: job.link })), total: result.jobs.length };
            } else if (platform === 'Jora') {
              const response = await fetch(`/api/jora?jobTitle=${encodeURIComponent(jobTitle)}&city=${encodeURIComponent(city)}&limit=60`);
              let jobs = [];
              if (response.ok) {
              const data = await response.json();
                jobs = data.jobs;
              }
              return { platform, jobs, total: jobs.length };
            } else if (platform === 'Seek') {
              const response = await fetch('http://localhost:4000/api/seek-jobs?jobTitle=' + encodeURIComponent(jobTitle) + '&city=' + encodeURIComponent(city) + '&limit=60');
              let jobs = [];
              if (response.ok) {
              const data = await response.json();
                jobs = data.jobs;
              }
              return { platform, jobs, total: jobs.length };
            } else {
              const result = await fetchJobsFromPlatform(platform, jobTitle, city, skills, 1, 60, appendToTerminal);
              return { platform, jobs: result.jobs, total: result.jobs.length };
            }
          });
          
          // Merge jobs from all platforms (no overlap, no repeat)
          const platformResultsSettled = await Promise.allSettled(platformJobsPromises);
          const platformResults = platformResultsSettled
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);
          // Terminal output number of jobs from each platform, whether 0 or not
          platformResults.forEach(r => {
            appendToTerminal(`✓ ${r.platform}: ${r.jobs.length} jobs`);
          });
          let allPlatformJobs = platformResults.flatMap(result => result.jobs);
          // Platform name normalization, ensure Adzuna uniform
          allPlatformJobs = allPlatformJobs.map(job => ({
            ...job,
            platform: job.platform
              ? job.platform.charAt(0).toUpperCase() + job.platform.slice(1)
              : job.platform
          }));
          // Debug: Print all platform jobs structure
          console.log('All platform jobs:', allPlatformJobs.map(j => ({ platform: j.platform, url: j.url, title: j.title })));
          console.log('Adzuna jobs in allPlatformJobs:', allPlatformJobs.filter(j => (j.platform || '').toLowerCase().includes('adzuna')));
          // Correction: Adzuna jobs are displayed if they have a url, no special shielding
          allPlatformJobs = allPlatformJobs.filter(job =>
            job.platform !== 'Adzuna' || (job.url && job.url.length > 0)
          );
          // Uniform total jobs
          setTotalJobs(allPlatformJobs.length);
          setTotalPages(Math.ceil(allPlatformJobs.length / jobsPerPage));
          
          console.log('All platform jobs:', allPlatformJobs);
          
          // Ensure job data matches Job type
          const validJobs = allPlatformJobs.map(job => ({
            ...job,
            jobType: job.jobType || 'Full-time',
            tags: job.tags || [],
            description: job.description || 'No description provided.',
            matchScore: job.platform === 'Adzuna' ? 30 : 75,
            matchAnalysis: 'Unable to analyze match'
          })) as Job[];
          
          // Get match score for each job
          appendToTerminal('○ Analyzing job matches...');
          const jobsWithScores = await Promise.all(
            validJobs.map(async (job) => {
              try {
                const startTime = performance.now();
                appendToTerminal(`○ Analyzing match for "${job.title}"`);
                
                const matchResponse = await fetch('/api/job-match', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    jobTitle: job.title,
                    jobDescription: job.description,
                    jobRequirements: job.requirements || [],
                    jobLocation: job.location,
                    userProfile: {
                      jobTitles: [job.title],
                      skills: job.skills || [],
                      city: job.location,
                      seniority: job.experience,
                      openToRelocate: job.experience?.toLowerCase().includes('senior'),
                      careerPriorities: userProfile?.careerPriorities || []
                    }
                  }),
                });
                
                const endTime = performance.now();
                const duration = Math.round(endTime - startTime);
                const status = matchResponse.status;
                
                appendToTerminal(`✓ Match analysis completed in ${duration}ms`);
                
                const matchData = await matchResponse.json();
                return {
                  ...job,
                  matchScore: matchData.score,
                  matchAnalysis: matchData.analysis,
                  matchHighlights: matchData.highlights,
                  summary: matchData.listSummary,
                  detailedSummary: matchData.detailedSummary
                };
              } catch (error) {
                console.error('Error getting match score:', error);
                appendToTerminal(`✗ Match analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                return {
                  ...job,
                  matchScore: 75,
                  matchAnalysis: 'Unable to analyze match',
                  matchHighlights: [
                    `Location match: ${job.location}`,
                    `Required skills match: ${job.requirements?.join(', ') || 'Not specified'}`,
                    'Mid-level seniority alignment'
                  ],
                  summary: 'Unable to generate job summary',
                  detailedSummary: 'Unable to generate detailed job summary'
                };
              }
            })
          );
          
          // Debug: Print Adzuna jobs in validJobs and jobsWithScores stages
          console.log('Adzuna in validJobs:', validJobs.filter(j => j.platform === 'Adzuna'));
          console.log('Adzuna in jobsWithScores:', jobsWithScores.filter(j => j.platform === 'Adzuna'));
          
          appendToTerminal('✓ Jobs sorted by match score');
          
          // Sort by match score
          const sortedJobs = jobsWithScores.sort((a, b) => b.matchScore - a.matchScore);
          
          setAllJobs(sortedJobs);
          setTotalJobs(sortedJobs.length);
          setTotalPages(Math.ceil(sortedJobs.length / jobsPerPage));
          // Set first page
          setPagedJobs(sortedJobs.slice(0, jobsPerPage));
          if (sortedJobs.length > 0) {
            setSelectedJob(sortedJobs[0]);
            appendToTerminal(`✓ Job search completed successfully, ${sortedJobs.length} jobs in total`);
          }
          
          // Update cache after getting new data
          if (sortedJobs.length > 0) {
            cacheUtils.setCache(sortedJobs, { jobTitle, city, skills });
            appendToTerminal('✓ Job data cached for future use');
          }
          console.log('Final total:', sortedJobs.length);
          appendToTerminal(`Final total: ${sortedJobs.length}`);
        } else {
          console.log('Missing required data:', { 
            hasJobTitle: !!jobTitle, 
            hasCity: !!city 
          });
          appendToTerminal('✗ Error: Missing required profile information');
          appendToTerminal('Please complete your profile to start job search');
        }
      } catch (error) {
        console.error('Error in fetchJobs:', error);
        appendToTerminal(`✗ Error while fetching jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, [userProfile, appendToTerminal]);

  // New: Page logic, slice only when currentPage changes
  useEffect(() => {
    const startIndex = (currentPage - 1) * jobsPerPage;
    const endIndex = startIndex + jobsPerPage;
    setPagedJobs(allJobs.slice(startIndex, endIndex));
  }, [allJobs, currentPage, jobsPerPage]);

  const handleJobSelect = (jobId: string) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const handleViewDetails = (job: Job, rect?: DOMRect, ref?: HTMLElement) => {
    setSelectedJob(job);
    setShowDetailModal(true);
    setSelectedJobRef(ref || null);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedJobRef(null);
  };

  const handleSelectAll = () => {
    if (selectedJobs.length === allJobs.length) {
      setSelectedJobs([]);
    } else {
      setSelectedJobs(allJobs.map(job => job.id));
    }
  };

  const handleBatchApply = async () => {
    try {
      const jobsToApply = allJobs.filter(job => selectedJobs.includes(job.id));
      await handleBatchLinkedInApply(jobsToApply);
      setSelectedJobs([]); // Clear selected state
    } catch (error) {
      console.error('Error applying to jobs:', error);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleUpdatePreferences = (preferences: Record<string, string>) => {
    cacheUtils.clearCache(); // Clear cache
    // Merge new preferences into existing search conditions
    const updatedSearchParams = new URLSearchParams();
    Object.entries(preferences).forEach(([key, value]) => {
      if (value) {
        updatedSearchParams.set(key, value);
      }
    });
    
    // Update URL parameters
    router.push(`/jobs?${updatedSearchParams.toString()}`);
    
    // Update user configuration
    const updatedProfile = {
      ...userProfile,
      ...preferences
    };
    setUserProfile(updatedProfile);
    localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    
    // Reset loading state and current page
    setIsLoading(true);
    setCurrentPage(1);
    
    // Trigger re-fetching jobs
    const fetchJobs = async () => {
      try {
        const jobTitle = updatedProfile?.jobTitle?.[0];
        const city = updatedProfile?.city;
        const skillsStr = localStorage.getItem('skills');
        const skillsArray = skillsStr ? JSON.parse(skillsStr) : [];
        const skills = skillsArray.map((skill: any) => 
          typeof skill === 'object' ? skill.name : skill
        );
        const seniority = updatedProfile?.seniority || '';
        const openToRelocate = updatedProfile?.openForRelocation === 'yes';
        
        if (jobTitle && city) {
          const urls = generateSearchUrls(jobTitle, skills, city);
          setSearchUrls(urls);
          
          const platformJobsPromises = urls.map(async ({ platform }) => {
            const result = await fetchJobsFromPlatform(platform, jobTitle, city, skills, currentPage, jobsPerPage, appendToTerminal);
            return result;
          });
          
          const platformResultsSettled = await Promise.allSettled(platformJobsPromises);
          const platformResults = platformResultsSettled
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);
          const allPlatformJobs = platformResults.flatMap(result => result.jobs);
          
          const total = platformResults.reduce((sum, result) => sum + result.total, 0);
          const totalPages = Math.ceil(total / jobsPerPage);
          
          const validJobs = allPlatformJobs.map(job => ({
            ...job,
            jobType: job.jobType || 'Full-time',
            tags: job.tags || [],
            description: job.description || 'No description provided.',
            matchScore: job.platform === 'Adzuna' ? 30 : 75,
            matchAnalysis: 'Unable to analyze match'
          })) as Job[];
          
          const jobsWithScores = await Promise.all(
            validJobs.map(async (job) => {
              try {
                const startTime = performance.now();
                appendToTerminal(`○ Analyzing match for "${job.title}"`);
                
                const matchResponse = await fetch('/api/job-match', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    jobTitle: job.title,
                    jobDescription: job.description,
                    jobRequirements: job.requirements || [],
                    jobLocation: job.location,
                    userProfile: {
                      jobTitles: [job.title],
                      skills: job.requirements || [],
                      city: job.location,
                      seniority: job.experience,
                      openToRelocate: job.experience?.toLowerCase().includes('senior'),
                      careerPriorities: updatedProfile?.careerPriorities || []
                    }
                  }),
                });
                
                const endTime = performance.now();
                const duration = Math.round(endTime - startTime);
                const status = matchResponse.status;
                
                appendToTerminal(`✓ Match analysis completed in ${duration}ms`);
                
                const matchData = await matchResponse.json();
                return {
                  ...job,
                  matchScore: matchData.score,
                  matchAnalysis: matchData.analysis,
                  matchHighlights: matchData.highlights,
                  summary: matchData.listSummary,
                  detailedSummary: matchData.detailedSummary
                };
              } catch (error) {
                console.error('Error getting match score:', error);
                appendToTerminal(`❌ Match analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                return {
                  ...job,
                  matchScore: 75,
                  matchAnalysis: 'Unable to analyze match',
                  matchHighlights: [
                    `Location match: ${job.location}`,
                    `Required skills match: ${job.requirements?.join(', ') || 'Not specified'}`,
                    'Mid-level seniority alignment'
                  ],
                  summary: 'Unable to generate job summary',
                  detailedSummary: 'Unable to generate detailed job summary'
                };
              }
            })
          );
          
          const sortedJobs = jobsWithScores.sort((a, b) => b.matchScore - a.matchScore);
          
          setAllJobs(sortedJobs);
          setTotalJobs(total);
          setTotalPages(totalPages);
          if (sortedJobs.length > 0) {
            setSelectedJob(sortedJobs[0]);
          }
        }
      } catch (error) {
        console.error('Error in fetchJobs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  };

  // Listen for job ad visibility
  useEffect(() => {
    if (!showDetailModal || !selectedJobRef) return;
    const checkVisibility = () => {
      const rect = selectedJobRef.getBoundingClientRect();
      if (
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth
      ) {
        setShowDetailModal(false);
        setSelectedJobRef(null);
      }
    };
    window.addEventListener('scroll', checkVisibility);
    window.addEventListener('resize', checkVisibility);
    checkVisibility();
    return () => {
      window.removeEventListener('scroll', checkVisibility);
      window.removeEventListener('resize', checkVisibility);
    };
  }, [showDetailModal, selectedJobRef]);

  // Auto scroll to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalOutput]);

  useSmartAutoScroll(terminalRef, terminalOutput);

  // Listen for job fetching stage, control screenshot stream
  const startScreenshotStream = useCallback(() => {
    console.log('Starting screenshot stream...');
    setShowScreenshotStream(true);
    if (wsRef.current) {
      console.log('Closing existing WebSocket connection...');
      wsRef.current.close();
    }
    console.log('Creating new WebSocket connection...');
    const ws = new WebSocket('ws://localhost:3003');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connection opened');
    };

    ws.onmessage = (event) => {
      console.log('Received WebSocket message:', event.data instanceof Blob ? 'Blob data' : event.data);
      if (event.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          console.log('Converting blob to data URL...');
          setScreenshotData(reader.result as string);
        };
        reader.readAsDataURL(event.data);
      } else if (event.data === 'LOGIN_REQUIRED') {
        console.log('LinkedIn login required');
      } else if (event.data.startsWith('ERROR:')) {
        console.error('WebSocket error:', event.data);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setShowScreenshotStream(false);
      setScreenshotData(null);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      wsRef.current = null;
    };
  }, []);

  const stopScreenshotStream = useCallback(() => {
    console.log('Stopping screenshot stream...');
    setShowScreenshotStream(false);
    // Don't clear screenshotData, so job fetching can still retain the last frame screenshot
    if (wsRef.current) {
      console.log('Closing WebSocket connection...');
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    console.log('isLoading changed:', isLoading);
    if (isLoading) {
      startScreenshotStream();
    } else {
      stopScreenshotStream();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isLoading, startScreenshotStream, stopScreenshotStream]);

  // If loading user configuration, show loading state
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {language === 'zh' ? 'Loading...' : 'Loading...'}
          </h2>
          <p className="text-gray-500">
            {language === 'zh' 
              ? 'Fetching your profile...' 
              : 'Fetching your profile...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'zh')}
                className="ml-4 text-sm text-gray-500"
              >
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-grow flex items-center justify-center">
        <div className="flex w-full px-6 md:px-10 lg:px-16 min-h-[calc(100vh-64px)] ml-12">
          {/* Left job list area */}
          <div className="pr-4 flex-none overflow-y-auto" style={{ width: 1000 }}>
            <div className="bg-white">
              {/* Job list part */}
              <div className="w-full">
                <div className="sticky top-0 bg-white z-10 p-3 border-b border-gray-200">
                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        {language === 'zh' ? '推荐职位' : 'Recommended Jobs'}
                      </h2>
                      <span className="text-sm text-gray-500">
                        {totalJobs} {language === 'zh' ? '个职位' : 'jobs'}
                      </span>
                    </div>
                    
                    {/* Control bar */}
                    <div className="flex items-center space-x-3 text-sm">
                      <button
                        onClick={handleSelectAll}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {selectedJobs.length === allJobs.length 
                          ? (language === 'zh' ? '取消全选' : 'Deselect All') 
                          : (language === 'zh' ? '全选' : 'Select All')}
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={handleBatchApply}
                        disabled={selectedJobs.length === 0}
                        className={`text-blue-600 hover:text-blue-800 font-medium ${
                          selectedJobs.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {language === 'zh' ? '申请选中职位' : 'Apply Selected'} ({selectedJobs.length})
                      </button>
                    </div>
                  </div>
                </div>

                {isLoading ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">
                      {language === 'zh' ? '加载中...' : 'Loading jobs...'}
                    </p>
                  </div>
                ) : allJobs.length > 0 ? (
                  <>
                    <div className="divide-y divide-gray-200">
                      {pagedJobs.map((job, index) => (
                        <JobSummaryCard
                          key={job.id + '-' + job.platform}
                          job={job}
                          language={language}
                          isSelected={selectedJobs.includes(job.id)}
                          onSelect={() => handleJobSelect(job.id)}
                          onViewDetails={(job, _rect, cardRef) => {
                            handleViewDetails(job, undefined, cardRef?.current || undefined);
                          }}
                          userProfile={{
                            jobTitles: userProfile.jobTitle || [],
                            skills: userProfile.skills?.map((skill: any) =>
                              typeof skill === 'object' ? skill.name : skill
                            ) || [],
                            city: userProfile.city || '',
                            seniority: userProfile.seniority || '',
                            openToRelocate: userProfile.openForRelocation === 'yes'
                          }}
                          cardId={`job-card-${job.id}`}
                        />
                      ))}
                    </div>
                    
                    {/* Page control */}
                    <div className="flex justify-center items-center space-x-2 py-4 border-t border-gray-200">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-1 rounded-md ${
                          currentPage === 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {language === 'zh' ? '上一页' : 'Previous'}
                      </button>
                      <span className="text-sm text-gray-600">
                        {language === 'zh' ? '第' : 'Page'} {currentPage} {language === 'zh' ? '页，共' : 'of'} {totalPages} {language === 'zh' ? '页' : 'pages'}
                      </span>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1 rounded-md ${
                          currentPage === totalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {language === 'zh' ? '下一页' : 'Next'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 px-4">
                    <p className="text-gray-500">
                      {language === 'zh' 
                        ? '暂无推荐职位。请在个人资料页面完善您的求职意向。' 
                        : 'No recommended jobs yet. Please complete your job preferences in the Profile page.'}
                    </p>
                    <Link
                      href="/profile"
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {language === 'zh' ? '完善个人资料' : 'Complete Profile'}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Héra Computer */}
          <div className="pl-4 border-l border-gray-200 flex-none" style={{ width: 700 }}>
            <div className="h-screen sticky top-0">
              <div className="p-4">
                <h2 className="text-base font-semibold text-gray-700 mb-4">Héra Computer</h2>
                {showScreenshotStream && screenshotData ? (
                  <img ref={screenshotRef} src={screenshotData} alt="LinkedIn Screenshot" style={{ width: '100%', borderRadius: 8, marginBottom: 16 }} />
                ) : (
                  <div
                    ref={terminalRef}
                    className="font-mono text-sm leading-[20px] whitespace-pre-wrap bg-white rounded-lg p-4 border border-gray-200 overflow-y-auto w-full max-w-full"
                    id="hera-computer-terminal"
                    style={{ 
                      height: '800px',
                      overflowY: 'scroll',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#94A3B8 transparent',
                      fontFamily: 'Menlo, Monaco, \"Courier New\", monospace',
                      fontSize: '12px',
                      lineHeight: '20px',
                      backgroundColor: '#ffffff',
                      color: '#374151'
                    }}
                  >
                    <div className="space-y-1">
                      {terminalOutput.map((line, index) => {
                        const processedLine = line.replace(/🔍/g, '○')
                                               .replace(/📋/g, '○')
                                               .replace(/📊/g, '○')
                                               .replace(/🔗/g, '○')
                                               .replace(/✨/g, '○')
                                               .replace(/🎉/g, '○')
                                               .replace(/❌/g, '✗')
                                               .replace(/✅/g, '✓')
                                               .replace(/📍/g, '○')
                                               .replace(/📅/g, '○')
                                               .replace(/📈/g, '○')
                                               .replace(/📉/g, '○')
                                               .replace(/📌/g, '○')
                                               .replace(/🔑/g, '○')
                                               .replace(/📝/g, '○')
                                               .replace(/📎/g, '○')
                                               .replace(/🔄/g, '○');

                        if (line.startsWith('○ Compiling')) {
                          return <div key={index} className="text-gray-500">{processedLine}</div>;
                        }
                        if (line.startsWith('✓ Compiled') || line.startsWith('✓')) {
                          return <div key={index} className="text-green-600">{processedLine}</div>;
                        }
                        if (line.startsWith('❌')) {
                          return <div key={index} className="text-red-600">{processedLine}</div>;
                        }
                        if (line.startsWith('○')) {
                          return <div key={index} className="text-gray-500">{processedLine}</div>;
                        }
                        if (line.includes('API called with:') || line.includes('Raw response:')) {
                          const [prefix, data] = line.split(/:\s(.+)/);
                          return (
                            <div key={index}>
                              <span className="text-gray-600">{prefix}:</span>
                              <pre className="text-gray-800 ml-2 whitespace-pre-wrap">{data}</pre>
                            </div>
                          );
                        }
                        if (line.match(/^(GET|POST|PUT|DELETE)/)) {
                          const parts = line.split(' ');
                          return (
                            <div key={index}>
                              <span className="text-blue-600">{parts[0]}</span>
                              <span className="text-gray-600"> {parts.slice(1).join(' ')}</span>
                            </div>
                          );
                        }
                        return <div key={index} className="text-gray-600">{processedLine}</div>;
                      })}
                    </div>
                    <div ref={terminalEndRef} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Job details floating window */}
      {showDetailModal && (
        <div
          className="fixed z-50 bg-white shadow-xl rounded-lg border border-gray-200 flex flex-col"
          style={{
            right: 32,
            top: 120,
            width: 400,
            height: Math.floor(window.innerHeight / 3),
          }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-base font-semibold text-gray-900">
              {language === 'zh' ? '职位详情' : 'Job Details'}
            </h2>
            <button
              onClick={handleCloseDetailModal}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 text-sm">
            <JobDetailPanel job={selectedJob} language={language} compact />
          </div>
        </div>
      )}

      <JobAssistant onUpdatePreferences={handleUpdatePreferences} language={language} />
    </div>
  );
} 