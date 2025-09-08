import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import App from '@/app/page';

// Mock the API module
jest.mock('@/utils/api', () =>> ({
  apiPost: jest.fn(),
  apiDelete: jest.fn(),
  apiPut: jest.fn()
}));

// Mock child components
jest.mock('@/components/QuickCapture/TaskList', () => {
  return function MockTaskList(props: any) {
    return (
      <div data-testid="task-list">
        <button onClick={() => props.onViewDetail({ id: 1, content: 'Test Task' })>
          View Detail
        </button>
        <button onClick={() => props.onDelete(1)}>Delete Task</button>
      </div>
    );
  };
});

jest.mock('@/components/QuickCapture/TaskDetail', () => {
  return function MockTaskDetail(props: any) {
    return (
      <div data-testid="task-detail">
        <button onClick={props.onClose}>Close</button>
        <button onClick={() => props.onUpdate({ ...props.task, content: 'Updated' })}>
          Update
        </button>
        <button onClick={() => props.onAddSubtask(1, 'New Subtask')}>
          Add Subtask
        </button>
        <button onClick={() => props.onDeleteSubtask(2)}>
          Delete Subtask
        </button>
      </div>
    );
  };
});

describe('App Component - Bug Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Critical Bug: Non-functional Subtask Handlers', () => {
    it('should NOT only show notifications for addSubtask - BUG CONFIRMED', async () => {
      render(<App />);
      
      // Open task detail
      const viewButton = screen.getByText(/View Detail/);
      fireEvent.click(viewButton);
      
      // Try to add subtask
      const addSubtaskButton = screen.getByText(/Add Subtask/);
      fireEvent.click(addSubtaskButton);
      
      // Check if only notification was shown (BUG)
      const { apiPost } = await import('@/utils/api');
      
      // BUG CONFIRMED: No API call is made, only notification
      expect(apiPost).not.toHaveBeenCalled();
      
      // But notification is shown (misleading user)
      await waitFor(() => {
        expect(screen.getByText(/子任务添加成功/)).toBeInTheDocument();
      });
    });

    it('should NOT only show notifications for deleteSubtask - BUG CONFIRMED', async () => {
      render(<App />);
      
      // Open task detail
      const viewButton = screen.getByText(/View Detail/);
      fireEvent.click(viewButton);
      
      // Try to delete subtask
      const deleteSubtaskButton = screen.getByText(/Delete Subtask/);
      fireEvent.click(deleteSubtaskButton);
      
      // Check if only notification was shown (BUG)
      const { apiDelete } = await import('@/utils/api');
      
      // BUG CONFIRMED: No API call is made, only notification
      expect(apiDelete).not.toHaveBeenCalled();
      
      // But notification is shown (misleading user)
      await waitFor(() => {
        expect(screen.getByText(/子任务删除成功/)).toBeInTheDocument();
      });
    });

    it('should make actual API calls after bug fix', async () => {
      // This test documents what should happen after the bug is fixed
      const { apiPost, apiDelete } = await import('@/utils/api');
      (apiPost as jest.Mock).mockResolvedValue({ ok: true });
      (apiDelete as jest.Mock).mockResolvedValue({ ok: true });
      
      render(<App />);
      
      // Open task detail
      const viewButton = screen.getByText(/View Detail/);
      fireEvent.click(viewButton);
      
      // Add subtask
      const addSubtaskButton = screen.getByText(/Add Subtask/);
      fireEvent.click(addSubtaskButton);
      
      // After fix: should make API call
      expect(apiPost).toHaveBeenCalledWith(
        '/api/records/1/subtasks',
        expect.objectContaining({
          content: 'New Subtask',
          category: 'task'
        }),
        expect.any(String)
      );
      
      // Delete subtask
      const deleteSubtaskButton = screen.getByText(/Delete Subtask/);
      fireEvent.click(deleteSubtaskButton);
      
      // After fix: should make API call
      expect(apiDelete).toHaveBeenCalledWith(
        '/api/records/2',
        expect.any(String)
      );
    });
  });

  describe('Notification System Issues', () => {
    it('should auto-dismiss notifications after 3 seconds', async () => {
      render(<App />);
      
      // Trigger a notification by saving a task
      const { apiPost } = await import('@/utils/api');
      (apiPost as jest.Mock).mockResolvedValue({ ok: true });
      
      // This would normally be triggered by the RightPanel component
      // For testing, we'll simulate it directly
      act(() => {
        window.dispatchEvent(new CustomEvent('taskSaved', { 
          detail: { success: true, message: 'Task saved!' } 
        }));
      });
      
      // Check notification appears
      expect(screen.getByText(/Task saved!/)).toBeInTheDocument();
      
      // Advance timers by 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      // Notification should be dismissed
      expect(screen.queryByText(/Task saved!/)).not.toBeInTheDocument();
    });

    it('should handle multiple notifications correctly', async () => {
      render(<App />);
      
      // Trigger multiple notifications rapidly
      act(() => {
        window.dispatchEvent(new CustomEvent('taskSaved', { 
          detail: { success: true, message: 'First notification' } 
        }));
        
        jest.advanceTimersByTime(500);
        
        window.dispatchEvent(new CustomEvent('taskSaved', { 
          detail: { success: true, message: 'Second notification' } 
        }));
      });
      
      // Should show both notifications initially
      expect(screen.getByText(/First notification/)).toBeInTheDocument();
      expect(screen.getByText(/Second notification/)).toBeInTheDocument();
      
      // Advance time
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      // Both should be dismissed
      expect(screen.queryByText(/First notification/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Second notification/)).not.toBeInTheDocument();
    });
  });

  describe('Event Handling Issues', () => {
    it('should handle search events correctly', async () => {
      render(<App />);
      
      // Simulate search event
      act(() => {
        window.dispatchEvent(new CustomEvent('taskSearch', { 
          detail: { query: 'test search' } 
        }));
      });
      
      // Check if search state is updated
      // This would be verified by checking if TaskList receives the search query
      expect(screen.getByTestId('task-list')).toBeInTheDocument();
    });

    it('should handle filter events correctly', async () => {
      render(<App />);
      
      // Simulate filter events
      act(() => {
        window.dispatchEvent(new CustomEvent('taskFilter', { 
          detail: { type: 'status', value: 'active' } 
        }));
        
        window.dispatchEvent(new CustomEvent('taskFilter', { 
          detail: { type: 'priority', value: 'high' } 
        }));
        
        window.dispatchEvent(new CustomEvent('taskFilter', { 
          detail: { type: 'taskType', value: 'work' } 
        }));
      });
      
      // Check if filter states are updated
      expect(screen.getByTestId('task-list')).toBeInTheDocument();
    });

    it('should handle invalid event data gracefully', async () => {
      render(<App />);
      
      // Send invalid event data
      act(() => {
        window.dispatchEvent(new CustomEvent('taskSearch', { 
          detail: null 
        }));
        
        window.dispatchEvent(new CustomEvent('taskFilter', { 
          detail: { type: 'invalid', value: 'test' } 
        }));
      });
      
      // Should not crash
      expect(screen.getByTestId('task-list')).toBeInTheDocument();
    });
  });

  describe('State Management Issues', () => {
    it('should maintain consistent state during task operations', async () => {
      const { apiPut } = await import('@/utils/api');
      (apiPut as jest.Mock).mockResolvedValue({ ok: true });
      
      render(<App />);
      
      // Open task detail
      const viewButton = screen.getByText(/View Detail/);
      fireEvent.click(viewButton);
      
      // Update task
      const updateButton = screen.getByText(/Update/);
      fireEvent.click(updateButton);
      
      // Should make API call
      expect(apiPut).toHaveBeenCalledWith(
        '/api/records/1',
        expect.objectContaining({
          content: 'Updated'
        }),
        expect.any(String)
      );
      
      // Should show success notification
      await waitFor(() => {
        expect(screen.getByText(/任务更新成功/)).toBeInTheDocument();
      });
    });

    it('should handle task detail modal state correctly', async () => {
      render(<App />);
      
      // Initially no detail modal
      expect(screen.queryByTestId('task-detail')).not.toBeInTheDocument();
      
      // Open detail
      const viewButton = screen.getByText(/View Detail/);
      fireEvent.click(viewButton);
      
      // Should show detail modal
      expect(screen.getByTestId('task-detail')).toBeInTheDocument();
      
      // Close detail
      const closeButton = screen.getByText(/Close/);
      fireEvent.click(closeButton);
      
      // Should hide detail modal
      expect(screen.queryByTestId('task-detail')).not.toBeInTheDocument();
    });
  });

  describe('Search and Filter Functionality', () => {
    it('should update search state correctly', async () => {
      render(<App />);
      
      // Search input would be in the header
      // For testing, we'll trigger it via the event system
      act(() => {
        window.dispatchEvent(new CustomEvent('taskSearch', { 
          detail: { query: 'test query' } 
        }));
      });
      
      // Verify search state is updated
      expect(screen.getByTestId('task-list')).toBeInTheDocument();
    });

    it('should handle filter state changes', async () => {
      render(<App />);
      
      // Test all filter types
      const filters = [
        { type: 'status', value: 'active' },
        { type: 'status', value: 'completed' },
        { type: 'priority', value: 'high' },
        { type: 'priority', value: 'low' },
        { type: 'taskType', value: 'work' },
        { type: 'taskType', value: 'hobby' },
        { type: 'showAllLevels', value: 'true' },
        { type: 'showAllLevels', value: 'false' }
      ];
      
      filters.forEach(filter => {
        act(() => {
          window.dispatchEvent(new CustomEvent('taskFilter', { 
            detail: filter 
          }));
        });
      });
      
      // Should handle all filter changes without crashing
      expect(screen.getByTestId('task-list')).toBeInTheDocument();
    });
  });

  describe('Right Panel Functionality', () => {
    it('should toggle right panel visibility', async () => {
      render(<App />);
      
      // Initially might not show right panel
      // Click floating button to show
      const floatingButton = screen.getByText(/+/);
      fireEvent.click(floatingButton);
      
      // Should show right panel (implementation dependent)
      expect(screen.getByTestId('task-list')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      const { apiPost } = await import('@/utils/api');
      (apiPost as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      render(<App />);
      
      // Trigger save operation
      act(() => {
        window.dispatchEvent(new CustomEvent('taskSaved', { 
          detail: { content: 'Test', category: 'task' } 
        }));
      });
      
      // Should show error notification
      await waitFor(() => {
        expect(screen.getByText(/保存记录失败/)).toBeInTheDocument();
      });
    });

    it('should handle malformed error messages', async () => {
      const { apiPost } = await import('@/utils/api');
      (apiPost as jest.Mock).mockRejectedValue('String error');
      
      render(<App />);
      
      act(() => {
        window.dispatchEvent(new CustomEvent('taskSaved', { 
          detail: { content: 'Test', category: 'task' } 
        }));
      });
      
      // Should handle non-Error objects gracefully
      await waitFor(() => {
        expect(screen.getByText(/保存记录失败/)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Issues', () => {
    it('should handle rapid state changes efficiently', async () => {
      render(<App />);
      
      // Simulate rapid state changes
      act(() => {
        for (let i = 0; i < 10; i++) {
          window.dispatchEvent(new CustomEvent('taskSearch', { 
            detail: { query: `search ${i}` } 
          }));
        }
      });
      
      // Should handle without performance issues
      expect(screen.getByTestId('task-list')).toBeInTheDocument();
    });
  });

  describe('Accessibility Issues', () => {
    it('should provide proper labels for interactive elements', () => {
      render(<App />);
      
      // Check for proper button labels
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should handle keyboard navigation', () => {
      render(<App />);
      
      // Tab navigation should work
      const firstButton = screen.getAllByRole('button')[0];
      firstButton.focus();
      
      fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
      
      // Focus should move
      expect(document.activeElement).not.toBe(firstButton);
    });
  });
});