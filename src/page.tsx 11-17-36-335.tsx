'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Logo } from '@/components/Logo';
import { 
  COUNTRIES, 
  CITIES, 
  JOB_TITLES, 
  SENIORITY_LEVELS, 
  JOB_TYPES,
  SALARY_PERIODS,
  YEARLY_SALARY_RANGES_AUD,
  YEARLY_SALARY_RANGES_RMB,
  type CountryCode,
  type Language,
} from '@/constants/profileData';
import { cn } from '@/lib/utils';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Trash2 } from 'lucide-react';
import { cityOptionsMap, type CountryKey } from '@/constants/cities';
import { Controller } from 'react-hook-form';
import { StorageManager } from '@/utils/storage';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format').min(1, 'Email is required'),
  phone: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  city: z.string().min(1, 'City is required'),
  jobTitle: z.array(z.string()).min(1, 'At least one job title is required'),
  seniority: z.string().min(1, 'Seniority is required'),
  openForRelocation: z.string().min(1, 'Please select relocation preference'),
  salaryPeriod: z.string().min(1, 'Salary period is required'),
  salaryRange: z.string().min(1, 'Salary range is required'),
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  website: z.string().optional(),
  video: z.string().optional(),
  resume: z.custom<File | null>((val) => val instanceof File || val === null, {
    message: 'Please upload a valid resume file'
  }),
  avatar: z.custom<File | null>((val) => val instanceof File || val === null, {
    message: 'Please upload a valid image file'
  }).optional(),
  about: z.string().optional(),
  education: z.array(z.object({
    startDate: z.string(),
    endDate: z.string(),
    degree: z.string(),
    school: z.string(),
  })).optional(),
  employment: z.array(z.object({
    startDate: z.string(),
    endDate: z.string(),
    company: z.string(),
    position: z.string(),
    description: z.string(),
  })).optional(),
  skills: z.array(z.object({
    name: z.string()
  })).optional(),
  careerPriorities: z.array(z.string()).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const translations = {
  en: {
    tabs: {
      profile: 'Profile',
      jobs: 'Jobs',
      applications: 'Applications',
    },
    sections: {
      resume: {
        title: 'Resume',
        upload: 'Upload Resume',
        dragDrop: 'or drag and drop',
        formats: 'PDF, DOC, DOCX formats',
        delete: 'Delete',
      },
      photo: {
        title: 'Photo',
        upload: 'Upload Photo',
        formats: 'PNG, JPG up to 10MB',
        delete: 'Delete',
      },
      basicInfo: {
        firstName: 'First Name',
        lastName: 'Last Name',
        email: 'Email',
        phone: 'Phone',
        country: 'Country',
        city: 'City',
      },
      jobPreference: {
        jobTitle: 'Job Title',
        seniority: 'Seniority',
        jobType: 'Job Type',
        salaryPeriod: 'Salary Period',
        salaryRange: 'Expected Salary',
        openForRelocation: 'Open for Relocation',
      },
      socialMedia: {
        title: 'Social Media',
        linkedin: 'LinkedIn',
        twitter: 'Twitter',
        website: 'Website',
        video: 'Video',
      },
      additionalInfo: {
        skills: {
          title: 'Additional Skills',
          add: 'Add Skill',
        },
        employment: {
          title: 'Employment History',
          add: 'Add Employment',
          company: 'Company',
          position: 'Position',
          startDate: 'Start Date',
          endDate: 'End Date',
          description: 'Description',
        },
        education: {
          title: 'Education',
          add: 'Add Education',
          school: 'School',
          degree: 'Degree',
          field: 'Field of Study',
          startDate: 'Start Date',
          endDate: 'End Date',
        },
        certifications: {
          title: 'Certifications',
          add: 'Add Certification',
          name: 'Name',
          issuer: 'Issuer',
          issueDate: 'Issue Date',
          expiryDate: 'Expiry Date',
        },
      },
      skills: {
        title: 'Skills',
      },
    },
    buttons: {
      cancel: 'Cancel',
      save: 'Save Profile',
    },
  },
  zh: {
    tabs: {
      profile: '个人资料',
      jobs: '求职意向',
      applications: '申请记录',
    },
    sections: {
      resume: {
        title: '简历',
        upload: '上传简历',
        dragDrop: '或拖放文件',
        formats: 'PDF, DOC, DOCX 格式',
        delete: '删除',
      },
      photo: {
        title: '照片',
        upload: '上传照片',
        formats: 'PNG, JPG 格式，最大 10MB',
        delete: '删除',
      },
      basicInfo: {
        firstName: '名字',
        lastName: '姓氏',
        email: '邮箱',
        phone: '电话',
        country: '国家',
        city: '城市',
      },
      jobPreference: {
        jobTitle: '职位',
        seniority: '职级',
        jobType: '工作类型',
        salaryPeriod: '薪资周期',
        salaryRange: '期望薪资',
        openForRelocation: '是否接受调动',
      },
      socialMedia: {
        title: '社交媒体',
        linkedin: '领英',
        twitter: '推特',
        website: '个人网站',
        video: '视频介绍',
      },
      additionalInfo: {
        skills: {
          title: '技能特长',
          add: '添加技能',
        },
        employment: {
          title: '工作经历',
          add: '添加工作经历',
          company: '公司',
          position: '职位',
          startDate: '开始日期',
          endDate: '结束日期',
          description: '工作描述',
        },
        education: {
          title: '教育经历',
          add: '添加教育经历',
          school: '学校',
          degree: '学位',
          field: '专业',
          startDate: '开始日期',
          endDate: '结束日期',
        },
        certifications: {
          title: '证书认证',
          add: '添加证书',
          name: '证书名称',
          issuer: '发证机构',
          issueDate: '发证日期',
          expiryDate: '有效期至',
        },
      },
      skills: {
        title: '技能特长',
      },
    },
    buttons: {
      cancel: '取消',
      save: '保存资料',
    },
  },
};

