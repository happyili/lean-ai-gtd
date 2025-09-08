import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import AISuggestions from '@/components/QuickCapture/AISuggestions';

// Mock the API module
jest.mock('@/utils/api', () => ({
  apiPost: jest.fn()
}));

describe('AISuggestions Component - Bug Tests', () => {
  const mockProps = {
    taskId: 1,
    onCreateSubtasks: jest.fn(),
    isVisible: true,
    onClose: jest.fn()
  };

  const mockAIResponse = {
    analysis: {
      execution_strategy: {
        summary: 'Test execution strategy',
        key_points: ['Point 1', 'Point 2'],
        recommendations: ['Rec 1', 'Rec 2']
      },
      opportunities: {
        summary: 'Test opportunities',
        potential_areas: ['Area 1', 'Area 2'],
        value_propositions: ['Value 1', 'Value 2']
      },
      subtask_suggestions: [
        {
          title: 'Subtask 1',
          description: 'Description 1',
          priority: 'high' as const,
          estimated_time: '2 hours',
          dependencies: []
        },
        {
          title: 'Subtask 2',
          description: 'Description 2',
          priority: 'medium' as const,
          estimated_time: '1 hour',
          dependencies: ['Subtask 1']
        }
      ]
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Handling Issues', () => {
    it('should handle network failures gracefully', async () => {
      const { apiPost } = await import('@/utils/api');
      (apiPost as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      render(<AISuggestions {...mockProps} />);
      
      // Click analyze button
      const analyzeButton = screen.getByText(/开始AI分析/);
      fireEvent.click(analyzeButton);
      
      await waitFor(() => {
        expect(screen.getByText(/分析失败/)).toBeInTheDocument();
      });
      
      // Should show user-friendly error message
      expect(screen.getByText(/AI 分析服务暂时不可用/)).toBeInTheDocument();
    });

    it('should handle malformed API responses', async () => {
      const { apiPost } = await import('@/utils/api');
      (apiPost as jest.Mock).mockResolvedValue({
        json: async () => ({}) // Missing analysis property
      });
      
      render(<AISuggestions {...mockProps} />);
      
      const analyzeButton = screen.getByText(/开始AI分析/);
      fireEvent.click(analyzeButton);
      
      await waitFor(() => {
        expect(screen.getByText(/分析失败/)).toBeInTheDocument();
      });
      
      expect(screen.getByText(/AI 分析结果格式错误/)).toBeInTheDocument();
    });

    it('should handle HTTP errors with proper status codes', async () => {
      const { apiPost } = await import('@/utils/api');
      (apiPost as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });
      
      render(<AISuggestions {...mockProps} />);
      
      const analyzeButton = screen.getByText(/开始AI分析/);
      fireEvent.click(analyzeButton);
      
      await waitFor(() => {
        expect(screen.getByText(/HTTP 500: Internal Server Error/)).toBeInTheDocument();
      });
    });

    it('should handle network timeouts', async () => {
      const { apiPost } = await import('@/utils/api');
      (apiPost as jest.Mock).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );
      
      render(<AISuggestions {...mockProps} />);
      
      const analyzeButton = screen.getByText(/开始AI分析/);
      fireEvent.click(analyzeButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Network timeout/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Subtask Selection Issues', () => {
    it('should handle subtask selection correctly', async () => {
      const { apiPost } = await import('@/utils/api');
      (apiPost as jest.Mock).mockResolvedValueOnce({
        json: async () => mockAIResponse
      });
      
      render(<AISuggestions {...mockProps} />);
      
      // Start analysis
      const analyzeButton = screen.getByText(/开始AI分析/);
      fireEvent.click(analyzeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Subtask 1')).toBeInTheDocument();
      });
      
      // Select first subtask
      const firstSubtask = screen.getByText('Subtask 1').closest('div');
      fireEvent.click(firstSubtask!);
      
      // Should show selection
      expect(screen.getByText(/已选择 1 个子任务/)).toBeInTheDocument();
    });

    it('should handle multiple subtask selection', async () => {
      const { apiPost } = await import('@/utils/api');
      (apiPost as jest.Mock).mockResolvedValueOnce({
        json: async () => mockAIResponse
      });
      
      render(<AISuggestions {...mockProps} />);
      
      const analyzeButton = screen.getByText(/开始AI分析/);
      fireEvent.click(analyzeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Subtask 1')).toBeInTheDocument();
      });
      
      // Select both subtasks
      const firstSubtask = screen.getByText('Subtask 1').closest('div');
      const secondSubtask = screen.getByText('Subtask 2').closest('div');
      
      fireEvent.click(firstSubtask!);
      fireEvent.click(secondSubtask!);
      
      expect(screen.getByText(/已选择 2 个子任务/)).toBeInTheDocument();
    });

    it('should handle subtask creation failure', async () => {
      const { apiPost } = await import('@/utils/api');
      (apiPost as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => mockAIResponse
        })
        .mockRejectedValueOnce(new Error('Creation failed'));
      
      render(<AISuggestions {...mockProps} />);
      
      // Get analysis
      const analyzeButton = screen.getByText(/开始AI分析/);
      fireEvent.click(analyzeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Subtask 1')).toBeInTheDocument();
      });
      
      // Select and create
      const firstSubtask = screen.getByText('Subtask 1').closest('div');
      fireEvent.click(firstSubtask!);
      
      const createButton = screen.getByText(/创建选中的/);
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText(/创建子任务失败/)).toBeInTheDocument();
      });
    });
  });

  describe('UI State Management Issues', () => {
    it('should handle rapid analyze button clicks', async () => {
      const { apiPost } = await import('@/utils/api');
      (apiPost as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );
      
      render(<AISuggestions {...mockProps} />);
      
      const analyzeButton = screen.getByText(/开始AI分析/);
      
      // Click multiple times rapidly
      fireEvent.click(analyzeButton);
      fireEvent.click(analyzeButton);
      fireEvent.click(analyzeButton);
      
      // Should only trigger one API call
      expect(apiPost).toHaveBeenCalledTimes(1);
      
      // Should show loading state
      expect(screen.getByText(/AI正在分析中/)).toBeInTheDocument();
    });

    it('should handle close during analysis', async () => {
      const { apiPost } = await import('@/utils/api');
      (apiPost as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );
      
      render(<AISuggestions {...mockProps} />);
      
      const analyzeButton = screen.getByText(/开始AI分析/);
      fireEvent.click(analyzeButton);
      
      // Close modal during loading
      const closeButton = screen.getByText(/×/);
      fireEvent.click(closeButton);
      
      expect(mockProps.onClose).toHaveBeenCalled();
    });

    it('should reset state when reopening', async () => {
      const { apiPost } = await import('@/utils/api');
      (apiPost as jest.Mock).mockResolvedValueOnce({
        json: async () => mockAIResponse
      });
      
      const { rerender } = render(<AISuggestions {...mockProps} />);
      
      // Get analysis
      const analyzeButton = screen.getByText(/开始AI分析/);
      fireEvent.click(analyzeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Subtask 1')).toBeInTheDocument();
      });
      
      // Close and reopen
      rerender(<AISuggestions {...mockProps} isVisible={false} />);
      rerender(<AISuggestions {...mockProps} isVisible={true} />);
      
      // Should reset to initial state
      expect(screen.getByText(/开始AI分析/)).toBeInTheDocument();
      expect(screen.queryByText('Subtask 1')).not.toBeInTheDocument();
    });
  });

  describe('Data Validation Issues', () => {
    it('should handle missing subtask suggestions', async () => {
      const responseWithoutSubtasks = {
        analysis: {
          ...mockAIResponse.analysis,
          subtask_suggestions: []
        }
      };
      
      const { apiPost } = await import('@/utils/api');
      (apiPost as jest.Mock).mockResolvedValueOnce({
        json: async () => responseWithoutSubtasks
      });
      
      render(<AISuggestions {...mockProps} />);
      
      const analyzeButton = screen.getByText(/开始AI分析/);
      fireEvent.click(analyzeButton);
      
      await waitFor(() => {
        expect(screen.getByText(/AI暂未生成子任务建议/)).toBeInTheDocument();
      });
    });

    it('should handle invalid subtask data', async () => {
      const responseWithInvalidSubtasks = {
        analysis: {
          ...mockAIResponse.analysis,
          subtask_suggestions: [
            {
              // Missing required fields
              title: '',
              description: null,
              priority: 'invalid',
              estimated_time: undefined,
              dependencies: null
            }
          ]
        }
      };
      
      const { apiPost } = await import('@/utils/api');
      (apiPost as jest.Mock).mockResolvedValueOnce({
        json: async () => responseWithInvalidSubtasks
      });
      
      render(<AISuggestions {...mockProps} />);
      
      const analyzeButton = screen.getByText(/开始AI分析/);
      fireEvent.click(analyzeButton);
      
      await waitFor(() => {
        // Should handle gracefully without crashing
        expect(screen.getByText(/子任务拆分建议/)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Issues', () => {
    it('should handle large number of subtask suggestions', async () => {
      const largeSuggestionList = Array.from({ length: 50 }, (_, i) => ({
        title: `Subtask ${i + 1}`,
        description: `Description ${i + 1}`,
        priority: 'medium' as const,
        estimated_time: '1 hour',
        dependencies: []
      }));
      
      const responseWithManySuggestions = {
        analysis: {
          ...mockAIResponse.analysis,
          subtask_suggestions: largeSuggestionList
        }
      };
      
      const { apiPost } = await import('@/utils/api');
      (apiPost as jest.Mock).mockResolvedValueOnce({
        json: async () => responseWithManySuggestions
      });
      
      const startTime = performance.now();
      render(<AISuggestions {...mockProps} />);
      
      const analyzeButton = screen.getByText(/开始AI分析/);
      fireEvent.click(analyzeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Subtask 1')).toBeInTheDocument();
      });
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(1000); // Should render in less than 1 second
    });
  });

  describe('Accessibility Issues', () => {
    it('should provide proper labels for interactive elements', () => {
      render(<AISuggestions {...mockProps} />);
      
      // Check for proper button labels
      const analyzeButton = screen.getByText(/开始AI分析/);
      expect(analyzeButton).toHaveAttribute('aria-busy', 'false');
      
      // Check for proper heading structure
      expect(screen.getByRole('heading', { name: /AI智能分析/ })).toBeInTheDocument();
    });

    it('should handle keyboard navigation', () => {
      render(<AISuggestions {...mockProps} />);
      
      const analyzeButton = screen.getByText(/开始AI分析/);
      analyzeButton.focus();
      
      // Should be able to activate with keyboard
      fireEvent.keyDown(analyzeButton, { key: 'Enter' });
      expect(analyzeButton).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Retry Logic Issues', () => {
    it('should handle retry after failure', async () => {
      const { apiPost } = await import('@/utils/api');
      (apiPost as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          json: async () => mockAIResponse
        });
      
      render(<AISuggestions {...mockProps} />);
      
      // First attempt fails
      const analyzeButton = screen.getByText(/开始AI分析/);
      fireEvent.click(analyzeButton);
      
      await waitFor(() => {
        expect(screen.getByText(/分析失败/)).toBeInTheDocument();
      });
      
      // Retry
      const retryButton = screen.getByText(/重试/);
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByText('Subtask 1')).toBeInTheDocument();
      });
      
      // Should have been called twice
      expect(apiPost).toHaveBeenCalledTimes(2);
    });
  });
});