const express = require('express');
const { fetchSeekJobs } = require('./seekCrawler');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from root .env.local file
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.get('/api/seek-jobs', async (req, res) => {
  console.log('Received request with params:', req.query);
  const { jobTitle = 'software-engineer', city = 'melbourne', limit = 25 } = req.query;
  
  try {
    console.log(`Fetching jobs for: ${jobTitle} in ${city} with limit ${limit}`);
    const jobs = await fetchSeekJobs(jobTitle, city, parseInt(limit));
    console.log(`Successfully fetched ${jobs.length} jobs`);
    res.json({ jobs });
  } catch (e) {
    console.error('Error fetching jobs:', e);
    res.status(500).json({ 
      error: e.message,
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    });
  }
});

// Add error handling middleware
app.use((err, req, res, next) => {
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.listen(port, () => {
  console.log(`SEEK Crawler API Service Started: http://localhost:${port}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
}); 