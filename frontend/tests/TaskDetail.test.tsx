import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import TaskDetail from '@/components/QuickCapture/TaskDetail';

// Mock the API module
jest.mock('@/utils/api', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiPut: jest.fn(),
  apiDelete: jest.fn()
}));

describe('TaskDetail Component - Bug Tests', () => {
  const mockProps = {
    task: {
      id: 1,
      content: 'Test Task',
      category: 'task',
      priority: 'medium',
      status: 'active',
      task_type: 'work',
      progress_notes: 'Initial progress',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      subtasks: []
    },
    onClose: jest.fn(),
    onUpdate: jest.fn(),
    onAddSubtask: jest.fn(),
    onDeleteSubtask: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.alert
    global.alert = jest.fn();
  });

  describe('Error Handling Issues', () => {
    it('should not use alert() for error messages', async () => {
      // Mock API failure
      const { apiGet } = await import('@/utils/api');
      (apiGet as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      render(<TaskDetail {...mockProps} />);
      
      await waitFor(() => {
        expect(global.alert).not.toHaveBeenCalled();
      });
      
      // Should show error in UI instead of alert
      expect(screen.queryByRole('alert')).toBeInTheDocument();
    });

    it('should handle API failures gracefully', async () => {
      const { apiGet } = await import('@/utils/api');
      (apiGet as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      render(<TaskDetail {...mockProps} />);
      
      await waitFor(() => {
        // Should show user-friendly error message
        expect(screen.getByText(/获取子任务失败/)).toBeInTheDocument();
      });
    });

    it('should handle network timeouts', async () => {
      const { apiGet } = await import('@/utils/api');
      (apiGet as jest.Mock).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );
      
      render(<TaskDetail {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/网络连接失败/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Subtask Management Issues', () => {
    it('should validate subtask input before adding', async () => {
      render(<TaskDetail {...mockProps} />);
      
      // Try to add empty subtask
      const addButton = screen.getByText(/添加子任务/);
      fireEvent.click(addButton);
      
      const { apiPost } = await import('@/utils/api');
      expect(apiPost).not.toHaveBeenCalled();
    });

    it('should handle subtask addition failure', async () => {
      const { apiPost } = await import('@/utils/api');
      (apiPost as jest.Mock).mockRejectedValue(new Error('Server error'));
      
      render(<TaskDetail {...mockProps} />);
      
      // Add subtask input
      const input = screen.getByPlaceholderText(/添加新的子任务/);
      fireEvent.change(input, { target: { value: 'New subtask' } });
      
      // Try to add subtask
      const addButton = screen.getByText(/添加子任务/);
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText(/添加子任务失败/)).toBeInTheDocument();
      });
    });

    it('should handle subtask status updates correctly', async () => {
      const mockSubtask = {
        id: 2,
        content: 'Test Subtask',
        status: 'active',
        priority: 'medium',
        created_at: '2024-01-01T10:00:00Z'
      };
      
      const { apiGet } = await import('@/utils/api');
      (apiGet as jest.Mock).mockResolvedValue({
        json: async () => ({ subtasks: [mockSubtask] })
      });
      
      render(<TaskDetail {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Subtask')).toBeInTheDocument();
      });
      
      // Toggle status
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      
      const { apiPut } = await import('@/utils/api');
      await waitFor(() => {
        expect(apiPut).toHaveBeenCalledWith(
          '/api/records/2',
          { status: 'completed' },
          expect.any(String)
        );
      });
    });
  });

  describe('Form Validation Issues', () => {
    it('should validate task content before saving', async () => {
      render(<TaskDetail {...mockProps} />);
      
      // Enter edit mode
      const editButton = screen.getByText(/编辑任务/);
      fireEvent.click(editButton);
      
      // Clear content
      const textarea = screen.getByDisplayValue('Test Task');
      fireEvent.change(textarea, { target: { value: '' } });
      
      // Try to save
      const saveButton = screen.getByText(/保存/);
      fireEvent.click(saveButton);
      
      // Should not save empty content
      expect(mockProps.onUpdate).not.toHaveBeenCalled();
    });

    it('should handle form state reset on cancel', async () => {
      render(<TaskDetail {...mockProps} />);
      
      // Enter edit mode
      const editButton = screen.getByText(/编辑任务/);
      fireEvent.click(editButton);
      
      // Change content
      const textarea = screen.getByDisplayValue('Test Task');
      fireEvent.change(textarea, { target: { value: 'Modified Task' } });
      
      // Cancel
      const cancelButton = screen.getByText(/取消/);
      fireEvent.click(cancelButton);
      
      // Re-enter edit mode
      fireEvent.click(screen.getByText(/编辑任务/));
      
      // Should show original content
      expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument();
    });
  });

  describe('Sorting and Filtering Issues', () => {
    it('should sort subtasks by priority correctly', async () => {
      const mockSubtasks = [
        {
          id: 2,
          content: 'Low Priority',
          priority: 'low',
          status: 'active',
          created_at: '2024-01-01T10:00:00Z'
        },
        {
          id: 3,
          content: 'High Priority',
          priority: 'high',
          status: 'active',
          created_at: '2024-01-01T09:00:00Z'
        },
        {
          id: 4,
          content: 'Urgent Priority',
          priority: 'urgent',
          status: 'active',
          created_at: '2024-01-01T08:00:00Z'
        }
      ];
      
      const { apiGet } = await import('@/utils/api');
      (apiGet as jest.Mock).mockResolvedValue({
        json: async () => ({ subtasks: mockSubtasks })
      });
      
      render(<TaskDetail {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Low Priority')).toBeInTheDocument();
      });
      
      // Change sort order
      const sortSelect = screen.getByDisplayValue(/按优先级排序/);
      fireEvent.change(sortSelect, { target: { value: 'created' } });
      
      // Should reorder tasks
      const tasks = screen.getAllByText(/Priority/);
      expect(tasks[0]).toHaveTextContent('Low Priority'); // Most recent
    });

    it('should filter subtasks by status correctly', async () => {
      const mockSubtasks = [
        {
          id: 2,
          content: 'Active Task',
          priority: 'medium',
          status: 'active',
          created_at: '2024-01-01T10:00:00Z'
        },
        {
          id: 3,
          content: 'Completed Task',
          priority: 'medium',
          status: 'completed',
          created_at: '2024-01-01T10:00:00Z'
        }
      ];
      
      const { apiGet } = await import('@/utils/api');
      (apiGet as jest.Mock).mockResolvedValue({
        json: async () => ({ subtasks: mockSubtasks })
      });
      
      render(<TaskDetail {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Active Task')).toBeInTheDocument();
        expect(screen.getByText('Completed Task')).toBeInTheDocument();
      });
      
      // Filter to show only active tasks
      const filterSelect = screen.getByDisplayValue(/全部状态/);
      fireEvent.change(filterSelect, { target: { value: 'active' } });
      
      expect(screen.getByText('Active Task')).toBeInTheDocument();
      expect(screen.queryByText('Completed Task')).not.toBeInTheDocument();
    });
  });

  describe('Data Loading Issues', () => {
    it('should handle empty subtask list', async () => {
      const { apiGet } = await import('@/utils/api');
      (apiGet as jest.Mock).mockResolvedValue({
        json: async () => ({ subtasks: [] })
      });
      
      render(<TaskDetail {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/暂无子任务/)).toBeInTheDocument();
      });
    });

    it('should handle malformed API responses', async () => {
      const { apiGet } = await import('@/utils/api');
      (apiGet as jest.Mock).mockResolvedValue({
        json: async () => ({}) // Missing subtasks property
      });
      
      render(<TaskDetail {...mockProps} />);
      
      await waitFor(() => {
        // Should handle gracefully without crashing
        expect(screen.getByText(/暂无子任务/)).toBeInTheDocument();
      });
    });

    it('should update when task prop changes', async () => {
      const { apiGet } = await import('@/utils/api');
      (apiGet as jest.Mock).mockResolvedValue({
        json: async () => ({ subtasks: [] })
      });
      
      const { rerender } = render(<TaskDetail {...mockProps} />);
      
      // Verify initial API call
      expect(apiGet).toHaveBeenCalledWith(
        '/api/records/1/subtasks',
        expect.any(String)
      );
      
      // Change task prop
      const newTask = {
        ...mockProps.task,
        id: 2,
        content: 'New Task'
      };
      
      rerender(<TaskDetail {...mockProps} task={newTask} />);
      
      // Should fetch subtasks for new task
      await waitFor(() => {
        expect(apiGet).toHaveBeenCalledWith(
          '/api/records/2/subtasks',
          expect.any(String)
        );
      });
    });
  });

  describe('Performance Issues', () => {
    it('should handle large number of subtasks efficiently', async () => {
      const largeSubtaskList = Array.from({ length: 100 }, (_, i) => ({
        id: i + 2,
        content: `Subtask ${i + 1}`,
        priority: 'medium',
        status: 'active',
        created_at: new Date().toISOString()
      }));
      
      const { apiGet } = await import('@/utils/api');
      (apiGet as jest.Mock).mockResolvedValue({
        json: async () => ({ subtasks: largeSubtaskList })
      });
      
      const startTime = performance.now();
      render(<TaskDetail {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getAllByText(/Subtask \d+/)).toHaveLength(100);
      });
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(2000); // Should render in less than 2 seconds
    });
  });

  describe('Accessibility Issues', () => {
    it('should provide proper labels for form controls', () => {
      render(<TaskDetail {...mockProps} />);
      
      // Check form controls have labels
      const textarea = screen.getByPlaceholderText(/添加新的子任务/);
      expect(textarea).toHaveAttribute('aria-label');
      
      const selects = screen.getAllByRole('combobox');
      selects.forEach(select => {
        expect(select).toHaveAttribute('aria-label');
      });
    });

    it('should handle keyboard navigation in forms', () => {
      render(<TaskDetail {...mockProps} />);
      
      // Tab through form elements
      const input = screen.getByPlaceholderText(/添加新的子任务/);
      input.focus();
      
      fireEvent.keyDown(input, { key: 'Enter' });
      
      // Should not submit empty form
      const { apiPost } = await import('@/utils/api');
      expect(apiPost).not.toHaveBeenCalled();
    });
  });

  describe('State Consistency Issues', () => {
    it('should maintain consistency between local and parent state', async () => {
      const mockSubtask = {
        id: 2,
        content: 'Test Subtask',
        priority: 'medium',
        status: 'active',
        created_at: '2024-01-01T10:00:00Z'
      };
      
      const { apiGet, apiDelete } = await import('@/utils/api');
      (apiGet as jest.Mock).mockResolvedValue({
        json: async () => ({ subtasks: [mockSubtask] })
      });
      (apiDelete as jest.Mock).mockResolvedValue({ ok: true });
      
      render(<TaskDetail {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Subtask')).toBeInTheDocument();
      });
      
      // Delete subtask
      const deleteButton = screen.getByText(/删除/);
      fireEvent.click(deleteButton);
      
      // Should call both local update and parent callback
      await waitFor(() => {
        expect(apiDelete).toHaveBeenCalledWith('/api/records/2', expect.any(String));
        expect(mockProps.onDeleteSubtask).toHaveBeenCalledWith(2);
      });
    });
  });
});