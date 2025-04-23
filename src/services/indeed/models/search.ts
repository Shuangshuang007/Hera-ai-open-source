export interface SearchParams {
  keywords: string;
  location: string;
  radius: number;
  jobType?: string[];
  experience?: string[];
  salary?: string;
  sort?: 'date' | 'relevance';
  fromAge?: number; // 职位发布时间（天数）
} 