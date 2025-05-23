import React, { useRef } from 'react';

interface JobSummaryCardProps {
  job: any;
  language: 'en' | 'zh';
  isSelected: boolean;
  onSelect: () => void;
  onViewDetails: (job: any, rect?: DOMRect, cardRef?: React.RefObject<HTMLDivElement> | undefined) => void;
  userProfile?: {
    jobTitles: string[];
    skills: string[];
    city: string;
    seniority: string;
    openToRelocate: boolean;
  };
  renderCustomActions?: () => React.ReactNode;
}

// 将第三人称转为第二人称
function toSecondPerson(text: string) {
  return text
    .replace(/\bThe candidate\b/g, 'You')
    .replace(/\bthe candidate\b/g, 'you')
    .replace(/\bTheir\b/g, 'Your')
    .replace(/\btheir\b/g, 'your')
    .replace(/\bThey have\b/g, 'You have')
    .replace(/\bthey have\b/g, 'you have')
    .replace(/\bTheir experience\b/g, 'Your experience')
    .replace(/\btheir experience\b/g, 'your experience');
}

const MatchSummary = ({ matchScore, matchAnalysis }: { matchScore: number | null, matchAnalysis: string | null }) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-900">Match Summary</h3>
        {matchScore !== null && (
          <div className="flex items-center">
            <span className="text-sm font-medium text-blue-700 mr-1">Match Score:</span>
            <span className="text-sm font-semibold text-blue-700">{matchScore}%</span>
          </div>
        )}
      </div>
      {matchAnalysis && (
        <p className="text-sm text-gray-600">{toSecondPerson(matchAnalysis)}</p>
      )}
    </div>
  );
};

export function JobSummaryCard({ 
  job, 
  language, 
  isSelected, 
  onSelect, 
  onViewDetails,
  userProfile,
  cardId,
  renderCustomActions
}: JobSummaryCardProps & { cardId?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  return (
    <div 
      className={`p-3 hover:bg-gray-50 cursor-pointer ${
        isSelected ? 'bg-blue-50' : ''
      }`}
      id={cardId}
      ref={cardRef}
    >
      <div className="flex items-start">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300"
        />
        <div className="ml-3 flex-1">
          {/* 职位标题和公司 */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{job.title}</h3>
              <p className="text-sm text-gray-600">{job.company}</p>
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {job.platform}
            </span>
          </div>
          
          {/* 位置和薪资信息 */}
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
            <span>{job.location}</span>
            {job.salary && (
              <span>• {job.salary}</span>
            )}
            {job.postedDate && (
              <span>• {language === 'zh' ? '发布于' : 'Posted'} {job.postedDate}</span>
            )}
          </div>
          
          {/* 职位类型和标签 */}
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
              {job.jobType}
            </span>
            {job.tags?.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
              >
                {tag}
              </span>
            ))}
          </div>
          
          {/* 职位描述摘要 */}
          {job.summary && (
            <div className="mt-2">
              <p className="text-sm text-gray-700 line-clamp-2">{job.summary}</p>
            </div>
          )}
          
          {/* 匹配分析 */}
          {job.matchScore && (
            <div className="mt-3">
              <div className="text-sm font-semibold text-blue-700 mb-2">
                {language === 'zh' ? '匹配分数' : 'Match Score'}: {job.matchScore}
              </div>
              {job.matchHighlights && job.matchHighlights.length > 0 && (
                <div className="text-sm text-gray-600 space-y-1">
                  {job.matchHighlights.map((highlight, index) => (
                    <div key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* 申请按钮 */}
          <div className="mt-1 flex justify-end space-x-2">
            {renderCustomActions ? (
              renderCustomActions()
            ) : (
              <>
                <button
                  type="button"
                  className="text-xs font-semibold bg-gray-100 text-blue-700 hover:bg-gray-200 rounded px-3 py-1 transition-colors duration-150 shadow-sm"
                  style={{ height: '28px', lineHeight: '18px' }}
                  onClick={e => {
                    e.stopPropagation();
                    if (window && window.dispatchEvent) {
                      window.dispatchEvent(new CustomEvent('send-job-to-chat', {
                        detail: {
                          title: job.title,
                          company: job.company,
                          whoWeAre: job.detailedSummary?.split('\n\n')[0] || '',
                          whoWeAreLookingFor: job.detailedSummary?.split('\n\n')[1] || '',
                          matchScore: job.matchScore,
                          matchAnalysis: job.matchAnalysis || '',
                          url: job.url || job.link || '',
                        }
                      }));
                    }
                  }}
                >
                  {language === 'zh' ? '发送到聊天' : 'Send to Chat'}
                </button>
                <button
                  type="button"
                  className="text-xs font-semibold bg-gray-100 text-blue-700 hover:bg-gray-200 rounded px-3 py-1 transition-colors duration-150 shadow-sm"
                  style={{ height: '28px', lineHeight: '18px' }}
                  onClick={e => {
                    e.stopPropagation();
                    onViewDetails(job, undefined, cardRef.current || undefined);
                  }}
                >
                  {language === 'zh' ? '查看详情' : 'View Details'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 