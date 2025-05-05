import React, { useEffect, useState } from 'react';
import { Job } from '@/constants/mockJobs';
import { JobDetailPanel } from './JobDetailPanel';

interface JobDetailModalProps {
  job: Job | null;
  language: 'en' | 'zh';
  onClose: () => void;
  rect?: DOMRect | null;
}

export function JobDetailModal({ job, language, onClose, rect }: JobDetailModalProps) {
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const modalWidth = 650;
  const modalHeight = Math.floor(window.innerHeight / 3 * 1.2);
  const padding = 8;

  useEffect(() => {
    if (!rect) return;

    const updatePosition = () => {
      let left = rect.right + padding;
      let top = rect.top + window.scrollY;
      if (left + modalWidth > window.innerWidth) {
        left = rect.left - modalWidth - padding;
      }
      if (top + modalHeight > window.innerHeight + window.scrollY) {
        top = window.innerHeight + window.scrollY - modalHeight - padding;
      }
      if (top < padding + window.scrollY) top = padding + window.scrollY;
      setPosition({ left, top });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [rect, modalHeight]);

  if (!job || !rect) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-gray-500 bg-opacity-30 transition-opacity pointer-events-auto" onClick={onClose} />
      {/* 悬浮窗口 */}
      <div
        className="fixed bg-white shadow-xl rounded-lg border border-gray-200 pointer-events-auto flex flex-col"
        style={{ 
          left: position.left, 
          top: position.top, 
          width: modalWidth, 
          height: modalHeight,
        }}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {language === 'zh' ? '职位详情' : 'Job Details'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-3 text-sm">
          <JobDetailPanel job={job} language={language} compact />
        </div>
      </div>
    </div>
  );
} 