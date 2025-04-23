console.log('Hera Job Launcher background script loaded');

chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked');
  if (tab.url.includes('indeed.com')) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'START_PROCESSING',
      payload: {
        jobTitle: 'Software Engineer',
        location: 'Melbourne'
      }
    });
  }
});

// 监听来自 Hera 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'START_JOB_SEARCH') {
    handleJobSearch(request.payload);
  }
});

async function handleJobSearch(payload) {
  const { jobTitle, location, skills, seniority } = payload;
  
  try {
    // 构建搜索 URL
    const searchUrl = buildSearchUrl(payload);
    
    // 打开新标签页
    const tab = await chrome.tabs.create({ url: searchUrl });
    
    // 等待页面加载完成
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        // 移除监听器
        chrome.tabs.onUpdated.removeListener(listener);
        
        // 发送消息给 content script 开始处理
        chrome.tabs.sendMessage(tab.id, {
          type: 'START_PROCESSING',
          payload: {
            jobTitle,
            skills,
            seniority
          }
        });
      }
    });
  } catch (error) {
    console.error('Error in job search:', error);
    notifyHera({
      type: 'ERROR',
      error: error.message
    });
  }
}

function buildSearchUrl(payload) {
  const { jobTitle, location, seniority } = payload;
  const baseUrl = 'https://au.indeed.com/jobs';
  const params = new URLSearchParams({
    q: `${jobTitle} ${seniority}`.trim(),
    l: location,
    radius: '50',
    sort: 'date'
  });
  
  return `${baseUrl}?${params.toString()}`;
}

function notifyHera(message) {
  // 发送消息到 Hera 后台
  fetch('http://localhost:3002/api/plugin-status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  }).catch(console.error);
} 