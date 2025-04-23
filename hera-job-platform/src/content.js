console.log('Hera Job Launcher loaded');

// 监听来自 background script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  if (message.type === 'START_PROCESSING') {
    console.log('Starting job processing');
  }
}); 