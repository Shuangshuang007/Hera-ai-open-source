# Seek Crawler API

A lightweight API service that crawls and fetches job listings from Seek.com.au.

## Overview

This service provides a REST API endpoint to fetch job listings from Seek.com.au. It uses Playwright for web crawling and includes job analysis capabilities using OpenAI's GPT model.

## API Endpoints

### Get Job Listings

```http
GET /api/seek-jobs
```

Fetches job listings from Seek.com.au based on the provided parameters.

#### Query Parameters

| Parameter | Type   | Default           | Description                                |
|-----------|--------|-------------------|--------------------------------------------|
| jobTitle  | string | software-engineer | The job title to search for               |
| city      | string | melbourne        | The city to search jobs in                |
| limit     | number | 25               | Maximum number of jobs to return (max: 60) |

#### Example Request

```bash
curl "http://localhost:4000/api/seek-jobs?jobTitle=Software%20Engineer&city=Sydney&limit=60"
```

#### Example Response

```json
{
  "jobs": [
    {
      "title": "Software Engineer",
      "company": "Example Company",
      "location": "Sydney",
      "description": "Short job description...",
      "fullDescription": "Full job description...",
      "requirements": ["Requirement 1", "Requirement 2"],
      "url": "https://www.seek.com.au/job/...",
      "source": "company",
      "platform": "seek",
      "summary": "Brief job summary",
      "detailedSummary": "Detailed job description",
      "matchScore": 85,
      "matchAnalysis": "Job match analysis..."
    }
  ]
}
```

#### Error Response

```json
{
  "error": "Error message",
  "stack": "Stack trace (only in development mode)"
}
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory with:
```env
OPENAI_API_KEY=your_openai_api_key
```

3. Start the server:
```bash
npm start
```

The server will start on port 4000 by default.

## Environment Variables

| Variable        | Description                                      | Required |
|----------------|--------------------------------------------------|----------|
| OPENAI_API_KEY | API key for OpenAI (used for job analysis)       | Yes      |
| NODE_ENV       | Environment mode ('development' or 'production')  | No       |

## Features

- Real-time job crawling from Seek.com.au
- Intelligent job analysis using GPT-3.5
- CORS enabled for cross-origin requests
- Error handling and logging
- Rate limiting and request throttling
- Development/Production environment support

## Limitations

- Maximum of 60 jobs per request
- Rate limiting may apply
- Some job details may be unavailable if the listing has expired
- GPT analysis may occasionally fail, falling back to basic job information 