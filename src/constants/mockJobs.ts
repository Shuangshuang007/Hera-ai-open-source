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

export const mockJobs: Job[] = [
  {
    id: '1',
    title: 'Software Engineer',
    company: 'Tech Solutions Inc.',
    location: 'Melbourne',
    salary: '$80,000 - $120,000',
    description: 'We are looking for a talented Software Engineer to join our team. You will be responsible for developing and maintaining our core products.',
    requirements: [
      '3+ years of experience in software development',
      'Strong knowledge of React and TypeScript',
      'Experience with cloud platforms (AWS/Azure)',
      'Excellent problem-solving skills'
    ],
    postedDate: '2024-03-15',
    jobType: 'Full-time',
    experience: 'Mid-level',
    url: 'https://example.com/job1',
    platform: 'LinkedIn',
    benefits: ['Health insurance', 'Remote work options', '401k matching'],
    tags: ['React', 'TypeScript', 'AWS']
  },
  {
    id: '2',
    title: 'Senior Software Engineer',
    company: 'Digital Innovations Pty Ltd',
    location: 'Sydney',
    salary: '$120,000 - $160,000',
    description: 'Join our team as a Senior Software Engineer and help us build the next generation of digital solutions.',
    requirements: [
      '5+ years of experience in software development',
      'Expert in React and Node.js',
      'Experience with microservices architecture',
      'Strong leadership skills'
    ],
    postedDate: '2024-03-14',
    jobType: 'Full-time',
    experience: 'Senior',
    url: 'https://example.com/job2',
    platform: 'Seek',
    benefits: ['Flexible hours', 'Learning budget', 'Stock options'],
    tags: ['React', 'Node.js', 'Microservices']
  },
  {
    id: '3',
    title: 'Frontend Developer',
    company: 'Web Solutions Co.',
    location: 'Melbourne',
    salary: '$70,000 - $100,000',
    description: 'We are seeking a Frontend Developer to create beautiful and responsive web applications.',
    requirements: [
      '2+ years of frontend development experience',
      'Proficient in React and modern CSS',
      'Experience with responsive design',
      'Good understanding of UX principles'
    ],
    postedDate: '2024-03-13',
    jobType: 'Full-time',
    experience: 'Junior',
    url: 'https://example.com/job3',
    platform: 'Glassdoor'
  },
  {
    id: '4',
    title: 'Full Stack Developer',
    company: 'Innovation Tech',
    location: 'Sydney',
    salary: '$90,000 - $130,000',
    description: 'Looking for a Full Stack Developer to join our growing team and work on exciting projects.',
    requirements: [
      '4+ years of full stack development experience',
      'Strong knowledge of React and Node.js',
      'Experience with databases and APIs',
      'Good understanding of DevOps practices'
    ],
    postedDate: '2024-03-12',
    jobType: 'Full-time',
    experience: 'Mid-level',
    url: 'https://example.com/job4',
    platform: 'Dice'
  },
  {
    id: '5',
    title: 'React Developer',
    company: 'Future Tech Solutions',
    location: 'Melbourne',
    salary: '$85,000 - $115,000',
    description: 'Join our dynamic team as a React Developer and help build modern web applications.',
    requirements: [
      '3+ years of React experience',
      'Strong TypeScript skills',
      'Experience with state management (Redux/MobX)',
      'Knowledge of modern frontend tools'
    ],
    postedDate: '2024-03-11',
    jobType: 'Full-time',
    experience: 'Mid-level',
    url: 'https://example.com/job5',
    platform: 'Monster'
  },
  {
    id: '6',
    title: 'Frontend Engineer',
    company: 'Creative Digital',
    location: 'Sydney',
    salary: '$95,000 - $125,000',
    description: 'We are looking for a Frontend Engineer to join our product team and create exceptional user experiences.',
    requirements: [
      '4+ years of frontend development',
      'Expert in React and modern JavaScript',
      'Experience with performance optimization',
      'Strong UI/UX sensibilities'
    ],
    postedDate: '2024-03-10',
    jobType: 'Full-time',
    experience: 'Mid-level',
    url: 'https://example.com/job6',
    platform: 'CareerBuilder'
  },
  {
    id: '7',
    title: 'Senior Frontend Developer',
    company: 'Tech Innovators',
    location: 'Melbourne',
    salary: '$110,000 - $150,000',
    description: 'Looking for a Senior Frontend Developer to lead our frontend team and mentor junior developers.',
    requirements: [
      '6+ years of frontend development',
      'Strong leadership skills',
      'Experience with modern frontend architectures',
      'History of mentoring developers'
    ],
    postedDate: '2024-03-09',
    jobType: 'Full-time',
    experience: 'Senior',
    url: 'https://example.com/job7',
    platform: 'ZipRecruiter'
  },
  {
    id: '8',
    title: 'JavaScript Developer',
    company: 'Software Solutions Ltd',
    location: 'Sydney',
    salary: '$75,000 - $105,000',
    description: 'Join us as a JavaScript Developer and work on cutting-edge web applications.',
    requirements: [
      '2+ years of JavaScript development',
      'Experience with React or Vue.js',
      'Knowledge of modern build tools',
      'Good communication skills'
    ],
    postedDate: '2024-03-08',
    jobType: 'Full-time',
    experience: 'Mid-level',
    url: 'https://example.com/job8',
    platform: 'Glassdoor'
  },
  {
    id: '9',
    title: 'UI Developer',
    company: 'Design Tech Co',
    location: 'Melbourne',
    salary: '$70,000 - $95,000',
    description: 'We are seeking a UI Developer to create beautiful and intuitive user interfaces.',
    requirements: [
      '2+ years of UI development',
      'Strong HTML/CSS skills',
      'Experience with React',
      'Eye for design and detail'
    ],
    postedDate: '2024-03-07',
    jobType: 'Full-time',
    experience: 'Junior',
    url: 'https://example.com/job9',
    platform: 'Indeed'
  },
  {
    id: '10',
    title: 'Frontend Architect',
    company: 'Enterprise Solutions',
    location: 'Sydney',
    salary: '$130,000 - $180,000',
    description: 'Looking for a Frontend Architect to design and implement scalable frontend architectures.',
    requirements: [
      '8+ years of frontend development',
      'Experience with large-scale applications',
      'Strong system design skills',
      'Team leadership experience'
    ],
    postedDate: '2024-03-06',
    jobType: 'Full-time',
    experience: 'Senior',
    url: 'https://example.com/job10',
    platform: 'Dice'
  }
]; 