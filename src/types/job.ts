export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  requirements?: string[];
  benefits?: string[];
  jobType?: string;
  experience?: string;
  postedDate?: string;
  platform: string;
  url: string;
  tags?: string[];
  skills?: string[];
  openToRelocate?: boolean;
  matchScore?: number;
  matchAnalysis?: string;
  matchHighlights?: string[];
  summary?: string;
  detailedSummary?: string;
} 