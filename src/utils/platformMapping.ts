// 平台知识图谱映射
export const platformMap: Record<string, string[]> = {
  "accountant": ["LinkedIn", "Seek", "eFinancialCareers"],
  "frontend developer": ["LinkedIn", "Jora", "Seek"],
  "frontend": ["LinkedIn", "Jora", "Seek"],
  "software engineer": ["LinkedIn", "Seek", "Jora"],
  "software": ["LinkedIn", "Seek", "Jora"],
  "engineer": ["LinkedIn", "Seek", "Jora"],
  "data analyst": ["LinkedIn", "Seek", "Indeed"],
  "data": ["LinkedIn", "Seek", "Indeed"],
  "analyst": ["LinkedIn", "Seek", "Indeed"],
  "project manager": ["LinkedIn", "Seek", "Indeed"],
  "project": ["LinkedIn", "Seek", "Indeed"],
  "manager": ["LinkedIn", "Seek", "Indeed"],
  "marketing manager": ["LinkedIn", "Seek", "Indeed"],
  "marketing": ["LinkedIn", "Seek", "Indeed"],
  "finance manager": ["LinkedIn", "eFinancialCareers", "Seek"],
  "finance": ["LinkedIn", "eFinancialCareers", "Seek"]
};

// 城市名称标准化映射
const cityNormalizationMap: Record<string, string> = {
  'melbourne': 'Melbourne',
  'sydney': 'Sydney',
  'brisbane': 'Brisbane',
  'perth': 'Perth',
  'adelaide': 'Adelaide',
  'canberra': 'Canberra',
  'hobart': 'Hobart',
  'darwin': 'Darwin'
};

// 标准化城市名称
function normalizeCity(city: string): string {
  const normalized = cityNormalizationMap[city.toLowerCase()];
  return normalized || city;
}

// 城市与平台映射
const cityPlatformMap: Record<string, string[]> = {
  'melbourne': ['LinkedIn', 'Seek', 'Indeed'],
  'sydney': ['LinkedIn', 'Seek', 'Indeed'],
  'brisbane': ['LinkedIn', 'Seek'],
  'perth': ['LinkedIn', 'Seek'],
  'adelaide': ['LinkedIn', 'Seek'],
  'canberra': ['LinkedIn', 'Seek'],
  'hobart': ['LinkedIn', 'Seek'],
  'darwin': ['LinkedIn', 'Seek']
};

// 基础平台配置
const basePlatformsByCountry: Record<string, string[]> = {
  "default": ["LinkedIn", "Indeed"],
  "india": ["LinkedIn"],
  "china": ["Boss直聘", "智联招聘", "前程无忧", "猎聘网"]
};

// 城市到国家的映射
const cityToCountryMap: Record<string, string> = {
  // 澳大利亚城市
  'melbourne': 'default',
  'sydney': 'default',
  'brisbane': 'default',
  'perth': 'default',
  'adelaide': 'default',
  'canberra': 'default',
  'hobart': 'default',
  'darwin': 'default',
  // 印度城市
  'delhi': 'india',
  'mumbai': 'india',
  'bangalore': 'india',
  'chennai': 'india',
  'kolkata': 'india',
  // 中国城市
  'beijing': 'china',
  'shanghai': 'china',
  'guangzhou': 'china',
  'shenzhen': 'china'
};

