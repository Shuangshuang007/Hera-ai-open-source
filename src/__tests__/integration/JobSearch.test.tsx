import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobsPage from '../../app/jobs/page';

// 模拟 fetch 响应
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        jobs: [
          {
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
          }
        ]
      })
  })
);

// 模拟 localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('Job Search Integration', () => {
  beforeEach(() => {
    // 设置用户配置
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'userProfile') {
        return JSON.stringify({
          jobTitle: ['Software Engineer'],
          city: 'Melbourne',
          skills: ['React', 'TypeScript'],
          seniority: 'Mid-level',
          openForRelocation: 'no'
        });
      }
      return null;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads and displays jobs based on user profile', async () => {
    render(<JobsPage />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    // 验证职位卡片信息
    expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    expect(screen.getByText('Melbourne')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('handles job selection and batch operations', async () => {
    render(<JobsPage />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    // 选择职位
    const checkbox = screen.getByRole('checkbox');
    await userEvent.click(checkbox);

    // 验证选择状态
    expect(checkbox).toBeChecked();

    // 验证批量操作按钮状态
    const batchApplyButton = screen.getByText(/Apply Selected/);
    expect(batchApplyButton).not.toBeDisabled();
  });

  it('updates job list when search preferences change', async () => {
    render(<JobsPage />);

    // 等待初始加载
    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    // 模拟搜索偏好更新
    const updatePreferences = {
      jobTitle: ['Frontend Developer'],
      city: 'Sydney'
    };

    // 触发偏好更新
    // 注意：这里需要根据实际UI实现来模拟用户操作
    // 这只是一个示例，实际实现可能需要调整
    await userEvent.click(screen.getByText('Update Preferences'));
    
    // 验证 fetch 是否使用新的搜索条件
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('Frontend Developer'),
      expect.any(Object)
    );
  });

  it('handles error states gracefully', async () => {
    // 模拟 API 错误
    global.fetch = jest.fn(() => Promise.reject(new Error('API Error')));

    render(<JobsPage />);

    // 等待错误状态显示
    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });

    // 验证错误提示
    expect(screen.getByText(/Failed to fetch jobs/i)).toBeInTheDocument();
  });
}); 