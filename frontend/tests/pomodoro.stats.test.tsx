import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import PomodoroManager from '@/components/PomodoroManager';

// Mock API module used by PomodoroManager
vi.mock('@/utils/api', () => {
  return {
    apiGet: vi.fn((url: string) => {
      // Return empty tasks for tasks endpoint
      if (url.includes('/api/pomodoro/tasks')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: { tasks: [], count: 0 } }),
        } as Response);
      }
      // Return fake stats for stats endpoint
      if (url.includes('/api/pomodoro/stats')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              total_stats: {
                total_tasks: 0,
                completed_tasks: 0,
                active_tasks: 0,
                pending_tasks: 0,
                skipped_tasks: 0,
                total_pomodoros: 0,
                total_focus_time: 0,
                completion_rate: 0,
              },
              today_stats: {
                today_completed_tasks: 1,
                today_pomodoros: 2,
                today_focus_time: 50,
                today_focus_hours: 0.8,
              },
            },
          }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => ({ success: true }) } as Response);
    }),
    apiPost: vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ success: true }) } as Response)),
  };
});

describe('PomodoroManager stats toggle', () => {
  it('shows loading and renders stats when toggled on', async () => {
    render(<PomodoroManager accessToken={'token'} />);

    // Click 统计 button
    fireEvent.click(screen.getByRole('button', { name: /统计/i }));

    // Loading indicator
    expect(screen.getByText('加载统计中...')).toBeInTheDocument();

    // Stats numbers appear
    await waitFor(() => {
      expect(screen.getByText('今日番茄钟')).toBeInTheDocument();
      expect(screen.getByText('今日完成任务')).toBeInTheDocument();
      expect(screen.getByText('今日专注时间')).toBeInTheDocument();
      expect(screen.getByText('完成率')).toBeInTheDocument();
    });
  });

  it('renders reset button for non-pending tasks', async () => {
    // Override mock for tasks to include a completed task
    const { apiGet } = await import('@/utils/api');
    (apiGet as any).mockImplementation((url: string) => {
      if (url.includes('/api/pomodoro/tasks')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: { tasks: [
            {
              id: 1,
              title: 'Test task',
              description: '',
              related_task_ids: '[]',
              priority_score: 50,
              estimated_pomodoros: 2,
              order_index: 1,
              status: 'completed',
              started_at: null,
              completed_at: null,
              pomodoros_completed: 2,
              total_focus_time: 50,
              ai_reasoning: '',
              created_at: ''
            }
          ], count: 1 } })
        } as Response);
      }
      if (url.includes('/api/pomodoro/stats')) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { total_stats: {}, today_stats: {} } }) } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => ({ success: true }) } as Response);
    });

    render(<PomodoroManager accessToken={'token'} />);

    // Wait a tick for tasks to load
    await waitFor(() => {
      expect(screen.getAllByText(/Test task/).length).toBeGreaterThan(0);
    });

    // Reset buttons should appear (compact cards)
    expect(screen.getAllByTitle('重置为未开始').length).toBeGreaterThan(0);
  });
});
