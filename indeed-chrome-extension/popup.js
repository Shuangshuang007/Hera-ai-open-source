document.getElementById('scrape').onclick = () => {
  document.getElementById('status').innerText = '正在抓取并导入...';
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'scrapeAndSend'}, (resp) => {
      if (resp && resp.success) {
        document.getElementById('status').innerText = '导入成功！';
      } else {
        document.getElementById('status').innerText = '导入失败，请检查API或网络。';
      }
    });
  });
}; 