// 构建平台特定的搜索URL
export function buildSearchUrl(platform: string, jobTitle: string, skills: string[], city: string): string {
  const encodedTitle = encodeURIComponent(jobTitle);
  const normalizedCity = normalizeCity(city || 'Melbourne');
  const encodedCity = encodeURIComponent(normalizedCity);
  const encodedSkills = skills.length > 0 
    ? encodeURIComponent(skills.join(' ')) 
    : '';

  switch (platform.toLowerCase()) {
    case 'linkedin':
      return `https://www.linkedin.com/jobs/search/?keywords=${encodedTitle}${encodedSkills ? `%20${encodedSkills}` : ''}&location=${encodedCity}`;
    case 'seek':
      return `https://www.seek.com.au/${encodedTitle}-jobs/in-${normalizedCity.toLowerCase()}`;
    case 'jora': {
      // Jora 真实URL格式: https://au.jora.com/{JobTitle}-jobs-in-{City}-VIC?disallow=true&sp=recent_homepage&pt=unseen
      function capitalizeWords(str: string) {
        return str.replace(/\b\w/g, c => c.toUpperCase());
      }
      const formattedTitle = capitalizeWords(jobTitle).replace(/\s+/g, '-');
      const formattedCity = capitalizeWords(city).replace(/\s+/g, '-');
      return `https://au.jora.com/${formattedTitle}-jobs-in-${formattedCity}-VIC?disallow=true&sp=recent_homepage&pt=unseen`;
    }
    case 'efinancialcareers':
      return `https://www.efinancialcareers.com/search?keywords=${encodedTitle}&location=${encodedCity}`;
    case 'indeed':
      return `https://au.indeed.com/jobs?q=${encodedTitle}${encodedSkills ? `%20${encodedSkills}` : ''}&l=${encodedCity}`;
    case 'boss直聘':
      return `https://www.zhipin.com/job_detail/?query=${encodedTitle}&city=${encodedCity}`;
    case '智联招聘':
      return `https://sou.zhaopin.com/?jl=${encodedCity}&kw=${encodedTitle}`;
    case '前程无忧':
      return `https://search.51job.com/list/${encodedCity},000000,0000,00,9,99,${encodedTitle},2,1.html`;
    case '猎聘网':
      return `https://www.liepin.com/zhaopin/?key=${encodedTitle}&dqs=${encodedCity}`;
    default:
      return '';
  }
}

// 根据城市获取推荐的平台
export function getPlatformsByCity(city: string): string[] {
  const normalizedCity = normalizeCity(city);
  return cityPlatformMap[normalizedCity.toLowerCase()] || ['LinkedIn'];
}

// 根据职位标题获取推荐的平台
function getPlatformsByJobTitle(jobTitle: string): string[] {
  const lowerJobTitle = jobTitle.toLowerCase();
  const matchedKey = Object.keys(platformMap).find(key => 
    lowerJobTitle.includes(key.toLowerCase())
  );
  return matchedKey ? platformMap[matchedKey] : ["LinkedIn"];
}

// 根据城市获取国家
function getCountryByCity(city: string): string {
  const normalizedCity = normalizeCity(city).toLowerCase();
  return cityToCountryMap[normalizedCity] || 'default';
}

// 根据职位标题和城市获取推荐的平台
export function getRecommendedPlatforms(jobTitle: string, city: string): string[] {
  // 获取基础平台
  const country = getCountryByCity(city);
  const basePlatforms = basePlatformsByCountry[country] || basePlatformsByCountry.default;
  
  // 获取基于职位的平台
  const jobPlatforms = getPlatformsByJobTitle(jobTitle);
  
  // 获取基于城市的平台
  const cityPlatforms = getPlatformsByCity(city);
  
  // 合并所有平台列表，去重
  const allPlatforms = Array.from(new Set([
    ...basePlatforms,
    ...jobPlatforms,
    ...cityPlatforms
  ]));
  
  console.log('Recommended platforms:', {
    country,
    basePlatforms,
    jobPlatforms,
    cityPlatforms,
    final: allPlatforms
  });
  
  return allPlatforms;
}

// 生成所有推荐平台的搜索URL
export function generateSearchUrls(jobTitle: string, skills: string[], city: string) {
  const platforms = getRecommendedPlatforms(jobTitle, city);
  return platforms.map(platform => ({
    platform,
    url: buildSearchUrl(platform, jobTitle, skills, city)
  }));
} 