import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import UserMenu from '@/components/Auth/UserMenu';
import TaskList from '@/components/QuickCapture/TaskList';
import TaskDetail from '@/components/QuickCapture/TaskDetail';
import PomodoroFocusMode from '@/components/QuickCapture/PomodoroFocusMode';
import SimpleTaskCreator from '@/components/QuickCapture/SimpleTaskCreator';
import { apiPost, apiDelete } from '@/utils/api';

interface TaskCreateData {
  content: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  taskType: 'work' | 'hobby' | 'life';
  estimatedTime?: number;
  tags?: string[];
}

interface PomodoroTask {
  id: string;
  title: string;
  description: string;
  estimatedTime: number;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

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


export default function App() {
  const { isAuthenticated, isLoading: authLoading, accessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedTask, setSelectedTask] = useState<Record | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showAllLevels, setShowAllLevels] = useState(false);
  const [isTaskTypeFilterExpanded, setIsTaskTypeFilterExpanded] = useState(false);
  const [isStatusFilterExpanded, setIsStatusFilterExpanded] = useState(false);
  const [isPriorityFilterExpanded, setIsPriorityFilterExpanded] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentPomodoroTask, setCurrentPomodoroTask] = useState<PomodoroTask | null>(null);
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState('all');
  const [isSubtaskCollapsed, setIsSubtaskCollapsed] = useState(false); // 新增：控制subtask折叠状态

  // 点击外部关闭搜索框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isSearchExpanded && !target.closest('.search-container')) {
        setIsSearchExpanded(false);
      }
    };

    if (isSearchExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchExpanded]);

  // 如果正在加载认证状态，显示加载状态
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">正在加载...</span>
      </div>
    );
  }

  // 显示通知
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // 保存记录
  const handleSave = async (content: string, category: string) => {
    setIsLoading(true);
    try {
      const payload: any = { content, category };
      
      // 如果是guest用户，不指定user_id，让后端自动设置为NULL
      if (!isAuthenticated) {
        // 不需要添加user_id参数，后端会自动处理为NULL
      }
      
      await apiPost(
        '/api/records',
        payload,
        '保存记录',
        accessToken || undefined
      );

      showNotification('记录保存成功！', 'success');
      setShowAddDialog(false); // 关闭对话框
      
    } catch (error) {
      console.error('保存记录失败:', error);
      showNotification(error instanceof Error ? error.message : '保存记录失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 保存详细任务数据
  const handleSaveTaskData = async (taskData: TaskCreateData) => {
    setIsLoading(true);
    try {
      const payload: any = {
        content: taskData.content,
        category: taskData.category,
        priority: taskData.priority,
        task_type: taskData.taskType,
        estimated_time: taskData.estimatedTime,
        tags: taskData.tags?.join(',') || ''
      };
      
      // 如果是guest用户，不指定user_id，让后端自动设置为NULL
      if (!isAuthenticated) {
        // 不需要添加user_id参数，后端会自动处理为NULL
      }

      await apiPost(
        '/api/records',
        payload,
        '保存任务',
        accessToken || undefined
      );

      showNotification('任务创建成功！', 'success');
      setShowAddDialog(false); // 关闭对话框
      
    } catch (error) {
      console.error('保存任务失败:', error);
      showNotification(error instanceof Error ? error.message : '保存任务失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 开始番茄时钟
  const handleStartPomodoro = (task: PomodoroTask) => {
    setCurrentPomodoroTask(task);
    setIsPomodoroActive(true);
    showNotification(`开始专注模式: ${task.title}`, 'success');
  };

  // 番茄时钟完成
  const handlePomodoroComplete = () => {
    showNotification('番茄时钟完成！休息一下吧 🎉', 'success');
  };

  // 番茄时钟暂停
  const handlePomodoroPause = () => {
    showNotification('番茄时钟已暂停', 'success');
  };

  // 番茄时钟停止
  const handlePomodoroStop = () => {
    setCurrentPomodoroTask(null);
    setIsPomodoroActive(false);
    showNotification('番茄时钟已停止', 'success');
  };

  // 删除记录
  const handleDelete = async (id: number) => {
    try {
      await apiDelete(
        `/api/records/${id}`,
        '删除记录',
        accessToken || undefined
      );

      showNotification('记录删除成功', 'success');
      
    } catch (error) {
      console.error('删除记录失败:', error);
      showNotification(error instanceof Error ? error.message : '删除记录失败', 'error');
    }
  };

  // 搜索记录
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const searchEvent = new CustomEvent('taskSearch', { 
      detail: { query } 
    });
    window.dispatchEvent(searchEvent);
  };

  // 获取任务类型显示文本 - 用于折叠按钮
  const getTaskTypeDisplayText = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'all': '类型',
      'work': '工作',
      'hobby': '业余', 
      'life': '生活'
    };
    return typeMap[type] || '类型';
  };

  // 获取状态显示文本 - 用于折叠按钮
  const getStatusDisplayText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'all': '状态',
      'pending': '待办',
      'active': '进行中',
      'completed': '已完成',
      'paused': '暂停',
      'cancelled': '已取消'
    };
    return statusMap[status] || '状态';
  };

  // 获取优先级显示文本 - 用于折叠按钮
  const getPriorityDisplayText = (priority: string) => {
    const priorityMap: { [key: string]: string } = {
      'all': '优先',
      'urgent': '紧急',
      'high': '高',
      'medium': '中',
      'low': '低'
    };
    return priorityMap[priority] || '优先';
  };

  // 获取搜索显示文本 - 用于折叠按钮
  const getSearchDisplayText = (query: string) => {
    if (!query || query.trim() === '') {
      return '搜索';
    }
    return query.length > 10 ? query.substring(0, 10) + '...' : query;
  };

  // 处理筛选
  const handleFilter = (type: string, value: string) => {
    if (type === 'status') {
      setStatusFilter(value);
      // 选择状态后自动折叠
      setIsStatusFilterExpanded(false);
    } else if (type === 'priority') {
      setPriorityFilter(value);
      // 选择优先级后自动折叠
      setIsPriorityFilterExpanded(false);
    } else if (type === 'taskType') {
      setSelectedTaskType(value);
      // 选择任务类型后自动折叠
      setIsTaskTypeFilterExpanded(false);
    } else if (type === 'showAllLevels') {
      setShowAllLevels(value === 'true');
    }
    
    const filterEvent = new CustomEvent('taskFilter', { 
      detail: { type, value } 
    });
    window.dispatchEvent(filterEvent);
  };


  // 查看任务详情
  const handleViewDetail = (record: Record) => {
    setSelectedTask(record);
  };

  // 关闭任务详情
  const handleCloseDetail = () => {
    setSelectedTask(null);
  };

  // 更新任务
  const handleUpdateTask = async (updatedTask: Record) => {
    try {
      const { apiPut, apiPutPublic } = await import('@/utils/api');
      
      if (isAuthenticated && accessToken) {
        await apiPut(
          `/api/records/${updatedTask.id}`,
          updatedTask,
          '更新任务',
          accessToken
        );
      } else {
        await apiPutPublic(
          `/api/records/${updatedTask.id}`,
          updatedTask,
          '更新任务'
        );
      }

      showNotification('任务更新成功', 'success');
      
      // 更新选中的任务
      setSelectedTask(updatedTask);
      
    } catch (error) {
      console.error('更新任务失败:', error);
      showNotification(error instanceof Error ? error.message : '更新任务失败', 'error');
    }
  };

  // 添加子任务
  const handleAddSubtask = async (parentId: number, content: string) => {
    try {
      const { apiPost } = await import('@/utils/api');
      
      const response = await apiPost(
        `/api/records/${parentId}/subtasks`,
        {
          content: content,
          category: 'task'
        },
        '添加子任务',
        accessToken || undefined
      );

      await response.json();
      showNotification('子任务添加成功', 'success');
      
      // Refresh task list to show new subtask
      const refreshEvent = new CustomEvent('taskRefresh');
      window.dispatchEvent(refreshEvent);
      
    } catch (error) {
      console.error('添加子任务失败:', error);
      showNotification(error instanceof Error ? error.message : '添加子任务失败', 'error');
    }
  };

  // 删除子任务
  const handleDeleteSubtask = async (subtaskId: number) => {
    try {
      const { apiDelete } = await import('@/utils/api');
      
      await apiDelete(
        `/api/records/${subtaskId}`,
        '删除子任务',
        accessToken || undefined
      );

      showNotification('子任务删除成功', 'success');
      
      // Refresh task list to remove deleted subtask
      const refreshEvent = new CustomEvent('taskRefresh');
      window.dispatchEvent(refreshEvent);
      
    } catch (error) {
      console.error('删除子任务失败:', error);
      showNotification(error instanceof Error ? error.message : '删除子任务失败', 'error');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* 番茄时钟专注模式 */}
      <PomodoroFocusMode
        isActive={isPomodoroActive}
        task={currentPomodoroTask}
        onComplete={handlePomodoroComplete}
        onPause={handlePomodoroPause}
        onStop={handlePomodoroStop}
      />

      {/* 通知栏 */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl transition-all backdrop-blur-sm ${
          notification.type === 'success' 
            ? 'status-success'
            : 'status-error'
        }`}>
          <div className="font-semibold text-sm">{notification.message}</div>
        </div>
      )}

      {/* 头部 */}
      <header className="backdrop-blur-lg surface-elevated border-b sticky top-0 z-40" style={{ borderColor: 'var(--border-light)' }}>
        <div className="max-w-7xl mx-auto px-6 py-2">
          <div className="flex items-center justify-between h-8">
            {/* 左侧：Logo + 导航菜单 */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center shadow-sm" style={{ background: 'var(--primary)' }}>
                  <span className="text-white text-xs font-bold">AI</span>
                </div>
                <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  AIGTD
                </h1>
              </div>
              
              {/* 导航菜单 */}
              <nav className="flex items-center space-x-1 relative">
                {/* 搜索筛选 - 可折叠 */}
                <div className="flex items-center space-x-1 search-container">
                  {/* 折叠状态下的主按钮 */}
                  {!isSearchExpanded ? (
                    <button
                      onClick={() => setIsSearchExpanded(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all hover:btn-secondary flex items-center space-x-1 ${
                        searchQuery && searchQuery.trim() !== '' ? 'ring-blue-300' : ''
                      }`}
                      style={{ 
                        backgroundColor: searchQuery && searchQuery.trim() !== '' ? 'var(--info-bg)' : 'transparent',
                        color: searchQuery && searchQuery.trim() !== '' ? 'var(--info)' : 'var(--text-secondary)',
                        border: `1px solid ${searchQuery && searchQuery.trim() !== '' ? 'var(--info)' : 'transparent'}`
                      }}
                    >
                      <span>{getSearchDisplayText(searchQuery)}</span>
                      <span className="text-xs">▶</span>
                    </button>
                  ) : (
                    /* 展开状态下的搜索框 */
                    <div className="flex items-center space-x-1">
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          placeholder="搜索任务..."
                          className="px-3 py-1 rounded-lg text-xs font-medium form-input"
                          style={{ 
                            backgroundColor: 'var(--card-background)',
                            border: '1px solid var(--border-light)',
                            color: 'var(--text-primary)',
                            minWidth: '120px'
                          }}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            handleSearch(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setIsSearchExpanded(false);
                            }
                            if (e.key === 'Escape') {
                              setIsSearchExpanded(false);
                            }
                          }}
                          autoFocus
                        />
                      </div>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          handleSearch('');
                          setIsSearchExpanded(false);
                        }}
                        className="px-2 py-1 rounded text-xs font-medium transition-all hover:btn-secondary"
                        style={{ 
                          backgroundColor: 'transparent',
                          color: 'var(--text-muted)'
                        }}
                        title="清除搜索"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                
                  {/* 任务类型筛选 - 可折叠 */}
                <div className="flex items-center space-x-1">
                  {/* 折叠状态下的主按钮 */}
                  {!isTaskTypeFilterExpanded ? (
                    <button
                      onClick={() => setIsTaskTypeFilterExpanded(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all hover:btn-secondary flex items-center space-x-1 ${
                        selectedTaskType !== 'all' ? 'ing-blue-300' : ''
                      }`}
                      style={{ 
                        backgroundColor: selectedTaskType !== 'all' ? 'var(--info-bg)' : 'transparent',
                        color: selectedTaskType !== 'all' ? 'var(--info)' : 'var(--text-secondary)',
                        border: `1px solid ${selectedTaskType !== 'all' ? 'var(--info)' : 'transparent'}`
                      }}
                    >
                      <span>{getTaskTypeDisplayText(selectedTaskType)}</span>
                      <span className="text-xs">▶</span>
                    </button>
                  ) : (
                    /* 展开状态下的所有按钮 */
                    <>
                      <button
                        onClick={() => handleFilter('taskType', 'all')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          selectedTaskType === 'all' 
                            ? 'text-white' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: selectedTaskType === 'all' ? 'var(--primary)' : 'transparent',
                          color: selectedTaskType === 'all' ? 'white' : 'var(--text-secondary)',
                          border: `1px solid ${selectedTaskType === 'all' ? 'var(--primary)' : 'var(--border-light)'}`
                        }}
                      >
                        全部
                      </button>
                      <button
                        onClick={() => handleFilter('taskType', 'work')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          selectedTaskType === 'work' 
                            ? 'bg-blue-100 text-blue-800 border-blue-200' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: selectedTaskType === 'work' ? 'var(--info-bg)' : 'transparent',
                          color: selectedTaskType === 'work' ? 'var(--info)' : 'var(--text-secondary)',
                          border: `1px solid ${selectedTaskType === 'work' ? 'var(--info)' : 'var(--border-light)'}`
                        }}
                      >
                        工作
                      </button>
                      <button
                        onClick={() => handleFilter('taskType', 'hobby')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          selectedTaskType === 'hobby' 
                            ? 'bg-green-100 text-green-800 border-green-200' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: selectedTaskType === 'hobby' ? 'var(--success-bg)' : 'transparent',
                          color: selectedTaskType === 'hobby' ? 'var(--success)' : 'var(--text-secondary)',
                          border: `1px solid ${selectedTaskType === 'hobby' ? 'var(--success)' : 'var(--border-light)'}`
                        }}
                      >
                        业余
                      </button>
                      <button
                        onClick={() => handleFilter('taskType', 'life')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          selectedTaskType === 'life' 
                            ? 'bg-purple-100 text-purple-800 border-purple-200' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: selectedTaskType === 'life' ? 'var(--accent-purple-light)' : 'transparent',
                          color: selectedTaskType === 'life' ? 'var(--accent-purple)' : 'var(--text-secondary)',
                          border: `1px solid ${selectedTaskType === 'life' ? 'var(--accent-purple)' : 'var(--border-light)'}`
                        }}
                      >
                        生活
                      </button>
                    </>
                  )}
                </div>

                {/* 状态筛选 - 可折叠 */}
                <div className="flex items-center space-x-1">
                  {/* 折叠状态下的主按钮 */}
                  {!isStatusFilterExpanded ? (
                    <button
                      onClick={() => setIsStatusFilterExpanded(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all hover:btn-secondary flex items-center space-x-1 ${
                        statusFilter !== 'all' ? 'ring-blue-300' : ''
                      }`}
                      style={{ 
                        backgroundColor: statusFilter !== 'all' ? 'var(--info-bg)' : 'transparent',
                        color: statusFilter !== 'all' ? 'var(--info)' : 'var(--text-secondary)',
                        border: `1px solid ${statusFilter !== 'all' ? 'var(--info)' : 'transparent'}`
                      }}
                    >
                      <span>{getStatusDisplayText(statusFilter)}</span>
                      <span className="text-xs">▶</span>
                    </button>
                  ) : (
                    /* 展开状态下的所有按钮 */
                    <>
                      <button
                        onClick={() => handleFilter('status', 'all')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          statusFilter === 'all' 
                            ? 'text-white' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: statusFilter === 'all' ? 'var(--primary)' : 'transparent',
                          color: statusFilter === 'all' ? 'white' : 'var(--text-secondary)',
                          border: `1px solid ${statusFilter === 'all' ? 'var(--primary)' : 'var(--border-light)'}`
                        }}
                      >
                        全部
                      </button>
                      <button
                        onClick={() => handleFilter('status', 'pending')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          statusFilter === 'pending' 
                            ? 'bg-gray-100 text-gray-800 border-gray-200' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: statusFilter === 'pending' ? 'var(--background-secondary)' : 'transparent',
                          color: statusFilter === 'pending' ? 'var(--text-primary)' : 'var(--text-secondary)',
                          border: `1px solid ${statusFilter === 'pending' ? 'var(--border-default)' : 'var(--border-light)'}`
                        }}
                      >
                        待办
                      </button>
                      <button
                        onClick={() => handleFilter('status', 'active')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          statusFilter === 'active' 
                            ? 'bg-blue-100 text-blue-800 border-blue-200' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: statusFilter === 'active' ? 'var(--info-bg)' : 'transparent',
                          color: statusFilter === 'active' ? 'var(--info)' : 'var(--text-secondary)',
                          border: `1px solid ${statusFilter === 'active' ? 'var(--info)' : 'var(--border-light)'}`
                        }}
                      >
                        进行中
                      </button>
                      <button
                        onClick={() => handleFilter('status', 'completed')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          statusFilter === 'completed' 
                            ? 'bg-green-100 text-green-800 border-green-200' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: statusFilter === 'completed' ? 'var(--success-bg)' : 'transparent',
                          color: statusFilter === 'completed' ? 'var(--success)' : 'var(--text-secondary)',
                          border: `1px solid ${statusFilter === 'completed' ? 'var(--success)' : 'var(--border-light)'}`
                        }}
                      >
                        已完成
                      </button>
                      <button
                        onClick={() => handleFilter('status', 'paused')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          statusFilter === 'paused' 
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-200' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: statusFilter === 'paused' ? 'var(--warning-bg)' : 'transparent',
                          color: statusFilter === 'paused' ? 'var(--warning)' : 'var(--text-secondary)',
                          border: `1px solid ${statusFilter === 'paused' ? 'var(--warning)' : 'var(--border-light)'}`
                        }}
                      >
                        暂停
                      </button>
                      <button
                        onClick={() => handleFilter('status', 'cancelled')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          statusFilter === 'cancelled' 
                            ? 'bg-red-100 text-red-800 border-red-200' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: statusFilter === 'cancelled' ? 'var(--error-bg)' : 'transparent',
                          color: statusFilter === 'cancelled' ? 'var(--error)' : 'var(--text-secondary)',
                          border: `1px solid ${statusFilter === 'cancelled' ? 'var(--error)' : 'var(--border-light)'}`
                        }}
                      >
                        已取消
                      </button>
                    </>
                  )}
                </div>

                {/* 优先级筛选 - 可折叠 */}
                <div className="flex items-center space-x-1">
                  {/* 折叠状态下的主按钮 */}
                  {!isPriorityFilterExpanded ? (
                    <button
                      onClick={() => setIsPriorityFilterExpanded(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all hover:btn-secondary flex items-center space-x-1 ${
                        priorityFilter !== 'all' ? 'ring-blue-300' : ''
                      }`}
                      style={{ 
                        backgroundColor: priorityFilter !== 'all' ? 'var(--info-bg)' : 'transparent',
                        color: priorityFilter !== 'all' ? 'var(--info)' : 'var(--text-secondary)',
                        border: `1px solid ${priorityFilter !== 'all' ? 'var(--info)' : 'transparent'}`
                      }}
                    >
                      <span>{getPriorityDisplayText(priorityFilter)}</span>
                      <span className="text-xs">▶</span>
                    </button>
                  ) : (
                    /* 展开状态下的所有按钮 */
                    <>
                      <button
                        onClick={() => handleFilter('priority', 'all')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          priorityFilter === 'all' 
                            ? 'text-white' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: priorityFilter === 'all' ? 'var(--primary)' : 'transparent',
                          color: priorityFilter === 'all' ? 'white' : 'var(--text-secondary)',
                          border: `1px solid ${priorityFilter === 'all' ? 'var(--primary)' : 'var(--border-light)'}`
                        }}
                      >
                        全部
                      </button>
                      <button
                        onClick={() => handleFilter('priority', 'urgent')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          priorityFilter === 'urgent' 
                            ? 'bg-red-100 text-red-800 border-red-200' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: priorityFilter === 'urgent' ? 'var(--error-bg)' : 'transparent',
                          color: priorityFilter === 'urgent' ? 'var(--error)' : 'var(--text-secondary)',
                          border: `1px solid ${priorityFilter === 'urgent' ? 'var(--error)' : 'var(--border-light)'}`
                        }}
                      >
                        紧急
                      </button>
                      <button
                        onClick={() => handleFilter('priority', 'high')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          priorityFilter === 'high' 
                            ? 'bg-orange-100 text-orange-800 border-orange-200' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: priorityFilter === 'high' ? 'var(--warning-bg)' : 'transparent',
                          color: priorityFilter === 'high' ? 'var(--accent-amber)' : 'var(--text-secondary)',
                          border: `1px solid ${priorityFilter === 'high' ? 'var(--accent-amber)' : 'var(--border-light)'}`
                        }}
                      >
                        高
                      </button>
                      <button
                        onClick={() => handleFilter('priority', 'medium')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          priorityFilter === 'medium' 
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-200' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: priorityFilter === 'medium' ? 'var(--warning-bg)' : 'transparent',
                          color: priorityFilter === 'medium' ? 'var(--warning)' : 'var(--text-secondary)',
                          border: `1px solid ${priorityFilter === 'medium' ? 'var(--warning)' : 'var(--border-light)'}`
                        }}
                      >
                        中
                      </button>
                      <button
                        onClick={() => handleFilter('priority', 'low')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          priorityFilter === 'low' 
                            ? 'bg-gray-100 text-gray-800 border-gray-200' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: priorityFilter === 'low' ? 'var(--background-secondary)' : 'transparent',
                          color: priorityFilter === 'low' ? 'var(--text-muted)' : 'var(--text-secondary)',
                          border: `1px solid ${priorityFilter === 'low' ? 'var(--border-default)' : 'var(--border-light)'}`
                        }}
                      >
                        低
                      </button>
                    </>
                  )}
                </div>

                {/* 看子任务按钮 */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleFilter('showAllLevels', (!showAllLevels).toString())}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      showAllLevels 
                        ? 'text-white' 
                        : 'hover:btn-secondary'
                    }`}
                    style={{ 
                      backgroundColor: showAllLevels ? 'var(--info)' : 'transparent',
                      color: showAllLevels ? 'white' : 'var(--text-secondary)',
                      border: `1px solid ${showAllLevels ? 'var(--info)' : 'var(--border-light)'}`
                    }}
                    title={showAllLevels ? '隐藏子任务' : '显示子任务'}
                  >
                    看子任务
                  </button>
                </div>

                {/* 折叠子任务按钮 */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setIsSubtaskCollapsed(!isSubtaskCollapsed)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      isSubtaskCollapsed 
                        ? 'text-white' 
                        : 'hover:btn-secondary'
                    }`}
                    style={{ 
                      backgroundColor: isSubtaskCollapsed ? 'var(--primary)' : 'transparent',
                      color: isSubtaskCollapsed ? 'white' : 'var(--text-secondary)',
                      border: `1px solid ${isSubtaskCollapsed ? 'var(--primary)' : 'var(--border-light)'}`
                    }}
                  >
                    {'折叠'}
                  </button>
                </div>
              </nav>
            </div>

            {/* 右侧：用户菜单 */}
            <div className="flex items-center">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className={`flex transition-all duration-300 ${isPomodoroActive ? 'h-[calc(100vh-128px)] mt-[80px]' : 'h-[calc(100vh-48px)]'}`}>
        {/* 任务列表占满整个宽度 */}
        <main className="w-full">
          <TaskList
            onViewDetail={handleViewDetail}
            onDelete={handleDelete}
            onSearch={handleSearch}
            onSave={handleSave}
            onStartPomodoro={handleStartPomodoro}
            showNotification={showNotification}
            isCollapsed={isSubtaskCollapsed}
            showAllLevels={showAllLevels}
          />
        </main>

        {/* 展开添加面板的浮动按钮 */}
        <button
          onClick={() => setShowAddDialog(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40"
          title="打开添加面板"
        >
          <span className="text-xl font-bold">+</span>
        </button>
      </div>

      {/* 任务详情弹窗 */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={handleCloseDetail}
          onUpdate={handleUpdateTask}
          onAddSubtask={handleAddSubtask}
          onDeleteSubtask={handleDeleteSubtask}
        />
      )}

      {/* 简化的添加任务对话框 */}
      {showAddDialog && (
        <SimpleTaskCreator
          onSave={handleSaveTaskData}
          onClose={() => setShowAddDialog(false)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}