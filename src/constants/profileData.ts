export type Language = 'en' | 'zh';

export interface LangLabel {
  en: string;
  zh: string;
}

export interface Option {
  value: string;
  label: LangLabel;
  category?: LangLabel;
}

export const COUNTRIES = [
  { value: 'au', label: { en: 'Australia', zh: '澳大利亚' } },
  { value: 'cn', label: { en: 'China', zh: '中国' } },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]['value'];

export const CITIES: Record<CountryCode, Option[]> = {
  au: [
    { value: 'melbourne_vic', label: { en: 'Melbourne, VIC', zh: '墨尔本, 维多利亚州' } },
    { value: 'sydney_nsw', label: { en: 'Sydney, NSW', zh: '悉尼, 新南威尔士州' } },
    { value: 'brisbane_qld', label: { en: 'Brisbane, QLD', zh: '布里斯班, 昆士兰州' } },
    { value: 'perth_wa', label: { en: 'Perth, WA', zh: '珀斯, 西澳大利亚州' } },
    { value: 'adelaide_sa', label: { en: 'Adelaide, SA', zh: '阿德莱德, 南澳大利亚州' } },
    { value: 'gold_coast_qld', label: { en: 'Gold Coast, QLD', zh: '黄金海岸, 昆士兰州' } },
    { value: 'canberra_act', label: { en: 'Canberra, ACT', zh: '堪培拉, 首都领地' } },
    { value: 'newcastle_nsw', label: { en: 'Newcastle, NSW', zh: '纽卡斯尔, 新南威尔士州' } },
    { value: 'sunshine_coast_qld', label: { en: 'Sunshine Coast, QLD', zh: '阳光海岸, 昆士兰州' } },
    { value: 'wollongong_nsw', label: { en: 'Wollongong, NSW', zh: '卧龙岗, 新南威尔士州' } },
    { value: 'hobart_tas', label: { en: 'Hobart, TAS', zh: '霍巴特, 塔斯马尼亚州' } },
    { value: 'geelong_vic', label: { en: 'Geelong, VIC', zh: '吉朗, 维多利亚州' } },
  ],
  cn: [
    // 一线城市
    { value: 'beijing', label: { en: 'Beijing', zh: '北京' } },
    { value: 'shanghai', label: { en: 'Shanghai', zh: '上海' } },
    { value: 'guangzhou', label: { en: 'Guangzhou', zh: '广州' } },
    { value: 'shenzhen', label: { en: 'Shenzhen', zh: '深圳' } },
    // 新一线城市
    { value: 'chengdu', label: { en: 'Chengdu', zh: '成都' } },
    { value: 'hangzhou', label: { en: 'Hangzhou', zh: '杭州' } },
    { value: 'wuhan', label: { en: 'Wuhan', zh: '武汉' } },
    { value: 'chongqing', label: { en: 'Chongqing', zh: '重庆' } },
    { value: 'nanjing', label: { en: 'Nanjing', zh: '南京' } },
    { value: 'xian', label: { en: "Xi'an", zh: '西安' } },
    { value: 'suzhou', label: { en: 'Suzhou', zh: '苏州' } },
    { value: 'tianjin', label: { en: 'Tianjin', zh: '天津' } },
    { value: 'zhengzhou', label: { en: 'Zhengzhou', zh: '郑州' } },
    { value: 'changsha', label: { en: 'Changsha', zh: '长沙' } },
    { value: 'dongguan', label: { en: 'Dongguan', zh: '东莞' } },
    { value: 'foshan', label: { en: 'Foshan', zh: '佛山' } },
    { value: 'ningbo', label: { en: 'Ningbo', zh: '宁波' } },
    { value: 'qingdao', label: { en: 'Qingdao', zh: '青岛' } },
    { value: 'shenyang', label: { en: 'Shenyang', zh: '沈阳' } },
    // 二线城市
    { value: 'hefei', label: { en: 'Hefei', zh: '合肥' } },
    { value: 'fuzhou', label: { en: 'Fuzhou', zh: '福州' } },
    { value: 'xiamen', label: { en: 'Xiamen', zh: '厦门' } },
    { value: 'kunming', label: { en: 'Kunming', zh: '昆明' } },
    { value: 'dalian', label: { en: 'Dalian', zh: '大连' } },
    { value: 'jinan', label: { en: 'Jinan', zh: '济南' } },
    { value: 'nanning', label: { en: 'Nanning', zh: '南宁' } },
    { value: 'changchun', label: { en: 'Changchun', zh: '长春' } },
    { value: 'harbin', label: { en: 'Harbin', zh: '哈尔滨' } },
    { value: 'wenzhou', label: { en: 'Wenzhou', zh: '温州' } },
    { value: 'shijiazhuang', label: { en: 'Shijiazhuang', zh: '石家庄' } },
    { value: 'nanchang', label: { en: 'Nanchang', zh: '南昌' } },
    { value: 'guiyang', label: { en: 'Guiyang', zh: '贵阳' } },
    { value: 'taiyuan', label: { en: 'Taiyuan', zh: '太原' } },
    { value: 'wuxi', label: { en: 'Wuxi', zh: '无锡' } },
  ],
};

