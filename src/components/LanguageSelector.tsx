import React from 'react';

interface LanguageSelectorProps {
  language: 'en' | 'zh';
  onLanguageChange: (language: 'en' | 'zh') => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ language, onLanguageChange }) => {
  return (
    <select
      className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
      value={language}
      onChange={(e) => onLanguageChange(e.target.value as 'en' | 'zh')}
    >
      <option value="en">English</option>
      <option value="zh">中文</option>
    </select>
  );
}; 