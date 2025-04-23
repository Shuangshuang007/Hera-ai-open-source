import React from 'react';

interface TabProps {
  children: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

export const Tab: React.FC<TabProps> = ({ children, isActive, onClick }) => {
  return (
    <button
      className={`${
        isActive
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-base`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}; 