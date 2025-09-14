import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import UserMenu from '@/components/Auth/UserMenu';
import TaskList from '@/components/QuickCapture/TaskList';
import TaskDetail from '@/components/QuickCapture/TaskDetail';
import PomodoroFocusMode from '@/components/QuickCapture/PomodoroFocusMode';
import SimpleTaskCreator from '@/components/QuickCapture/SimpleTaskCreator';
import PomodoroManager from '@/components/PomodoroManager';
import RemindersList from '@/components/Reminders/RemindersList';
import ReminderBanner from '@/components/Reminders/ReminderBanner';
import InfoResourceList from '@/components/InfoResources/InfoResourceList';
import InfoResourceDetail from '@/components/InfoResources/InfoResourceDetail';
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

interface InfoResource {
  id: number;
  title: string;
  content: string;
  resource_type: string;
  user_id?: number | null;
  status: string;
  created_at: string;
  updated_at: string;
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
  const [currentView, setCurrentView] = useState<'tasks' | 'pomodoro'>('tasks'); // 新增：控制当前视图
  const [isTaskManagementDropdownOpen, setIsTaskManagementDropdownOpen] = useState(false); // 任务管理下拉菜单状态
  const [selectedTaskManagementMode, setSelectedTaskManagementMode] = useState<'tasks' | 'resources' | 'reminders'>('tasks'); // 选中的任务管理模式
  const [selectedInfoResource, setSelectedInfoResource] = useState<InfoResource | null>(null); // 选中的信息资源

