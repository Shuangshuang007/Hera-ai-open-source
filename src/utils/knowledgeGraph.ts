interface KnowledgeGraphResult {
  industry: string;
  category: string;
  location: string;
  platforms: string[];
}

// 技能关键词映射
const skillMap = {
  technology: [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'React', 'Angular', 'Vue',
    'Node.js', 'AWS', 'Azure', 'DevOps', 'Docker', 'Kubernetes', 'Machine Learning',
    'AI', 'Data Science', 'Cloud', 'Full Stack', 'Frontend', 'Backend'
  ],
  finance: [
    'Investment Banking', 'Trading', 'Risk Management', 'Financial Analysis',
    'Portfolio Management', 'Hedge Fund', 'Private Equity', 'Venture Capital',
    'Quantitative', 'CFA', 'Bloomberg', 'Financial Modeling'
  ],
  design: [
    'UI', 'UX', 'Figma', 'Adobe', 'Sketch', 'Product Design', 'Graphic Design',
    'Visual Design', 'Interaction Design', 'Design Systems', 'Prototyping'
  ],
  marketing: [
    'Digital Marketing', 'SEO', 'SEM', 'Content Marketing', 'Social Media',
    'Marketing Analytics', 'Brand Management', 'Growth Hacking', 'Email Marketing'
  ],
  sales: [
    'Business Development', 'Account Management', 'Sales Strategy', 'CRM',
    'Lead Generation', 'Sales Operations', 'Customer Success', 'Enterprise Sales'
  ]
};

// 职位关键词映射
const jobTitleMap = {
  technology: [
    'Software Engineer', 'Developer', 'Programmer', 'DevOps', 'Data Scientist',
    'Machine Learning', 'AI', 'Cloud', 'Full Stack', 'Frontend', 'Backend',
    'Technical', 'Engineering', 'Architect'
  ],
  finance: [
    'Investment Banking', 'Trader', 'Risk', 'Financial', 'Portfolio', 'Fund',
    'Equity', 'Venture Capital', 'Quantitative', 'Investment', 'Banking'
  ],
  design: [
    'Designer', 'UI', 'UX', 'Product Designer', 'Graphic Designer',
    'Visual Designer', 'Interaction Designer', 'Creative'
  ],
  marketing: [
    'Marketing', 'SEO', 'Content', 'Social Media', 'Brand', 'Growth',
    'Digital Marketing', 'Marketing Manager'
  ],
  sales: [
    'Sales', 'Business Development', 'Account Manager', 'Sales Operations',
    'Customer Success', 'Enterprise Sales'
  ]
};

// 地区映射
const locationMap = {
  australia: ['Australia', 'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
  china: ['China', 'Beijing', 'Shanghai', 'Shenzhen', 'Guangzhou', 'Hangzhou'],
  singapore: ['Singapore'],
  newZealand: ['New Zealand', 'Auckland', 'Wellington', 'Christchurch']
};

// 平台映射
const platformMap = {
  technology: ['LinkedIn', 'Jora', 'Indeed', 'Seek'],
  finance: ['LinkedIn', 'eFinancialCareers', 'Indeed'],
  design: ['LinkedIn', 'Indeed', 'Seek'],
  marketing: ['LinkedIn', 'Indeed', 'Seek'],
  sales: ['LinkedIn', 'Indeed', 'Seek']
};

// 判断字符串是否包含数组中的任何关键词
function containsKeywords(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

// 获取知识图谱结果
export function getKnowledgeGraph(jobTitle: string, skills: string[]): KnowledgeGraphResult {
  let industry = 'General';
  let category = 'General';
  let location = 'International';
  
  // 判断行业和类别
  for (const [key, keywords] of Object.entries(jobTitleMap)) {
    if (containsKeywords(jobTitle, keywords)) {
      category = key;
      break;
    }
  }
  
  // 如果职位名称没有明确类别，则从技能判断
  if (category === 'General') {
    for (const [key, keywords] of Object.entries(skillMap)) {
      if (skills.some(skill => containsKeywords(skill, keywords))) {
        category = key;
        break;
      }
    }
  }
  
  // 根据类别确定行业
  switch (category) {
    case 'technology':
      industry = 'Technology';
      break;
    case 'finance':
      industry = 'Finance';
      break;
    case 'design':
      industry = 'Creative';
      break;
    case 'marketing':
    case 'sales':
      industry = 'Business';
      break;
    default:
      industry = 'General';
  }
  
  // 获取推荐平台
  const platforms = platformMap[category as keyof typeof platformMap] || ['LinkedIn', 'Indeed'];
  
  return {
    industry,
    category,
    location,
    platforms
  };
} 