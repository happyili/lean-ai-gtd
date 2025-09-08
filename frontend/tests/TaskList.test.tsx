import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import TaskList from '@/components/QuickCapture/TaskList';

// Mock the API module
jest.mock('@/utils/api', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiPut: jest.fn(),
  apiDelete: jest.fn(),
  buildUrl: jest.fn(),
  handleApiError: jest.fn()
}));

describe('TaskList Component - Bug Tests', () => {
  const mockProps = {
    onViewDetail: jest.fn(),
    onDelete: jest.fn(),
    onSearch: jest.fn(),
    onSave: jest.fn(),
    showNotification: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Memory Leak Issues', () => {
    it('should cleanup timeouts on unmount', async () => {
      const { unmount } = render(<TaskList {...mockProps} />);
      
      // Simulate typing in progress notes
      const textarea = screen.getByPlaceholderText(/记录当前进展/);
      fireEvent.change(textarea, { target: { value: 'Test progress' } });
      
      // Unmount before timeout executes
      unmount();
      
      // Wait for potential timeout
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 11000));
      });
      
      // Verify no API calls were made after unmount
      const { apiPut } = await import('@/utils/api');
      expect(apiPut).not.toHaveBeenCalled();
    });

    it('should clear previous timeouts when typing rapidly', async () => {
      render(<TaskList {...mockProps} />);
      
      const textarea = screen.getByPlaceholderText(/记录当前进展/);
      
      // Type multiple times rapidly
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'Test 1' } });
        await new Promise(resolve => setTimeout(resolve, 100));
        fireEvent.change(textarea, { target: { value: 'Test 2' } });
        await new Promise(resolve => setTimeout(resolve, 100));
        fireEvent.change(textarea, { target: { value: 'Test 3' } });
      });
      
      // Wait for auto-save timeout
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 11000));
      });
      
      // Should only save once (the last value)
      const { apiPut } = await import('@/utils/api');
      expect(apiPut).toHaveBeenCalledTimes(1);
      expect(apiPut).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ progress_notes: 'Test 3' }),
        expect.any(String)
      );
    });
  });

  describe('Race Conditions', () => {
    it('should handle component unmount during search', async () => {
      const { unmount } = render(<TaskList {...mockProps} />);
      
      // Simulate search
      const searchInput = screen.getByPlaceholderText(/搜索任务/);
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'test search' } });
        // Unmount before debounce completes
        setTimeout(() => unmount(), 200);
        await new Promise(resolve => setTimeout(resolve, 500));
      });
      
      // Verify no errors occur
      expect(mockProps.showNotification).not.toHaveBeenCalledWith(
        expect.stringContaining('失败'),
        'error'
      );
    });

    it('should handle rapid filter changes', async () => {
      render(<TaskList {...mockProps} />);
      
      // Simulate rapid filter changes
      await act(async () => {
        // Change status filter
        fireEvent.change(screen.getByDisplayValue(/所有状态/), { 
          target: { value: 'active' } 
        });
        
        // Change priority filter before debounce completes
        await new Promise(resolve => setTimeout(resolve, 100));
        fireEvent.change(screen.getByDisplayValue(/所有优先级/), { 
          target: { value: 'high' } 
        });
        
        // Change task type filter
        await new Promise(resolve => setTimeout(resolve, 100));
        fireEvent.change(screen.getByDisplayValue(/所有类型/), { 
          target: { value: 'work' } 
        });
        
        // Wait for final debounce
        await new Promise(resolve => setTimeout(resolve, 500));
      });
      
      // Should only fetch once with final values
      const { buildUrl } = await import('@/utils/api');
      expect(buildUrl).toHaveBeenCalledWith(
        '/api/records',
        expect.objectContaining({
          status: 'active',
          priority: 'high',
          task_type: 'work'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API import failures gracefully', async () => {
      // Mock dynamic import failure
      jest.doMock('@/utils/api', () => {
        throw new Error('Module not found');
      });
      
      render(<TaskList {...mockProps} />);
      
      // Try to update task priority
      const priorityButton = screen.getByText(/中/);
      fireEvent.click(priorityButton);
      
      const highPriority = screen.getByText(/高/);
      fireEvent.click(highPriority);
      
      await waitFor(() => {
        expect(mockProps.showNotification).toHaveBeenCalledWith(
          expect.stringContaining('失败'),
          'error'
        );
      });
    });

    it('should handle undefined task properties', async () => {
      const mockTask = {
        id: 1,
        content: 'Test task',
        priority: undefined,
        status: undefined,
        task_type: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Mock API response with undefined values
      const { buildUrl, handleApiError } = await import('@/utils/api');
      (buildUrl as jest.Mock).mockReturnValue('/api/test');
      (handleApiError as jest.Mock).mockResolvedValue({
        json: async () => ({ records: [mockTask] })
      });
      
      render(<TaskList {...mockProps} />);
      
      // Should not crash when displaying task with undefined properties
      await waitFor(() => {
        expect(screen.getByText('Test task')).toBeInTheDocument();
      });
      
      // Should show default labels
      expect(screen.getByText(/中/)).toBeInTheDocument(); // Default priority
      expect(screen.getByText(/工作/)).toBeInTheDocument(); // Default task type
    });
  });

  describe('Dropdown Management', () => {
    it('should close dropdowns when clicking outside', async () => {
      render(<TaskList {...mockProps} />);
      
      // Open status dropdown
      const statusButton = screen.getByText(/进行中/);
      fireEvent.click(statusButton);
      
      // Click outside
      fireEvent.click(document.body);
      
      // Dropdown should be closed (no dropdown options visible)
      expect(screen.queryByText(/已完成/)).not.toBeInTheDocument();
    });

    it('should handle multiple dropdown interactions', async () => {
      render(<TaskList {...mockProps} />);
      
      // Open priority dropdown
      const priorityButton = screen.getByText(/中/);
      fireEvent.click(priorityButton);
      
      // Try to open status dropdown while priority is open
      const statusButton = screen.getByText(/进行中/);
      fireEvent.click(statusButton);
      
      // Both dropdowns might be open (current bug)
      // This test documents the current behavior
      expect(screen.getByText(/高/)).toBeInTheDocument();
      expect(screen.getByText(/已完成/)).toBeInTheDocument();
    });
  });

  describe('Progress Notes Functionality', () => {
    it('should support Chinese input handling', async () => {
      render(<TaskList {...mockProps} />);
      
      const textarea = screen.getByPlaceholderText(/记录当前进展/);
      
      // Simulate Chinese input composition
      fireEvent.compositionStart(textarea);
      fireEvent.change(textarea, { target: { value: '测试' } });
      fireEvent.compositionEnd(textarea);
      
      // Should handle Chinese input without triggering premature save
      const { apiPut } = await import('@/utils/api');
      expect(apiPut).not.toHaveBeenCalled();
      
      // Should save after timeout
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 11000));
      });
      
      expect(apiPut).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ progress_notes: '测试' }),
        expect.any(String)
      );
    });

    it('should support undo functionality', async () => {
      render(<TaskList {...mockProps} />);
      
      const textarea = screen.getByPlaceholderText(/记录当前进展/);
      
      // Type initial content
      fireEvent.change(textarea, { target: { value: 'Initial content' } });
      
      // Type new content
      fireEvent.change(textarea, { target: { value: 'New content' } });
      
      // Trigger undo (Ctrl+Z)
      fireEvent.keyDown(textarea, { key: 'z', ctrlKey: true });
      
      // Should revert to previous content
      expect(textarea).toHaveValue('Initial content');
    });
  });

  describe('Task State Management', () => {
    it('should handle task deletion while expanded', async () => {
      const mockTask = {
        id: 1,
        content: 'Test task',
        priority: 'medium',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { buildUrl, handleApiError } = await import('@/utils/api');
      (buildUrl as jest.Mock).mockReturnValue('/api/test');
      (handleApiError as jest.Mock).mockResolvedValue({
        json: async () => ({ records: [mockTask] })
      });
      
      render(<TaskList {...mockProps} />);
      
      // Expand task
      await waitFor(() => {
        fireEvent.click(screen.getByText('Test task'));
      });
      
      // Delete the task
      const deleteButton = screen.getByTitle(/删除任务/);
      fireEvent.click(deleteButton);
      
      // Confirm deletion
      const confirmButton = screen.getByText(/确认/);
      fireEvent.click(confirmButton);
      
      // Should not crash and expanded state should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Test task')).not.toBeInTheDocument();
      });
    });
  });
});

describe('Performance Issues', () => {
  it('should handle large task lists efficiently', async () => {
    // Create 100 mock tasks
    const largeTaskList = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      content: `Task ${i + 1}`,
      priority: 'medium',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const { buildUrl, handleApiError } = await import('@/utils/api');
    (buildUrl as jest.Mock).mockReturnValue('/api/test');
    (handleApiError as jest.Mock).mockResolvedValue({
      json: async () => ({ records: largeTaskList })
    });
    
    const startTime = performance.now();
    render(<TaskList {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Task \d+/)).toHaveLength(100);
    });
    
    const renderTime = performance.now() - startTime;
    expect(renderTime).toBeLessThan(1000); // Should render in less than 1 second
  });
});

describe('Accessibility Issues', () => {
  it('should provide proper ARIA labels for interactive elements', () => {
    render(<TaskList {...mockProps} />);
    
    // Check for proper button labels
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
    });
  });

  it('should handle keyboard navigation', () => {
    render(<TaskList {...mockProps} />);
    
    // Tab through interactive elements
    const firstFocusable = screen.getByRole('button');
    firstFocusable.focus();
    
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    
    // Should move focus to next element
    expect(document.activeElement).not.toBe(firstFocusable);
  });
});