import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import ReminderBanner from '@/components/Reminders/ReminderBanner';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/utils/api', () => ({
  apiGet: (...args: any[]) => mockGet(...args),
  apiPost: (...args: any[]) => mockPost(...args),
}));

const success = (body: any) => Promise.resolve({ ok: true, json: async () => body } as Response);

describe('ReminderBanner', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('shows due reminders and acknowledges', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/api/reminders/due')) {
        return success({ reminders: [{ id: 1, content: '喝水提醒' }], count: 1 });
      }
      return success({});
    });
    mockPost.mockImplementation(() => success({ success: true }));

    render(<ReminderBanner accessToken={'token'} />);

    await waitFor(() => {
      expect(screen.getByText('喝水提醒')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '知道了' }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/reminders/1/acknowledge', {}, '确认提醒', 'token');
      expect(screen.queryByText('喝水提醒')).not.toBeInTheDocument();
    });
  });
});