export interface JobTitleGroup {
  label: LangLabel;
  options: Option[];
}

export const JOB_TITLES: JobTitleGroup[] = [
  {
    label: { en: "Administration & Human Resources (HR)", zh: "行政与人力资源" },
    options: [
      {
        value: "administrative_assistant",
        label: { en: "Administrative Assistant", zh: "行政助理" },
        category: { en: "Administration & Office Support", zh: "行政与办公支持" }
      },
      {
        value: "receptionist",
        label: { en: "Receptionist", zh: "前台" },
        category: { en: "Administration & Office Support", zh: "行政与办公支持" }
      },
      {
        value: "office_manager",
        label: { en: "Office Manager", zh: "办公室经理" },
        category: { en: "Administration & Office Support", zh: "行政与办公支持" }
      },
      {
        value: "personal_assistant",
        label: { en: "Personal Assistant (PA)", zh: "个人助理" },
        category: { en: "Administration & Office Support", zh: "行政与办公支持" }
      },
      {
        value: "executive_assistant",
        label: { en: "Executive Assistant (EA)", zh: "行政助理" },
        category: { en: "Administration & Office Support", zh: "行政与办公支持" }
      },
      {
        value: "data_entry_clerk",
        label: { en: "Data Entry Clerk", zh: "数据录入员" },
        category: { en: "Administration & Office Support", zh: "行政与办公支持" }
      },
      {
        value: "hr_coordinator",
        label: { en: "HR Coordinator", zh: "人力资源协调员" },
        category: { en: "Human Resources & Recruitment", zh: "人力资源与招聘" }
      },
      {
        value: "hr_manager",
        label: { en: "HR Manager", zh: "人力资源经理" },
        category: { en: "Human Resources & Recruitment", zh: "人力资源与招聘" }
      },
      {
        value: "talent_acquisition_specialist",
        label: { en: "Talent Acquisition Specialist", zh: "人才招聘专员" },
        category: { en: "Human Resources & Recruitment", zh: "人力资源与招聘" }
      },
      {
        value: "recruitment_consultant",
        label: { en: "Recruitment Consultant", zh: "招聘顾问" },
        category: { en: "Human Resources & Recruitment", zh: "人力资源与招聘" }
      }
    ]
  },
  {
    label: { en: "Sales & Marketing", zh: "销售与市场营销" },
    options: [
      {
        value: "sales_representative",
        label: { en: "Sales Representative", zh: "销售代表" },
        category: { en: "Sales & Account Management", zh: "销售与客户管理" }
      },
      {
        value: "account_manager",
        label: { en: "Account Manager", zh: "客户经理" },
        category: { en: "Sales & Account Management", zh: "销售与客户管理" }
      },
      {
        value: "business_development_manager",
        label: { en: "Business Development Manager", zh: "业务发展经理" },
        category: { en: "Sales & Account Management", zh: "销售与客户管理" }
      },
      {
        value: "customer_success_manager",
        label: { en: "Customer Success Manager", zh: "客户成功经理" },
        category: { en: "Sales & Account Management", zh: "销售与客户管理" }
      },
      {
        value: "marketing_manager",
        label: { en: "Marketing Manager", zh: "市场营销经理" },
        category: { en: "Marketing & Branding", zh: "市场营销与品牌" }
      },
      {
        value: "digital_marketing_specialist",
        label: { en: "Digital Marketing Specialist", zh: "数字营销专员" },
        category: { en: "Marketing & Branding", zh: "市场营销与品牌" }
      },
      {
        value: "content_marketing_specialist",
        label: { en: "Content Marketing Specialist", zh: "内容营销专员" },
        category: { en: "Marketing & Branding", zh: "市场营销与品牌" }
      },
      {
        value: "social_media_manager",
        label: { en: "Social Media Manager", zh: "社交媒体经理" },
        category: { en: "Marketing & Branding", zh: "市场营销与品牌" }
      },
      {
        value: "pr_officer",
        label: { en: "Public Relations Officer", zh: "公关主管" },
        category: { en: "Public Relations & Communications", zh: "公关与传播" }
      },
      {
        value: "communications_manager",
        label: { en: "Corporate Communications Manager", zh: "企业传播经理" },
        category: { en: "Public Relations & Communications", zh: "公关与传播" }
      }
    ]
  },
  {
    label: { en: "Finance & Accounting", zh: "金融与会计" },
    options: [
      {
        value: "accountant",
        label: { en: "Accountant", zh: "会计师" },
        category: { en: "Accounting & Finance", zh: "会计与财务" }
      },
      {
        value: "financial_accountant",
        label: { en: "Financial Accountant", zh: "财务会计师" },
        category: { en: "Accounting & Finance", zh: "会计与财务" }
      },
      {
        value: "cfo",
        label: { en: "Chief Financial Officer (CFO)", zh: "首席财务官" },
        category: { en: "Accounting & Finance", zh: "会计与财务" }
      },
      {
        value: "financial_controller",
        label: { en: "Financial Controller", zh: "财务总监" },
        category: { en: "Accounting & Finance", zh: "会计与财务" }
      },
      {
        value: "banking_consultant",
        label: { en: "Banking Consultant", zh: "银行顾问" },
        category: { en: "Banking & Insurance", zh: "银行与保险" }
      },
      {
        value: "financial_planner",
        label: { en: "Financial Planner", zh: "理财规划师" },
        category: { en: "Banking & Insurance", zh: "银行与保险" }
      },
      {
        value: "investment_analyst",
        label: { en: "Investment Analyst", zh: "投资分析师" },
        category: { en: "Investment & Asset Management", zh: "投资与资产管理" }
      },
      {
        value: "fund_manager",
        label: { en: "Fund Manager", zh: "基金经理" },
        category: { en: "Investment & Asset Management", zh: "投资与资产管理" }
      }
    ]
  },
  {
    label: { en: "Information Technology (IT)", zh: "信息技术" },
    options: [
      {
        value: "software_engineer",
        label: { en: "Software Engineer", zh: "软件工程师" },
        category: { en: "Software Development & Engineering", zh: "软件开发与工程" }
      },
      {
        value: "full_stack_developer",
        label: { en: "Full Stack Developer", zh: "全栈开发工程师" },
        category: { en: "Software Development & Engineering", zh: "软件开发与工程" }
      },
      {
        value: "frontend_developer",
        label: { en: "Front-End Developer", zh: "前端开发工程师" },
        category: { en: "Software Development & Engineering", zh: "软件开发与工程" }
      },
      {
        value: "backend_developer",
        label: { en: "Back-End Developer", zh: "后端开发工程师" },
        category: { en: "Software Development & Engineering", zh: "软件开发与工程" }
      },
      {
        value: "data_scientist",
        label: { en: "Data Scientist", zh: "数据科学家" },
        category: { en: "Data Science & Artificial Intelligence", zh: "数据科学与人工智能" }
      },
      {
        value: "machine_learning_engineer",
        label: { en: "Machine Learning Engineer", zh: "机器学习工程师" },
        category: { en: "Data Science & Artificial Intelligence", zh: "数据科学与人工智能" }
      },
      {
        value: "network_engineer",
        label: { en: "Network Engineer", zh: "网络工程师" },
        category: { en: "Network & Infrastructure", zh: "网络与基础设施" }
      },
      {
        value: "system_administrator",
        label: { en: "System Administrator", zh: "系统管理员" },
        category: { en: "Network & Infrastructure", zh: "网络与基础设施" }
      },
      {
        value: "it_security_analyst",
        label: { en: "IT Security Analyst", zh: "IT安全分析师" },
        category: { en: "Network & Infrastructure", zh: "网络与基础设施" }
      },
      {
        value: "it_support_engineer",
        label: { en: "IT Support Engineer", zh: "IT支持工程师" },
        category: { en: "IT Support & Technical Services", zh: "IT支持与技术服务" }
      }
    ]
  },
  {
    label: { en: "Transport & Logistics", zh: "运输与物流" },
    options: [
      {
        value: "truck_driver",
        label: { en: "Truck Driver", zh: "卡车司机" },
        category: { en: "Transport & Driving", zh: "运输与驾驶" }
      },
      {
        value: "delivery_driver",
        label: { en: "Delivery Driver", zh: "送货司机" },
        category: { en: "Transport & Driving", zh: "运输与驾驶" }
      },
      {
        value: "pilot",
        label: { en: "Pilot", zh: "飞行员" },
        category: { en: "Aviation & Shipping", zh: "航空与航运" }
      },
      {
        value: "cabin_crew",
        label: { en: "Cabin Crew", zh: "空乘人员" },
        category: { en: "Aviation & Shipping", zh: "航空与航运" }
      },
      {
        value: "ship_captain",
        label: { en: "Ship Captain", zh: "船长" },
        category: { en: "Aviation & Shipping", zh: "航空与航运" }
      }
    ]
  },
  {
    label: { en: "Engineering & Construction", zh: "工程与建筑" },
    options: [
      {
        value: "civil_engineer",
        label: { en: "Civil Engineer", zh: "土木工程师" },
        category: { en: "Engineering", zh: "工程" }
      },
      {
        value: "structural_engineer",
        label: { en: "Structural Engineer", zh: "结构工程师" },
        category: { en: "Engineering", zh: "工程" }
      },
      {
        value: "mechanical_engineer",
        label: { en: "Mechanical Engineer", zh: "机械工程师" },
        category: { en: "Engineering", zh: "工程" }
      },
      {
        value: "electrical_engineer",
        label: { en: "Electrical Engineer", zh: "电气工程师" },
        category: { en: "Engineering", zh: "工程" }
      },
      {
        value: "architect",
        label: { en: "Architect", zh: "建筑师" },
        category: { en: "Construction & Trades", zh: "建筑与工程" }
      },
      {
        value: "construction_manager",
        label: { en: "Construction Manager", zh: "建筑经理" },
        category: { en: "Construction & Trades", zh: "建筑与工程" }
      },
      {
        value: "site_supervisor",
        label: { en: "Site Supervisor", zh: "工地主管" },
        category: { en: "Construction & Trades", zh: "建筑与工程" }
      }
    ]
  },
  {
    label: { en: "Healthcare & Medical", zh: "医疗与保健" },
    options: [
      {
        value: "general_practitioner",
        label: { en: "General Practitioner (GP)", zh: "全科医生" },
        category: { en: "Medical & Allied Health", zh: "医疗与相关卫生" }
      },
      {
        value: "specialist_doctor",
        label: { en: "Specialist Doctor", zh: "专科医生" },
        category: { en: "Medical & Allied Health", zh: "医疗与相关卫生" }
      },
      {
        value: "dentist",
        label: { en: "Dentist", zh: "牙医" },
        category: { en: "Medical & Allied Health", zh: "医疗与相关卫生" }
      },
      {
        value: "registered_nurse",
        label: { en: "Registered Nurse (RN)", zh: "注册护士" },
        category: { en: "Nursing & Aged Care", zh: "护理与养老" }
      },
      {
        value: "physiotherapist",
        label: { en: "Physiotherapist", zh: "物理治疗师" },
        category: { en: "Medical & Allied Health", zh: "医疗与相关卫生" }
      },
      {
        value: "psychologist",
        label: { en: "Psychologist", zh: "心理学家" },
        category: { en: "Psychology & Social Work", zh: "心理与社会工作" }
      }
    ]
  },
  {
    label: { en: "Education & Training", zh: "教育与培训" },
    options: [
      {
        value: "early_childhood_educator",
        label: { en: "Early Childhood Educator", zh: "幼儿教育者" },
        category: { en: "Teaching & Training", zh: "教学与培训" }
      },
      {
        value: "primary_school_teacher",
        label: { en: "Primary School Teacher", zh: "小学教师" },
        category: { en: "Teaching & Training", zh: "教学与培训" }
      },
      {
        value: "secondary_school_teacher",
        label: { en: "Secondary School Teacher", zh: "中学教师" },
        category: { en: "Teaching & Training", zh: "教学与培训" }
      },
      {
        value: "university_lecturer",
        label: { en: "University Lecturer", zh: "大学讲师" },
        category: { en: "Teaching & Training", zh: "教学与培训" }
      }
    ]
  },
  {
    label: { en: "Legal & Compliance", zh: "法律与合规" },
    options: [
      {
        value: "lawyer",
        label: { en: "Lawyer (Solicitor/Barrister)", zh: "律师" },
        category: { en: "Legal & Compliance", zh: "法律与合规" }
      },
      {
        value: "legal_counsel",
        label: { en: "Legal Counsel", zh: "法律顾问" },
        category: { en: "Legal & Compliance", zh: "法律与合规" }
      },
      {
        value: "paralegal",
        label: { en: "Paralegal", zh: "律师助理" },
        category: { en: "Legal & Compliance", zh: "法律与合规" }
      },
      {
        value: "compliance_officer",
        label: { en: "Compliance Officer", zh: "合规官" },
        category: { en: "Legal & Compliance", zh: "法律与合规" }
      }
    ]
  },
  {
    label: { en: "Manufacturing & Trades", zh: "制造与技工" },
    options: [
      {
        value: "production_manager",
        label: { en: "Production Manager", zh: "生产经理" },
        category: { en: "Manufacturing & Production", zh: "制造与生产" }
      },
      {
        value: "machine_operator",
        label: { en: "Machine Operator", zh: "机器操作员" },
        category: { en: "Manufacturing & Production", zh: "制造与生产" }
      },
      {
        value: "mechanic",
        label: { en: "Mechanic", zh: "机械师" },
        category: { en: "Automotive & Repair", zh: "汽车与维修" }
      },
      {
        value: "logistics_manager",
        label: { en: "Logistics Manager", zh: "物流经理" },
        category: { en: "Logistics & Supply Chain", zh: "物流与供应链" }
      }
    ]
  },
  {
    label: { en: "Customer Service & Retail", zh: "客服与零售" },
    options: [
      {
        value: "customer_service_representative",
        label: { en: "Customer Service Representative", zh: "客服代表" },
        category: { en: "Customer Service", zh: "客户服务" }
      },
      {
        value: "retail_assistant",
        label: { en: "Retail Assistant", zh: "零售助理" },
        category: { en: "Retail & Hospitality", zh: "零售与酒店" }
      },
      {
        value: "store_manager",
        label: { en: "Store Manager", zh: "店铺经理" },
        category: { en: "Retail & Hospitality", zh: "零售与酒店" }
      }
    ]
  },
  {
    label: { en: "Creative & Design", zh: "创意与设计" },
    options: [
      {
        value: "graphic_designer",
        label: { en: "Graphic Designer", zh: "平面设计师" },
        category: { en: "Design & Visual Arts", zh: "设计与视觉艺术" }
      },
      {
        value: "ux_ui_designer",
        label: { en: "UX/UI Designer", zh: "用户体验/界面设计师" },
        category: { en: "Design & Visual Arts", zh: "设计与视觉艺术" }
      },
      {
        value: "photographer",
        label: { en: "Photographer", zh: "摄影师" },
        category: { en: "Photography & Film Production", zh: "摄影与影视制作" }
      }
    ]
  },
  {
    label: { en: "Media & Communication", zh: "媒体与传播" },
    options: [
      {
        value: "journalist",
        label: { en: "Journalist", zh: "记者" },
        category: { en: "Journalism & Writing", zh: "新闻与写作" }
      },
      {
        value: "copywriter",
        label: { en: "Copywriter", zh: "文案" },
        category: { en: "Journalism & Writing", zh: "新闻与写作" }
      },
      {
        value: "social_media_specialist",
        label: { en: "Social Media Specialist", zh: "社交媒体专员" },
        category: { en: "Digital Media & Advertising", zh: "数字媒体与广告" }
      }
    ]
  },
  {
    label: { en: "Agriculture & Environment", zh: "农业与环境" },
    options: [
      {
        value: "farm_manager",
        label: { en: "Farm Manager", zh: "农场经理" },
        category: { en: "Agriculture & Farming", zh: "农业与养殖" }
      },
      {
        value: "environmental_consultant",
        label: { en: "Environmental Consultant", zh: "环境顾问" },
        category: { en: "Environmental Science", zh: "环境科学" }
      },
      {
        value: "marine_biologist",
        label: { en: "Marine Biologist", zh: "海洋生物学家" },
        category: { en: "Fisheries & Marine Science", zh: "渔业与海洋科学" }
      }
    ]
  },
  {
    label: { en: "Government & Public Services", zh: "政府与公共服务" },
    options: [
      {
        value: "policy_advisor",
        label: { en: "Policy Advisor", zh: "政策顾问" },
        category: { en: "Public Administration", zh: "公共管理" }
      },
      {
        value: "government_officer",
        label: { en: "Government Officer", zh: "政府官员" },
        category: { en: "Public Administration", zh: "公共管理" }
      },
      {
        value: "community_engagement_officer",
        label: { en: "Community Engagement Officer", zh: "社区参与官" },
        category: { en: "Community Services & Non-Profit", zh: "社区服务与非营利" }
      }
    ]
  }
];

