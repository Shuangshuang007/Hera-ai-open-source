# Hera AI Job Platform

An intelligent job search platform that aggregates and analyzes job listings from multiple sources including LinkedIn, Seek, Jora, and Adzuna.

## Features

- Multi-source job aggregation (LinkedIn, Seek, Jora, Adzuna)
- AI-powered job matching and analysis
- Real-time job search and filtering
- Detailed job insights and summaries
- Location-based job search

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Playwright for web scraping

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Shuangshuang007/heraai-open.git
cd heraai-open
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```
# Add your environment variables here
```

## Usage

1. Start the main application:
```bash
npm run dev
```

2. Start the Seek crawler API (in a separate terminal):
```bash
cd seek-crawler-api
npm install
npm run start
```

The application will be available at http://localhost:3002

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This project is for educational purposes only. Please respect the terms of service of the job platforms being scraped.

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

## Testing

This project uses Jest for minimal unit testing.

To run tests:
```bash
npm test
```

You can add your own tests in the `__tests__` directory.

## Running Minimal Tests

### Test Case 1: Running the Local Development Server
1. Start the development server:
```bash
npm run dev
```
2. Access the main interface:
   - Open http://localhost:3002/profile to view your profile
   - Open http://localhost:3002/jobs to view job listings

### Test Case 2: Testing Job Recommendations
1. Navigate to the chat interface
2. Type "Refresh Jobs" to trigger a job recommendation
3. The system will:
   - Analyze your profile
   - Search for relevant jobs
   - Display matching opportunities

---

# Creator's Note: Why I Built Héra AI

I'm Shuangshuang Wu — founder of Héra AI and a global investor by training.

Across the past decade, I've advised institutional funds, led cross-border M&A, and helped scale platforms across HR, education, and consumer tech. But what compels me now is something far more personal: giving jobseekers the tools they deserve.

I believe the future of jobseeking is conversational.

Héra AI is designed to act as your intelligent co-pilot — one that listens, understands your goals, and brings vivid, relevant opportunities straight to you. No more stale listings. No more blind searches. It answers your questions, refreshes your options in real time, and shows you what truly fits.

It is not a crawler.
It is not a bot.
It is not another automation script lost in a sea of noise.

It is:
- A system that recommends roles through live chat — not keyword filters.
- A system that parses resumes with context — not just fields.
- A system that scores and reasons — not just matches.
- A system that returns agency to the candidate.

I ask that this codebase not be used for scraping or misuse.
I trust that open-source is not only about access — but about intention.
I believe that when both sides of the market are empowered, better matches happen — faster, deeper, and with more meaning.

I come from a background in law and finance. Over the past two months, I've been learning to code from scratch — building this project line by line with Cursor. It's far from perfect, but it comes from a place of belief, urgency, and hope.

I share it now not because it's finished, but because it's a beginning.

Please be kind to its flaws. Feel free to connect, collaborate, or send any feedback — I'd love to hear from you.
- 💼 LinkedIn
- 🐦 Twitter / X
- 📬 Email: shuang@heraai.net.au
