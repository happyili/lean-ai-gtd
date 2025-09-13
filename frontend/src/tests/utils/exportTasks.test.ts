import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import * as XLSX from 'xlsx';
import {
  convertTasksToExportFormat,
  convertImportRowToTaskData,
  validateImportData,
  fetchAllTasks,
  importTasksFromExcel,
  TaskRecord
} from '../../utils/exportTasks';

// Mock dependencies
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
    sheet_to_json: vi.fn(),
  },
  writeFile: vi.fn(),
  read: vi.fn()
}));

vi.mock('../../utils/api', () => ({
  buildUrl: vi.fn((url, params) => `http://localhost:5050${url}?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()}`),
  handleApiError: vi.fn(async (response) => response)
}));

// Mock global fetch
const mockFetch = vi.fn() as Mock;
global.fetch = mockFetch;

describe('exportTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('convertTasksToExportFormat', () => {
    it('should convert basic task data to export format', () => {
      const tasks: TaskRecord[] = [
        {
          id: 1,
          content: 'Test Task 1',
          category: 'task',
          priority: 'high',
          progress_notes: 'In progress',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T11:00:00Z',
          status: 'active',
          task_type: 'work',
          subtask_count: 2,
          user_id: 1,
          tags: 'urgent,important',
          estimated_time: 120
        }
      ];

      const result = convertTasksToExportFormat(tasks);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        任务ID: '1',
        任务内容: 'Test Task 1',
        任务类型: '工作',
        优先级: '高',
        状态: '进行中',
        进展记录: 'In progress',
        标签: 'urgent,important',
        预估时间: '120分钟',
        父任务ID: '',
        子任务数量: 2,
        创建时间: expect.any(String),
        更新时间: expect.any(String)
      });
    });

    it('should handle parent-child task relationships', () => {
      const tasks: TaskRecord[] = [
        {
          id: 1,
          content: 'Parent Task',
          category: 'task',
          priority: 'medium',
          progress_notes: '',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T11:00:00Z',
          status: 'pending',
          task_type: 'work',
          subtask_count: 2,
          user_id: 1,
          subtasks: [
            {
              id: 2,
              content: 'Child Task 1',
              category: 'task',
              parent_id: 1,
              priority: 'high',
              progress_notes: 'Started',
              created_at: '2024-01-01T10:30:00Z',
              updated_at: '2024-01-01T10:30:00Z',
              status: 'active',
              task_type: 'work',
              user_id: 1
            },
            {
              id: 3,
              content: 'Child Task 2',
              category: 'task',
              parent_id: 1,
              priority: 'low',
              progress_notes: '',
              created_at: '2024-01-01T11:00:00Z',
              updated_at: '2024-01-01T11:00:00Z',
              status: 'pending',
              task_type: 'hobby',
              user_id: 1
            }
          ]
        }
      ];

      const result = convertTasksToExportFormat(tasks);

      expect(result).toHaveLength(3); // Parent + 2 children

      // Check parent task
      expect(result[0].任务内容).toBe('Parent Task');
      expect(result[0].父任务ID).toBe('');
      expect(result[0].子任务数量).toBe(2);
      expect(result[0].任务ID).toBe('1');

      // Check child tasks
      expect(result[1].任务内容).toBe('Child Task 1');
      expect(result[1].父任务ID).toBe('1');
      expect(result[1].子任务数量).toBe(0);
      expect(result[1].任务ID).toBe('2');

      expect(result[2].任务内容).toBe('Child Task 2');
      expect(result[2].父任务ID).toBe('1');
      expect(result[2].子任务数量).toBe(0);
      expect(result[2].任务ID).toBe('3');
    });

    it('should handle tasks with default values', () => {
      const tasks: TaskRecord[] = [
        {
          id: 1,
          content: 'Minimal Task',
          category: 'task',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T11:00:00Z',
          status: 'pending'
        }
      ];

      const result = convertTasksToExportFormat(tasks);

      expect(result[0]).toEqual({
        任务ID: '1',
        任务内容: 'Minimal Task',
        任务类型: '工作', // default
        优先级: '中', // default from empty priority
        状态: '待办',
        进展记录: '',
        标签: '',
        预估时间: '',
        父任务ID: '',
        子任务数量: 0,
        创建时间: expect.any(String),
        更新时间: expect.any(String)
      });
    });
  });

  describe('convertImportRowToTaskData', () => {
    it('should convert Excel row data to task format', () => {
      const row = {
        '任务内容': 'Import Test Task',
        '任务类型': '工作',
        '优先级': '高',
        '状态': '进行中',
        '进展记录': 'Making progress',
        '标签': 'test,import',
        '预估时间': '60分钟',
        '父任务ID': '5'
      };

      const result = convertImportRowToTaskData(row);

      expect(result).toEqual({
        content: 'Import Test Task',
        category: 'task',
        task_type: 'work',
        priority: 'high',
        status: 'active',
        progress_notes: 'Making progress',
        tags: 'test,import',
        estimated_time: 60,
        parent_id: 5
      });
    });

    it('should handle rows with empty parent_id', () => {
      const row = {
        '任务内容': 'Parent Task',
        '任务类型': '业余',
        '优先级': '中',
        '状态': '待办',
        '进展记录': '',
        '标签': '',
        '预估时间': '',
        '父任务ID': ''
      };

      const result = convertImportRowToTaskData(row);

      expect(result.parent_id).toBeUndefined();
      expect(result.estimated_time).toBeUndefined();
      expect(result.task_type).toBe('hobby');
      expect(result.priority).toBe('medium');
      expect(result.status).toBe('pending');
    });

    it('should handle invalid parent_id gracefully', () => {
      const row = {
        '任务内容': 'Test Task',
        '父任务ID': 'invalid'
      };

      const result = convertImportRowToTaskData(row);

      expect(result.parent_id).toBeUndefined();
    });
  });

  describe('validateImportData', () => {
    it('should validate correct data structure', () => {
      const data = [
        {
          '任务内容': 'Valid Task 1',
          '任务类型': '工作',
          '优先级': '高',
          '状态': '进行中'
        },
        {
          '任务内容': 'Valid Task 2',
          '任务类型': '业余',
          '优先级': '低',
          '状态': '待办'
        }
      ];

      const result = validateImportData(data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required columns', () => {
      const data = [
        {
          '任务类型': '工作'
          // Missing 任务内容
        }
      ];

      const result = validateImportData(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('缺少必需的列: 任务内容');
    });

    it('should detect empty task content', () => {
      const data = [
        {
          '任务内容': '',
          '任务类型': '工作'
        },
        {
          '任务内容': '  ',
          '任务类型': '工作'
        }
      ];

      const result = validateImportData(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('第 2 行: 任务内容不能为空');
      expect(result.errors).toContain('第 3 行: 任务内容不能为空');
    });

    it('should detect content too long', () => {
      const data = [
        {
          '任务内容': 'x'.repeat(501)
        }
      ];

      const result = validateImportData(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('第 2 行: 任务内容不能超过500字符');
    });

    it('should validate task type values', () => {
      const data = [
        {
          '任务内容': 'Valid Task',
          '任务类型': '无效类型'
        }
      ];

      const result = validateImportData(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('第 2 行: 任务类型必须是"工作"、"业余"或"生活"之一');
    });

    it('should validate priority values', () => {
      const data = [
        {
          '任务内容': 'Valid Task',
          '优先级': '无效优先级'
        }
      ];

      const result = validateImportData(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('第 2 行: 优先级必须是"紧急"、"高"、"中"或"低"之一');
    });

    it('should validate status values', () => {
      const data = [
        {
          '任务内容': 'Valid Task',
          '状态': '无效状态'
        }
      ];

      const result = validateImportData(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('第 2 行: 状态必须是"待办"、"进行中"、"已完成"、"暂停"或"已取消"之一');
    });

    it('should validate parent task ID format', () => {
      const data = [
        {
          '任务内容': 'Valid Task',
          '父任务ID': 'abc'
        },
        {
          '任务内容': 'Valid Task 2',
          '父任务ID': '-1'
        }
      ];

      const result = validateImportData(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('第 2 行: 父任务ID必须是有效的正整数');
      expect(result.errors).toContain('第 3 行: 父任务ID必须是有效的正整数');
    });
  });

  describe('fetchAllTasks', () => {
    it('should fetch tasks with proper authentication', async () => {
      const mockTasks = [
        {
          id: 1,
          content: 'Test Task',
          category: 'task',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T11:00:00Z',
          status: 'pending'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ records: mockTasks })
      });

      const accessToken = 'test-token';
      const result = await fetchAllTasks(accessToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/records'),
        {
          headers: {
            'Authorization': 'Bearer test-token'
          }
        }
      );
      expect(result).toEqual(mockTasks);
    });

    it('should fetch tasks without authentication for guest users', async () => {
      const mockTasks: TaskRecord[] = [];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ records: mockTasks })
      });

      const result = await fetchAllTasks();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/records'),
        {
          headers: {}
        }
      );
      expect(result).toEqual(mockTasks);
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockRejectedValue(new Error('Failed to parse JSON'))
      });

      await expect(fetchAllTasks()).rejects.toThrow();
    });
  });

  describe('importTasksFromExcel', () => {
    it('should import tasks and skip duplicates while preserving parent-child relationships', async () => {
      // Mock existing tasks
      const existingTasks = [
        {
          id: 1,
          content: 'Existing Task',
          category: 'task',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T11:00:00Z',
          status: 'pending'
        }
      ];

      // Mock Excel data with parent-child relationships
      const excelData = [
        {
          '任务内容': 'Existing Task', // Should be skipped
          '任务类型': '工作',
          '优先级': '中',
          '状态': '待办'
        },
        {
          '任务内容': 'New Parent Task',
          '任务类型': '工作',
          '优先级': '高',
          '状态': '进行中',
          '父任务ID': ''
        },
        {
          '任务内容': 'New Child Task',
          '任务类型': '工作',
          '优先级': '中',
          '状态': '待办',
          '父任务ID': '2' // References parent task
        }
      ];

      // Mock file with arrayBuffer method
      const mockFile = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
      } as unknown as File;
      
      // Mock XLSX functions
      (XLSX.read as Mock).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      });
      (XLSX.utils.sheet_to_json as Mock).mockReturnValue(excelData);

      // Mock fetchAllTasks
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ records: existingTasks })
      });

      // Mock task creation API calls
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // New Parent Task
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // New Child Task

      const result = await importTasksFromExcel(mockFile, 'test-token');

      expect(result.success).toBe(2);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.details).toContain('第2行: "Existing Task" 已存在，跳过');
      expect(result.details).toContain('第3行: "New Parent Task" 导入成功');
      expect(result.details).toContain('第4行: "New Child Task" 导入成功');
      
      // Verify API calls
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/records'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );

      // Verify child task uses subtasks endpoint
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/records/2/subtasks'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('should handle file reading errors', async () => {
      const mockFile = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
      } as unknown as File;
      
      (XLSX.read as Mock).mockImplementation(() => {
        throw new Error('Invalid file format');
      });

      await expect(importTasksFromExcel(mockFile)).rejects.toThrow('导入失败: Invalid file format');
    });

    it('should handle empty Excel file', async () => {
      const mockFile = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
      } as unknown as File;
      
      (XLSX.read as Mock).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      });
      (XLSX.utils.sheet_to_json as Mock).mockReturnValue([]);

      await expect(importTasksFromExcel(mockFile)).rejects.toThrow('Excel文件为空或没有有效数据');
    });

    it('should handle validation errors', async () => {
      const mockFile = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
      } as unknown as File;
      const invalidData = [
        {
          '任务类型': '工作'
          // Missing required '任务内容'
        }
      ];
      
      (XLSX.read as Mock).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      });
      (XLSX.utils.sheet_to_json as Mock).mockReturnValue(invalidData);

      await expect(importTasksFromExcel(mockFile)).rejects.toThrow(/数据验证失败/);
    });
  });
});
