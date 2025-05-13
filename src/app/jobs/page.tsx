'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { type Job } from '@/types/job';  // 从 types 目录导入 Job 类型
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

// 添加缓存相关的常量和类型
const CACHE_KEY = 'job_search_cache';
const CACHE_EXPIRY = 60 * 60 * 1000; // 1小时过期

interface CacheData {
  jobs: Job[];
  timestamp: number;
  searchParams: {
    jobTitle: string;
    city: string;
    skills: string[];
  };
}

// 缓存工具函数
const cacheUtils = {
  getCache: (): CacheData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data: CacheData = JSON.parse(cached);
      const now = Date.now();
      
      // 检查缓存是否过期
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

// 滚动跟随逻辑（带类型声明）
function useSmartAutoScroll(ref: React.RefObject<HTMLDivElement>, dep: any[]) {
  const [isAuto, setIsAuto] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isAuto) {
      el.scrollTop = el.scrollHeight;
    }
    const onScroll = () => {
      // 距底部小于30px时自动滚动，否则用户手动滚动
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

  // 在组件挂载后获取用户配置
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

  // 添加终端输出的函数
  const appendToTerminal = useCallback((message: string) => {
    // 如果消息是编译相关的，保持原格式
    if (message.includes('Compiling') || message.includes('Compiled')) {
      setTerminalOutput(prev => [...prev, message]);
      return;
    }

    // 如果是 API 调用参数，格式化 JSON
    if (typeof message === 'string' && message.includes('API called with:')) {
      try {
        const [prefix, paramsStr] = message.split('API called with:');
        const params = JSON.parse(paramsStr);
        const formattedParams = JSON.stringify(params, null, 2);
        setTerminalOutput(prev => [...prev, `${prefix}API called with:\n${formattedParams}`]);
        return;
      } catch (e) {
        // 如果解析失败，使用原始消息
        setTerminalOutput(prev => [...prev, message]);
        return;
      }
    }

    // 其他消息直接添加
    setTerminalOutput(prev => [...prev, message]);
  }, []);

  // 监听编译消息
  useEffect(() => {
    const handleCompilationMessage = (event: MessageEvent) => {
      if (event.data.type === 'compilation') {
        appendToTerminal(event.data.message);
      }
    };

    window.addEventListener('message', handleCompilationMessage);
    return () => window.removeEventListener('message', handleCompilationMessage);
  }, [appendToTerminal]);

  // 在用户配置加载后获取职位
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
        
        // 检查缓存
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
        
        // 如果没有缓存或缓存过期，继续原有的获取逻辑
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
          
          // 合并所有平台的职位（不交错、不重复）
          const platformResultsSettled = await Promise.allSettled(platformJobsPromises);
          const platformResults = platformResultsSettled
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);
          // 终端输出每个平台的职位数，无论是否为0
          platformResults.forEach(r => {
            appendToTerminal(`✓ ${r.platform}: ${r.jobs.length} jobs`);
          });
          let allPlatformJobs = platformResults.flatMap(result => result.jobs);
          // 平台名归一化，确保 Adzuna 统一
          allPlatformJobs = allPlatformJobs.map(job => ({
            ...job,
            platform: (job.platform || '').trim().toLowerCase() === 'adzuna' ? 'Adzuna' : job.platform
          }));
          // 调试：打印所有平台 jobs 结构
          console.log('所有平台 jobs:', allPlatformJobs.map(j => ({ platform: j.platform, url: j.url, title: j.title })));
          console.log('Adzuna jobs in allPlatformJobs:', allPlatformJobs.filter(j => (j.platform || '').toLowerCase().includes('adzuna')));
          // 修正：Adzuna职位只要有url就展示，不再特殊屏蔽
          allPlatformJobs = allPlatformJobs.filter(job =>
            job.platform !== 'Adzuna' || (job.url && job.url.length > 0)
          );
          // 统一职位总数
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
          
          // 调试：打印 Adzuna 职位在 validJobs 和 jobsWithScores 阶段
          console.log('Adzuna in validJobs:', validJobs.filter(j => j.platform === 'Adzuna'));
          console.log('Adzuna in jobsWithScores:', jobsWithScores.filter(j => j.platform === 'Adzuna'));
          
          appendToTerminal('✓ Jobs sorted by match score');
          
          // Sort by match score
          const sortedJobs = jobsWithScores.sort((a, b) => b.matchScore - a.matchScore);
          
          setAllJobs(sortedJobs);
          setTotalJobs(sortedJobs.length);
          setTotalPages(Math.ceil(sortedJobs.length / jobsPerPage));
          // 设置第一页
          setPagedJobs(sortedJobs.slice(0, jobsPerPage));
          if (sortedJobs.length > 0) {
            setSelectedJob(sortedJobs[0]);
            appendToTerminal(`✓ Job search completed successfully, ${sortedJobs.length} jobs in total`);
          }
          
          // 在获取到新数据后，更新缓存
          if (sortedJobs.length > 0) {
            cacheUtils.setCache(sortedJobs, { jobTitle, city, skills });
            appendToTerminal('✓ Job data cached for future use');
          }
          console.log('最终展示总数:', sortedJobs.length);
          appendToTerminal(`最终展示总数: ${sortedJobs.length}`);
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

  // 新增：分页逻辑，currentPage变化时只切片
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
      setSelectedJobs([]); // 清空选中状态
    } catch (error) {
      console.error('Error applying to jobs:', error);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleUpdatePreferences = (preferences: Record<string, string>) => {
    cacheUtils.clearCache(); // 清除缓存
    // 合并新的偏好到现有的搜索条件中
    const updatedSearchParams = new URLSearchParams();
    Object.entries(preferences).forEach(([key, value]) => {
      if (value) {
        updatedSearchParams.set(key, value);
      }
    });
    
    // 更新 URL 参数
    router.push(`/jobs?${updatedSearchParams.toString()}`);
    
    // 更新用户配置
    const updatedProfile = {
      ...userProfile,
      ...preferences
    };
    setUserProfile(updatedProfile);
    localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    
    // 重置加载状态和当前页面
    setIsLoading(true);
    setCurrentPage(1);
    
    // 触发重新获取工作
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

  // 监听job ad是否在可视区域
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

  // 自动滚动到最底部
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalOutput]);

  useSmartAutoScroll(terminalRef, terminalOutput);

  // 监听job fetching阶段，控制截图流
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
    // 不清空 screenshotData，这样 job fetching 结束后还能保留最后一帧截图
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

  // 如果正在加载用户配置，显示加载状态
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {language === 'zh' ? '加载中...' : 'Loading...'}
          </h2>
          <p className="text-gray-500">
            {language === 'zh' 
              ? '正在获取您的个人资料...' 
              : 'Fetching your profile...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex justify-between items-center px-8">
          <div className="flex space-x-8">
            <Logo />
            <div className="hidden md:flex space-x-8">
              <Link href="/profile" className="border-b-2 border-transparent py-4 text-[20px] font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">
                Profile
              </Link>
              <Link href="/jobs" className="border-b-2 border-blue-500 py-4 text-[20px] font-medium text-blue-600">
                Jobs
              </Link>
              <Link href="/applications" className="border-b-2 border-transparent py-4 text-[20px] font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">
                Applications
              </Link>
            </div>
          </div>
          <select
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'zh')}
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </nav>
      </div>

      <div className="flex w-full px-6 md:px-10 lg:px-16 min-h-[calc(100vh-64px)] ml-12">
        {/* 左侧职位列表区域 */}
        <div className="pr-4 flex-none overflow-y-auto" style={{ width: 1000 }}>
          <div className="bg-white">
            {/* 职位列表部分 */}
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
                  
                  {/* 控制栏 */}
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
                  
                  {/* 分页控件 */}
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

        {/* 右侧 Héra Computer */}
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

      {/* 职位详情悬浮窗口 */}
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