const countryOptions = [
  { label: { en: "Australia", zh: "澳大利亚" }, value: "Australia" },
  { label: { en: "China", zh: "中国" }, value: "China" }
] as const;

// 日期格式化函数
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  
  // 处理 "Present"、"Now" 等当前时间表示
  const currentTimeWords = ['present', 'now', 'current', '至今', '现在'];
  if (currentTimeWords.includes(dateStr.toLowerCase())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  
  // 处理 "November 2025" 格式
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const parts = dateStr.split(' ');
  if (parts.length === 2) {
    const monthIndex = monthNames.findIndex(m => m === parts[0].toLowerCase());
    if (monthIndex !== -1 && !isNaN(Number(parts[1]))) {
      const month = String(monthIndex + 1).padStart(2, '0');
      return `${parts[1]}-${month}`;
    }
  }
  
  // 处理 YYYY-MM 格式
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
  return dateStr;
  }
  
  // 处理 YYYY 格式
  if (/^\d{4}$/.test(dateStr)) {
    return `${dateStr}-01`;
  }
  
  return '';  // 如果无法解析，返回空字符串而不是默认值
};

// 添加城市名称标准化函数
const normalizeCity = (city: string) => {
  if (!city) return '';
  // 获取所有已知城市名称
  const knownCities = Object.values(cityOptionsMap).flat().map(c => c.value);
  // 查找匹配的城市（不区分大小写）
  const match = knownCities.find(c => c.toLowerCase() === city.toLowerCase());
  return match || city;
};

