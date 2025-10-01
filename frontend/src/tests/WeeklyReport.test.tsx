import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WeeklyReport from '../components/WeeklyReport';
import * as api from '../utils/api';

// Mock API functions
vi.mock('../utils/api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn()
}));

const mockApiGet = vi.mocked(api.apiGet);
const mockApiPost = vi.mocked(api.apiPost);

const mockWeeklyReportData = {
  week_info: {
    start_date: '2024-01-01T00:00:00Z',
    end_date: '2024-01-07T23:59:59Z',
    week_offset: 0,
    is_current_week: true
  },
  task_type_filter: 'all',
  new_tasks: [
    {
      id: 1,
      content: '新增工作任务1',
      priority: 'high',
      status: 'active',
      task_type: 'work',
      created_at: '2024-01-02T10:00:00Z',
      updated_at: '2024-01-02T10:00:00Z',
      subtask_count: 2,
      subtasks: [
        {
          id: 2,
          content: '子任务1',
          priority: 'medium',
          status: 'active',
          task_type: 'work',
          created_at: '2024-01-02T10:30:00Z',
          updated_at: '2024-01-02T10:30:00Z'
        }
      ]
    }
  ],
  completed_tasks: [
    {
      id: 3,
      content: '完成的任务1',
      priority: 'medium',
      status: 'completed',
      task_type: 'work',
      created_at: '2024-01-01T09:00:00Z',
      updated_at: '2024-01-03T15:00:00Z',
      subtask_count: 0
    }
  ],
  status_changed_tasks: [
    {
      id: 4,
      content: '状态变更任务1',
      priority: 'high',
      status: 'paused',
      task_type: 'hobby',
      created_at: '2023-12-28T10:00:00Z',
      updated_at: '2024-01-04T11:00:00Z',
      subtask_count: 0
    }
  ],
  deleted_tasks: [
    {
      id: 5,
      content: '删除的任务1',
      priority: 'low',
      status: 'deleted',
      task_type: 'life',
      created_at: '2024-01-01T08:00:00Z',
      updated_at: '2024-01-05T16:00:00Z',
      subtask_count: 0
    }
  ],
  stagnant_high_priority: [
    {
      task: {
        id: 6,
        content: '停滞的高优任务',
        priority: 'urgent',
        status: 'active',
        task_type: 'work',
        created_at: '2023-12-01T10:00:00Z',
        updated_at: '2023-12-15T10:00:00Z',
        subtask_count: 0
      },
      days_stagnant: 20
    }
  ],
  frequent_changes: [
    {
      id: 7,
      content: '频繁变更的任务',
      priority: 'medium',
      status: 'deleted',
      task_type: 'life',
      created_at: '2024-01-02T09:00:00Z',
      updated_at: '2024-01-02T17:00:00Z',
      subtask_count: 0
    }
  ],
  summary: {
    total_new: 1,
    total_completed: 1,
    total_status_changed: 1,
    total_deleted: 1,
    stagnant_high_priority_count: 1,
    frequent_changes_count: 1
  }
};