  // 点击外部关闭搜索框和下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isSearchExpanded && !target.closest('.search-container')) {
        setIsSearchExpanded(false);
      }
      if (isTaskManagementDropdownOpen && !target.closest('.task-management-dropdown')) {
        setIsTaskManagementDropdownOpen(false);
      }
    };

    if (isSearchExpanded || isTaskManagementDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchExpanded, isTaskManagementDropdownOpen]);

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

  // 信息资源相关处理函数
  const handleViewInfoResourceDetail = (resource: InfoResource) => {
    setSelectedInfoResource(resource);
  };

  const handleCloseInfoResourceDetail = () => {
    setSelectedInfoResource(null);
  };

  const handleUpdateInfoResource = async (updatedResource: InfoResource) => {
    try {
      const { apiPut, apiPutPublic } = await import('@/utils/api');
      
      if (isAuthenticated && accessToken) {
        await apiPut(
          `/api/info-resources/${updatedResource.id}`,
          updatedResource,
          '更新信息资源',
          accessToken
        );
      } else {
        await apiPutPublic(
          `/api/info-resources/${updatedResource.id}`,
          updatedResource,
          '更新信息资源'
        );
      }

      showNotification('信息资源更新成功', 'success');
      
      // 更新选中的信息资源
      setSelectedInfoResource(updatedResource);
      
    } catch (error) {
      console.error('更新信息资源失败:', error);
      showNotification(error instanceof Error ? error.message : '更新信息资源失败', 'error');
    }
  };

  const handleDeleteInfoResource = async (resourceId: number) => {
    try {
      await apiDelete(
        `/api/info-resources/${resourceId}`,
        '删除信息资源',
        accessToken || undefined
      );

      showNotification('信息资源删除成功', 'success');
      
    } catch (error) {
      console.error('删除信息资源失败:', error);
      showNotification(error instanceof Error ? error.message : '删除信息资源失败', 'error');
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
      <header className="backdrop-blur-lg surface-elevated border-b sticky top-0 z-40" >
        <div className="max-w-7xl mx-auto px-6 py-1">
          <div className="flex items-center justify-between h-8">
            {/* 左侧：Logo + 导航菜单 */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <h1 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  AIGTD
                </h1>
              </div>
              
              {/* 主导航标签 */}
              <nav className="flex items-center space-x-2">
                {/* 任务管理下拉菜单 */}
                <div className="relative task-management-dropdown">
                  <button
                    onClick={() => {
                      setCurrentView('tasks');
                      setIsTaskManagementDropdownOpen(!isTaskManagementDropdownOpen);
                    }}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentView === 'tasks' 
                        ? 'text-white' 
                        : 'hover:bg-gray-100'
                    }`}
                    style={{ 
                      backgroundColor: currentView === 'tasks' ? 'var(--primary)' : 'transparent',
                      color: currentView === 'tasks' ? 'white' : 'var(--text-primary)'
                    }}
                  >
                    {selectedTaskManagementMode === 'tasks' ? '任务管理' : 
                     selectedTaskManagementMode === 'resources' ? '信息资源' : 
                     selectedTaskManagementMode === 'reminders' ? '定时提醒' : '任务管理'}
                    <svg 
                      className={`ml-1 w-4 h-4 transform transition-transform ${isTaskManagementDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* 下拉菜单 */}
                  {isTaskManagementDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 min-w-[140px] bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setSelectedTaskManagementMode('tasks');
                            setIsTaskManagementDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                            selectedTaskManagementMode === 'tasks' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                          }`}
                        >
                          任务管理
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTaskManagementMode('resources');
                            setIsTaskManagementDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                            selectedTaskManagementMode === 'resources' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                          }`}
                        >
                          信息资源
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTaskManagementMode('reminders');
                            setIsTaskManagementDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                            selectedTaskManagementMode === 'reminders' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                          }`}
                        >
                          定时提醒
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setCurrentView('pomodoro')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentView === 'pomodoro' 
                      ? 'text-white' 
                      : 'hover:bg-gray-100'
                  }`}
                  style={{ 
                    backgroundColor: currentView === 'pomodoro' ? 'var(--primary)' : 'transparent',
                    color: currentView === 'pomodoro' ? 'white' : 'var(--text-primary)'
                  }}
                >
                  AI番茄钟
                </button>
              </nav>
              
              {/* 筛选菜单 - 只在任务管理视图显示 */}
              {currentView === 'tasks' && (
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
                        backgroundColor: 'transparent',
                        color: searchQuery && searchQuery.trim() !== '' ? 'var(--info)' : 'var(--text-primary)',
                        border: 'none'
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
                            minWidth: '100px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
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
                        backgroundColor: 'transparent',
                        color: selectedTaskType !== 'all' ? 'var(--info)' : 'var(--text-primary)',
                        border: 'none'
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
                          color: selectedTaskType === 'all' ? 'white' : 'var(--text-primary)',
                          border: `1px solid ${selectedTaskType === 'all' ? 'var(--primary)' : 'var(--border-default)'}`
                        }}
                      >
                        全部
                      </button>
                      <button
                        onClick={() => handleFilter('taskType', 'work')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          selectedTaskType === 'work' 
                            ? '' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: selectedTaskType === 'work' ? 'var(--info-bg)' : 'transparent',
                          color: selectedTaskType === 'work' ? 'var(--info)' : 'var(--text-primary)',
                          border: `1px solid ${selectedTaskType === 'work' ? 'var(--info)' : 'var(--border-default)'}`
                        }}
                      >
                        工作
                      </button>
                      <button
                        onClick={() => handleFilter('taskType', 'hobby')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          selectedTaskType === 'hobby' 
                            ? '' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: selectedTaskType === 'hobby' ? 'var(--success-bg)' : 'transparent',
                          color: selectedTaskType === 'hobby' ? 'var(--success)' : 'var(--text-primary)',
                          border: `1px solid ${selectedTaskType === 'hobby' ? 'var(--success)' : 'var(--border-default)'}`
                        }}
                      >
                        业余
                      </button>
                      <button
                        onClick={() => handleFilter('taskType', 'life')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          selectedTaskType === 'life' 
                            ? '' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: selectedTaskType === 'life' ? 'var(--accent-purple-bg)' : 'transparent',
                          color: selectedTaskType === 'life' ? 'var(--accent-purple)' : 'var(--text-primary)',
                          border: `1px solid ${selectedTaskType === 'life' ? 'var(--accent-purple)' : 'var(--border-default)'}`
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
                        backgroundColor: 'transparent',
                        color: statusFilter !== 'all' ? 'var(--info)' : 'var(--text-primary)',
                        border: 'none'
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
                          color: statusFilter === 'all' ? 'white' : 'var(--text-primary)',
                          border: `1px solid ${statusFilter === 'all' ? 'var(--primary)' : 'var(--border-default)'}`
                        }}
                      >
                        全部
                      </button>
                      <button
                        onClick={() => handleFilter('status', 'pending')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          statusFilter === 'pending' 
                            ? '' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: 'transparent',
                          color: statusFilter === 'pending' ? 'var(--text-primary)' : 'var(--text-primary)',
                          border: `1px solid ${statusFilter === 'pending' ? 'var(--border-default)' : 'var(--border-default)'}`
                        }}
                      >
                        待办
                      </button>
                      <button
                        onClick={() => handleFilter('status', 'active')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          statusFilter === 'active' 
                            ? '' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: statusFilter === 'active' ? 'var(--info-bg)' : 'transparent',
                          color: statusFilter === 'active' ? 'var(--info)' : 'var(--text-primary)',
                          border: `1px solid ${statusFilter === 'active' ? 'var(--info)' : 'var(--border-default)'}`
                        }}
                      >
                        进行中
                      </button>
                      <button
                        onClick={() => handleFilter('status', 'completed')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          statusFilter === 'completed' 
                            ? '' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: statusFilter === 'completed' ? 'var(--success-bg)' : 'transparent',
                          color: statusFilter === 'completed' ? 'var(--success)' : 'var(--text-primary)',
                          border: `1px solid ${statusFilter === 'completed' ? 'var(--success)' : 'var(--border-default)'}`
                        }}
                      >
                        已完成
                      </button>
                      <button
                        onClick={() => handleFilter('status', 'paused')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          statusFilter === 'paused' 
                            ? '' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: statusFilter === 'paused' ? 'var(--warning-bg)' : 'transparent',
                          color: statusFilter === 'paused' ? 'var(--warning)' : 'var(--text-primary)',
                          border: `1px solid ${statusFilter === 'paused' ? 'var(--warning)' : 'var(--border-default)'}`
                        }}
                      >
                        暂停
                      </button>
                      <button
                        onClick={() => handleFilter('status', 'cancelled')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          statusFilter === 'cancelled' 
                            ? '' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: statusFilter === 'cancelled' ? 'var(--error-bg)' : 'transparent',
                          color: statusFilter === 'cancelled' ? 'var(--error)' : 'var(--text-primary)',
                          border: `1px solid ${statusFilter === 'cancelled' ? 'var(--error)' : 'var(--border-default)'}`
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
                        backgroundColor: 'transparent',
                        color: priorityFilter !== 'all' ? 'var(--info)' : 'var(--text-primary)',
                        border: 'none'
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
                          color: priorityFilter === 'all' ? 'white' : 'var(--text-primary)',
                          border: `1px solid ${priorityFilter === 'all' ? 'var(--primary)' : 'var(--border-default)'}`
                        }}
                      >
                        全部
                      </button>
                      <button
                        onClick={() => handleFilter('priority', 'urgent')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          priorityFilter === 'urgent' 
                            ? '' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: priorityFilter === 'urgent' ? 'var(--error-bg)' : 'transparent',
                          color: priorityFilter === 'urgent' ? 'var(--error)' : 'var(--text-primary)',
                          border: `1px solid ${priorityFilter === 'urgent' ? 'var(--error)' : 'var(--border-default)'}`
                        }}
                      >
                        紧急
                      </button>
                      <button
                        onClick={() => handleFilter('priority', 'high')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          priorityFilter === 'high' 
                            ? '' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: priorityFilter === 'high' ? 'var(--error-bg)' : 'transparent',
                          color: priorityFilter === 'high' ? 'var(--error)' : 'var(--text-primary)',
                          border: `1px solid ${priorityFilter === 'high' ? 'var(--error)' : 'var(--border-default)'}`
                        }}
                      >
                        高
                      </button>
                      <button
                        onClick={() => handleFilter('priority', 'medium')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          priorityFilter === 'medium' 
                            ? '' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: priorityFilter === 'medium' ? 'var(--warning-bg)' : 'transparent',
                          color: priorityFilter === 'medium' ? 'var(--warning)' : 'var(--text-primary)',
                          border: `1px solid ${priorityFilter === 'medium' ? 'var(--warning)' : 'var(--border-default)'}`
                        }}
                      >
                        中
                      </button>
                      <button
                        onClick={() => handleFilter('priority', 'low')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          priorityFilter === 'low' 
                            ? '' 
                            : 'hover:btn-secondary'
                        }`}
                        style={{ 
                          backgroundColor: 'transparent',
                          color: priorityFilter === 'low' ? 'var(--text-muted)' : 'var(--text-primary)',
                          border: `1px solid ${priorityFilter === 'low' ? 'var(--border-default)' : 'var(--border-default)'}`
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
                      color: showAllLevels ? 'white' : 'var(--text-primary)',
                      border: `1px solid ${showAllLevels ? 'var(--info)' : 'var(--border-default)'}`
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
                      color: isSubtaskCollapsed ? 'white' : 'var(--text-primary)',
                      border: `1px solid ${isSubtaskCollapsed ? 'var(--primary)' : 'var(--border-default)'}`
                    }}
                  >
                    {'折叠'}
                  </button>
                </div>
              </nav>
              )}
            </div>

            {/* 右侧：用户菜单 */}
            <div className="flex items-center">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* 到期提醒条 - 紧贴banner下方 */}
      <ReminderBanner accessToken={accessToken} />

      {/* 主要内容区域 */}
      <div className={`flex transition-all duration-300 ${isPomodoroActive ? 'h-[calc(100vh-128px)] mt-[80px]' : 'h-[calc(100vh-48px)]'}`}>
        {/* 条件渲染不同的视图 */}
        {currentView === 'tasks' ? (
          <main className="w-full">

            {/* 任务管理模式 */}
            {selectedTaskManagementMode === 'tasks' && (
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
            )}

            {/* 信息资源模式 */}
            {selectedTaskManagementMode === 'resources' && (
              <InfoResourceList
                onViewDetail={handleViewInfoResourceDetail}
                onDelete={handleDeleteInfoResource}
                onSearch={handleSearch}
                showNotification={showNotification}
              />
            )}

            {/* 定时提醒模式 */}
            {selectedTaskManagementMode === 'reminders' && (
              <RemindersList accessToken={accessToken} />
            )}
          </main>
        ) : (
          <main className="w-full">
            <PomodoroManager accessToken={accessToken} />
          </main>
        )}
      </div>

      {/* 展开添加面板的浮动按钮 - 只在任务管理视图的任务模式显示 */}
      {currentView === 'tasks' && selectedTaskManagementMode === 'tasks' && (
        <button
          onClick={() => setShowAddDialog(true)}
          className="fixed bottom-6 right-6 w-14 h-14 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40"
          style={{
            background: 'linear-gradient(135deg, var(--primary), var(--accent-blue))',
            boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)'
          }}
          title="打开添加面板"
        >
          <span className="text-xl font-semibold">+</span>
        </button>
      )}

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

      {/* 信息资源详情弹窗 */}
      {selectedInfoResource && (
        <InfoResourceDetail
          resource={selectedInfoResource}
          onClose={handleCloseInfoResourceDetail}
          onUpdate={handleUpdateInfoResource}
          onDelete={handleDeleteInfoResource}
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