interface ParsedSkill {
  name: string;
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [language, setLanguage] = useState<Language>('en');
  const [availableCities, setAvailableCities] = useState<typeof CITIES[CountryCode]>([]);
  const [salaryRanges, setSalaryRanges] = useState(YEARLY_SALARY_RANGES_AUD);
  const [avatarPreview, setAvatarPreview] = useState<string>();
  const [isDragging, setIsDragging] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);

  const { register, handleSubmit, formState: { errors }, setValue, watch, control, getValues } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      education: [],
      employment: [],
      jobTitle: [],
      skills: [],
    },
  });

  // 添加监听 jobTitle 和 city 变化的 useEffect
  useEffect(() => {
    const subscription = watch((value) => {
      // 获取当前的 userProfile
      const currentUserProfileStr = localStorage.getItem('userProfile');
      const currentUserProfile = currentUserProfileStr ? JSON.parse(currentUserProfileStr) : {};
      
      // 更新 userProfile
      const updatedUserProfile = {
        ...currentUserProfile,
        ...value,
        jobTitle: value.jobTitle || currentUserProfile.jobTitle,
        city: value.city || currentUserProfile.city
      };
      
      // 保存更新后的 userProfile
      localStorage.setItem('userProfile', JSON.stringify(updatedUserProfile));
      
      // 单独保存关键字段
      if (value.jobTitle && value.jobTitle.length > 0) {
        localStorage.setItem("jobTitle", value.jobTitle[0]);
        console.log('Saved jobTitle to localStorage:', value.jobTitle[0]);
      }
      // 只在 city 有值且与当前值不同时保存
      if (value.city && value.city !== currentUserProfile.city) {
        localStorage.setItem("city", value.city);
        console.log('Saved city to localStorage:', value.city);
      }
    });

    return () => subscription.unsubscribe?.();
  }, [watch]);

  const { fields: educationFields, append: appendEducation, remove: removeEducation } = useFieldArray({
    control,
    name: 'education',
  });

  const { fields: employmentFields, append: appendEmployment, remove: removeEmployment } = useFieldArray({
    control,
    name: 'employment',
  });

  const { fields: skillFields, append: appendSkill, remove: removeSkill } = useFieldArray({
    control,
    name: "skills"
  });

  const selectedCountry = watch('country');
  const resume = watch('resume');
  const salaryPeriod = watch('salaryPeriod');
  const t = translations[language];

  useEffect(() => {
    if (selectedCountry) {
      const countryCode = selectedCountry as CountryCode;
      setAvailableCities(CITIES[countryCode]);
      setSalaryRanges(countryCode === 'cn' ? YEARLY_SALARY_RANGES_RMB : YEARLY_SALARY_RANGES_AUD);
    }
  }, [selectedCountry]);

  // 添加终端输出的函数
  const appendToTerminal = useCallback((message: string) => {
    setTerminalOutput(prev => [...prev, message]);
  }, []);

  const handleResumeChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file || isProcessing) return;

      setResumeFile(file);
      setIsParsingResume(true);
      setIsProcessing(true);
      appendToTerminal(`○ Processing resume: ${file.name}`);

      const formData = new FormData();
      formData.append('file', file);

      appendToTerminal('○ Sending to server for parsing...');
      const startTime = Date.now();
      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });
      const endTime = Date.now();
      appendToTerminal(`POST /api/parse-resume ${response.status} in ${endTime - startTime}ms`);

      const responseText = await response.text();
      let parsedData;
      
      try {
        parsedData = JSON.parse(responseText);

      if (!response.ok) {
          throw new Error(parsedData.error || 'Failed to parse resume');
        }
        
        appendToTerminal('✓ Resume parsed successfully');
        appendToTerminal('✓ Found data:');
        appendToTerminal(`  firstName: ${parsedData.firstName || 'N/A'}`);
        appendToTerminal(`  lastName: ${parsedData.lastName || 'N/A'}`);
        appendToTerminal(`  email: ${parsedData.email || 'N/A'}`);
        appendToTerminal(`  phone: ${parsedData.phone || 'N/A'}`);
        appendToTerminal(`  location: ${parsedData.city || 'N/A'}, ${parsedData.country || 'N/A'}`);
        appendToTerminal(`  skills: ${parsedData.skills?.length || 0} found`);
        appendToTerminal(`  education: ${parsedData.education?.length || 0} entries`);
        appendToTerminal(`  experience: ${parsedData.employmentHistory?.length || 0} entries`);
        
        // 清除现有数据
        setValue('education', []);
        setValue('employment', []);
        setValue('jobTitle', []);
        setValue('skills', []);
        appendToTerminal('○ Updating form fields...');

        // 处理基本字段
        const basicFields = ['firstName', 'lastName', 'email', 'phone'];
        for (const field of basicFields) {
          if (parsedData[field]) {
            setValue(field as keyof ProfileFormData, parsedData[field]);
            appendToTerminal(`✓ Set ${field}: ${parsedData[field]}`);
          }
        }

        // 处理地理位置
        if (parsedData.country) {
          setValue('country', parsedData.country);
          appendToTerminal(`✓ Set country: ${parsedData.country}`);
          if (parsedData.city) {
            const normalizedCity = normalizeCity(parsedData.city);
            setValue('city', normalizedCity);
            localStorage.setItem("city", normalizedCity);
            appendToTerminal(`✓ Set city: ${normalizedCity}`);
          }
        }

        // 处理职位和技能
        if (parsedData.jobTitles?.length) {
          const jobTitles = parsedData.jobTitles.slice(0, 5);
          setValue('jobTitle', jobTitles);
          if (jobTitles[0]) {
            localStorage.setItem('jobTitle', jobTitles[0]); // 保存第一个职位作为主要职位
          }
          appendToTerminal(`✓ Set job titles: ${jobTitles.join(', ')}`);
        }
        if (parsedData.skills?.length) {
          const skills = parsedData.skills.slice(0, 5);
          const formattedSkills = skills.map((skill: string) => ({ name: skill }));
          setValue('skills', formattedSkills);
          // 保存原始技能数组
          localStorage.setItem('skills', JSON.stringify(skills));
          appendToTerminal(`✓ Set skills: ${skills.join(', ')}`);
        }

        // 处理教育经历
      if (parsedData.education?.length) {
          const educationToShow = parsedData.education.slice(0, 2);
          appendToTerminal(`○ Processing ${educationToShow.length} education entries...`);
          for (const edu of educationToShow) {
          appendEducation({
            school: edu.school || '',
            degree: edu.degree || '',
            startDate: edu.startYear || '',
              endDate: edu.endYear || ''
          });
            appendToTerminal(`✓ Added education: ${edu.school} - ${edu.degree}`);
          }
      }

        // 处理工作经历
      if (parsedData.employmentHistory?.length) {
          const employmentToShow = parsedData.employmentHistory.slice(0, 2);
          appendToTerminal(`○ Processing ${employmentToShow.length} employment entries...`);
          
          for (const emp of employmentToShow) {
            const formattedEndDate = emp.endDate ? formatDate(emp.endDate) : '';
          appendEmployment({
            company: emp.company || '',
            position: emp.position || '',
              startDate: formatDate(emp.startDate || ''),
              endDate: formattedEndDate,
              description: emp.summary || ''
            });
            appendToTerminal(`✓ Added employment: ${emp.company} - ${emp.position}`);
          }
        }

        appendToTerminal('✓ Resume data processed successfully');
        appendToTerminal('✓ Form ready for review');

    } catch (error) {
      console.error('Error parsing resume:', error);
        appendToTerminal('❌ Error: Failed to parse resume');
        appendToTerminal(`❌ Details: ${error instanceof Error ? error.message : 'Unknown error'}`);
      alert(language === 'en' ? 'Failed to parse resume. Please try again or fill in manually.' : '简历解析失败，请重试或手动填写。');
      }
    } catch (error) {
      console.error('Error handling resume:', error);
      appendToTerminal('❌ Error: Failed to handle resume');
      appendToTerminal(`❌ Details: ${error instanceof Error ? error.message : 'Unknown error'}`);
      alert(language === 'en' ? 'Failed to handle resume. Please try again later.' : '无法处理简历，请稍后再试。');
    } finally {
      setIsParsingResume(false);
      setIsProcessing(false);
    }
  }, [setValue, appendEducation, appendEmployment, language, appendSkill, appendToTerminal]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setValue('avatar', file as File);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveResume = () => {
    setResumeFile(null);
    setValue('resume', null);
  };

  const handleRemoveAvatar = () => {
    setValue('avatar', null);
    setAvatarPreview(undefined);
    const input = document.getElementById('avatar') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      setValue('resume', file);
      setResumeFile(file);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsProcessing(true);
      
      // 保存到 localStorage
      localStorage.setItem('userProfile', JSON.stringify(data));
      
      // 使用 StorageManager 保存档案
      StorageManager.saveProfile(data);
      
      // 保存技能
      if (data.skills) {
        localStorage.setItem('skills', JSON.stringify(data.skills));
      }
      
      // 其他现有的保存逻辑...
      
      // 跳转到 jobs 页面
      router.push('/jobs');
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderBasicFields = useMemo(() => (
    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
      <div className="sm:col-span-3">
        <Input
          label={<>{t.sections.basicInfo.firstName}<span className="text-red-500 ml-1">*</span></>}
          {...register('firstName')}
          error={errors.firstName?.message}
          required
        />
      </div>
      <div className="sm:col-span-3">
        <Input
          label={<>{t.sections.basicInfo.lastName}<span className="text-red-500 ml-1">*</span></>}
          {...register('lastName')}
          error={errors.lastName?.message}
          required
        />
      </div>
      <div className="sm:col-span-3">
        <Input
          label={<>{t.sections.basicInfo.email}<span className="text-red-500 ml-1">*</span></>}
          type="email"
          {...register('email')}
          error={errors.email?.message}
          required
        />
      </div>
      <div className="sm:col-span-3">
        <Input
          label={t.sections.basicInfo.phone}
          type="tel"
          {...register('phone')}
          error={errors.phone?.message}
          required
        />
      </div>
      <div className="sm:col-span-3">
        <label className="block text-sm font-medium text-gray-700">
          {t.sections.basicInfo.country}<span className="text-red-500 ml-1">*</span>
        </label>
        <select
          {...register("country")}
          onChange={(e) => {
            setValue("country", e.target.value);
            setValue("city", ""); // 重置城市
          }}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="">{language === 'zh' ? '请选择国家' : 'Select Country'}</option>
          {countryOptions.map((country) => (
            <option key={country.value} value={country.value}>
              {language === 'zh' ? country.label.zh : country.label.en}
            </option>
          ))}
        </select>
        {errors.country?.message && (
          <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
        )}
      </div>
      <div className="sm:col-span-3">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {language === 'zh' ? '城市' : 'City'}<span className="text-red-500 ml-1">*</span>
          </label>
          <Controller
            name="city"
            control={control}
            render={({ field }) => {
              const country = watch("country");
              const cityOptions = country ? cityOptionsMap[country as CountryKey] || [] : [];

  return (
                <Select
                  options={cityOptions}
                  value={field.value || ''}
                  onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
                    const cityValue = event.target.value;
                    field.onChange(cityValue);
                    localStorage.setItem("city", cityValue);
                    console.log('City selected and saved to localStorage:', cityValue);
                    
                    // 更新 userProfile 中的城市
                    const currentUserProfileStr = localStorage.getItem('userProfile');
                    const currentUserProfile = currentUserProfileStr ? JSON.parse(currentUserProfileStr) : {};
                    const updatedUserProfile = {
                      ...currentUserProfile,
                      city: cityValue
                    };
                    localStorage.setItem('userProfile', JSON.stringify(updatedUserProfile));
                    console.log('Updated userProfile with city:', cityValue);
                  }}
                  placeholder={language === 'zh' ? '请选择城市' : 'Select City'}
                  language={language}
                  disabled={!country}
                />
              );
            }}
          />
          {errors.city && (
            <p className="text-sm text-red-600">{errors.city.message}</p>
          )}
        </div>
      </div>
    </div>
  ), [register, errors, t, language, watch, control]);

  const renderSocialFields = useMemo(() => (
    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
      <div className="sm:col-span-3">
        <Input
          label={t.sections.socialMedia.linkedin}
          {...register('linkedin')}
          error={errors.linkedin?.message}
        />
      </div>
      <div className="sm:col-span-3">
        <Input
          label={t.sections.socialMedia.twitter}
          {...register('twitter')}
          error={errors.twitter?.message}
        />
      </div>
      <div className="sm:col-span-3">
        <Input
          label={t.sections.socialMedia.website}
          {...register('website')}
          error={errors.website?.message}
        />
      </div>
      <div className="sm:col-span-3">
        <Input
          label={t.sections.socialMedia.video}
          {...register('video')}
          error={errors.video?.message}
        />
      </div>
    </div>
  ), [register, errors, t]);

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex justify-between items-center px-8">
          <div className="flex space-x-8">
          <Logo />
            <div className="hidden md:flex space-x-8">
              <a href="/profile" className="border-b-2 border-blue-500 py-4 text-[20px] font-medium text-blue-600">
                {t.tabs.profile}
              </a>
              <a href="/jobs" className="border-b-2 border-transparent py-4 text-[20px] font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">
                {t.tabs.jobs}
              </a>
              <a href="/applications" className="border-b-2 border-transparent py-4 text-[20px] font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">
                {t.tabs.applications}
              </a>
            </div>
          </div>
          <select
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
            </nav>
          </div>

      {/* 响应式左右布局容器 */}
      <div className="flex w-full px-6 md:px-10 lg:px-16 min-h-[calc(100vh-64px)] ml-12">
        {/* 左侧 Profile 内容区域 */}
        <div className="pr-4 flex-none overflow-y-auto border-r border-gray-200" style={{ width: 1000 }}>
          <div className="bg-white">
            <div className="py-8 px-8 sm:px-10 lg:px-12">
              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        {avatarPreview ? (
                          <div className="relative w-24 h-24 mx-auto">
                            <img
                              src={avatarPreview}
                              alt="Avatar preview"
                              className="rounded-full object-cover w-full h-full"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveAvatar}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <label
                              htmlFor="avatar"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                            >
                              <span>{t.sections.photo.upload}</span>
                              <input
                                id="avatar"
                                type="file"
                                className="sr-only"
                                accept="image/*"
                                onChange={handleAvatarChange}
                              />
                            </label>
                            <p className="text-xs text-gray-500 mt-2">{t.sections.photo.formats}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <div className="text-center">
                          <label
                            htmlFor="resume-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                          >
                            <span>Upload Resume<span className="text-red-500 ml-1">*</span></span>
                            <input
                              id="resume-upload"
                              type="file"
                              className="sr-only"
                              accept=".pdf,.doc,.docx,.txt"
                              onChange={handleResumeChange}
                            />
                          </label>
                          <p className="text-xs text-gray-500 mt-2">PDF, DOC, DOCX, TXT formats</p>
                        </div>
                        {isParsingResume && (
                          <p className="text-sm text-blue-600 mt-2">Parsing resume...</p>
                        )}
                        {resumeFile && (
                          <div className="mt-2 flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm text-gray-500">{resumeFile.name}</span>
                            <button
                              type="button"
                              onClick={handleRemoveResume}
                              className="text-sm text-red-500 hover:text-red-700"
                            >
                              {language === 'en' ? 'Remove' : '删除'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                    <div>
                      <h3 className="text-base font-medium text-gray-900 mb-4">
                        {language === 'zh' ? '基本信息' : 'Basic Information'}
                      </h3>
                      {renderBasicFields}
                  </div>

                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-6">
                    <MultiSelect
                      label={t.sections.jobPreference.jobTitle}
                      options={JOB_TITLES}
                      value={watch('jobTitle')}
                      onChange={(value) => setValue('jobTitle', value)}
                      error={errors.jobTitle?.message}
                      required
                      language={language}
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <Select
                      label={t.sections.jobPreference.seniority}
                      options={SENIORITY_LEVELS}
                      {...register('seniority')}
                      error={errors.seniority?.message}
                      required
                      language={language}
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <Select
                      label={t.sections.jobPreference.openForRelocation}
                      options={[
                        { value: 'yes', label: { en: 'Yes', zh: '是' } },
                        { value: 'no', label: { en: 'No', zh: '否' } },
                      ]}
                      {...register('openForRelocation')}
                      error={errors.openForRelocation?.message}
                      required
                      language={language}
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'en' ? 'Expected Salary' : '期望薪资'}
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        options={SALARY_PERIODS}
                        {...register('salaryPeriod')}
                        error={errors.salaryPeriod?.message}
                        required
                        language={language}
                      />
                      {watch('salaryPeriod') === 'per_year' ? (
                        <Select
                          options={salaryRanges}
                          {...register('salaryRange')}
                          error={errors.salaryRange?.message}
                          required
                          language={language}
                        />
                      ) : (
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">
                              {selectedCountry === 'cn' ? '¥' : '$'}
                            </span>
                          </div>
                          <input
                            type="number"
                            className={cn(
                              'block w-full max-w-full pl-7 pr-12 sm:text-sm rounded-md',
                              'border-gray-300 focus:ring-blue-500 focus:border-blue-500',
                              errors.salaryRange && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                            )}
                            placeholder={language === 'en' ? 'Enter amount' : '请输入金额'}
                            {...register('salaryRange')}
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">
                              {selectedCountry === 'cn' ? 'RMB' : 'AUD'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    {errors.salaryRange && (
                      <p className="mt-1 text-sm text-red-500">{String(errors.salaryRange.message)}</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base font-medium text-gray-900">{t.sections.additionalInfo.education.title}<span className="text-red-500">*</span></h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="text-sm font-normal text-gray-500 hover:text-gray-700"
                      onClick={() => appendEducation({ startDate: '', endDate: '', degree: '', school: '' })}
                    >
                      + {t.sections.additionalInfo.education.add}
                    </Button>
                  </div>
                  {educationFields.map((field, index) => (
                    <div key={field.id} className="mb-4 p-4 border rounded-lg">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input
                          label={t.sections.additionalInfo.education.school}
                          {...register(`education.${index}.school`)}
                          error={errors.education?.[index]?.school?.message}
                        />
                        <Input
                          label={t.sections.additionalInfo.education.degree}
                          {...register(`education.${index}.degree`)}
                          error={errors.education?.[index]?.degree?.message}
                        />
                            <DatePicker
                              selected={field.startDate ? new Date(field.startDate + '-01') : null}
                              onChange={(date) => setValue(`education.${index}.startDate`, date ? date.toISOString().slice(0, 7) : '')}
                              dateFormat="yyyy-MM"
                              placeholderText={t.sections.additionalInfo.education.startDate}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              minDate={new Date(1980, 0)}
                              maxDate={new Date(2030, 11)}
                              showMonthYearPicker
                            />
                            <DatePicker
                              selected={field.endDate ? new Date(field.endDate + '-01') : null}
                              onChange={(date) => setValue(`education.${index}.endDate`, date ? date.toISOString().slice(0, 7) : '')}
                              dateFormat="yyyy-MM"
                              placeholderText={t.sections.additionalInfo.education.endDate}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              minDate={new Date(1980, 0)}
                              maxDate={new Date(2030, 11)}
                              showMonthYearPicker
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 text-red-500 hover:text-red-700"
                        onClick={() => removeEducation(index)}
                      >
                        {language === 'en' ? 'Remove' : '删除'}
                      </Button>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base font-medium text-gray-900">{t.sections.additionalInfo.employment.title}<span className="text-red-500">*</span></h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="text-sm font-normal text-gray-500 hover:text-gray-700"
                      onClick={() => appendEmployment({ startDate: '', endDate: '', company: '', position: '', description: '' })}
                    >
                      + {t.sections.additionalInfo.employment.add}
                    </Button>
                  </div>
                  {employmentFields.map((field, index) => (
                    <div key={field.id} className="mb-4 p-4 border rounded-lg">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input
                          label={t.sections.additionalInfo.employment.company}
                          {...register(`employment.${index}.company`)}
                          error={errors.employment?.[index]?.company?.message}
                        />
                        <Input
                          label={t.sections.additionalInfo.employment.position}
                          {...register(`employment.${index}.position`)}
                          error={errors.employment?.[index]?.position?.message}
                        />
                            <DatePicker
                              selected={watch(`employment.${index}.startDate`) ? new Date(watch(`employment.${index}.startDate`) + '-01') : null}
                              onChange={(date) => {
                                const formattedDate = date ? date.toISOString().slice(0, 7) : '';
                                setValue(`employment.${index}.startDate`, formattedDate);
                              }}
                              dateFormat="yyyy-MM"
                              placeholderText={t.sections.additionalInfo.employment.startDate}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              minDate={new Date(1980, 0)}
                              maxDate={new Date(2030, 11)}
                              showMonthYearPicker
                            />
                            <DatePicker
                              selected={watch(`employment.${index}.endDate`) ? new Date(watch(`employment.${index}.endDate`) + '-01') : null}
                              onChange={(date) => {
                                const formattedDate = date ? date.toISOString().slice(0, 7) : '';
                                setValue(`employment.${index}.endDate`, formattedDate);
                              }}
                              dateFormat="yyyy-MM"
                              placeholderText={t.sections.additionalInfo.employment.endDate}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              minDate={new Date(1980, 0)}
                              maxDate={new Date(2030, 11)}
                              showMonthYearPicker
                            />
                            <div className="sm:col-span-2">
                              <label className="block text-sm font-medium text-gray-700">Summary</label>
                              <textarea
                                {...register(`employment.${index}.description`)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                rows={3}
                                placeholder="Enter job responsibilities and achievements"
                              />
                              {errors.employment?.[index]?.description?.message && (
                                <p className="mt-1 text-sm text-red-600">{errors.employment[index].description?.message}</p>
                              )}
                            </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 text-red-500 hover:text-red-700"
                        onClick={() => removeEmployment(index)}
                      >
                        {language === 'en' ? 'Remove' : '删除'}
                      </Button>
                    </div>
                  ))}
                </div>

                    <div>
                      <label className="block text-base font-medium text-gray-900">
                        Career Priorities (1 - 3 options) <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {[
                          'Company Reputation',
                          'Higher Compensation',
                          'Location',
                          'Work-Life Balance',
                          'Hybrid Work (2+ Days Remote)',
                          'Clear Promotion Pathways',
                          'Company Values',
                          'Industry Fit',
                          'Functional Fit',
                          'Culture Fit'
                        ].map((priority) => (
                          <button
                            key={priority}
                            type="button"
                            onClick={() => {
                              const currentPriorities = watch('careerPriorities') || [];
                              if (currentPriorities.includes(priority)) {
                                setValue(
                                  'careerPriorities',
                                  currentPriorities.filter((p: string) => p !== priority)
                                );
                              } else if (currentPriorities.length < 3) {
                                setValue('careerPriorities', [...currentPriorities, priority]);
                              } else {
                                alert('You can select up to 3 priorities only.');
                              }
                            }}
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              (watch('careerPriorities') || []).includes(priority)
                                ? 'bg-blue-100 text-blue-800 border-2 border-blue-500'
                                : 'bg-gray-100 text-gray-800 border-2 border-gray-200'
                            }`}
                          >
                            {priority}
                          </button>
                        ))}
              </div>
                    </div>

                    <div>
                      <h3 className="text-base font-medium text-gray-900 mb-4">{t.sections.socialMedia.title}</h3>
                      {renderSocialFields}
                    </div>

                    <div className="mb-8">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base font-medium text-gray-900">{t.sections.additionalInfo.skills.title}</h3>
                        {(skillFields?.length || 0) < 10 && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            className="text-sm font-normal text-gray-500 hover:text-gray-700"
                            onClick={() => appendSkill({ name: '' })}
                          >
                            + Add Skill
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        {skillFields.map((field, index) => (
                          <div key={field.id} className="flex items-start gap-2">
                            <div className="flex-1">
                              <Input
                                {...register(`skills.${index}.name`)}
                                error={errors.skills?.[index]?.name?.message}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSkill(index)}
                              className="mt-2 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-4 mt-8">
                    <Button
                      type="submit"
                      variant="outline"
                      className="px-4 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700"
                    >
                      {language === 'en' ? 'Save' : '保存'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/jobs')}
                      className="px-4 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700"
                    >
                      {language === 'en' ? 'Next - Jobs' : '下一步 - 职位'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 text-right mt-2">
                    * Required fields
                  </p>
            </form>
          )}
            </div>
          </div>
        </div>

        {/* 右侧 Héra Computer 区域 */}
        <div className="pl-4 border-l border-gray-200 flex-none overflow-y-auto min-h-[300px] md:min-h-0" style={{ width: 700 }}>
          <div className="sticky top-0 p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Héra Computer</h2>
            <div 
              className="font-mono text-sm leading-[20px] whitespace-pre-wrap bg-white rounded-lg p-4 border border-gray-200 h-[calc(100vh-120px)] overflow-y-auto w-full max-w-full"
              style={{
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                fontSize: '12px',
                lineHeight: '20px',
                backgroundColor: '#ffffff',
                color: '#374151'
              }}
            >
              {terminalOutput.map((line, index) => {
                // 处理编译消息的颜色
                if (line.startsWith('○ Compiling')) {
                  return (
                    <div key={index} className="text-gray-500">
                      {line}
                    </div>
                  );
                }
                // 处理编译完成消息的颜色
                if (line.startsWith('✓ Compiled') || line.startsWith('✓')) {
                  return (
                    <div key={index} className="text-green-600">
                      {line}
                    </div>
                  );
                }
                // 处理错误消息的颜色
                if (line.startsWith('❌')) {
                  return (
                    <div key={index} className="text-red-600">
                      {line}
                    </div>
                  );
                }
                // 处理进行中消息的颜色
                if (line.startsWith('○')) {
                  return (
                    <div key={index} className="text-gray-500">
                      {line}
                    </div>
                  );
                }
                // 处理 API 调用和 JSON 数据
                if (line.includes('API called with:') || line.includes('Raw response:')) {
                  const [prefix, data] = line.split(/:\s(.+)/);
                  return (
                    <div key={index}>
                      <span className="text-gray-600">{prefix}:</span>
                      <pre className="text-gray-800 ml-2 whitespace-pre-wrap">{data}</pre>
                    </div>
                  );
                }
                // 处理 HTTP 请求日志
                if (line.match(/^(GET|POST|PUT|DELETE)/)) {
                  const parts = line.split(' ');
                  return (
                    <div key={index}>
                      <span className="text-blue-600">{parts[0]}</span>
                      <span className="text-gray-600"> {parts.slice(1).join(' ')}</span>
                    </div>
                  );
                }
                // 默认样式
                return (
                  <div key={index} className="text-gray-600">
                    {line}
                  </div>
                );
              })}
              {(isParsingResume || isProcessing) && (
                <div className="animate-pulse text-gray-600">$ _</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}