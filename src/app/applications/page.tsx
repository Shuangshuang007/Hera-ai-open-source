"use client";

import React, { useEffect, useState, useRef } from "react";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { JobSummaryCard } from "@/components/JobSummaryCard";

export default function ApplicationsPage() {
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const jobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');
    setSavedJobs(jobs);
  }, []);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

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
              <Link href="/jobs" className="border-b-2 border-transparent py-4 text-[20px] font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">
                Jobs
              </Link>
              <Link href="/applications" className="border-b-2 border-blue-500 py-4 text-[20px] font-medium text-blue-600">
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
        {/* 左侧 Job List 区域 */}
        <div className="pr-4 flex-none overflow-y-auto" style={{ width: 1000 }}>
          <div className="bg-white">
            <div className="w-full">
              <div className="sticky top-0 bg-white z-10 p-3 border-b border-gray-200">
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      {language === 'zh' ? '已保存职位' : 'Saved Jobs'}
                    </h2>
                    <span className="text-sm text-gray-500">
                      {savedJobs.length} {language === 'zh' ? '个职位' : 'jobs'}
                    </span>
                  </div>
                </div>
              </div>
              {savedJobs.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {savedJobs.map((job, index) => (
                    <JobSummaryCard
                      key={job.id + '-' + job.platform}
                      job={job}
                      language={language}
                      isSelected={false}
                      onSelect={() => {}}
                      onViewDetails={() => {}}
                      userProfile={{
                        jobTitles: job.title ? [job.title] : [],
                        skills: job.skills || [],
                        city: job.location || '',
                        seniority: job.seniority || '',
                        openToRelocate: false
                      }}
                      cardId={`job-card-${job.id}`}
                      renderCustomActions={() => (
                        <>
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold bg-gray-100 text-blue-700 hover:bg-gray-200 rounded px-3 py-1 transition-colors duration-150 shadow-sm mr-2"
                            style={{ height: '28px', lineHeight: '18px' }}
                          >
                            {language === 'zh' ? `在${job.platform}上申请` : `Apply on ${job.platform}`}
                          </a>
                          <a
                            href={getPlatformSearchUrl(job)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold bg-gray-100 text-blue-700 hover:bg-gray-200 rounded px-3 py-1 transition-colors duration-150 shadow-sm"
                            style={{ height: '28px', lineHeight: '18px' }}
                          >
                            {language === 'zh' ? `在${job.platform}搜索类似职位` : `Search Similar Jobs on ${job.platform}`}
                          </a>
                        </>
                      )}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 px-4">
                  <p className="text-gray-500">
                    {language === 'zh'
                      ? '暂无已保存职位。请在职位页面保存您感兴趣的职位。'
                      : 'No saved jobs yet. Please save jobs from the Jobs page.'}
                  </p>
                  <Link
                    href="/jobs"
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {language === 'zh' ? '去职位页面' : 'Go to Jobs'}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧 Computer 终端 */}
        <div className="pl-4 border-l border-gray-200 flex-none" style={{ width: 700 }}>
          <div className="h-screen sticky top-0">
            <div className="p-4">
              <h2 className="text-base font-semibold text-gray-700 mb-4">Héra Computer</h2>
              <div
                ref={terminalRef}
                className="font-mono text-sm leading-[20px] whitespace-pre-wrap bg-white rounded-lg p-4 border border-gray-200 overflow-y-auto w-full max-w-full"
                id="hera-computer-terminal"
                style={{
                  height: '800px',
                  overflowY: 'scroll',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#94A3B8 transparent',
                  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                  fontSize: '12px',
                  lineHeight: '20px',
                  backgroundColor: '#ffffff',
                  color: '#374151'
                }}
              >
                <div className="space-y-1">
                  <div className="text-gray-500">{language === 'zh' ? '终端已就绪。' : 'Terminal ready.'}</div>
                </div>
                <div ref={terminalEndRef} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getPlatformSearchUrl(job) {
  if (!job.platform || !job.title) return '#';
  const title = encodeURIComponent(job.title);
  switch (job.platform.toLowerCase()) {
    case 'linkedin':
      return `https://www.linkedin.com/jobs/search/?keywords=${title}`;
    case 'seek':
      return `https://www.seek.com.au/jobs?keywords=${title}`;
    case 'jora':
      return `https://au.jora.com/j?search_query=${title}`;
    case 'adzuna':
      return `https://www.adzuna.com.au/search?q=${title}`;
    default:
      return '#';
  }
} 