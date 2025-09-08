import { useState } from 'react';
import TaskList from '@/components/QuickCapture/TaskList';
import RightPanel from '@/components/QuickCapture/RightPanel';
import TaskDetail from '@/components/QuickCapture/TaskDetail';

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
  const [showRightPanel, setShowRightPanel] = useState(false);

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
      
    } catch (error) {
      console.error('保存记录失败:', error);
      showNotification(error instanceof Error ? error.message : '保存记录失败', 'error');
    } finally {
      setIsLoading(false);
    }
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
    } else if (type === 'showAllLevels') {
      setShowAllLevels(value === 'true');
    }
    
    const filterEvent = new CustomEvent('taskFilter', { 
      detail: { type, value } 
    });
    window.dispatchEvent(filterEvent);
  };

  // 清空输入
  const handleClear = () => {
    // 目前只是清空输入框，无需额外操作
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
                
                <button className="px-3 py-1 text-xs font-medium rounded-md transition-all" style={{ color: 'var(--primary)', background: 'var(--primary-light)' }}>
                  Tasks
                </button>
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
      <div className="flex h-[calc(100vh-48px)]">
        {/* 左侧任务列表 */}
        <main className={`transition-all duration-300 ${showRightPanel ? 'flex-1' : 'w-full'}`}>
          <TaskList
            onViewDetail={handleViewDetail}
            onDelete={handleDelete}
            onSearch={handleSearch}
            onSave={handleSave}
            showNotification={showNotification}
          />
        </main>

        {/* 右侧操作面板 */}
        {showRightPanel && (
          <aside className="w-96 transition-all duration-300">
            <RightPanel
              onSave={handleSave}
              onClear={handleClear}
              isLoading={isLoading}
              onClose={() => setShowRightPanel(false)}
            />
          </aside>
        )}

        {/* 展开右侧面板的浮动按钮 */}
        {!showRightPanel && (
          <button
            onClick={() => setShowRightPanel(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40"
            title="打开添加面板"
          >
            <span className="text-xl font-bold">+</span>
          </button>
        )}
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
    </div>
  );
}