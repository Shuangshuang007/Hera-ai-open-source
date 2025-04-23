'use client';

import React, { useEffect, useState, useRef } from 'react';
import { mockJobs, type Job } from '@/constants/mockJobs';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { mockFetchJobs, handleBatchLinkedInApply } from '@/utils/jobSearch';
import { generateSearchUrls } from '@/utils/platformMapping';
import { JobSummaryCard } from '@/components/JobSummaryCard';
import { JobDetailPanel } from '@/components/JobDetailPanel';

interface JobResult {
  jobs: Job[];
  total: number;
  page: number;
  totalPages: number;
}

export default function JobsPage() {
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [searchUrls, setSearchUrls] = useState<Array<{platform: string, url: string}>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);
  const jobsPerPage = 15;
  const detailPanelRef = useRef<HTMLDivElement>(null);

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

  // 在用户配置加载后获取职位
  useEffect(() => {
    if (!userProfile) return;

    const fetchJobs = async () => {
      try {
        console.log('Starting fetchJobs...');
        
        // 优先使用完整用户资料中的数据
        const jobTitle = userProfile?.jobTitle?.[0];
        const city = userProfile?.city;
        const skillsStr = localStorage.getItem('skills');
        const skillsArray = skillsStr ? JSON.parse(skillsStr) : [];
        const skills = skillsArray.map((skill: any) => 
          typeof skill === 'object' ? skill.name : skill
        );
        const seniority = userProfile?.seniority || '';
        const openToRelocate = userProfile?.openForRelocation === 'yes';
        
        console.log('Parsed data:', { jobTitle, city, skills, seniority, openToRelocate });

        if (jobTitle && city) {
          // 生成平台特定的搜索URL
          const urls = generateSearchUrls(jobTitle, skills, city);
          console.log('Generated URLs:', urls);
          setSearchUrls(urls);
          
          // 获取所有平台的职位
          const platformJobsPromises = urls.map(async ({ platform }) => {
            console.log(`Fetching jobs for platform: ${platform} with city: ${city}`);
            const result = await mockFetchJobs(platform, jobTitle, city, skills, currentPage, jobsPerPage);
            console.log(`Found ${result.jobs.length} jobs for ${platform} in ${city}:`, result);
            return result;
          });
          
          // 等待所有平台的职位数据
          const platformResults = await Promise.all(platformJobsPromises);
          const allPlatformJobs = platformResults.flatMap(result => result.jobs);
          
          // 计算总职位数和总页数
          const total = platformResults.reduce((sum, result) => sum + result.total, 0);
          const totalPages = Math.ceil(total / jobsPerPage);
          
          console.log('All platform jobs:', allPlatformJobs);
          
          // 确保职位数据符合Job类型
          const validJobs = allPlatformJobs.map(job => ({
            ...job,
            jobType: job.jobType || 'Full-time',
            tags: job.tags || [],
            matchScore: 75,
            matchAnalysis: 'Unable to analyze match'
          })) as Job[];
          
          // 获取每个职位的匹配分数
          const jobsWithScores = await Promise.all(
            validJobs.map(async (job) => {
              try {
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
                      openToRelocate: job.openToRelocate,
                      careerPriorities: userProfile?.careerPriorities || []
                    }
                  }),
                });
                
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
          
          // 按照匹配分数排序
          const sortedJobs = jobsWithScores.sort((a, b) => b.matchScore - a.matchScore);
          
          console.log('Final valid jobs:', sortedJobs);
          setAllJobs(sortedJobs);
          setTotalJobs(total);
          setTotalPages(totalPages);
          if (sortedJobs.length > 0) {
            setSelectedJob(sortedJobs[0]);
          }
        } else {
          console.log('Missing required data:', { 
            hasJobTitle: !!jobTitle, 
            hasCity: !!city 
          });
        }
      } catch (error) {
        console.error('Error in fetchJobs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, [userProfile, currentPage]);

  const handleJobSelect = (jobId: string) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const handleViewDetails = (job: Job) => {
    setSelectedJob(job);
    // 滚动到详情面板，使用 block: 'nearest' 确保面板在视窗内可见
    detailPanelRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'nearest',
      inline: 'start'
    });
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* 顶部导航 */}
        <div className="flex justify-between items-center mb-4">
          <Logo />
          <select
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'zh')}
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </div>

        {/* 主导航标签 */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <Link
                href="/profile"
                className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-6 border-b-2 font-medium text-base"
              >
                {language === 'zh' ? '个人资料' : 'Profile'}
              </Link>
              <Link
                href="/jobs"
                className="border-blue-500 text-blue-600 whitespace-nowrap py-4 px-6 border-b-2 font-medium text-base"
              >
                {language === 'zh' ? '求职意向' : 'Jobs'}
              </Link>
              <Link
                href="/applications"
                className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-6 border-b-2 font-medium text-base"
              >
                {language === 'zh' ? '申请记录' : 'Applications'}
              </Link>
            </nav>
          </div>

          {/* 职位列表和详情面板 */}
          <div className="flex flex-col md:flex-row h-[calc(100vh-12rem)]">
            {/* 左侧职位列表 */}
            <div className="w-full md:w-3/5 lg:w-3/5 border-r border-gray-200 overflow-y-auto">
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
                    {allJobs.map(job => (
                      <JobSummaryCard
                        key={job.id}
                        job={job}
                        language={language}
                        isSelected={selectedJobs.includes(job.id)}
                        onSelect={() => handleJobSelect(job.id)}
                        onViewDetails={handleViewDetails}
                        userProfile={{
                          jobTitles: userProfile.jobTitle || [],
                          skills: userProfile.skills?.map((skill: any) => 
                            typeof skill === 'object' ? skill.name : skill
                          ) || [],
                          city: userProfile.city || '',
                          seniority: userProfile.seniority || '',
                          openToRelocate: userProfile.openForRelocation === 'yes'
                        }}
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
                <div className="text-center py-12">
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

            {/* 右侧详情面板 */}
            <div ref={detailPanelRef} className="w-full md:w-2/5 lg:w-2/5 p-4 overflow-y-auto">
              <JobDetailPanel job={selectedJob} language={language} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 