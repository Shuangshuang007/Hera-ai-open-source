export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  platform: string;
  description?: string;
  salary?: string;
  postedDate?: string;
  requirements?: string[];
  benefits?: string[];
  summary?: string;
  detailedSummary?: string;
  matchScore?: number;
  matchAnalysis?: string;
  matchHighlights?: string[];
  jobType?: string;
  tags?: string[];
} 