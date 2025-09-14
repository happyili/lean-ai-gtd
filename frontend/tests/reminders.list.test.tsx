import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import RemindersList from '@/components/Reminders/RemindersList';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/utils/api', () => ({
  apiGet: (...args: any[]) => mockGet(...args),
  apiPost: (...args: any[]) => mockPost(...args),
  apiPut: (...args: any[]) => mockPut(...args),
  apiDelete: (...args: any[]) => mockDelete(...args),
}));

const success = (body: any) => Promise.resolve({ ok: true, json: async () => body } as Response);

describe('RemindersList', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPut.mockReset();
    mockDelete.mockReset();
  });

  it('renders list and supports create/edit/pause', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.startsWith('/api/reminders')) {
        return success({ reminders: [{
          id: 10,
          content: '每日备份',
          frequency: 'daily',
          day_of_week: null,
          remind_time: '09:00',
          status: 'active'
        }], total: 1 });
      }
      return success({});
    });
    mockPost.mockImplementation((url: string, payload: any) => {
      if (url === '/api/reminders') {
        return success({ reminder: { id: 99, status: 'active', ...payload } });
      }
      if (url.endsWith('/pause')) return success({ reminder: { id: 10, content: '每日备份', frequency: 'daily', day_of_week: null, remind_time: '09:00', status: 'paused' } });
      return success({});
    });
    mockPut.mockImplementation((url: string, payload: any) => success({ reminder: { id: 10, status: 'active', ...payload } }));

    render(<RemindersList accessToken={'token'} />);

    // initial item
    await waitFor(() => {
      expect(screen.getByText('每日备份')).toBeInTheDocument();
    });

    // create
    fireEvent.click(screen.getByRole('button', { name: '新建提醒' }));
    const contentInput = screen.getByPlaceholderText('提醒内容');
    fireEvent.change(contentInput, { target: { value: '喝水' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/reminders', expect.anything(), '创建提醒', 'token');
      expect(screen.getByText('喝水')).toBeInTheDocument();
    });

    // edit first item
    const editBtn = screen.getAllByText('编辑')[0];
    fireEvent.click(editBtn);
    // click the first 保存 in the edited row (there are two 保存, one from create form)
    const saveButtons = screen.getAllByText('保存');
    // choose the second one if two exist
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalled();
    });

    // pause second item (id 10)
    const pauseBtn = screen.getAllByRole('button', { name: '暂停' })[0];
    fireEvent.click(pauseBtn);
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/reminders/10/pause', {}, '暂停提醒', 'token');
    });
  });
});
