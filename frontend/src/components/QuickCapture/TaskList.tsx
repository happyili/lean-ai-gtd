import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import AISuggestions from './AISuggestions';
import AIChatSidebar from './AIChatSidebar';
import { buildUrl, handleApiError, apiPost } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { 
  taskTypeMap, 
  priorityMap, 
  statusMap, 
  getTaskTypeStyle, 
  getPriorityStyle, 
  getStatusStyle, 
  formatDate,
  DeleteButton,
  getDropdownStyle,
  getDropdownItemStyle
} from '@/utils/uiComponents';

interface Record {
  id: number;
  content: string;
  category: string;
  parent_id?: number;
  priority?: string;
  progress_notes?: string; // 替换progress为progress_notes
  created_at: string;
  updated_at: string;
  status: string;
  task_type?: string; // work/hobby/life - 工作/业余/生活
  subtask_count?: number;
  subtasks?: Record[];
  user_id?: number | null; // 用户ID，null表示guest用户
}

interface TaskListProps {
  onDelete: (id: number) => void;
  onSearch: (query: string) => void;
  onSave: (content: string, category: string) => Promise<void>;
  showNotification: (message: string, type: 'success' | 'error') => void;
  isCollapsed?: boolean;
  showAllLevels?: boolean;
  onToggleShowAllLevels?: () => void;
  onToggleCollapse?: () => void;
  // PomodoroBannerPanel相关props
  isPomodoroPanelExpanded?: boolean;
  onTogglePomodoroPanel?: () => void;
  onPomodoroTaskAdded?: () => void;
}


