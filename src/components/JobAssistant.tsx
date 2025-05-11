import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  type?: 'preference_update' | 'normal' | 'job_card';
  job?: JobCardContext;
}

interface JobAssistantProps {
  onUpdatePreferences: (preferences: any) => void;
  language: 'en' | 'zh';
}

interface JobCardContext {
  title: string;
  company: string;
  location?: string;
  postedDate?: string;
  summary?: string;
  whoWeAre?: string;
  whoWeAreLookingFor?: string;
  matchScore?: number;
  matchAnalysis?: string;
}

const PROFILE_KEYWORDS = [
  // 英文表达
  'find job', 'new job', 'change city', 'change industry', 'change salary', 'relocate', 'search new jobs', 'recommend jobs', 'apply jobs', 'switch role', 'change company',
  // 中文表达
  '找工作', '换工作', '换城市', '换行业', '换薪资', '调动', '搜新工作', '推荐职位', '投职位', '换岗位', '换公司',
  // 字段名
  'first name', 'last name', 'email', 'phone', 'country', 'city', 'job title', 'seniority', 'open for relocation', 'expected salary', 'education', 'employment history', 'career priorities',
  // 中文字段名
  '姓名', '名字', '姓氏', '邮箱', '电话', '国家', '城市', '职位', '级别', '意向城市', '薪资', '学历', '教育', '工作经历', '就业经历', '职业偏好', '公司声誉', '薪酬', '地点', '平衡', '混合办公', '晋升', '价值观', '行业匹配', '职能匹配', '文化匹配'
];

function containsProfileKeyword(text: string) {
  // 统一小写、去除多余空格和标点
  const normalized = text.toLowerCase().replace(/[\s.,!?，。！？、]/g, '');
  return PROFILE_KEYWORDS.some(keyword => {
    const pattern = keyword.toLowerCase().replace(/[\s.,!?，。！？、]/g, '');
    try {
      return new RegExp(pattern, 'i').test(normalized);
    } catch {
      return false;
    }
  });
}

// 新增：检测AI回复中是否有刷新职位的意图关键词
function containsJobRefreshIntent(text: string) {
  const patterns = [
    /find (a )?(job|position|opportunit(y|ies))/i,
    /search (for )?(job|position|opportunit(y|ies))/i,
    /refine (job|position|opportunit(y|ies))/i,
    /refresh (job|position|opportunit(y|ies))/i,
    /new (job|position|opportunit(y|ies))/i
  ];
  return patterns.some(pattern => pattern.test(text));
}

// 提取对话中最新偏好的辅助函数
interface LatestPreferences {
  location?: string;
  jobTitle?: string;
  // 可扩展更多字段
}
function extractLatestPreferencesFromMessages(messages: { role: string; content: string }[]): LatestPreferences {
  const latest: LatestPreferences = {};
  // 简单正则示例，可根据实际需求扩展
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'user') {
      if (!latest.location) {
        const locMatch = msg.content.match(/in ([A-Za-z ]+)/i);
        if (locMatch) latest.location = locMatch[1].trim();
      }
      if (!latest.jobTitle) {
        const titleMatch = msg.content.match(/do (?:a|the)? ?([A-Za-z ]+) job/i);
        if (titleMatch) latest.jobTitle = titleMatch[1].trim();
      }
      // 可扩展更多偏好
    }
    if (latest.location && latest.jobTitle) break;
  }
  return latest;
}

// 检测字符串是否包含中文字符
function detectLang(text: string): 'zh' | 'en' {
  return /[\u4e00-\u9fa5]/.test(text) ? 'zh' : 'en';
}

