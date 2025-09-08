import { useState } from 'react';
import TaskList from '@/components/QuickCapture/TaskList';
import TaskDetail from '@/components/QuickCapture/TaskDetail';
import PomodoroFocusMode from '@/components/QuickCapture/PomodoroFocusMode';
import SimpleTaskCreator from '@/components/QuickCapture/SimpleTaskCreator';

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
}

import { apiPost, apiDelete, apiPut } from '@/utils/api';

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedTask, setSelectedTask] = useState<Record | null>(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState('all');
  const [showAllLevels, setShowAllLevels] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentPomodoroTask, setCurrentPomodoroTask] = useState<PomodoroTask | null>(null);
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState('all');
  const [isTaskTypeFilterExpanded, setIsTaskTypeFilterExpanded] = useState(false);

  // 显示通知
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // 保存记录
  const handleSave = async (content: string, category: string) => {
    setIsLoading(true);
    try {
      await apiPost(
        '/api/records',
        { content, category },
        '保存记录'
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
      const payload = {
        content: taskData.content,
        category: taskData.category,
        priority: taskData.priority,
        task_type: taskData.taskType,
        estimated_time: taskData.estimatedTime,
        tags: taskData.tags?.join(',') || ''
      };

      await apiPost(
        '/api/records',
        payload,
        '保存任务'
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
        '删除记录'
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

  // 处理筛选
  const handleFilter = (type: string, value: string) => {
    if (type === 'status') {
      setStatusFilter(value);
    } else if (type === 'priority') {
      setPriorityFilter(value);
    } else if (type === 'taskType') {
      setTaskTypeFilter(value);
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

  // 获取任务类型显示文本 - 用于折叠按钮
  const getTaskTypeDisplayText = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'all': '全部',
      'work': '工作',
      'hobby': '业余', 
      'life': '生活'
    };
    return typeMap[type] || '全部';
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
      await apiPut(
        `/api/records/${updatedTask.id}`,
        updatedTask,
        '更新任务'
      );

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
        '删除子任务'
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
                <div 
                  className="relative"
                  onMouseEnter={() => setShowSearchDropdown(true)}
                  onMouseLeave={() => setShowSearchDropdown(false)}
                >
                  <button className="px-3 py-1 text-xs font-medium transition-all rounded-md hover:btn-secondary" style={{ color: 'var(--text-tertiary)' }}>
                    Search
                  </button>
                  
                  {/* 搜索下拉框 */}
                  {showSearchDropdown && (
                    <div 
                      className="absolute top-full left-0 -mt-1 w-80 p-4 card shadow-lg z-50 pt-5"
                      style={{ backgroundColor: 'var(--card-background)' }}
                    >
                      <div className="space-y-3">
                        {/* 搜索框 */}
                        <div className="relative">
                          <input
                            type="text"
                            value={searchQuery}
                            placeholder="搜索任务..."
                            className="w-full pl-8 pr-4 py-2 rounded-lg form-input text-body-small"
                            onChange={(e) => handleSearch(e.target.value)}
                          />
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>🔍</span>
                          </div>
                        </div>
                        
                        {/* 筛选器 */}
                        <div className="grid grid-cols-3 gap-3">
                          <select
                            value={statusFilter}
                            className="px-3 py-2 rounded-lg form-input text-body-small"
                            onChange={(e) => handleFilter('status', e.target.value)}
                          >
                            <option value="all">所有状态</option>
                            <option value="pending">待办</option>
                            <option value="active">进行中</option>
                            <option value="completed">已完成</option>
                            <option value="paused">暂停</option>
                            <option value="cancelled">已取消</option>
                          </select>
                          
                          <select
                            value={priorityFilter}
                            className="px-3 py-2 rounded-lg form-input text-body-small"
                            onChange={(e) => handleFilter('priority', e.target.value)}
                          >
                            <option value="all">所有优先级</option>
                            <option value="urgent">紧急</option>
                            <option value="high">高</option>
                            <option value="medium">中</option>
                            <option value="low">低</option>
                          </select>
                          
                          <select
                            value={taskTypeFilter}
                            className="px-3 py-2 rounded-lg form-input text-body-small"
                            onChange={(e) => handleFilter('taskType', e.target.value)}
                          >
                            <option value="all">所有类型</option>
                            <option value="work">工作</option>
                            <option value="hobby">业余</option>
                            <option value="life">生活</option>
                          </select>
                        </div>
                        
                        {/* 任务层级筛选 */}
                        <div className="flex items-center space-x-3 pt-2" style={{ borderTop: '1px solid var(--border-light)' }}>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showAllLevels}
                              className="rounded w-4 h-4"
                              style={{ accentColor: 'var(--primary)' }}
                              onChange={(e) => handleFilter('showAllLevels', e.target.checked.toString())}
                            />
                            <span className="text-body-small font-medium" style={{ color: 'var(--text-secondary)' }}>
                              显示所有层级任务
                            </span>
                          </label>
                          <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info)' }}>
                            默认只显示主任务
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                  {/* 任务类型筛选 - 可折叠 */}
                <div className="flex items-center space-x-1">
                  {/* 折叠状态下的主按钮 */}
                  {!isTaskTypeFilterExpanded ? (
                    <button
                      onClick={() => setIsTaskTypeFilterExpanded(true)}
                      className="px-3 py-1 rounded-lg text-xs font-medium transition-all hover:btn-secondary flex items-center space-x-1"
                      style={{ 
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-light)'
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
              </nav>
            </div>

            {/* 右侧：My Account */}
            <div className="flex items-center">
              <button className="flex items-center space-x-2 px-3 py-1 text-xs font-medium transition-all rounded-md hover:btn-secondary" style={{ color: 'var(--text-secondary)' }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--border-default)' }}>
                  <span className="text-white text-xs font-medium">U</span>
                </div>
                <span>My Account</span>
              </button>
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