'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
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
    },
    buttons: {
      cancel: '取消',
      save: '保存资料',
    },
  },
};

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [language, setLanguage] = useState<Language>('en');
  const [availableCities, setAvailableCities] = useState<typeof CITIES[CountryCode]>([]);
  const [salaryRanges, setSalaryRanges] = useState(YEARLY_SALARY_RANGES_AUD);
  const [avatarPreview, setAvatarPreview] = useState<string>();
  const [isDragging, setIsDragging] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      country: '',
      city: '',
      jobTitle: [],
      seniority: '',
      openForRelocation: '',
      salaryPeriod: '',
      salaryRange: '',
      linkedin: '',
      twitter: '',
      website: '',
      video: '',
      resume: null,
      avatar: null,
      about: '',
    }
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

  const handleResumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setValue('resume', file as File);
      setResumeFile(file);
    }
  };

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
    setValue('resume', null);
    setResumeFile(null);
    const input = document.getElementById('resume') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
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
      // TODO: Handle form submission
      console.log('Form data:', data);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-4">
          <Logo />
          <select
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              {Object.entries(t.tabs).map(([key, value]) => (
                <button
                  key={key}
                  className={`${
                    activeTab === key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-base`}
                  onClick={() => setActiveTab(key)}
                >
                  {value}
                </button>
              ))}
            </nav>
          </div>

          {activeTab === 'profile' && (
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              <div className="space-y-6">
                {/* Upload Section */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* Photo Upload */}
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

                  {/* Resume Upload */}
                  <div>
                    <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <div className="text-center">
                          <label
                            htmlFor="resume"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                          >
                            <span>{t.sections.resume.upload}</span>
                            <input
                              id="resume"
                              type="file"
                              className="sr-only"
                              accept=".pdf,.doc,.docx"
                              onChange={handleResumeChange}
                              required
                            />
                          </label>
                          <p className="text-xs text-gray-500 mt-2">{t.sections.resume.formats}</p>
                        </div>
                        {resumeFile && (
                          <div className="mt-2 flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm text-gray-500">{resumeFile.name}</span>
                            <button
                              type="button"
                              onClick={handleRemoveResume}
                              className="text-sm text-red-500 hover:text-red-700"
                            >
                              {t.sections.resume.delete}
                            </button>
                          </div>
                        )}
                        {errors.resume && (
                          <p className="mt-1 text-sm text-red-500">{String(errors.resume.message)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <Input
                      label={t.sections.basicInfo.firstName}
                      {...register('firstName')}
                      error={errors.firstName?.message}
                      required
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <Input
                      label={t.sections.basicInfo.lastName}
                      {...register('lastName')}
                      error={errors.lastName?.message}
                      required
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <Input
                      label={t.sections.basicInfo.email}
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
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <Select
                      label={t.sections.basicInfo.country}
                      options={COUNTRIES}
                      {...register('country')}
                      error={errors.country?.message}
                      required
                      language={language}
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <Select
                      label={t.sections.basicInfo.city}
                      options={availableCities}
                      {...register('city')}
                      error={errors.city?.message}
                      disabled={!selectedCountry}
                      required
                      language={language}
                    />
                  </div>
                </div>

                {/* Job Preference */}
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  {/* Job Title - Full Width */}
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

                  {/* Seniority and Open for Relocation - Two Columns */}
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

                  {/* Expected Salary */}
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
                              'block w-full pl-7 pr-12 sm:text-sm rounded-md',
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

                {/* Social Media */}
                <div>
                  <h3 className="text-base font-medium text-gray-900 mb-4">{t.sections.socialMedia.title}</h3>
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
                </div>

                {/* Additional Skills */}
                <div>
                  <h3 className="text-base font-medium text-gray-900 mb-4">{t.sections.additionalInfo.skills.title}</h3>
                  {/* TODO: Add skills input component */}
                </div>

                {/* Employment History */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-medium text-gray-900">{t.sections.additionalInfo.employment.title}</h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="text-sm font-normal text-gray-500 hover:text-gray-700"
                    >
                      + {t.sections.additionalInfo.employment.add}
                    </Button>
                  </div>
                  {/* TODO: Add employment history form */}
                </div>

                {/* Education */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-medium text-gray-900">{t.sections.additionalInfo.education.title}</h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="text-sm font-normal text-gray-500 hover:text-gray-700"
                    >
                      + {t.sections.additionalInfo.education.add}
                    </Button>
                  </div>
                  {/* TODO: Add education form */}
                </div>

                {/* Certifications */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-medium text-gray-900">{t.sections.additionalInfo.certifications.title}</h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="text-sm font-normal text-gray-500 hover:text-gray-700"
                    >
                      + {t.sections.additionalInfo.certifications.add}
                    </Button>
                  </div>
                  {/* TODO: Add certifications form */}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6">
                <Button type="button" variant="outline">
                  {t.buttons.cancel}
                </Button>
                <Button type="submit">
                  {t.buttons.save}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 