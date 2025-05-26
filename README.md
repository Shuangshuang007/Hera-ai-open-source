# Hera AI Job Search Platform

## Quick Start

1. Clone Repository
```bash
git clone [repository-url]
cd [repository-name]
```

2. Install Dependencies
```bash
npm install
```

3. Configure Environment Variables
Create a `.env.local` file and configure the necessary environment variables (see below for details)

4. Start Services
```bash
# Start main application (port 3002)
npm run dev

# For Australia region only: Start SEEK job crawler service (port 4000)
cd seek-crawler-api
npm install
npm run dev
```

## Dependency Versions

### Core Dependencies

The project uses the following core dependencies:

```json
{
  "dependencies": {
    "next": "15.2.4",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "@langchain/openai": "0.5.7",
    "openai": "4.95.1"
  }
}
```

### SEEK Crawler Dependencies (Australia Region Only)

If you're using this project in Australia, you'll need these additional dependencies to support SEEK job search functionality:

```json
{
  "dependencies": {
    "playwright": "1.52.0",
    "playwright-extra": "4.3.6",
    "playwright-extra-plugin-stealth": "0.0.1"
  }
}
```

Note: Users outside Australia don't need these crawler dependencies as the system will automatically use LinkedIn search only.

## Environment Variables Configuration

Create a `.env.local` file in the root directory with the following variables:

```env
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration
DATABASE_URL=your_database_url_here

# API Configuration
PORT=3002  # Main application port
PORT=4000  # Job crawler service port (in seek-crawler-api directory)

# Other Configuration
NODE_ENV=development  # or production
```

## API Documentation

### Job Crawler Service (localhost:4000)

The job crawler service runs on port 4000 and provides the following endpoints:

1. Get Job Listings
```bash
GET http://localhost:4000/api/seek-jobs
```

Query Parameters:
- `jobTitle`: Job title to search for (default: software-engineer)
- `city`: City name (default: melbourne)
- `limit`: Maximum number of results to return (default: 25)

Example Request:
```bash
curl "http://localhost:4000/api/seek-jobs?jobTitle=Software%20Engineer&city=Sydney&limit=60"
```

Response Format:
```json
{
  "jobs": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "Job Location",
      "description": "Job Description",
      "fullDescription": "Full Job Description",
      "requirements": ["Requirement 1", "Requirement 2"],
      "url": "Job URL",
      "source": "Source",
      "platform": "seek",
      "summary": "AI-generated Job Summary",
      "detailedSummary": "AI-generated Detailed Analysis",
      "matchScore": 85,
      "matchAnalysis": "AI-generated Match Analysis"
    }
  ]
}
```

## Getting Required API Keys

1. OpenAI API Key:
   - Visit [OpenAI Platform](https://platform.openai.com/)
   - Register and log in to your account
   - Create a new API key in the API Keys section
   - Copy the generated key and set it as the `OPENAI_API_KEY` environment variable

2. Database URL:
   - Configure the connection URL based on your database type
   - Example format: `postgresql://username:password@localhost:5432/database_name`

## Important Notes

- Do not commit the `.env.local` file containing actual API keys to version control
- Add `.env.local` to your `.gitignore` file
- Use secure key management practices in production environments
- The main application and job crawler service need to be started separately on different ports (3002 and 4000)

## Verifying Configuration

After configuration, verify that environment variables are loaded correctly:

1. Start the main application:
```bash
npm run dev
```

2. Start the job crawler service (Australia region only):
```bash
cd seek-crawler-api
npm run dev
```

3. Test API endpoints:
```bash
# Test main application
curl http://localhost:3002/api/jobs

# Test job crawler service (Australia region only)
curl http://localhost:4000/api/seek-jobs
```

If you encounter an "Unauthorized" error, verify that your `OPENAI_API_KEY` is configured correctly.