describe('WeeklyReport', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    accessToken: 'test-token'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <WeeklyReport {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render loading state initially', async () => {
    // Mock API to return a pending promise
    mockApiGet.mockReturnValue(new Promise(() => {}));

    render(<WeeklyReport {...defaultProps} />);

    expect(screen.getByText('加载周报数据中...')).toBeInTheDocument();
    expect(screen.getByText('周报总结')).toBeInTheDocument();
  });

  it('should fetch and display weekly report data', async () => {
    mockApiGet.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockWeeklyReportData
      })
    } as Response);

    render(<WeeklyReport {...defaultProps} />);

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith(
        '/api/weekly-report?task_type=all&week_offset=0',
        '获取周报数据',
        'test-token'
      );
    });

    // Check if summary statistics are displayed
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument(); // total_new
      expect(screen.getByText('新增任务')).toBeInTheDocument();
      expect(screen.getByText('完成任务')).toBeInTheDocument();
    });
  });

  it('should display error message when API fails', async () => {
    mockApiGet.mockResolvedValue({
      json: () => Promise.resolve({
        success: false,
        error: '获取数据失败'
      })
    } as Response);

    render(<WeeklyReport {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('获取数据失败')).toBeInTheDocument();
    });
  });

  it('should handle network error gracefully', async () => {
    mockApiGet.mockRejectedValue(new Error('Network error'));

    render(<WeeklyReport {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('获取周报数据失败')).toBeInTheDocument();
    });
  });

  it('should change task type filter', async () => {
    mockApiGet.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockWeeklyReportData
      })
    } as Response);

    render(<WeeklyReport {...defaultProps} />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(1);
    });

    // Find and change the task type filter
    const select = screen.getByDisplayValue('全部类型');
    fireEvent.change(select, { target: { value: 'work' } });

    // Should trigger new API call
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith(
        '/api/weekly-report?task_type=work&week_offset=0',
        '获取周报数据',
        'test-token'
      );
    });
  });

  it('should navigate between weeks', async () => {
    mockApiGet.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockWeeklyReportData
      })
    } as Response);

    render(<WeeklyReport {...defaultProps} />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(1);
    });

    // Find and click previous week button
    const prevWeekButton = screen.getAllByRole('button').find(
      button => button.querySelector('svg') // ChevronLeft icon
    );
    
    if (prevWeekButton) {
      fireEvent.click(prevWeekButton);

      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith(
          '/api/weekly-report?task_type=all&week_offset=-1',
          '获取周报数据',
          'test-token'
        );
      });
    }
  });

  it('should switch between tabs', async () => {
    mockApiGet.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockWeeklyReportData
      })
    } as Response);

    render(<WeeklyReport {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('概览')).toBeInTheDocument();
    });

    // Click on details tab
    const detailsTab = screen.getByText('详细');
    fireEvent.click(detailsTab);

    expect(screen.getByText('新增工作任务1')).toBeInTheDocument();
    expect(screen.getByText('完成的任务1')).toBeInTheDocument();
  });

  it('should generate AI analysis', async () => {
    mockApiGet.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockWeeklyReportData
      })
    } as Response);

    mockApiPost.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        ai_analysis: '这是AI分析结果：本周任务执行情况良好...'
      })
    } as Response);

    render(<WeeklyReport {...defaultProps} />);

    // Wait for data to load
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(1);
    });

    // Click on AI analysis tab
    const aiTab = screen.getByText('AI分析');
    fireEvent.click(aiTab);

    // Click generate analysis button
    const generateButton = screen.getByText('生成分析');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        '/api/weekly-report/ai-analysis',
        {
          report_data: mockWeeklyReportData,
          custom_context: ''
        },
        '生成AI分析',
        'test-token'
      );
    });

    await waitFor(() => {
      expect(screen.getByText('这是AI分析结果：本周任务执行情况良好...')).toBeInTheDocument();
    });
  });

  it('should handle AI analysis error', async () => {
    mockApiGet.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockWeeklyReportData
      })
    } as Response);

    mockApiPost.mockResolvedValue({
      json: () => Promise.resolve({
        success: false,
        error: 'AI服务不可用'
      })
    } as Response);

    render(<WeeklyReport {...defaultProps} />);

    // Wait for data to load
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(1);
    });

    // Click on AI analysis tab
    const aiTab = screen.getByText('AI分析');
    fireEvent.click(aiTab);

    // Click generate analysis button
    const generateButton = screen.getByText('生成分析');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('AI服务不可用')).toBeInTheDocument();
    });
  });

  it('should refresh data when refresh button is clicked', async () => {
    mockApiGet.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockWeeklyReportData
      })
    } as Response);

    render(<WeeklyReport {...defaultProps} />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(1);
    });

    // Click refresh button
    const refreshButton = screen.getByText('刷新');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(2);
    });
  });

  it('should close when close button is clicked', () => {
    const onClose = vi.fn();
    
    render(<WeeklyReport {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: '' }); // X button
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should display task priorities and types correctly', async () => {
    mockApiGet.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockWeeklyReportData
      })
    } as Response);

    render(<WeeklyReport {...defaultProps} />);

    // Wait for data to load
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(1);
    });

    // Click on details tab to see task details
    const detailsTab = screen.getByText('详细');
    fireEvent.click(detailsTab);

    await waitFor(() => {
      // Check priority labels
      expect(screen.getByText('高优')).toBeInTheDocument();
      expect(screen.getByText('中优')).toBeInTheDocument();
      
      // Check task type labels
      expect(screen.getByText('工作')).toBeInTheDocument();
      expect(screen.getByText('业余')).toBeInTheDocument();
      expect(screen.getByText('生活')).toBeInTheDocument();
    });
  });

  it('should show stagnant high priority tasks warning', async () => {
    mockApiGet.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockWeeklyReportData
      })
    } as Response);

    render(<WeeklyReport {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('需要关注的问题')).toBeInTheDocument();
      expect(screen.getByText('1 个高优先级任务长期停滞')).toBeInTheDocument();
      expect(screen.getByText('1 个任务频繁变更，可能规划不合理')).toBeInTheDocument();
    });
  });

  it('should handle empty report data', async () => {
    const emptyReportData = {
      ...mockWeeklyReportData,
      new_tasks: [],
      completed_tasks: [],
      status_changed_tasks: [],
      deleted_tasks: [],
      stagnant_high_priority: [],
      frequent_changes: [],
      summary: {
        total_new: 0,
        total_completed: 0,
        total_status_changed: 0,
        total_deleted: 0,
        stagnant_high_priority_count: 0,
        frequent_changes_count: 0
      }
    };

    mockApiGet.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: emptyReportData
      })
    } as Response);

    render(<WeeklyReport {...defaultProps} />);

    // Click on details tab
    await waitFor(() => {
      const detailsTab = screen.getByText('详细');
      fireEvent.click(detailsTab);
    });

    await waitFor(() => {
      expect(screen.getByText('本周没有新增任务')).toBeInTheDocument();
      expect(screen.getByText('本周没有完成任务')).toBeInTheDocument();
      expect(screen.getByText('本周没有任务状态变更')).toBeInTheDocument();
      expect(screen.getByText('本周没有删除任务')).toBeInTheDocument();
    });
  });
});
