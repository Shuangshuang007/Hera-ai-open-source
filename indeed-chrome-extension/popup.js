document.getElementById('scrape').onclick = () => {
  document.getElementById('status').innerText = 'Scraping and importing...';
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'scrapeAndSend'}, (resp) => {
      if (resp && resp.success) {
        document.getElementById('status').innerText = 'Import successful!';
      } else {
        document.getElementById('status').innerText = 'Import failed. Please check API or network.';
      }
    });
  });
}; 