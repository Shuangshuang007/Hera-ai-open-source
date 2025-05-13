async function scrapeJobs(targetCount = 60) {
  let jobs = [];
  let page = 0;
  while (jobs.length < targetCount) {
    // 抓取当前页
    document.querySelectorAll('a.tapItem').forEach(card => {
      if (jobs.length >= targetCount) return;
      const title = card.querySelector('h2.jobTitle span')?.innerText || '';
      const company = card.querySelector('.companyName')?.innerText || '';
      const location = card.querySelector('.companyLocation')?.innerText || '';
      const summary = card.querySelector('.job-snippet')?.innerText || '';
      const url = card.href || '';
      jobs.push({ title, company, location, summary, url });
    });
    // 翻页
    const nextBtn = document.querySelector('a[aria-label="Next"]');
    if (!nextBtn || jobs.length >= targetCount) break;
    nextBtn.click();
    await new Promise(r => setTimeout(r, 2500)); // 等待新页面加载
    page++;
    if (page > 20) break; // 防止死循环
  }
  return jobs.slice(0, targetCount);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'scrapeAndSend') {
    scrapeJobs(60).then(jobs => {
      fetch('http://localhost:3002/api/import-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs })
      }).then(resp => {
        sendResponse({ success: resp.ok });
      }).catch(() => sendResponse({ success: false }));
    });
    return true; // 异步响应
  }
}); 