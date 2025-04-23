'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { type Language } from '@/constants/profileData';

interface Option {
  value: string;
  label: {
    en: string;
    zh: string;
  };
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  options: ReadonlyArray<Option>;
  error?: string;
  language: Language;
  required?: boolean;
  multiple?: boolean;
  disabled?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, language, required, multiple, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            className={cn(
              'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm appearance-none pr-10',
              error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
              multiple && 'min-h-[120px]',
              disabled && 'opacity-75 bg-gray-100 cursor-not-allowed',
              className
            )}
            ref={ref}
            multiple={multiple}
            disabled={disabled}
            {...props}
          >
            {!multiple && (
              <option value="">{language === 'en' ? 'Please select' : '请选择'}</option>
            )}
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label[language]}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
); 