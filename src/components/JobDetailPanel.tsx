import React from 'react';
import { Job } from '@/types/job';
import { LinkedInAutoApply } from '@/components/LinkedInAutoApply';

interface JobDetailPanelProps {
  job: Job | null;
  language: 'en' | 'zh';
}

export function JobDetailPanel({ job, language }: JobDetailPanelProps) {
  if (!job) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-lg border border-gray-200">
        <div className="text-center p-8">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {language === 'zh' ? '选择一个职位查看详情' : 'Select a job to view details'}
          </h3>
          <p className="text-gray-500">
            {language === 'zh' 
              ? '从左侧列表中选择一个职位，查看完整的职位描述和要求。' 
              : 'Choose a job from the list to view its full description and requirements.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white rounded-lg border border-gray-200 overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {job.title}
          </h2>
          <button
            onClick={() => console.log('Starting application:', job.title)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {language === 'zh' ? '立即申请' : 'Auto Apply'}
          </button>
        </div>

        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          {job.company}
        </h3>

        {/* 只在有platform时显示搜索链接 */}
        {job.platform && (
          <div className="flex flex-col space-y-2">
            <a
              href={`https://www.${job.platform.toLowerCase()}.com/jobs/search?keywords=${encodeURIComponent(job.title)}&location=${encodeURIComponent(job.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
            >
              {language === 'zh' ? `在 ${job.platform} 上搜索相似职位` : `Search Similar Jobs on ${job.platform}`}
            </a>
            {job.url && (
              (job.platform.toLowerCase() === 'linkedin' && job.url.includes('/jobs/view/')) ||
              (job.platform.toLowerCase() === 'indeed' && job.url.includes('/viewjob')) ||
              (job.platform.toLowerCase() === 'seek' && job.url.includes('/job/'))
            ) && (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm inline-block"
              >
                {language === 'zh' ? `在 ${job.platform} 上查看该职位` : `View this job ad on ${job.platform}`}
              </a>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-4">
          <span>{job.location}</span>
          {job.salary && <span>• {job.salary}</span>}
          {job.postedDate && (
            <span>• {language === 'zh' ? '发布于' : 'Posted'} {job.postedDate}</span>
          )}
        </div>

        {/* Job Summary */}
        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            {language === 'zh' ? '职位概要' : 'Job Summary'}
          </h3>
          <div className="space-y-4">
            {/* Who we are */}
            <div>
              <span className="text-sm font-medium text-gray-800">
                {language === 'zh' ? '公司介绍' : 'Who we are'}: 
              </span>
              <span className="text-sm text-gray-600 ml-1">
                {(job.detailedSummary?.split('\n\n')[0] || job.summary || '')
                  .replace(/^Who we are:\s*/i, '')
                  .replace(/^公司介绍:\s*/i, '')}
              </span>
            </div>

            {/* Who we are looking for */}
            <div>
              <span className="text-sm font-medium text-gray-800">
                {language === 'zh' ? '理想候选人' : 'Who we are looking for'}: 
              </span>
              <span className="text-sm text-gray-600 ml-1">
                {(job.detailedSummary?.split('\n\n')[1] || '')
                  .replace(/^Who we are looking for:\s*/i, '')
                  .replace(/^理想候选人:\s*/i, '')}
              </span>
            </div>

            {/* Benefits and Offerings */}
            <div>
              <span className="text-sm font-medium text-gray-800">
                {language === 'zh' ? '福利待遇' : 'Benefits and Offerings'}: 
              </span>
              <span className="text-sm text-gray-600 ml-1">
                {(job.detailedSummary?.split('\n\n')[2] || '')
                  .replace(/^Benefits and Offerings:\s*/i, '')
                  .replace(/^福利待遇:\s*/i, '')}
              </span>
            </div>
          </div>
        </div>

        {/* Matching Summary Section */}
        {(job.matchScore !== undefined || job.matchAnalysis) && (
          <div className="mt-6 mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              {language === 'zh' ? '匹配分析' : 'Matching Summary'}
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              {job.matchScore !== undefined && (
                <div className="text-sm font-semibold text-blue-700 mb-3">
                  {language === 'zh' ? '匹配分数' : 'Match Score'}: {job.matchScore}
                </div>
              )}
              {job.matchAnalysis && (
                <div className="space-y-2">
                  {job.matchAnalysis.split('\n\n').map((section, index) => {
                    const [title, ...content] = section.split('\n');
                    return (
                      <div key={index}>
                        <span className="text-sm font-medium text-gray-800">{title}</span>
                        <span className="text-sm text-gray-700"> {content.join(' ')}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {job.description && (
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              {language === 'zh' ? '职位描述' : 'Job Description'}
            </h3>
            <p className="text-sm text-gray-700 whitespace-pre-line">{job.description}</p>
          </div>
        )}

        {job.requirements && job.requirements.length > 0 && (
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              {language === 'zh' ? '任职要求' : 'Requirements'}
            </h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
              {job.requirements.map((req, index) => (
                <li key={index}>{req}</li>
              ))}
            </ul>
          </div>
        )}

        {job.benefits && job.benefits.length > 0 && (
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              {language === 'zh' ? '福利待遇' : 'Benefits'}
            </h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
              {job.benefits.map((benefit, index) => (
                <li key={index}>{benefit}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
} 