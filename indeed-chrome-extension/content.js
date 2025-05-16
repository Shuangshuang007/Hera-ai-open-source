async function scrapeJobs(targetCount = 60) {
  let jobs = [];
  // Select all job cards
  let cards = document.querySelectorAll('div.job_seen_beacon, div.slider_item');
  
  cards.forEach(card => {
    if (jobs.length >= targetCount) return;
    
    // Get job title
    const titleElement = card.querySelector('a.jcs-JobTitle, h2.jobTitle');
    const title = titleElement?.innerText?.trim() || '';
    
    // Get company name
    const companyElement = card.querySelector('span[data-testid="company-name"], span.companyName');
    const company = companyElement?.innerText?.trim() || '';
    
    // Get location
    const locationElement = card.querySelector('div[data-testid="text-location"], div.companyLocation');
    const location = locationElement?.innerText?.trim() || '';
    
    // Get salary
    const salaryElement = card.querySelector('div.salary-snippet-container, div[data-testid="attribute_snippet_testid"], div.metadata-salary');
    const salary = salaryElement?.innerText?.trim() || '';
    
    // Get job summary
    const summaryElement = card.querySelector('div[data-testid="jobsnippet_footer"], div.job-snippet');
    const summary = summaryElement?.innerText?.trim() || '';
    
    // Get job URL
    const urlElement = card.querySelector('a.jcs-JobTitle, h2.jobTitle a');
    const url = urlElement?.href || '';
    
    if (title) {
      jobs.push({ 
        title, 
        company, 
        location, 
        salary, 
        summary, 
        url 
      });
    }
  });
  
  console.log('Scraped jobs:', jobs); // Debug log
  return jobs.slice(0, targetCount);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'scrapeAndSend') {
    scrapeJobs(60).then(jobs => {
      fetch('http://localhost:5000/api/import-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs })
      }).then(resp => {
        sendResponse({ success: resp.ok });
      }).catch((err) => {
        console.error('Import failed:', err);
        sendResponse({ success: false });
      });
    });
    return true; // Indicates async response
  }
}); 