export default function TaskList({
  onDelete, 
  onSearch, 
  onSave, 
  showNotification, 
  isCollapsed = false, 
  showAllLevels = false, 
  onToggleShowAllLevels, 
  onToggleCollapse,
  isPomodoroPanelExpanded = false,
  onTogglePomodoroPanel,
  onPomodoroTaskAdded
}: TaskListProps) {
  const { isAuthenticated, accessToken } = useAuth();
  const [tasks, setTasks] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState('all'); // 任务类型筛选
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleteSubtaskConfirm, setDeleteSubtaskConfirm] = useState<number | null>(null);
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<number | null>(null);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [progressNotesCache, setProgressNotesCache] = useState<{[key: number]: string}>({});
  const [progressNotesHistory, setProgressNotesHistory] = useState<{[key: number]: string[]}>({});
  const [saveTimeouts, setSaveTimeouts] = useState<{[key: number]: NodeJS.Timeout}>({});
  const [newSubtaskContent, setNewSubtaskContent] = useState<{[key: number]: string}>({});
  const [isAddingSubtask, setIsAddingSubtask] = useState<number | null>(null);
  const [editingSubtask, setEditingSubtask] = useState<number | null>(null);
  const [editingSubtaskContent, setEditingSubtaskContent] = useState<{[key: number]: string}>({});
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [editingTaskContent, setEditingTaskContent] = useState<{[key: number]: string}>({});
  const [showAISuggestions, setShowAISuggestions] = useState<number | null>(null);
  const [showStrategySuggestions, setShowStrategySuggestions] = useState<number | null>(null);
  const [priorityDropdownOpen, setPriorityDropdownOpen] = useState<number | null>(null);
  const [taskTypeDropdownOpen, setTaskTypeDropdownOpen] = useState<number | null>(null);
  const [showStatsDetail, setShowStatsDetail] = useState(false);
  const [showAIChatSidebar, setShowAIChatSidebar] = useState(false);
  // 控制在折叠视图下是否展示全部子任务（仅影响内联子任务区域，不展开详情）
  const [showAllInlineSubtasks, setShowAllInlineSubtasks] = useState<Set<number>>(new Set());
  
  // 番茄钟状态
  const [isAddingToPomodoro, setIsAddingToPomodoro] = useState<number | null>(null);
  
  // 翻页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);

  // 将任务添加到番茄钟
  const handleAddToPomodoro = async (taskId: number) => {
    if (!isAuthenticated || !accessToken) {
      showNotification('请先登录以使用番茄钟功能', 'error');
      return;
    }

    // 找到对应的任务
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      showNotification('任务不存在', 'error');
      return;
    }

    setIsAddingToPomodoro(taskId);
    try {
      const response = await apiPost(
        '/api/pomodoro/tasks/add-single',
        { record_id: taskId },
        '添加任务到番茄钟',
        accessToken
      );
      
      const data = await response.json();
      
      if (data.success) {
        // 自动展开PomodoroBannerPanel
        if (onTogglePomodoroPanel && !isPomodoroPanelExpanded) {
          onTogglePomodoroPanel();
        }
        
        // 触发PomodoroBannerPanel刷新
        if (onPomodoroTaskAdded) {
          onPomodoroTaskAdded();
        }
        
        showNotification('任务已添加到番茄钟并自动开始！', 'success');
      } else {
        showNotification(data.message || '添加失败', 'error');
      }
    } catch (error) {
      console.error('添加任务到番茄钟失败:', error);
      showNotification(error instanceof Error ? error.message : '添加失败', 'error');
    } finally {
      setIsAddingToPomodoro(null);
    }
  };

  // 更新任务内容
  const handleUpdateTaskContent = async (taskId: number, content: string) => {
    try {
      const { apiPut, apiPutPublic } = await import('@/utils/api');
      
      if (isAuthenticated && accessToken) {
        await apiPut(
          `/api/records/${taskId}`,
          { content },
          '更新任务内容',
          accessToken
        );
      } else {
        await apiPutPublic(
          `/api/records/${taskId}`,
          { content },
          '更新任务内容'
        );
      }

      // 更新本地状态
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, content }
            : task
        )
      );
    } catch (error) {
      console.error('更新任务内容失败:', error);
      showNotification(error instanceof Error ? error.message : '更新任务内容失败', 'error');
    }
  };

  // 更新任务优先级
  const handleUpdatePriority = async (taskId: number, newPriority: string) => {
    try {
      const { apiPut, apiPutPublic } = await import('@/utils/api');
      
      if (isAuthenticated && accessToken) {
        await apiPut(
          `/api/records/${taskId}`,
          { priority: newPriority },
          '更新任务优先级',
          accessToken
        );
      } else {
        await apiPutPublic(
          `/api/records/${taskId}`,
          { priority: newPriority },
          '更新任务优先级'
        );
      }

      // 更新本地状态
      setTasks(prevTasks => 
        prevTasks.map(task => {
          if (task.id === taskId) {
            return { ...task, priority: newPriority };
          }
          // 同时更新子任务中的对应项
          if (task.subtasks) {
            const updatedSubtasks = task.subtasks.map(subtask => 
              subtask.id === taskId ? { ...subtask, priority: newPriority } : subtask
            );
            return { ...task, subtasks: updatedSubtasks };
          }
          return task;
        })
      );
    } catch (error) {
      console.error('更新任务优先级失败:', error);
      showNotification(error instanceof Error ? error.message : '更新任务优先级失败', 'error');
    }
  };

  // 更新任务状态
  const handleUpdateStatus = async (taskId: number, newStatus: string) => {
    try {
      const { apiPut, apiPutPublic } = await import('@/utils/api');
      
      if (isAuthenticated && accessToken) {
        await apiPut(
          `/api/records/${taskId}`,
          { status: newStatus },
          '更新任务状态',
          accessToken
        );
      } else {
        await apiPutPublic(
          `/api/records/${taskId}`,
          { status: newStatus },
          '更新任务状态'
        );
      }

      // 更新本地状态
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, status: newStatus }
            : task
        )
      );
    } catch (error) {
      console.error('更新任务状态失败:', error);
      showNotification(error instanceof Error ? error.message : '更新任务状态失败', 'error');
    }
  };

  // 更新任务类型
  const handleUpdateTaskType = async (taskId: number, newTaskType: string) => {
    try {
      const { apiPut, apiPutPublic } = await import('@/utils/api');
      
      if (isAuthenticated && accessToken) {
        await apiPut(
          `/api/records/${taskId}`,
          { task_type: newTaskType },
          '更新任务类型',
          accessToken
        );
      } else {
        await apiPutPublic(
          `/api/records/${taskId}`,
          { task_type: newTaskType },
          '更新任务类型'
        );
      }

      // 更新本地状态
      setTasks(prevTasks => 
        prevTasks.map(task => {
          if (task.id === taskId) {
            return { ...task, task_type: newTaskType };
          }
          // 同时更新子任务中的对应项
          if (task.subtasks) {
            const updatedSubtasks = task.subtasks.map(subtask => 
              subtask.id === taskId ? { ...subtask, task_type: newTaskType } : subtask
            );
            return { ...task, subtasks: updatedSubtasks };
          }
          return task;
        })
      );
    } catch (error) {
      console.error('更新任务类型失败:', error);
      showNotification(error instanceof Error ? error.message : '更新任务类型失败', 'error');
    }
  };

  // 更新任务进展记录
  const handleUpdateProgressNotes = async (taskId: number, progressNotes: string) => {
    try {
      const { apiPut, apiPutPublic } = await import('@/utils/api');
      
      if (isAuthenticated && accessToken) {
        await apiPut(
          `/api/records/${taskId}`,
          { progress_notes: progressNotes },
          '更新进展记录',
          accessToken
        );
      } else {
        await apiPutPublic(
          `/api/records/${taskId}`,
          { progress_notes: progressNotes },
          '更新进展记录'
        );
      }

      // 更新本地状态
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, progress_notes: progressNotes }
            : task
        )
      );
    } catch (error) {
      console.error('更新进展记录失败:', error);
      showNotification(error instanceof Error ? error.message : '更新进展记录失败', 'error');
    }
  };

  // 处理进展记录输入变化（支持中文输入）
  const handleProgressNotesChange = (taskId: number, value: string) => {
    // 保存到历史记录（用于撤销）
    setProgressNotesHistory(prev => {
      const currentTask = tasks.find(t => t.id === taskId);
      const currentValue = progressNotesCache[taskId] || currentTask?.progress_notes || '';
      const history = prev[taskId] || [];
      
      // 只在值有显著变化时保存到历史
      if (currentValue !== value && (value.length === 0 || Math.abs(value.length - currentValue.length) > 5)) {
        return {
          ...prev,
          [taskId]: [...history.slice(-9), currentValue] // 保留最近10个状态
        };
      }
      return prev;
    });

    // 立即更新缓存
    setProgressNotesCache(prev => ({
      ...prev,
      [taskId]: value
    }));

    // 清除之前的定时器
    if (saveTimeouts[taskId]) {
      clearTimeout(saveTimeouts[taskId]);
    }

    // 设置新的10秒自动保存定时器
    const timeout = setTimeout(() => {
      handleUpdateProgressNotes(taskId, value);
      setSaveTimeouts(prev => {
        const newTimeouts = { ...prev };
        delete newTimeouts[taskId];
        return newTimeouts;
      });
    }, 10000);

    setSaveTimeouts(prev => ({
      ...prev,
      [taskId]: timeout
    }));
  };

  // 立即保存进展记录
  const saveProgressNotesImmediately = (taskId: number) => {
    const cachedValue = progressNotesCache[taskId];
    if (cachedValue !== undefined) {
      // 清除定时器
      if (saveTimeouts[taskId]) {
        clearTimeout(saveTimeouts[taskId]);
        setSaveTimeouts(prev => {
          const newTimeouts = { ...prev };
          delete newTimeouts[taskId];
          return newTimeouts;
        });
      }
      
      handleUpdateProgressNotes(taskId, cachedValue);
    }
  };

  // 撤销进展记录更改
  const undoProgressNotesChange = (taskId: number) => {
    const history = progressNotesHistory[taskId];
    if (history && history.length > 0) {
      const previousValue = history[history.length - 1];
      
      // 更新缓存和任务状态
      setProgressNotesCache(prev => ({
        ...prev,
        [taskId]: previousValue
      }));
      
      handleUpdateProgressNotes(taskId, previousValue);
      
      // 移除最后一个历史记录
      setProgressNotesHistory(prev => ({
        ...prev,
        [taskId]: history.slice(0, -1)
      }));
    }
  };

  // 获取当前进展记录值
  const getCurrentProgressNotes = (taskId: number): string => {
    if (progressNotesCache[taskId] !== undefined) {
      return progressNotesCache[taskId];
    }
    const task = tasks.find(t => t.id === taskId);
    return task?.progress_notes || '';
  };

  // 添加子任务
  const handleAddSubtask = async (parentId: number) => {
    const content = newSubtaskContent[parentId]?.trim();
    if (!content) return;

    try {
      const { apiPost, apiPostPublic } = await import('@/utils/api');
      
      // 根据是否登录选择API方法
      const response = isAuthenticated 
        ? await apiPost(
            `/api/records/${parentId}/subtasks`,
            {
              content: content,
              category: 'task'
            },
            '添加子任务',
            accessToken || undefined
          )
        : await apiPostPublic(
            `/api/records/${parentId}/subtasks`,
            {
              content: content,
              category: 'task'
            },
            '添加子任务'
          );

      const data = await response.json();
      
      // 递归更新任务列表，支持多层嵌套
      const updateTasksRecursively = (tasks: Record[]): Record[] => {
        return tasks.map(task => {
          if (task.id === parentId) {
            return {
              ...task,
              subtasks: [...(task.subtasks || []), data.subtask],
              subtask_count: (task.subtask_count || 0) + 1
            };
          }
          
          // 如果有子任务，递归更新子任务
          if (task.subtasks && task.subtasks.length > 0) {
            const updatedSubtasks = updateTasksRecursively(task.subtasks);
            return { ...task, subtasks: updatedSubtasks };
          }
          
          return task;
        });
      };
      
      setTasks(prevTasks => updateTasksRecursively(prevTasks));

      // 清空输入框并关闭添加状态
      setNewSubtaskContent(prev => ({ ...prev, [parentId]: '' }));
      setIsAddingSubtask(null);

    } catch (error) {
      console.error('添加子任务失败:', error);
      showNotification(error instanceof Error ? error.message : '添加子任务失败', 'error');
    }
  };

  // 删除子任务
  const handleDeleteSubtask = async (subtaskId: number, parentId: number) => {
    if (deleteSubtaskConfirm === subtaskId) {
      try {
        const { apiDelete } = await import('@/utils/api');
        
        await apiDelete(
          `/api/records/${subtaskId}`,
          '删除子任务',
          accessToken || undefined
        );

        // 递归更新任务列表，支持多层嵌套删除
        const updateTasksRecursively = (tasks: Record[]): Record[] => {
          return tasks.map(task => {
            if (task.id === parentId) {
              return {
                ...task,
                subtasks: (task.subtasks || []).filter(subtask => subtask.id !== subtaskId),
                subtask_count: Math.max(0, (task.subtask_count || 0) - 1)
              };
            }
            
            // 如果有子任务，递归更新子任务
            if (task.subtasks && task.subtasks.length > 0) {
              const updatedSubtasks = updateTasksRecursively(task.subtasks);
              return { ...task, subtasks: updatedSubtasks };
            }
            
            return task;
          });
        };
        
        setTasks(prevTasks => updateTasksRecursively(prevTasks));
        
        setDeleteSubtaskConfirm(null);
      } catch (error) {
        console.error('删除子任务失败:', error);
        showNotification(error instanceof Error ? error.message : '删除子任务失败', 'error');
      }
    } else {
      setDeleteSubtaskConfirm(subtaskId);
      // 3秒后自动取消确认状态
      setTimeout(() => setDeleteSubtaskConfirm(null), 3000);
    }
  };

  // 处理子任务输入变化
  const handleSubtaskContentChange = (parentId: number, content: string) => {
    setNewSubtaskContent(prev => ({
      ...prev,
      [parentId]: content
    }));
  };

  // 开始编辑任务标题
  const startEditingTask = (taskId: number, currentContent: string) => {
    setEditingTask(taskId);
    setEditingTaskContent(prev => ({
      ...prev,
      [taskId]: currentContent
    }));
  };

  // 取消编辑任务标题
  const cancelEditingTask = () => {
    setEditingTask(null);
    setEditingTaskContent({});
  };

  // 保存任务标题编辑
  const saveTaskEdit = async (taskId: number) => {
    const newContent = editingTaskContent[taskId]?.trim();
    if (!newContent) return;

    try {
      await handleUpdateTaskContent(taskId, newContent);

      // 结束编辑状态
      setEditingTask(null);
      setEditingTaskContent(prev => {
        const newState = { ...prev };
        delete newState[taskId];
        return newState;
      });

    } catch (error) {
      console.error('更新任务标题失败:', error);
    }
  };

  // 开始编辑子任务
  const startEditingSubtask = (subtaskId: number, currentContent: string) => {
    setEditingSubtask(subtaskId);
    setEditingSubtaskContent(prev => ({
      ...prev,
      [subtaskId]: currentContent
    }));
  };

  // 取消编辑子任务
  const cancelEditingSubtask = () => {
    setEditingSubtask(null);
    setEditingSubtaskContent({});
  };

  // 保存子任务编辑
  const saveSubtaskEdit = async (subtaskId: number, parentId: number) => {
    const newContent = editingSubtaskContent[subtaskId]?.trim();
    if (!newContent) return;

    try {
      const { apiPut, apiPutPublic } = await import('@/utils/api');
      
      if (isAuthenticated && accessToken) {
        await apiPut(
          `/api/records/${subtaskId}`,
          { content: newContent },
          '更新子任务',
          accessToken
        );
      } else {
        await apiPutPublic(
          `/api/records/${subtaskId}`,
          { content: newContent },
          '更新子任务'
        );
      }

      // 更新任务列表中的子任务内容
      setTasks(prevTasks => 
        prevTasks.map(task => {
          if (task.id === parentId) {
            return {
              ...task,
              subtasks: (task.subtasks || []).map(subtask => 
                subtask.id === subtaskId 
                  ? { ...subtask, content: newContent }
                  : subtask
              )
            };
          }
          return task;
        })
      );

      // 结束编辑状态
      setEditingSubtask(null);
      setEditingSubtaskContent(prev => {
        const newState = { ...prev };
        delete newState[subtaskId];
        return newState;
      });

    } catch (error) {
      console.error('更新子任务失败:', error);
      showNotification(error instanceof Error ? error.message : '更新子任务失败', 'error');
    }
  };

  // 更新子任务状态
  const updateSubtaskStatus = async (subtaskId: number, parentId: number, newStatus: string) => {
    try {
      const { apiPut, apiPutPublic } = await import('@/utils/api');
      
      if (isAuthenticated && accessToken) {
        await apiPut(
          `/api/records/${subtaskId}`,
          { status: newStatus },
          '更新子任务状态',
          accessToken
        );
      } else {
        await apiPutPublic(
          `/api/records/${subtaskId}`,
          { status: newStatus },
          '更新子任务状态'
        );
      }

      // 更新任务列表中的子任务状态
      setTasks(prevTasks => 
        prevTasks.map(task => {
          if (task.id === parentId) {
            return {
              ...task,
              subtasks: (task.subtasks || []).map(subtask => 
                subtask.id === subtaskId 
                  ? { ...subtask, status: newStatus }
                  : subtask
              )
            };
          }
          return task;
        })
      );

    } catch (error) {
      console.error('更新子任务状态失败:', error);
      showNotification(error instanceof Error ? error.message : '更新子任务状态失败', 'error');
    }
  };

  const handleTaskClick = (task: Record) => {
    if (expandedTask === task.id) {
      // 保存进展记录当收起任务时
      saveProgressNotesImmediately(task.id);
      setExpandedTask(null);
    } else {
      setExpandedTask(task.id);
    }
  };

  // 监听来自头部导航的搜索和筛选事件
  useEffect(() => {
    const handleSearch = (e: any) => {
      setSearchQuery(e.detail.query);
    };

    const handleFilter = (e: any) => {
      if (e.detail.type === 'status') {
        setStatusFilter(e.detail.value);
      } else if (e.detail.type === 'priority') {
        setPriorityFilter(e.detail.value);
      } else if (e.detail.type === 'taskType') {
        setTaskTypeFilter(e.detail.value);
      } else if (e.detail.type === 'showAllLevels') {
        // showAllLevels 状态由父组件管理，这里不需要重复设置
        // setShowAllLevels(e.detail.value === 'true');
      }
    };

    const handleClickOutside = (_e: MouseEvent) => {
      setStatusDropdownOpen(null);
      setPriorityDropdownOpen(null);
      setTaskTypeDropdownOpen(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // 处理Ctrl+Z撤销功能
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && expandedTask) {
        e.preventDefault();
        undoProgressNotesChange(expandedTask);
      }
    };

    const handleCollapse = (e: CustomEvent) => {
      const { collapsed } = e.detail;
      if (collapsed) {
        // 折叠所有子任务
        setExpandedTask(null);
      }
      // 如果collapsed为false，保持当前展开状态
    };

    window.addEventListener('taskSearch', handleSearch);
    window.addEventListener('taskFilter', handleFilter);
    window.addEventListener('taskCollapse', handleCollapse as EventListener);
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('taskSearch', handleSearch);
      window.removeEventListener('taskFilter', handleFilter);
      window.removeEventListener('taskCollapse', handleCollapse as EventListener);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      
      // 清理所有定时器
      Object.values(saveTimeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, [expandedTask, saveTimeouts]);

  // 获取任务列表
  const fetchTasks = async (search?: string, status?: string, priority?: string, taskType?: string, page: number = 1) => {
    setIsLoading(true);
    try {
      const params: {[key: string]: string | number | boolean} = {
        category: 'task',
        include_subtasks: true,
        subtask_detail: true,
        top_level_only: false,
        per_page: 30,  // 设置每页显示30个任务
        page: page      // 添加页码参数
      };
      
      // 如果是guest用户，只获取user_id为NULL的任务
      if (!isAuthenticated) {
        params.user_id = 'null';
      }
      
      if (search) params.search = search;
      if (status && status !== 'all') params.status = status;
      if (priority && priority !== 'all') params.priority = priority;
      if (taskType && taskType !== 'all') params.task_type = taskType;
      
      const url = buildUrl('/api/records', params);
      const headers: HeadersInit = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      const response = await handleApiError(
        await fetch(url, { headers }),
        '获取任务'
      );
      
      const data = await response.json();
      setTasks(data.records || []);
      
      // 更新分页信息
      setCurrentPage(data.page || 1);
      setTotalPages(data.pages || 1);
      setTotalTasks(data.total || 0);
    } catch (error) {
      console.error('获取任务失败:', error);
      // 清空任务列表以防止显示旧数据
      setTasks([]);
      setCurrentPage(1);
      setTotalPages(1);
      setTotalTasks(0);
    } finally {
      setIsLoading(false);
    }
  };

  // 统一防抖获取任务列表（合并初始化、认证变化、筛选变化）
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchTasks(searchQuery, statusFilter, priorityFilter, taskTypeFilter, 1);
      onSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
    // 当认证状态、token、搜索和筛选变化时触发
  }, [isAuthenticated, accessToken, searchQuery, statusFilter, priorityFilter, taskTypeFilter]);

  const handleDelete = async (id: number) => {
    if (deleteConfirm === id) {
      try {
        const { apiDelete } = await import('@/utils/api');
        
        await apiDelete(
          `/api/records/${id}`,
          '删除任务',
          accessToken || undefined
        );

        // 重新获取任务列表
        await fetchTasks(searchQuery, statusFilter, priorityFilter, taskTypeFilter, currentPage);
        onDelete(id);
        setDeleteConfirm(null);
      } catch (error) {
        console.error('删除任务失败:', error);
        showNotification(error instanceof Error ? error.message : '删除任务失败', 'error');
      }
    } else {
      setDeleteConfirm(id);
      // 3秒后自动取消确认状态
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };


  // 添加新任务
  const handleAddTask = async () => {
    const content = newTaskContent.trim();
    if (!content) return;

    try {
      await onSave(content, 'task');
      setNewTaskContent(''); // 保存成功后清空输入框
      showNotification('任务创建成功！', 'success');
      // 重新获取任务列表
      await fetchTasks(searchQuery, statusFilter, priorityFilter, taskTypeFilter, currentPage);
    } catch (error) {
      console.error('创建任务失败:', error);
      showNotification('创建任务失败', 'error');
    }
  };

  // 处理筛选器变化 - 任务类型筛选现在由父组件处理


  // 计算任务统计数据
  const calculateTaskStats = () => {
    const filteredTasks = showAllLevels ? tasks : tasks.filter(task => !task.parent_id);
    const totalTasks = filteredTasks.length;
    
    // 获取本周开始时间
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    // 统计各种状态的任务
    const completedTasks = filteredTasks.filter(task => task.status === 'completed').length;
    const activeTasks = filteredTasks.filter(task => task.status === 'active').length;
    const pendingTasks = filteredTasks.filter(task => task.status === 'pending' || !task.status).length;
    
    // 本周完成的任务
    const thisWeekCompleted = filteredTasks.filter(task => {
      return task.status === 'completed' && new Date(task.updated_at) >= startOfWeek;
    }).length;
    
    // 本周新增的任务
    const thisWeekNew = filteredTasks.filter(task => {
      return new Date(task.created_at) >= startOfWeek;
    }).length;
    
    // 按优先级统计
    const urgentTasks = filteredTasks.filter(task => task.priority === 'urgent').length;
    const highTasks = filteredTasks.filter(task => task.priority === 'high').length;
    
    // 按类型统计
    const workTasks = filteredTasks.filter(task => task.task_type === 'work').length;
    const hobbyTasks = filteredTasks.filter(task => task.task_type === 'hobby').length;
    const lifeTasks = filteredTasks.filter(task => task.task_type === 'life').length;
    
    return {
      totalTasks,
      completedTasks,
      activeTasks,
      pendingTasks,
      thisWeekCompleted,
      thisWeekNew,
      urgentTasks,
      highTasks,
      workTasks,
      hobbyTasks,
      lifeTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    };
  };

  const stats = calculateTaskStats();

  // 翻页处理函数
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
      fetchTasks(searchQuery, statusFilter, priorityFilter, taskTypeFilter, page);
    }
  };

  // 生成页码数组
  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5; // 最多显示5个页码按钮
    
    if (totalPages <= maxVisiblePages) {
      // 如果总页数少于等于5页，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 如果总页数大于5页，显示当前页附近的页码
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, currentPage + 2);
      
      if (start > 1) {
        pages.push(1);
        if (start > 2) {
          pages.push('...');
        }
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="h-full flex flex-col card">
      {/* 头部 */}
      <div className="px-6 py-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-heading-2" style={{ color: 'var(--text-primary)' }}>任务管理</h2>
            {/* 看子任务按钮 */}
            {onToggleShowAllLevels && (
              <button
                onClick={onToggleShowAllLevels}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  showAllLevels 
                    ? 'text-white' 
                    : 'hover:btn-secondary'
                }`}
                style={{ 
                  backgroundColor: showAllLevels ? 'var(--info)' : 'transparent',
                  color: showAllLevels ? 'white' : 'var(--text-primary)',
                  border: `1px solid ${showAllLevels ? 'var(--info)' : 'var(--border-default)'}`
                }}
                title={showAllLevels ? '隐藏子任务' : '显示子任务'}
              >
                看子任务
              </button>
            )}
            {/* 折叠按钮 */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  isCollapsed 
                    ? 'text-white' 
                    : 'hover:btn-secondary'
                }`}
                style={{ 
                  backgroundColor: isCollapsed ? 'var(--primary)' : 'transparent',
                  color: isCollapsed ? 'white' : 'var(--text-primary)',
                  border: `1px solid ${isCollapsed ? 'var(--primary)' : 'var(--border-default)'}`
                }}
                title={isCollapsed ? '展开子任务' : '折叠子任务'}
              >
                折叠
              </button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {/* 详细进展统计 */}
            <div className="relative">
              <button
                onClick={() => setShowStatsDetail(!showStatsDetail)}
                className="px-4 py-1 rounded-xl cursor-pointer hover:shadow-sm transition-all flex items-center space-x-2"
                style={{ 
                  backgroundColor: 'var(--card-background)',
                
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-center">
                    <div className="text-body-small font-bold" style={{ color: 'var(--text-primary)' }}>
                      {stats.totalTasks}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      总任务
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-body-small font-bold" style={{ color: 'var(--success)' }}>
                      {stats.thisWeekCompleted}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      本周完成
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-body-small font-bold" style={{ color: 'var(--primary)' }}>
                      {stats.thisWeekNew}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      本周新增
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-body-small font-bold" style={{ color: 'var(--accent-amber)' }}>
                      {stats.completionRate}%
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      完成率
                    </div>
                  </div>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {showStatsDetail ? '▲' : '▼'}
                </span>
              </button>
              
              {/* 展开的详细统计 */}
              {showStatsDetail && (
                <div 
                  className="absolute top-full right-0 mt-2 p-4 card shadow-lg z-50 w-80"
                  style={{ 
                    backgroundColor: 'var(--card-background)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  
                  <div className="space-y-3">
                    {/* 任务状态分布 */}
                    <div>
                      <h4 className="text-body-small font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                        任务状态分布
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded" style={{ backgroundColor: 'var(--success-bg)' }}>
                          <div className="text-sm font-bold" style={{ color: 'var(--success)' }}>{stats.completedTasks}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>已完成</div>
                        </div>
                        <div className="p-2 rounded" style={{ backgroundColor: 'var(--info-bg)' }}>
                          <div className="text-sm font-bold" style={{ color: 'var(--info)' }}>{stats.activeTasks}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>进行中</div>
                        </div>
                        <div className="p-2 rounded" style={{ backgroundColor: 'var(--background-secondary)' }}>
                          <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{stats.pendingTasks}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>待办</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 优先级分布 */}
                    <div>
                      <h4 className="text-body-small font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                        优先级分布
                      </h4>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--error)' }}></div>
                          <span className="text-xs">紧急: {stats.urgentTasks}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--warning)' }}></div>
                          <span className="text-xs">高: {stats.highTasks}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 任务类型分布 */}
                    <div>
                      <h4 className="text-body-small font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                        任务类型分布
                      </h4>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--primary)' }}></div>
                          <span className="text-xs">工作: {stats.workTasks}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--success)' }}></div>
                          <span className="text-xs">业余: {stats.hobbyTasks}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--accent-purple)' }}></div>
                          <span className="text-xs">生活: {stats.lifeTasks}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 效率指标 */}
                    <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                      <h4 className="text-body-small font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                        效率指标
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div>
                          <div className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                            {stats.totalTasks > 0 ? Math.round((stats.thisWeekCompleted / stats.totalTasks) * 100) : 0}%
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>周完成率</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold" style={{ color: 'var(--accent-amber)' }}>
                            {stats.thisWeekNew > 0 ? Math.round((stats.thisWeekCompleted / stats.thisWeekNew) * 100) : 0}%
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>新增完成比</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowAIChatSidebar(true)}
              className="px-4 py-1 rounded-xl text-body-small font-medium transition-all hover:shadow-sm"
              style={{ 
                backgroundColor: 'var(--card-background)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--primary)',
                boxShadow: '0 0px 0px 0 var(--shadow-light)'
              }}
              title="AI助手聊天"
            >
              AI助手
            </button>
          </div>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto">
        {/* 始终显示的任务输入框 */}
        <div className="p-2 border-b" style={{ borderColor: 'var(--border-light)', backgroundColor: 'var(--background-secondary)' }}>
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <input
                type="text"
                value={newTaskContent}
                onChange={(e) => setNewTaskContent(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTask();
                  }
                }}
                placeholder="▶ 输入新任务内容..."
                className="w-full px-2 py-1 rounded-lg form-input text-body"
                style={{
                  backgroundColor: 'var(--card-background)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddTask}
                disabled={!newTaskContent.trim()}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ 
                  background: 'transparent',
                  color: newTaskContent.trim() ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: '1px solid var(--border-light)'
                }}
                title="添加任务"
              >
                <span style={{ fontSize: '1.1rem', lineHeight: 1, marginRight: '0.25rem' }}>＋</span>
                <span>任务</span>
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-body font-semibold" style={{ color: 'var(--text-muted)' }}>加载中...</div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32" style={{ color: 'var(--text-muted)' }}>
            <div className="text-4xl mb-3">📋</div>
            <div className="text-body-large font-semibold">暂无任务</div>
            <div className="text-body-small mt-1">点击上方"+ 任务"开始工作</div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-light)', borderBottom:'1px solid var(--border-light)' }}>
            {tasks
              .filter(task => showAllLevels || !task.parent_id) // 根据筛选条件显示任务
              .sort((a, b) => {
                // 按紧急程度倒序排序
                const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
                const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2;
                const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2;
                
                if (aPriority !== bPriority) {
                  return bPriority - aPriority; // 倒序：紧急度高的在前
                }
                
                // 紧急程度相同时，按创建时间升序排序（旧的在前）
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
              })
              .map((task) => {
              const priorityInfo = priorityMap[task.priority as keyof typeof priorityMap] || priorityMap.medium;
              const statusInfo = statusMap[task.status as keyof typeof statusMap] || statusMap.active;
              const isExpanded = expandedTask === task.id;
              const isSubtask = !!task.parent_id; // 判断是否为子任务
              
              return (
                <div key={task.id} className="group" style={{ borderColor: 'var(--border-light)' }}>
                  {/* 任务单行显示 */}
                  <div 
                    className="flex items-center justify-between p-3 hover:bg-opacity-50 transition-all"
                    style={{ 
                      backgroundColor: isExpanded ? 'var(--background-secondary)' : 'transparent',
                      paddingLeft: isSubtask ? '2rem' : '1rem', // 子任务增加左侧缩进
                      paddingRight: 0
                    }}
                  >
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      {/* 展开/收缩指示器 */}
                      <button 
                        className="text-xs cursor-pointer hover:opacity-70 transition-opacity" 
                        style={{ color: 'var(--text-muted)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskClick(task);
                        }}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                      
                      {/* 子任务标识 */}
                      {isSubtask && (
                        <div className="flex items-center space-x-1">
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>└</span>
                          <span 
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: 'var(--accent-amber)', color: 'white' }}
                          >
                            子任务
                          </span>
                        </div>
                      )}
                      
                      {/* 任务内容 */}
                      <div className="flex-1 min-w-0">
                        {editingTask === task.id ? (
                          <input
                            type="text"
                            value={editingTaskContent[task.id] || task.content}
                            onChange={(e) => setEditingTaskContent(prev => ({
                              ...prev,
                              [task.id]: e.target.value
                            }))}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                saveTaskEdit(task.id);
                              } else if (e.key === 'Escape') {
                                cancelEditingTask();
                              }
                            }}
                            onBlur={() => saveTaskEdit(task.id)}
                            className="w-full px-2 py-1 text-body font-medium rounded form-input"
                            style={{
                              backgroundColor: 'var(--card-background)',
                              border: '1px solid var(--border-light)',
                              color: isSubtask ? 'var(--text-secondary)' : 'var(--text-primary)'
                            }}
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="text-body font-medium cursor-pointer hover:underline task-content-truncated task-content-responsive main-task-width block" 
                            style={{ 
                              color: isSubtask ? 'var(--text-secondary)' : 'var(--text-primary)'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingTask(task.id, task.content);
                            }}
                            title={task.content}
                          >
                            {/* 为guest用户的top level task添加GUEST标签 */}
                            {!isSubtask && task.user_id === null && (
                              <span className="inline-block text-xs px-2 py-1 rounded mr-2 font-medium" style={{ backgroundColor: 'var(--background-secondary)', color: 'var(--text-muted)' }}>
                                GUEST
                              </span>
                            )}
                            {task.content}
                          </span>
                        )}
                      </div>
                      
                      {/* 状态和优先级标签 */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {/* 可点击的任务类型标签带下拉菜单 */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTaskTypeDropdownOpen(taskTypeDropdownOpen === task.id ? null : task.id);
                            }}
                            className="px-2 py-1 rounded-lg text-xs font-medium cursor-pointer hover:opacity-80 transition-all flex items-center space-x-1"
                            style={getTaskTypeStyle(taskTypeMap[task.task_type as keyof typeof taskTypeMap]?.color || 'default')}
                          >
                            <span>{taskTypeMap[task.task_type as keyof typeof taskTypeMap]?.label || '工作'}</span>
                            <span className="text-xs">▼</span>
                          </button>
                          
                          {/* 任务类型下拉菜单 */}
                          {taskTypeDropdownOpen === task.id && (
                            <div {...getDropdownStyle()}>
                              {Object.entries(taskTypeMap).map(([key, info]) => (
                                <button
                                  key={key}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateTaskType(task.id, key);
                                    setTaskTypeDropdownOpen(null);
                                  }}
                                  {...getDropdownItemStyle(task.task_type === key)}
                                >
                                  {info.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* 可点击的优先级标签带下拉菜单 */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPriorityDropdownOpen(priorityDropdownOpen === task.id ? null : task.id);
                            }}
                            className="px-2 py-1 rounded-lg text-xs font-medium cursor-pointer hover:opacity-80 transition-all flex items-center space-x-1"
                            style={getPriorityStyle(priorityInfo.color)}
                          >
                            <span>{priorityInfo.label}</span>
                            <span className="text-xs">▼</span>
                          </button>
                          
                          {/* 优先级下拉菜单 */}
                          {priorityDropdownOpen === task.id && (
                            <div {...getDropdownStyle()}>
                              {Object.entries(priorityMap).map(([key, info]) => (
                                <button
                                  key={key}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdatePriority(task.id, key);
                                    setPriorityDropdownOpen(null);
                                  }}
                                  {...getDropdownItemStyle(task.priority === key)}
                                >
                                  {info.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* 可点击的状态标签带下拉菜单 */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusDropdownOpen(statusDropdownOpen === task.id ? null : task.id);
                            }}
                            className="px-2 py-1 rounded-lg text-xs font-medium cursor-pointer hover:opacity-80 transition-all flex items-center space-x-1"
                            style={getStatusStyle(statusInfo.color)}
                          >
                            <span>{statusInfo.label}</span>
                            <span className="text-xs">▼</span>
                          </button>
                          
                          {/* 状态下拉菜单 */}
                          {statusDropdownOpen === task.id && (
                            <div {...getDropdownStyle()}>
                              {Object.entries(statusMap).map(([key, info]) => (
                                <button
                                  key={key}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(task.id, key);
                                    setStatusDropdownOpen(null);
                                  }}
                                  {...getDropdownItemStyle(task.status === key)}
                                >
                                  {info.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 进展概要 */}
                      {task.progress_notes && (
                        <div className="flex items-center space-x-2 flex-shrink-0 max-w-32" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskClick(task);
                        }}
                        >
                          <span className="text-body-small font-medium truncate" style={{ color: 'var(--text-secondary)' }} title={task.progress_notes}>
                            📝 {task.progress_notes}
                          </span>
                        </div>
                      )}
                      
                      {/* 时间 */}
                      <div className="text-caption" style={{ color: 'var(--text-muted)', marginRight: 4 }}>
                        {formatDate(task.created_at)}
                      </div>
                      
                      {/* 操作按钮 */}
                      <div className="flex items-center space-x-0.25">
                        {/* 添加子任务按钮 - 只对非子任务显示 */}
                        {!isSubtask && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsAddingSubtask(isAddingSubtask === task.id ? null : task.id);
                            }}
                            className="px-1 py-0.75 rounded-lg text-sm font-medium transition-all flex items-center"
                            style={{
                              backgroundColor: 'transparent',
                              color: 'var(--text-secondary)',
                            }}
                            title="添加子任务"
                          >
                            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>＋</span>
                          </button>
                        )}
                        
                        {/* 番茄按钮 */}
                        {isAuthenticated && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToPomodoro(task.id);
                            }}
                            disabled={isAddingToPomodoro === task.id}
                            className="px-2 py-1 rounded-lg text-xs font-medium transition-all flex items-center"
                            title="添加到番茄钟并开始专注"
                          >
                            <Clock className="w-4 h-4" />
                            <span>{isAddingToPomodoro === task.id ? '添加中...' : ''}</span>
                          </button>
                        )}
                        
                        <DeleteButton
                          id={task.id}
                          deleteConfirm={deleteConfirm}
                          onDelete={(id) => {
                            handleDelete(id);
                          }}
                          onSetDeleteConfirm={(id) => {
                            setDeleteConfirm(id);
                          }}
                          size="small"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 顶级任务的添加子任务输入框 */}
                  {!isSubtask && isAddingSubtask === task.id && (
                    <div className="pl-12 pr-4 pb-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={newSubtaskContent[task.id] || ''}
                          onChange={(e) => handleSubtaskContentChange(task.id, e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddSubtask(task.id);
                            }
                          }}
                          placeholder="输入子任务内容..."
                          className="flex-1 px-2 py-1 rounded text-xs form-input"
                          style={{
                            backgroundColor: 'var(--card-background)',
                            border: '1px solid var(--border-light)',
                            color: 'var(--text-primary)'
                          }}
                          autoFocus
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddSubtask(task.id);
                          }}
                          className="px-2 py-1 rounded text-xs btn-primary"
                          disabled={!newSubtaskContent[task.id]?.trim()}
                        >
                          添加
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 一级子任务内联显示 - 只在显示顶级任务且不是子任务且任务未展开时显示，但用户选择只显示主任务时不显示，且未折叠时显示 */}
                  {!showAllLevels && !isSubtask && !isExpanded && !isCollapsed && task.subtasks && task.subtasks.length > 0 && (
                    <div className="pl-12 pb-2">
                      {(
                        showAllInlineSubtasks.has(task.id)
                          ? task.subtasks
                          : task.subtasks.slice(0, 3)
                      ).map((subtask: Record, _index: number) => (
                        <div 
                          key={subtask.id} 
                          className="group"
                          style={{ 
                            borderLeft: '2px solid var(--border-light)', 
                            marginLeft: '8px',
                            color: 'var(--text-tertiary)'
                          }}
                        >
                          {/* 子任务主行 */}
                          <div className="flex items-center justify-between py-1 text-body-small" style={{ paddingLeft: '12px' }}>
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>└</span>
                              
                              {/* 子任务内容 - 可点击编辑 */}
                              {editingSubtask === subtask.id ? (
                                <input
                                  type="text"
                                  value={editingSubtaskContent[subtask.id] || subtask.content}
                                  onChange={(e) => setEditingSubtaskContent(prev => ({
                                    ...prev,
                                    [subtask.id]: e.target.value
                                  }))}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      saveSubtaskEdit(subtask.id, task.id);
                                    } else if (e.key === 'Escape') {
                                      cancelEditingSubtask();
                                    }
                                  }}
                                  onBlur={() => saveSubtaskEdit(subtask.id, task.id)}
                                  className="flex-1 px-2 py-1 text-xs rounded form-input"
                                  style={{
                                    backgroundColor: 'var(--card-background)',
                                    border: '1px solid var(--border-light)',
                                    color: 'var(--text-primary)'
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <span 
                                  className="font-medium cursor-pointer hover:underline task-content-truncated task-content-responsive subtask-width block"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditingSubtask(subtask.id, subtask.content);
                                  }}
                                  title={subtask.content}
                                >
                                  {subtask.content}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              {/* 可点击编辑的子任务优先级标签 */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPriorityDropdownOpen(priorityDropdownOpen === subtask.id ? null : subtask.id);
                                  }}
                                  className="px-2 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-all flex items-center space-x-1"
                                  style={getPriorityStyle(priorityMap[subtask.priority as keyof typeof priorityMap]?.color || 'default')}
                                  title="点击修改优先级"
                                >
                                  <span>{priorityMap[subtask.priority as keyof typeof priorityMap]?.label || '中'}</span>
                                  <span className="text-xs">▼</span>
                                </button>
                                
                                {/* 子任务优先级下拉菜单 */}
                                {priorityDropdownOpen === subtask.id && (
                                  <div {...getDropdownStyle()}>
                                    {Object.entries(priorityMap).map(([key, info]) => (
                                      <button
                                        key={key}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdatePriority(subtask.id, key);
                                          setPriorityDropdownOpen(null);
                                        }}
                                        {...getDropdownItemStyle(subtask.priority === key)}
                                      >
                                        {info.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              {/* 可点击编辑的状态标签 */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStatusDropdownOpen(statusDropdownOpen === subtask.id ? null : subtask.id);
                                  }}
                                  className="px-2 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-all flex items-center space-x-1"
                                  style={getStatusStyle(statusMap[subtask.status as keyof typeof statusMap]?.color || 'default')}
                                  title="点击修改状态"
                                >
                                  <span>{statusMap[subtask.status as keyof typeof statusMap]?.label || subtask.status}</span>
                                  <span className="text-xs">▼</span>
                                </button>
                                
                                {/* 子任务状态下拉菜单 */}
                                {statusDropdownOpen === subtask.id && (
                                  <div {...getDropdownStyle()}>
                                    {Object.entries(statusMap).map(([key, info]) => (
                                      <button
                                        key={key}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateSubtaskStatus(subtask.id, task.id, key);
                                          setStatusDropdownOpen(null);
                                        }}
                                        {...getDropdownItemStyle(subtask.status === key)}
                                      >
                                        {info.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              {/* 子任务时间 */}
                              <div className="text-caption" style={{ color: 'var(--text-muted)' }}>
                                {formatDate(subtask.created_at)}
                              </div>
                              
                              {/* 添加子任务按钮 */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsAddingSubtask(isAddingSubtask === subtask.id ? null : subtask.id);
                                }}
                                className="px-0.5 py-0.5 rounded text-xs font-medium transition-all flex items-center"
                                style={{
                                  backgroundColor: 'transparent',
                                  color: 'var(--text-secondary)',
                                }}
                                title="为此子任务添加子任务"
                              >
                                <span style={{ fontSize: '1.0rem', lineHeight: 1 }}>＋</span>
                              </button>
                              
                              {/* 番茄按钮 */}
                              {isAuthenticated && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToPomodoro(subtask.id);
                                  }}
                                  disabled={isAddingToPomodoro === subtask.id}
                                  className="px-1.5 py-0.5 rounded text-xs font-medium transition-all flex items-center space-x-1"
                                  title="添加到番茄钟并开始专注"
                                >
                                  <Clock className="w-4 h-4" />
                                  <span>{isAddingToPomodoro === subtask.id ? '...' : ''}</span>
                                </button>
                              )}
                              
                              {/* 删除子任务按钮 */}
                              <DeleteButton
                                id={subtask.id}
                                deleteConfirm={deleteSubtaskConfirm}
                                onDelete={(id) => {
                                  handleDeleteSubtask(id, task.id);
                                }}
                                onSetDeleteConfirm={(id) => {
                                  setDeleteSubtaskConfirm(id);
                                }}
                                size="small"
                              />
                            </div>
                          </div>

                          {/* 子任务的添加子任务输入框 */}
                          {isAddingSubtask === subtask.id && (
                            <div className="pl-6 pb-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={newSubtaskContent[subtask.id] || ''}
                                  onChange={(e) => handleSubtaskContentChange(subtask.id, e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleAddSubtask(subtask.id);
                                    }
                                  }}
                                  placeholder="输入子任务内容..."
                                  className="flex-1 px-2 py-1 rounded text-xs form-input"
                                  style={{
                                    backgroundColor: 'var(--card-background)',
                                    border: '1px solid var(--border-light)',
                                    color: 'var(--text-primary)'
                                  }}
                                  autoFocus
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddSubtask(subtask.id);
                                  }}
                                  className="px-2 py-1 rounded text-xs btn-primary"
                                  disabled={!newSubtaskContent[subtask.id]?.trim()}
                                >
                                  添加
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 递归显示子任务的子任务 */}
                          {subtask.subtasks && subtask.subtasks.length > 0 && (
                            <div className="pl-4">
                              {subtask.subtasks.map((subSubtask: Record) => (
                                <div 
                                  key={subSubtask.id} 
                                  className="group flex items-center justify-between py-1 text-body-small"
                                  style={{ 
                                    borderLeft: '2px solid var(--border-light)', 
                                    paddingLeft: '12px',
                                    marginLeft: '8px',
                                    color: 'var(--text-tertiary)'
                                  }}
                                >
                                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>└└</span>
                                    
                                    {/* 子子任务内容 - 可点击编辑 */}
                                    {editingSubtask === subSubtask.id ? (
                                      <input
                                        type="text"
                                        value={editingSubtaskContent[subSubtask.id] || subSubtask.content}
                                        onChange={(e) => setEditingSubtaskContent(prev => ({
                                          ...prev,
                                          [subSubtask.id]: e.target.value
                                        }))}
                                        onKeyPress={(e) => {
                                          if (e.key === 'Enter') {
                                            saveSubtaskEdit(subSubtask.id, subtask.id);
                                          } else if (e.key === 'Escape') {
                                            cancelEditingSubtask();
                                          }
                                        }}
                                        onBlur={() => saveSubtaskEdit(subSubtask.id, subtask.id)}
                                        className="flex-1 px-2 py-1 text-xs rounded form-input"
                                        style={{
                                          backgroundColor: 'var(--card-background)',
                                          border: '1px solid var(--border-light)',
                                          color: 'var(--text-primary)'
                                        }}
                                        autoFocus
                                      />
                                    ) : (
                                      <span 
                                        className="font-medium cursor-pointer hover:underline task-content-truncated task-content-responsive subtask-width block"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          startEditingSubtask(subSubtask.id, subSubtask.content);
                                        }}
                                        title={subSubtask.content}
                                      >
                                        {subSubtask.content}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2 flex-shrink-0">
                                    {/* 子子任务优先级标签 */}
                                    <div className="relative">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPriorityDropdownOpen(priorityDropdownOpen === subSubtask.id ? null : subSubtask.id);
                                        }}
                                        className="px-2 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-all flex items-center space-x-1"
                                        style={getPriorityStyle(priorityMap[subSubtask.priority as keyof typeof priorityMap]?.color || 'default')}
                                        title="点击修改优先级"
                                      >
                                        <span>{priorityMap[subSubtask.priority as keyof typeof priorityMap]?.label || '中'}</span>
                                        <span className="text-xs">▼</span>
                                      </button>
                                      
                                      {priorityDropdownOpen === subSubtask.id && (
                                        <div {...getDropdownStyle()}>
                                          {Object.entries(priorityMap).map(([key, info]) => (
                                            <button
                                              key={key}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleUpdatePriority(subSubtask.id, key);
                                                setPriorityDropdownOpen(null);
                                              }}
                                              {...getDropdownItemStyle(subSubtask.priority === key)}
                                            >
                                              {info.label}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* 子子任务状态标签 */}
                                    <div className="relative">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setStatusDropdownOpen(statusDropdownOpen === subSubtask.id ? null : subSubtask.id);
                                        }}
                                        className="px-2 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-all flex items-center space-x-1"
                                        style={getStatusStyle(statusMap[subSubtask.status as keyof typeof statusMap]?.color || 'default')}
                                        title="点击修改状态"
                                      >
                                        <span>{statusMap[subSubtask.status as keyof typeof statusMap]?.label || subSubtask.status}</span>
                                        <span className="text-xs">▼</span>
                                      </button>
                                      
                                      {statusDropdownOpen === subSubtask.id && (
                                        <div {...getDropdownStyle()}>
                                          {Object.entries(statusMap).map(([key, info]) => (
                                            <button
                                              key={key}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateSubtaskStatus(subSubtask.id, subtask.id, key);
                                                setStatusDropdownOpen(null);
                                              }}
                                              {...getDropdownItemStyle(subSubtask.status === key)}
                                            >
                                              {info.label}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* 子子任务时间 */}
                                    <div className="text-caption" style={{ color: 'var(--text-muted)' }}>
                                      {formatDate(subSubtask.created_at)}
                                    </div>
                                    
                                    {/* 番茄按钮 */}
                                    {isAuthenticated && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAddToPomodoro(subSubtask.id);
                                        }}
                                        disabled={isAddingToPomodoro === subSubtask.id}
                                        className="px-1.5 py-0.5 rounded text-xs font-medium transition-all flex items-center space-x-1"
                                        title="添加到番茄钟并开始专注"
                                      >
                                        <Clock className="w-4 h-4" />
                                        <span>{isAddingToPomodoro === subSubtask.id ? '...' : ''}</span>
                                      </button>
                                    )}
                                    
                                    {/* 删除子子任务按钮 */}
                                    <DeleteButton
                                      id={subSubtask.id}
                                      deleteConfirm={deleteSubtaskConfirm}
                                      onDelete={(id) => {
                                        handleDeleteSubtask(id, subtask.id);
                                      }}
                                      onSetDeleteConfirm={(id) => {
                                        setDeleteSubtaskConfirm(id);
                                      }}
                                      size="small"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {task.subtasks.length > 3 && !showAllInlineSubtasks.has(task.id) && (
                        <div 
                          className="py-1 text-xs font-medium cursor-pointer hover:underline"
                          style={{ 
                            color: 'var(--primary)',
                            paddingLeft: '20px'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = new Set(showAllInlineSubtasks);
                            next.add(task.id);
                            setShowAllInlineSubtasks(next);
                          }}
                        >
                          还有 {task.subtasks!.length - 3} 个子任务...
                        </div>
                      )}
                      {task.subtasks.length > 3 && showAllInlineSubtasks.has(task.id) && (
                        <div 
                          className="py-1 text-xs font-medium cursor-pointer hover:underline"
                          style={{ 
                            color: 'var(--primary)',
                            paddingLeft: '20px'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = new Set(showAllInlineSubtasks);
                            next.delete(task.id);
                            setShowAllInlineSubtasks(next);
                          }}
                        >
                          收起子任务
                        </div>
                      )}
                    </div>
                  )}

                  {/* 简化的展开区域 - 只显示进展记录编辑 */}
                  {isExpanded && (
                    <div className="pl-12 pr-6 py-4" style={{ backgroundColor: 'var(--background-secondary)', borderTop: '1px solid var(--border-light)' }}>
                      <div className="space-y-4">
                        {/* 进展记录编辑区域 */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-caption" style={{ color: 'var(--text-muted)' }}>
                                {getCurrentProgressNotes(task.id).length} 字符 • Ctrl+Z撤销
                              </span>
                              {progressNotesHistory[task.id] && progressNotesHistory[task.id].length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    undoProgressNotesChange(task.id);
                                  }}
                                  className="text-xs px-2 py-1 rounded btn-secondary"
                                  title="撤销 (Ctrl+Z)"
                                >
                                  ↶ 撤销
                                </button>
                              )}
                            </div>
                            
                            <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowAISuggestions(task.id);
                                  }}
                                  className="text-xs px-3 py-1 rounded btn-primary"
                                  style={{ background: 'var(--accent-purple)', borderColor: 'var(--accent-purple)' }}
                                >
                                  🤖 AI分析
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowStrategySuggestions(task.id);
                                  }}
                                  className="text-xs px-3 py-1 rounded btn-primary"
                                  style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }}
                                  title="AI策略建议"
                                >
                                  🎯 策略建议
                            </button>
                          </div>
                          <textarea
                            value={getCurrentProgressNotes(task.id)}
                            onChange={(e) => handleProgressNotesChange(task.id, e.target.value)}
                            onBlur={() => saveProgressNotesImmediately(task.id)}
                            onCompositionStart={() => {
                              // 中文输入开始时，清除自动保存定时器
                              if (saveTimeouts[task.id]) {
                                clearTimeout(saveTimeouts[task.id]);
                              }
                            }}
                            onCompositionEnd={(e) => {
                              // 中文输入结束时，重新开始自动保存
                              handleProgressNotesChange(task.id, e.currentTarget.value);
                            }}
                            placeholder="记录当前进展、遇到的问题和难点..."
                            className="w-full p-4 rounded-lg form-input text-body-small resize-none"
                            rows={5}
                            style={{
                              backgroundColor: 'var(--card-background)',
                              border: '1px solid var(--border-light)',
                              color: 'var(--text-primary)',
                              minHeight: '120px'
                            }}
                          />
                        </div>

                        {/* 子任务管理区域 */}
                        {!isSubtask && (
                          <div className="space-y-3" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                            <div className="flex items-center justify-between">
                              <label className="text-body-small font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                📋 子任务管理：
                              </label>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  className="text-xs px-3 py-1 rounded btn-secondary"
                                  title="查看任务详情"
                                >
                                  📋 详情
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsAddingSubtask(isAddingSubtask === task.id ? null : task.id);
                                  }}
                                  className="text-xs px-3 py-1 rounded btn-primary"
                                >
                                  {isAddingSubtask === task.id ? '取消添加' : '+ 添加子任务'}
                                </button>
                              </div>
                            </div>

                            {/* 添加子任务输入框 */}
                            {isAddingSubtask === task.id && (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={newSubtaskContent[task.id] || ''}
                                  onChange={(e) => handleSubtaskContentChange(task.id, e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleAddSubtask(task.id);
                                    }
                                  }}
                                  placeholder="输入子任务内容..."
                                  className="flex-1 px-3 py-2 rounded-lg form-input text-body-small"
                                  style={{
                                    backgroundColor: 'var(--card-background)',
                                    border: '1px solid var(--border-light)',
                                    color: 'var(--text-primary)'
                                  }}
                                  autoFocus
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddSubtask(task.id);
                                  }}
                                  className="px-3 py-2 rounded-lg btn-primary text-body-small"
                                  disabled={!newSubtaskContent[task.id]?.trim()}
                                >
                                  添加
                                </button>
                              </div>
                            )}

                            {/* 所有子任务列表 */}
                            {task.subtasks && task.subtasks.length > 0 && (
                              // 展开详情中：完整展示所有子任务，去除内部滚动和高度限制
                              <div className="space-y-2">
                                {task.subtasks.map((subtask: Record) => (
                                  <div key={subtask.id} className="space-y-2">
                                    {/* 主子任务 */}
                                    <div 
                                      className="group flex items-center justify-between p-2 rounded-lg hover:bg-opacity-50 transition-all"
                                      style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border-light)' }}
                                    >
                                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>└</span>
                                        
                                        {/* 子任务内容 - 可点击编辑 */}
                                        {editingSubtask === subtask.id ? (
                                          <input
                                            type="text"
                                            value={editingSubtaskContent[subtask.id] || subtask.content}
                                            onChange={(e) => setEditingSubtaskContent(prev => ({
                                              ...prev,
                                              [subtask.id]: e.target.value
                                            }))}
                                            onKeyPress={(e) => {
                                              if (e.key === 'Enter') {
                                                saveSubtaskEdit(subtask.id, task.id);
                                              } else if (e.key === 'Escape') {
                                                cancelEditingSubtask();
                                              }
                                            }}
                                            onBlur={() => saveSubtaskEdit(subtask.id, task.id)}
                                            className="flex-1 px-2 py-1 text-body-small rounded form-input"
                                            style={{
                                              backgroundColor: 'var(--card-background)',
                                              border: '1px solid var(--border-light)',
                                              color: 'var(--text-primary)'
                                            }}
                                            autoFocus
                                          />
                                        ) : (
                                          <span 
                                            className="text-body-small font-medium cursor-pointer hover:underline task-content-truncated task-content-responsive subtask-width block"
                                            style={{ 
                                              color: 'var(--text-primary)'
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              startEditingSubtask(subtask.id, subtask.content);
                                            }}
                                            title={subtask.content}
                                          >
                                            {subtask.content}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {/* 可点击编辑的子任务优先级标签 */}
                                        <div className="relative">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPriorityDropdownOpen(priorityDropdownOpen === subtask.id ? null : subtask.id);
                                            }}
                                            className="px-2 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-all flex items-center space-x-1"
                                            style={getPriorityStyle(priorityMap[subtask.priority as keyof typeof priorityMap]?.color || 'default')}
                                            title="点击修改优先级"
                                          >
                                            <span>{priorityMap[subtask.priority as keyof typeof priorityMap]?.label || '中'}</span>
                                            <span className="text-xs">▼</span>
                                          </button>
                                          
                                          {/* 子任务优先级下拉菜单 */}
                                          {priorityDropdownOpen === subtask.id && (
                                            <div {...getDropdownStyle()}>
                                              {Object.entries(priorityMap).map(([key, info]) => (
                                                <button
                                                  key={key}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUpdatePriority(subtask.id, key);
                                                    setPriorityDropdownOpen(null);
                                                  }}
                                                  {...getDropdownItemStyle(subtask.priority === key)}
                                                >
                                                  {info.label}
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* 可点击编辑的状态标签 */}
                                        <div className="relative">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setStatusDropdownOpen(statusDropdownOpen === subtask.id ? null : subtask.id);
                                            }}
                                            className="px-2 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-all flex items-center space-x-1"
                                            style={getStatusStyle(statusMap[subtask.status as keyof typeof statusMap]?.color || 'default')}
                                            title="点击修改状态"
                                          >
                                            <span>{statusMap[subtask.status as keyof typeof statusMap]?.label || subtask.status}</span>
                                            <span className="text-xs">▼</span>
                                          </button>
                                          
                                          {/* 子任务状态下拉菜单 */}
                                          {statusDropdownOpen === subtask.id && (
                                            <div {...getDropdownStyle()}>
                                              {Object.entries(statusMap).map(([key, info]) => (
                                                <button
                                                  key={key}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateSubtaskStatus(subtask.id, task.id, key);
                                                    setStatusDropdownOpen(null);
                                                  }}
                                                  {...getDropdownItemStyle(subtask.status === key)}
                                                >
                                                  {info.label}
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* 添加子任务按钮 */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setIsAddingSubtask(isAddingSubtask === subtask.id ? null : subtask.id);
                                          }}
                                          className="px-1 py-1 rounded text-xs font-medium transition-all flex items-center"
                                          style={{
                                            backgroundColor: 'transparent',
                                            color: 'var(--text-secondary)',
                                            border: '0px solid var(--border-light)'
                                          }}
                                          title="为此子任务添加子任务"
                                        >
                                          <span style={{ fontSize: '1.05rem', lineHeight: 1, marginRight: '0rem' }}>＋</span>
                                          <span>子任务</span>
                                        </button>
                                        
                                        {/* 番茄按钮 */}
                                        {isAuthenticated && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleAddToPomodoro(subtask.id);
                                            }}
                                            disabled={isAddingToPomodoro === subtask.id}
                                            className="px-2 py-1 rounded text-xs font-medium transition-all flex items-center space-x-1"
                                            style={{
                                              backgroundColor: isAddingToPomodoro === subtask.id ? 'var(--text-disabled)' : 'var(--error)',
                                              color: 'white',
                                              border: `1px solid ${isAddingToPomodoro === subtask.id ? 'var(--text-disabled)' : 'var(--error)'}`,
                                              opacity: isAddingToPomodoro === subtask.id ? 0.6 : 1
                                            }}
                                            title="添加到番茄钟并开始专注"
                                          >
                                            <span>🍅</span>
                                            <span>{isAddingToPomodoro === subtask.id ? '添加中...' : '番茄'}</span>
                                          </button>
                                        )}
                                        
                                        {/* 删除子任务按钮 */}
                                        <DeleteButton
                                          id={subtask.id}
                                          deleteConfirm={deleteSubtaskConfirm}
                                          onDelete={(id) => {
                                            handleDeleteSubtask(id, task.id);
                                          }}
                                          onSetDeleteConfirm={(id) => {
                                            setDeleteSubtaskConfirm(id);
                                          }}
                                          size="small"
                                        />
                                        
                                        {/* 子任务时间 */}
                                        <div className="text-caption" style={{ color: 'var(--text-muted)' }}>
                                          {formatDate(subtask.created_at)}
                                        </div>
                                      </div>
                                    </div>

                                    {/* 子任务的添加子任务输入框 */}
                                    {isAddingSubtask === subtask.id && (
                                      <div className="pl-6">
                                        <div className="flex items-center space-x-2">
                                          <input
                                            type="text"
                                            value={newSubtaskContent[subtask.id] || ''}
                                            onChange={(e) => handleSubtaskContentChange(subtask.id, e.target.value)}
                                            onKeyPress={(e) => {
                                              if (e.key === 'Enter') {
                                                handleAddSubtask(subtask.id);
                                              }
                                            }}
                                            placeholder="输入子任务内容..."
                                            className="flex-1 px-3 py-2 rounded-lg form-input text-body-small"
                                            style={{
                                              backgroundColor: 'var(--card-background)',
                                              border: '1px solid var(--border-light)',
                                              color: 'var(--text-primary)'
                                            }}
                                            autoFocus
                                          />
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleAddSubtask(subtask.id);
                                            }}
                                            className="px-3 py-2 rounded-lg btn-primary text-body-small"
                                            disabled={!newSubtaskContent[subtask.id]?.trim()}
                                          >
                                            添加
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {/* 递归显示子任务的子任务 */}
                                    {subtask.subtasks && subtask.subtasks.length > 0 && (
                                      <div className="pl-6 space-y-2">
                                        {subtask.subtasks.map((subSubtask: Record) => (
                                          <div 
                                            key={subSubtask.id}
                                            className="group flex items-center justify-between p-2 rounded-lg hover:bg-opacity-50 transition-all"
                                            style={{ backgroundColor: 'var(--background-secondary)', border: '1px solid var(--border-light)' }}
                                          >
                                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>└└</span>
                                              
                                              {/* 子子任务内容 - 可点击编辑 */}
                                              {editingSubtask === subSubtask.id ? (
                                                <input
                                                  type="text"
                                                  value={editingSubtaskContent[subSubtask.id] || subSubtask.content}
                                                  onChange={(e) => setEditingSubtaskContent(prev => ({
                                                    ...prev,
                                                    [subSubtask.id]: e.target.value
                                                  }))}
                                                  onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                      saveSubtaskEdit(subSubtask.id, subtask.id);
                                                    } else if (e.key === 'Escape') {
                                                      cancelEditingSubtask();
                                                    }
                                                  }}
                                                  onBlur={() => saveSubtaskEdit(subSubtask.id, subtask.id)}
                                                  className="flex-1 px-2 py-1 text-body-small rounded form-input"
                                                  style={{
                                                    backgroundColor: 'var(--card-background)',
                                                    border: '1px solid var(--border-light)',
                                                    color: 'var(--text-primary)'
                                                  }}
                                                  autoFocus
                                                />
                                              ) : (
                                                <span 
                                                  className="text-body-small font-medium cursor-pointer hover:underline task-content-truncated task-content-responsive subtask-width block"
                                                  style={{ 
                                                    color: 'var(--text-primary)'
                                                  }}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    startEditingSubtask(subSubtask.id, subSubtask.content);
                                                  }}
                                                  title={subSubtask.content}
                                                >
                                                  {subSubtask.content}
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center space-x-2">
                                              {/* 子子任务优先级标签 */}
                                              <div className="relative">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPriorityDropdownOpen(priorityDropdownOpen === subSubtask.id ? null : subSubtask.id);
                                                  }}
                                                  className="px-2 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-all flex items-center space-x-1"
                                                  style={getPriorityStyle(priorityMap[subSubtask.priority as keyof typeof priorityMap]?.color || 'default')}
                                                  title="点击修改优先级"
                                                >
                                                  <span>{priorityMap[subSubtask.priority as keyof typeof priorityMap]?.label || '中'}</span>
                                                  <span className="text-xs">▼</span>
                                                </button>
                                                
                                                {priorityDropdownOpen === subSubtask.id && (
                                                  <div {...getDropdownStyle()}>
                                                    {Object.entries(priorityMap).map(([key, info]) => (
                                                      <button
                                                        key={key}
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleUpdatePriority(subSubtask.id, key);
                                                          setPriorityDropdownOpen(null);
                                                        }}
                                                        {...getDropdownItemStyle(subSubtask.priority === key)}
                                                      >
                                                        {info.label}
                                                      </button>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                              
                                              {/* 子子任务状态标签 */}
                                              <div className="relative">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setStatusDropdownOpen(statusDropdownOpen === subSubtask.id ? null : subSubtask.id);
                                                  }}
                                                  className="px-2 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-all flex items-center space-x-1"
                                                  style={getStatusStyle(statusMap[subSubtask.status as keyof typeof statusMap]?.color || 'default')}
                                                  title="点击修改状态"
                                                >
                                                  <span>{statusMap[subSubtask.status as keyof typeof statusMap]?.label || subSubtask.status}</span>
                                                  <span className="text-xs">▼</span>
                                                </button>
                                                
                                                {statusDropdownOpen === subSubtask.id && (
                                                  <div {...getDropdownStyle()}>
                                                    {Object.entries(statusMap).map(([key, info]) => (
                                                      <button
                                                        key={key}
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          updateSubtaskStatus(subSubtask.id, subtask.id, key);
                                                          setStatusDropdownOpen(null);
                                                        }}
                                                        {...getDropdownItemStyle(subSubtask.status === key)}
                                                      >
                                                        {info.label}
                                                      </button>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                              
                                              {/* 番茄按钮 */}
                                              {isAuthenticated && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddToPomodoro(subSubtask.id);
                                                  }}
                                                  disabled={isAddingToPomodoro === subSubtask.id}
                                                  className="px-2 py-1 rounded text-xs font-medium transition-all flex items-center space-x-1"
                                                  style={{
                                                    backgroundColor: isAddingToPomodoro === subSubtask.id ? 'var(--text-disabled)' : 'var(--error)',
                                                    color: 'white',
                                                    border: `1px solid ${isAddingToPomodoro === subSubtask.id ? 'var(--text-disabled)' : 'var(--error)'}`,
                                                    opacity: isAddingToPomodoro === subSubtask.id ? 0.6 : 1
                                                  }}
                                                  title="添加到番茄钟并开始专注"
                                                >
                                                  <span>🍅</span>
                                                  <span>{isAddingToPomodoro === subSubtask.id ? '...' : ''}</span>
                                                </button>
                                              )}
                                              
                                              {/* 删除子子任务按钮 */}
                                              <DeleteButton
                                                id={subSubtask.id}
                                                deleteConfirm={deleteSubtaskConfirm}
                                                onDelete={(id) => {
                                                  handleDeleteSubtask(id, subtask.id);
                                                }}
                                                onSetDeleteConfirm={(id) => {
                                                  setDeleteSubtaskConfirm(id);
                                                }}
                                                size="small"
                                              />
                                              
                                              {/* 子子任务时间 */}
                                              <div className="text-caption" style={{ color: 'var(--text-muted)' }}>
                                                {formatDate(subSubtask.created_at)}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {task.subtasks && task.subtasks.length === 0 && !isAddingSubtask && (
                              <div className="text-center py-4 text-caption" style={{ color: 'var(--text-muted)' }}>
                                暂无子任务，点击上方按钮添加子任务
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* 翻页组件 */}
      {totalPages > 1 && (
        <div className="p-4 border-t" style={{ borderColor: 'var(--border-light)', backgroundColor: 'var(--card-background)' }}>
          <div className="flex items-center justify-between">
            {/* 左侧：显示任务总数和当前页信息 */}
            <div className="flex items-center space-x-4">
              <span className="text-body-small" style={{ color: 'var(--text-muted)' }}>
                共 {totalTasks} 个任务，第 {currentPage} / {totalPages} 页
              </span>
            </div>
            
            {/* 中间：翻页按钮 */}
            <div className="flex items-center space-x-2">
              {/* 上一页按钮 */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className={`px-3 py-2 rounded-lg text-body-small font-medium transition-all ${
                  currentPage <= 1 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:btn-secondary cursor-pointer'
                }`}
                style={{ 
                  backgroundColor: currentPage <= 1 ? 'var(--background-secondary)' : 'transparent',
                  color: currentPage <= 1 ? 'var(--text-disabled)' : 'var(--text-primary)',
                  border: `1px solid ${currentPage <= 1 ? 'var(--border-light)' : 'var(--border-default)'}`
                }}
              >
                ← 上一页
              </button>
              
              {/* 页码按钮 */}
              <div className="flex items-center space-x-1">
                {generatePageNumbers().map((page, index) => (
                  <button
                    key={index}
                    onClick={() => typeof page === 'number' ? handlePageChange(page) : undefined}
                    disabled={page === '...'}
                    className={`px-3 py-2 rounded-lg text-body-small font-medium transition-all ${
                      page === currentPage
                        ? 'text-white'
                        : page === '...'
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:btn-secondary cursor-pointer'
                    }`}
                    style={{ 
                      backgroundColor: page === currentPage ? 'var(--primary)' : 'transparent',
                      color: page === currentPage ? 'white' : page === '...' ? 'var(--text-disabled)' : 'var(--text-primary)',
                      border: `1px solid ${page === currentPage ? 'var(--primary)' : 'var(--border-light)'}`,
                      minWidth: '40px'
                    }}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              {/* 下一页按钮 */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className={`px-3 py-2 rounded-lg text-body-small font-medium transition-all ${
                  currentPage >= totalPages 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:btn-secondary cursor-pointer'
                }`}
                style={{ 
                  backgroundColor: currentPage >= totalPages ? 'var(--background-secondary)' : 'transparent',
                  color: currentPage >= totalPages ? 'var(--text-disabled)' : 'var(--text-primary)',
                  border: `1px solid ${currentPage >= totalPages ? 'var(--border-light)' : 'var(--border-default)'}`
                }}
              >
                下一页 →
              </button>
            </div>
            
            {/* 右侧：快速跳转 */}
            <div className="flex items-center space-x-2">
              <span className="text-body-small" style={{ color: 'var(--text-muted)' }}>跳转到</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && page <= totalPages) {
                    handlePageChange(page);
                  }
                }}
                className="w-16 px-2 py-1 rounded form-input text-center text-body-small"
                style={{
                  backgroundColor: 'var(--card-background)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)'
                }}
              />
              <span className="text-body-small" style={{ color: 'var(--text-muted)' }}>页</span>
            </div>
          </div>
        </div>
      )}
      
      {/* AI智能分析弹窗 */}
      <AISuggestions
        taskId={showAISuggestions || 0}
        isVisible={showAISuggestions !== null}
        onClose={() => setShowAISuggestions(null)}
        onCreateSubtasks={(_suggestions) => {
          // 重新获取任务列表以显示新创建的子任务
          fetchTasks(searchQuery, statusFilter, priorityFilter, taskTypeFilter, currentPage);
        }}
        autoStart={true}
        accessToken={accessToken || undefined}
      />
      
      {/* AI策略建议弹窗 */}
      <AISuggestions
        taskId={showStrategySuggestions || 0}
        isVisible={showStrategySuggestions !== null}
        onClose={() => setShowStrategySuggestions(null)}
        onCreateSubtasks={(_suggestions) => {
          // 重新获取任务列表以显示新创建的子任务
          fetchTasks(searchQuery, statusFilter, priorityFilter, taskTypeFilter, currentPage);
        }}
        mode="strategy"
        autoStart={true}
        accessToken={accessToken || undefined}
      />
      
      {/* AI聊天侧边栏 */}
      <AIChatSidebar
        isOpen={showAIChatSidebar}
        onClose={() => setShowAIChatSidebar(false)}
        tasks={tasks}
      />
    </div>
  );
}
