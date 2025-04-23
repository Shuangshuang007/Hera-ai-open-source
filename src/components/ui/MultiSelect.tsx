import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Language, LangLabel, Option, JobTitleGroup } from '@/constants/profileData';

export interface MultiSelectProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: JobTitleGroup[];
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  error?: string;
  required?: boolean;
  placeholder?: { en: string; zh: string };
  searchPlaceholder?: { en: string; zh: string };
  language: Language;
}

export function MultiSelect({
  options,
  value,
  onChange,
  label,
  error,
  required,
  placeholder = { en: 'Select options...', zh: '请选择...' },
  searchPlaceholder = { en: 'Search...', zh: '搜索...' },
  language,
  className,
  ...props
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.map(group => ({
    ...group,
    options: group.options.filter(option => {
      const searchTermLower = searchTerm?.toLowerCase() || '';
      const labelMatch = option.label?.[language]?.toLowerCase()?.includes(searchTermLower);
      const categoryMatch = option.category?.[language]?.toLowerCase()?.includes(searchTermLower);
      return labelMatch || categoryMatch;
    })
  })).filter(group => group.options.length > 0);

  const selectedLabels = value.map(v => {
    for (const group of options) {
      const option = group.options.find(opt => opt.value === v);
      if (option) return option.label[language];
    }
    return v;
  });

  const handleToggleOption = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  // 将选项分成两列
  const splitOptionsIntoColumns = (group: JobTitleGroup) => {
    const midPoint = Math.ceil(group.options.length / 2);
    return [
      group.options.slice(0, midPoint),
      group.options.slice(midPoint)
    ];
  };

  return (
    <div className="w-full" ref={containerRef} {...props}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <div
          className={cn(
            'min-h-[38px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
            'shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
            error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
            'cursor-pointer',
            className
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          {value.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedLabels.map((label, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-sm font-medium bg-blue-100 text-blue-800"
                >
                  {label}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleOption(value[index]);
                    }}
                    className="ml-1 inline-flex text-blue-400 hover:text-blue-600"
                  >
                    <span className="sr-only">Remove</span>
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-gray-500">{placeholder[language]}</span>
          )}
        </div>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg">
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder={searchPlaceholder[language]}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="max-h-[400px] overflow-auto">
              {filteredOptions.map((group, groupIndex) => {
                const [leftColumn, rightColumn] = splitOptionsIntoColumns(group);
                return (
                  <div key={groupIndex} className="py-2">
                    <div className="sticky top-0 bg-gray-50 px-3 py-1.5 text-sm font-semibold text-gray-900">
                      {group.label[language]}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4">
                      <div className="col-span-1">
                        {leftColumn.map((option, optionIndex) => (
                          <div
                            key={optionIndex}
                            className={cn(
                              'flex items-center px-3 py-2 text-sm cursor-pointer',
                              'hover:bg-gray-50',
                              value.includes(option.value) && 'bg-blue-50'
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleOption(option.value);
                            }}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={value.includes(option.value)}
                              onChange={() => {}}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="ml-3 truncate">
                              {option.label[language]}
                              {option.category && (
                                <span className="text-gray-500 text-xs ml-1">
                                  ({option.category[language]})
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="col-span-1">
                        {rightColumn.map((option, optionIndex) => (
                          <div
                            key={optionIndex}
                            className={cn(
                              'flex items-center px-3 py-2 text-sm cursor-pointer',
                              'hover:bg-gray-50',
                              value.includes(option.value) && 'bg-blue-50'
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleOption(option.value);
                            }}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={value.includes(option.value)}
                              onChange={() => {}}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="ml-3 truncate">
                              {option.label[language]}
                              {option.category && (
                                <span className="text-gray-500 text-xs ml-1">
                                  ({option.category[language]})
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
} 