// 刷新弹窗频率控制
function getRefreshPromptHistory() {
  const raw = localStorage.getItem('refreshPromptHistory');
  return raw ? JSON.parse(raw) : [];
}
function addRefreshPromptHistory() {
  const history = getRefreshPromptHistory();
  history.push(Date.now());
  localStorage.setItem('refreshPromptHistory', JSON.stringify(history));
}
function canShowRefreshPrompt() {
  const history = getRefreshPromptHistory();
  const now = Date.now();
  // 1小时内
  const oneHourAgo = now - 60 * 60 * 1000;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const oneHourCount = history.filter((ts: number) => ts > oneHourAgo).length;
  const todayCount = history.filter((ts: number) => ts > todayStart.getTime()).length;
  return {
    allow: oneHourCount < 10 && todayCount < 20,
    oneHourCount,
    todayCount
  };
}

// 职位内容转第三人称
function toThirdPerson(text: string, company: string) {
  const name = company || 'The company';
  // 移除小节标题
  text = text.replace(/^(Who we are:|Who we are looking for:)\s*/i, '');
  
  // 检查是否已经以任何公司名开头（包括其他公司名称）
  const anyCompanyPattern = /^([A-Z][A-Za-z0-9\s&-]+?)\s+(is|has)\b/;
  if (anyCompanyPattern.test(text)) {
    return text;
  }
  
  // 如果文本已经以公司名开头，直接返回
  const startsWithCompanyRegex = new RegExp(`^(${name}|The company)\\s+(is|has)\\b`, 'i');
  if (startsWithCompanyRegex.test(text)) {
    return text;
  }
  
  // 替换第一人称代词
  text = text
    .replace(/\bWe are\b/g, `${name} is`)
    .replace(/\bWe have\b/g, `${name} has`)
    .replace(/\bWe\b/g, 'they')
    .replace(/\bOur company\b/gi, name)
    .replace(/\bOur\b/g, 'their')
    .replace(/\bour\b/g, 'their')
    .replace(/\bwe are\b/g, `${name} is`)
    .replace(/\bwe have\b/g, `${name} has`)
    .replace(/\bwe\b/g, 'they')
    .replace(/\bWe're\b/g, `${name} is`)
    .replace(/\bwe're\b/g, `${name} is`)
    .replace(/\bWe've\b/g, `${name} has`)
    .replace(/\bwe've\b/g, `${name} has`)
    .replace(/\bWe'll\b/g, `${name} will`)
    .replace(/\bwe'll\b/g, `${name} will`)
    .replace(/\bWe'd\b/g, `${name} would`)
    .replace(/\bwe'd\b/g, `${name} would`)
    .replace(/\bWe've been\b/g, `${name} has been`)
    .replace(/\bwe've been\b/g, `${name} has been`)
    .replace(/\bWe're looking for\b/g, `${name} is looking for`)
    .replace(/\bwe're looking for\b/g, `${name} is looking for`)
    .replace(/\bWe're seeking\b/g, `${name} is seeking`)
    .replace(/\bwe're seeking\b/g, `${name} is seeking`)
    .replace(/\bWe're hiring\b/g, `${name} is hiring`)
    .replace(/\bwe're hiring\b/g, `${name} is hiring`)
    .replace(/\bWe're offering\b/g, `${name} is offering`)
    .replace(/\bwe're offering\b/g, `${name} is offering`)
    .replace(/\bWe're committed to\b/g, `${name} is committed to`)
    .replace(/\bwe're committed to\b/g, `${name} is committed to`)
    .replace(/\bWe're dedicated to\b/g, `${name} is dedicated to`)
    .replace(/\bwe're dedicated to\b/g, `${name} is dedicated to`)
    .replace(/\bWe're focused on\b/g, `${name} is focused on`)
    .replace(/\bwe're focused on\b/g, `${name} is focused on`)
    .replace(/\bWe're passionate about\b/g, `${name} is passionate about`)
    .replace(/\bwe're passionate about\b/g, `${name} is passionate about`)
    .replace(/\bWe're excited to\b/g, `${name} is excited to`)
    .replace(/\bwe're excited to\b/g, `${name} is excited to`)
    .replace(/\bWe're proud to\b/g, `${name} is proud to`)
    .replace(/\bwe're proud to\b/g, `${name} is proud to`)
    .replace(/\bWe're thrilled to\b/g, `${name} is thrilled to`)
    .replace(/\bwe're thrilled to\b/g, `${name} is thrilled to`)
    .replace(/\bWe're delighted to\b/g, `${name} is delighted to`)
    .replace(/\bwe're delighted to\b/g, `${name} is delighted to`)
    .replace(/\bWe're pleased to\b/g, `${name} is pleased to`)
    .replace(/\bwe're pleased to\b/g, `${name} is pleased to`)
    .replace(/\bWe're happy to\b/g, `${name} is happy to`)
    .replace(/\bwe're happy to\b/g, `${name} is happy to`)
    .replace(/\bWe're glad to\b/g, `${name} is glad to`)
    .replace(/\bwe're glad to\b/g, `${name} is glad to`)
    .replace(/\bWe're grateful to\b/g, `${name} is grateful to`)
    .replace(/\bwe're grateful to\b/g, `${name} is grateful to`)
    .replace(/\bWe're thankful to\b/g, `${name} is thankful to`)
    .replace(/\bwe're thankful to\b/g, `${name} is thankful to`)
    .replace(/\bWe're honored to\b/g, `${name} is honored to`)
    .replace(/\bwe're honored to\b/g, `${name} is honored to`)
    .replace(/\bWe're privileged to\b/g, `${name} is privileged to`)
    .replace(/\bwe're privileged to\b/g, `${name} is privileged to`)
    .replace(/\bWe're fortunate to\b/g, `${name} is fortunate to`)
    .replace(/\bwe're fortunate to\b/g, `${name} is fortunate to`)
    .replace(/\bWe're lucky to\b/g, `${name} is lucky to`)
    .replace(/\bwe're lucky to\b/g, `${name} is lucky to`)
    .replace(/\bWe're blessed to\b/g, `${name} is blessed to`)
    .replace(/\bwe're blessed to\b/g, `${name} is blessed to`)
    .replace(/\bWe're fortunate enough to\b/g, `${name} is fortunate enough to`)
    .replace(/\bwe're fortunate enough to\b/g, `${name} is fortunate enough to`)
    .replace(/\bWe're lucky enough to\b/g, `${name} is lucky enough to`)
    .replace(/\bwe're lucky enough to\b/g, `${name} is lucky enough to`)
    .replace(/\bWe're blessed enough to\b/g, `${name} is blessed enough to`)
    .replace(/\bwe're blessed enough to\b/g, `${name} is blessed enough to`)
    .replace(/\bWe're honored enough to\b/g, `${name} is honored enough to`)
    .replace(/\bwe're honored enough to\b/g, `${name} is honored enough to`)
    .replace(/\bWe're privileged enough to\b/g, `${name} is privileged enough to`)
    .replace(/\bwe're privileged enough to\b/g, `${name} is privileged enough to`)
    .replace(/\bWe're grateful enough to\b/g, `${name} is grateful enough to`)
    .replace(/\bwe're grateful enough to\b/g, `${name} is grateful enough to`)
    .replace(/\bWe're thankful enough to\b/g, `${name} is thankful enough to`)
    .replace(/\bwe're thankful enough to\b/g, `${name} is thankful enough to`)
    .replace(/\bWe're pleased enough to\b/g, `${name} is pleased enough to`)
    .replace(/\bwe're pleased enough to\b/g, `${name} is pleased enough to`)
    .replace(/\bWe're happy enough to\b/g, `${name} is happy enough to`)
    .replace(/\bwe're happy enough to\b/g, `${name} is happy enough to`)
    .replace(/\bWe're glad enough to\b/g, `${name} is glad enough to`)
    .replace(/\bwe're glad enough to\b/g, `${name} is glad enough to`)
    .replace(/\bWe're excited enough to\b/g, `${name} is excited enough to`)
    .replace(/\bwe're excited enough to\b/g, `${name} is excited enough to`)
    .replace(/\bWe're proud enough to\b/g, `${name} is proud enough to`)
    .replace(/\bwe're proud enough to\b/g, `${name} is proud enough to`)
    .replace(/\bWe're thrilled enough to\b/g, `${name} is thrilled enough to`)
    .replace(/\bwe're thrilled enough to\b/g, `${name} is thrilled enough to`)
    .replace(/\bWe're delighted enough to\b/g, `${name} is delighted enough to`)
    .replace(/\bwe're delighted enough to\b/g, `${name} is delighted enough to`);

  // 移除 "Their company is" 开头
  text = text.replace(/^Their company is\s+/i, '');
  
  // 如果文本不以公司名开头，添加公司名前缀
  if (!text.toLowerCase().startsWith(name.toLowerCase())) {
    text = `${name} is ${text}`;
  }

  // 确保每个句子的首字母大写
  text = text.split('. ').map(sentence => {
    let trimmed = sentence.trim();
    if (trimmed) {
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }
    return trimmed;
  }).join('. ');

  return text;
}

export const JobAssistant: React.FC<JobAssistantProps> = ({ onUpdatePreferences, language }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: "Hi, I'm Hera – your AI career assistant. I can help you with job search, career advice, and more. What would you like to know?" 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [pendingPreferences, setPendingPreferences] = useState<any>(null);
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);
  const [currentJobContext, setCurrentJobContext] = useState<JobCardContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 监听 send-job-to-chat 事件
  useEffect(() => {
    const handler = (e: any) => {
      const job: JobCardContext = e.detail;
      setIsMinimized(false); // 自动展开AI助手
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          type: 'job_card',
          content: '',
          job
        }
      ]);
      setCurrentJobContext(job);
    };
    window.addEventListener('send-job-to-chat', handler);
    return () => window.removeEventListener('send-job-to-chat', handler);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // 1. 先获取AI回复和意图解析
      const aiResponse = await fetch('/api/assistant/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: userMessage,
          context: messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
          jobContext: currentJobContext // 新增岗位上下文
        }),
      });
      const aiData = await aiResponse.json();
      
      if (aiData.action === 'career_advice') {
        // 1. 提取profile和最新偏好
        const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        const latestPreferences = extractLatestPreferencesFromMessages([...messages, { role: 'user', content: userMessage }]);
        const replyLang = detectLang(userMessage);
        // 2. 请求后端生成个性化建议
        const adviceRes = await fetch('/api/assistant/career-advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile,
            latestPreferences,
            question: userMessage,
            context: messages.slice(-5),
            replyLang
          })
        });
        const adviceData = await adviceRes.json();
        setMessages(prev => [
          ...prev,
          { 
            role: 'assistant', 
            content: adviceData.response || (replyLang === 'zh' ? '已为您结合个人资料和最新偏好生成职业建议。' : 'Here is your personalized career advice.')
          }
        ]);
      } else if (aiData.action === 'update_profile_and_refetch' && aiData.updates && Object.keys(aiData.updates).length > 0) {
        // 频率限制判断
        const { allow, oneHourCount, todayCount } = canShowRefreshPrompt();
        if (allow) {
          setPendingPreferences(aiData.updates);
          setShowRefreshPrompt(true);
          setMessages(prev => [
            ...prev,
            { 
              role: 'assistant', 
              content: language === 'zh' ? '检测到您想要刷新职位推荐。需要我为您刷新职位推荐吗？' : "It looks like you'd like to refresh job recommendations. Would you like to refresh the job recommendations based on your new preferences?",
              type: 'preference_update'
            }
          ]);
          addRefreshPromptHistory();
        } else {
          setMessages(prev => [
            ...prev,
            { 
              role: 'assistant', 
              content: language === 'zh'
                ? `操作过于频繁，请稍后再试。1小时内最多10次，今天已用${todayCount}/20次。`
                : `You are refreshing too frequently. Max 10 times per hour, 20 times per day. Used today: ${todayCount}/20.`
            }
          ]);
        }
      } else if (aiData.response) {
        setMessages(prev => [
          ...prev,
          { 
            role: 'assistant', 
            content: aiData.response
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { 
            role: 'assistant', 
            content: language === 'zh' ? '我明白您的问题，我会帮您处理。' : 'I understand your question. Let me help you with that.'
          }
        ]);
      }
      setShowRefreshPrompt(false);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: language === 'zh' ? '请求处理出错，请重试。' : 'Sorry, there was an error processing your request. Please try again.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceUpdate = async (preferences: any) => {
    try {
      // 更新localStorage.userProfile
      const currentUserProfileStr = localStorage.getItem('userProfile');
      const currentUserProfile = currentUserProfileStr ? JSON.parse(currentUserProfileStr) : {};
      const updatedUserProfile = {
        ...currentUserProfile,
        ...preferences
      };
      localStorage.setItem('userProfile', JSON.stringify(updatedUserProfile));
      // 触发职位刷新
      onUpdatePreferences(preferences);
      setPendingPreferences(preferences);
      setShowRefreshPrompt(false);
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: language === 'zh' 
            ? '已更新您的偏好设置，正在刷新职位推荐...' 
            : 'Your preferences have been updated. Refreshing job recommendations...'
        }
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: language === 'zh' 
            ? '更新偏好设置时出错，请重试。' 
            : 'Error updating preferences. Please try again.'
        }
      ]);
    }
  };

  // 从用户输入中提取偏好信息
  const extractPreferencesFromInput = (input: string) => {
    const preferences: any = {};
    const text = input.trim();

    // 1. 优先提取"[职位] jobs in [城市]"或"找[城市][职位]工作"类表达
    // 英文表达
    let match = text.match(/find\s+([\w\s\-]+?)\s+jobs?\s+in\s+([\w\s\-]+)/i);
    if (match) {
      preferences.jobTitle = match[1].trim();
      preferences.city = match[2].trim();
      return preferences;
    }
    // 兼容"[职位] position in [城市]"
    match = text.match(/([\w\s\-]+?)\s+positions?\s+in\s+([\w\s\-]+)/i);
    if (match) {
      preferences.jobTitle = match[1].trim();
      preferences.city = match[2].trim();
      return preferences;
    }
    // 兼容"in [城市] find [职位] jobs"
    match = text.match(/in\s+([\w\s\-]+)\s+find\s+([\w\s\-]+?)\s+jobs?/i);
    if (match) {
      preferences.city = match[1].trim();
      preferences.jobTitle = match[2].trim();
      return preferences;
    }
    // 中文表达："找[城市][职位]工作"或"帮我找[城市][职位]的工作"
    match = text.match(/[找帮]([\u4e00-\u9fa5A-Za-z]+)([\u4e00-\u9fa5A-Za-z]+)工作/);
    if (match) {
      preferences.city = match[1].trim();
      preferences.jobTitle = match[2].trim();
      return preferences;
    }
    // "在[城市]找[职位]工作"
    match = text.match(/在([\u4e00-\u9fa5A-Za-z]+)[找寻]([\u4e00-\u9fa5A-Za-z]+)工作/);
    if (match) {
      preferences.city = match[1].trim();
      preferences.jobTitle = match[2].trim();
      return preferences;
    }

    // 2. 单独提取城市
    // 英文 in/at/from city
    const cityMatch = text.match(/(?:in|at|from|到|在|来自)\s*([\u4e00-\u9fa5A-Za-z\s]+)/i);
    if (cityMatch) {
      // 避免误判"find jobs for me"等
      const cityCandidate = cityMatch[1].trim();
      if (cityCandidate.length > 1 && !/jobs?/i.test(cityCandidate)) {
        preferences.city = cityCandidate;
      }
    }
    // 中文"在[城市]"
    const zhCityMatch = text.match(/在([\u4e00-\u9fa5A-Za-z]+)[工作]?/);
    if (zhCityMatch) {
      preferences.city = zhCityMatch[1].trim();
    }

    // 3. 单独提取职位
    // 英文 job title/position as ...
    const jobTitleMatch = text.match(/(?:job title|position|职位|岗位|做|当)\s*(?:as|是|为|:)?\s*([\u4e00-\u9fa5A-Za-z\s]+)/i);
    if (jobTitleMatch) {
      preferences.jobTitle = jobTitleMatch[1].trim();
    }
    // 英文"find [职位] jobs"
    match = text.match(/find\s+([\w\s\-]+?)\s+jobs?/i);
    if (match) {
      preferences.jobTitle = match[1].trim();
    }
    // 中文"找[职位]工作"
    match = text.match(/[找帮]([\u4e00-\u9fa5A-Za-z]+)工作/);
    if (match) {
      preferences.jobTitle = match[1].trim();
    }

    // 4. 行业
    const industryMatch = text.match(/(?:industry|field|领域|行业)\s*(?:of|in|为|是)?\s*([\u4e00-\u9fa5A-Za-z\s]+)/i);
    if (industryMatch) {
      preferences.industry = industryMatch[1].trim();
    }
    // 5. 薪资
    const salaryMatch = text.match(/(?:salary|pay|薪资|工资)\s*(?:of|is|为|是)?\s*([\d\u4e00-\u9fa5A-Za-z\s\-]+)/i);
    if (salaryMatch) {
      preferences.salary = salaryMatch[1].trim();
    }
    // 6. 职位类型
    const jobTypeMatch = text.match(/(?:job type|position type|职位类型|工作类型)\s*(?:of|is|为|是)?\s*([\u4e00-\u9fa5A-Za-z\s]+)/i);
    if (jobTypeMatch) {
      preferences.jobType = jobTypeMatch[1].trim();
    }

    return preferences;
  };

  // 渲染岗位卡片消息（只显示title+company+按钮）
  function renderJobCard(job: JobCardContext) {
    return (
      <div className="border border-blue-200 bg-blue-50 rounded-lg p-3 mb-2">
        <div className="mb-1 text-black font-semibold" style={{ fontSize: '13px' }}>
          {job.title} <span className="text-black">@</span> {job.company}
        </div>
        <div className="flex space-x-2 mt-2">
          <button
            className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 rounded px-2 py-1 transition-colors duration-150 shadow-sm"
            onClick={() => handleJobCardButtonClick('company', job)}
          >
            {language === 'zh' ? '公司介绍' : 'Tell me about the company'}
          </button>
          <button
            className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 rounded px-2 py-1 transition-colors duration-150 shadow-sm"
            onClick={() => handleJobCardButtonClick('position', job)}
          >
            {language === 'zh' ? '岗位介绍' : 'Tell me about the position'}
          </button>
          <button
            className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 rounded px-2 py-1 transition-colors duration-150 shadow-sm"
            onClick={() => handleJobCardButtonClick('fit', job)}
          >
            {language === 'zh' ? '我适合吗' : 'Am I a good fit'}
          </button>
        </div>
      </div>
    );
  }

  // 处理岗位卡片按钮点击
  function handleJobCardButtonClick(type: 'company' | 'position' | 'fit', job: JobCardContext) {
    let userMsg = '';
    let aiMsg = '';
    if (type === 'company') {
      userMsg = language === 'zh' ? '公司介绍' : 'Tell me about the company';
      if (job.whoWeAre) {
        const cleaned = toThirdPerson(job.whoWeAre, job.company).trim();
        aiMsg = cleaned;  // 直接使用处理后的文本，不添加任何前缀
      } else {
        aiMsg = language === 'zh' ? '暂无公司介绍信息。' : 'No company info.';
      }
    } else if (type === 'position') {
      userMsg = language === 'zh' ? '岗位介绍' : 'Tell me about the position';
      if (job.whoWeAreLookingFor) {
        const cleaned = toThirdPerson(job.whoWeAreLookingFor, job.company).trim();
        aiMsg = cleaned;
      } else {
        aiMsg = language === 'zh' ? '暂无岗位介绍信息。' : 'No position info.';
      }
    } else if (type === 'fit') {
      userMsg = language === 'zh' ? '我适合吗' : 'Am I a good fit';
      if (job.matchScore || job.matchAnalysis) {
        aiMsg = (language === 'zh'
          ? `匹配分数：${job.matchScore ?? '-'}。${job.matchAnalysis || ''}`
          : `Match Score: ${job.matchScore ?? '-'}.\n${job.matchAnalysis || ''}`);
      } else {
        aiMsg = language === 'zh' ? '暂无匹配分析信息。' : 'No matching analysis.';
      }
    }
    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMsg },
      { role: 'assistant', content: aiMsg }
    ]);
  }

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 bg-white text-blue-700 p-2 rounded-xl cursor-pointer shadow-md hover:bg-gray-50 transition-colors duration-200 border border-gray-200 z-50 flex items-center space-x-2"
        style={{ fontSize: '15px' }}
        onClick={() => setIsMinimized(false)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
        </svg>
        <span className="text-blue-700 font-semibold tracking-tight" style={{ fontSize: '15px' }}>Chat</span>
      </div>
    );
  }

  return (
    <>
      {/* 移除遮罩层，使主页面可点击 */}
      {/* <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40" /> */}
      <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-md border border-gray-200 flex flex-col z-50" style={{ width: 750, maxWidth: '90vw', maxHeight: 750, height: 'auto' }}>
        <div className="px-3 py-2 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-xl">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <span className="font-semibold tracking-tight" style={{ fontSize: '18px', color: '#2563eb', fontFamily: 'Arial' }}>Héra</span>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-gray-50">
          {messages.map((message, index) => (
            <div
              key={`${message.id || index}-${message.content.substring(0, 20)}`}
              className={`${
                message.role === 'user' 
                  ? 'ml-auto bg-[#e8f0fe] text-[#1a56db] border border-[#2563eb]/10' 
                  : 'bg-white text-[#374151] border border-gray-200'
              } p-2.5 rounded-lg max-w-[85%] text-xs leading-relaxed shadow-sm`}
              style={{ fontSize: '13px' }}
            >
              {message.type === 'job_card' && message.job
                ? renderJobCard(message.job)
                : message.content}
              {message.type === 'preference_update' && (
                <div className="mt-2 flex space-x-2">
                  <button
                    onClick={() => handlePreferenceUpdate(pendingPreferences)}
                    style={{
                      background: '#e8f0fe',
                      color: '#2563eb',
                      borderRadius: '9999px',
                      padding: '0 14px',
                      height: '32px',
                      fontSize: '13px',
                      boxShadow: '0 1px 2px rgba(16,30,54,0.04)',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    {language === 'zh' ? '✅ 是，刷新职位' : '✅ Yes, Refresh Jobs'}
                  </button>
                  <Button
                    onClick={() => {
                      setPendingPreferences(null);
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full px-3.5 h-8 text-xs shadow-sm"
                    style={{ fontSize: '13px' }}
                  >
                    {language === 'zh' ? '❌ 否，保留当前职位' : '❌ No, Keep Current Jobs'}
                  </Button>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="p-2.5 rounded-lg bg-white text-[#374151] max-w-[85%] text-xs shadow-sm border border-gray-200" style={{ fontSize: '13px' }}>
              Thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t border-gray-200 bg-white rounded-b-xl">
          <div className="flex space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about a job or a post..."
              className="flex-1 text-xs border border-gray-300 focus:border-[#2563eb] focus:ring-[#2563eb] rounded-full h-8 bg-white placeholder-gray-400"
              style={{ fontSize: '13px' }}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button 
              onClick={handleSend} 
              disabled={isLoading}
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full px-3.5 h-8 text-xs shadow-sm"
              style={{ fontSize: '13px' }}
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}; 