export const SENIORITY_LEVELS: Option[] = [
  { value: 'entry', label: { en: 'Entry Level', zh: '初级' } },
  { value: 'mid', label: { en: 'Mid Level', zh: '中级' } },
  { value: 'senior', label: { en: 'Senior', zh: '高级' } },
  { value: 'executive', label: { en: 'Executive', zh: '管理层' } },
];

export const JOB_TYPES: Option[] = [
  { value: 'full_time', label: { en: 'Full-time', zh: '全职' } },
  { value: 'part_time', label: { en: 'Part-time', zh: '兼职' } },
  { value: 'contract', label: { en: 'Contract', zh: '合同工' } },
  { value: 'casual', label: { en: 'Casual', zh: '临时工' } },
  { value: 'internship', label: { en: 'Internship', zh: '实习' } },
];

export const SALARY_PERIODS: Option[] = [
  { value: 'per_year', label: { en: 'Per Year', zh: '每年' } },
  { value: 'per_month', label: { en: 'Per Month', zh: '每月' } },
  { value: 'per_day', label: { en: 'Per Day', zh: '每日' } },
  { value: 'per_hour', label: { en: 'Per Hour', zh: '每小时' } },
];

export const YEARLY_SALARY_RANGES_AUD: Option[] = [
  { value: '40000-60000', label: { en: '$40,000 - $60,000', zh: '$40,000 - $60,000' } },
  { value: '60000-80000', label: { en: '$60,000 - $80,000', zh: '$60,000 - $80,000' } },
  { value: '80000-100000', label: { en: '$80,000 - $100,000', zh: '$80,000 - $100,000' } },
  { value: '100000-120000', label: { en: '$100,000 - $120,000', zh: '$100,000 - $120,000' } },
  { value: '120000+', label: { en: '$120,000+', zh: '$120,000+' } },
];

export const YEARLY_SALARY_RANGES_RMB: Option[] = [
  { value: '200000-300000', label: { en: '¥200,000 - ¥300,000', zh: '¥200,000 - ¥300,000' } },
  { value: '300000-400000', label: { en: '¥300,000 - ¥400,000', zh: '¥300,000 - ¥400,000' } },
  { value: '400000-500000', label: { en: '¥400,000 - ¥500,000', zh: '¥400,000 - ¥500,000' } },
  { value: '500000-600000', label: { en: '¥500,000 - ¥600,000', zh: '¥500,000 - ¥600,000' } },
  { value: '600000+', label: { en: '¥600,000+', zh: '¥600,000+' } },
]; 