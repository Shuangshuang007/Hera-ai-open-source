const express = require('express');
const { fetchSeekJobs } = require('./seekCrawler');
const cors = require('cors');
const app = express();
const port = 4000;

app.use(cors());

app.get('/api/seek-jobs', async (req, res) => {
  const { jobTitle = 'software-engineer', city = 'melbourne', limit = 25 } = req.query;
  try {
    const jobs = await fetchSeekJobs(jobTitle, city, parseInt(limit));
    res.json({ jobs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(port, () => {
  console.log(`SEEK爬虫API服务已启动: http://localhost:${port}`);
}); 