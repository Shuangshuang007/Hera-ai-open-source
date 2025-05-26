import { render, screen, fireEvent } from '@testing-library/react';
import { JobSummaryCard } from '../JobSummaryCard';

const mockJob = {
  id: '1',
  title: 'Software Engineer',
  company: 'Tech Corp',
  location: 'Melbourne',
  description: 'A great job opportunity',
  platform: 'LinkedIn',
  matchScore: 85,
  url: 'https://example.com/job',
  source: 'company',
  requirements: ['React', 'TypeScript'],
  summary: 'Software engineering position',
  detailedSummary: 'Detailed job description',
  matchAnalysis: 'Good match for your skills'
};

const mockUserProfile = {
  jobTitles: ['Software Engineer'],
  skills: ['React', 'TypeScript'],
  city: 'Melbourne',
  seniority: 'Mid-level',
  openToRelocate: false
};

describe('JobSummaryCard', () => {
  it('renders job details correctly', () => {
    render(
      <JobSummaryCard
        job={mockJob}
        language="en"
        isSelected={false}
        onSelect={() => {}}
        onViewDetails={() => {}}
        userProfile={mockUserProfile}
      />
    );

    // 验证基本信息是否正确显示
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    expect(screen.getByText('Melbourne')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('handles selection correctly', () => {
    const onSelect = jest.fn();
    render(
      <JobSummaryCard
        job={mockJob}
        language="en"
        isSelected={false}
        onSelect={onSelect}
        onViewDetails={() => {}}
        userProfile={mockUserProfile}
      />
    );

    // 点击选择框
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onSelect).toHaveBeenCalled();
  });

  it('shows match score indicator', () => {
    render(
      <JobSummaryCard
        job={mockJob}
        language="en"
        isSelected={false}
        onSelect={() => {}}
        onViewDetails={() => {}}
        userProfile={mockUserProfile}
      />
    );

    // 验证匹配分数是否正确显示
    const matchScore = screen.getByText('85');
    expect(matchScore).toBeInTheDocument();
    expect(matchScore.parentElement).toHaveClass('text-green-600'); // 假设高分显示绿色
  });

  it('supports Chinese language', () => {
    render(
      <JobSummaryCard
        job={mockJob}
        language="zh"
        isSelected={false}
        onSelect={() => {}}
        onViewDetails={() => {}}
        userProfile={mockUserProfile}
      />
    );

    // 验证中文界面元素
    expect(screen.getByText('匹配度')).toBeInTheDocument();
  });
}); 