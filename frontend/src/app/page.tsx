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
  progress?: number;
  created_at: string;
  updated_at: string;
  status: string;
  subtask_count?: number;
  subtasks?: Record[];
}

const API_BASE_URL = 'http://localhost:5050';

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedTask, setSelectedTask] = useState<Record | null>(null);

  // 显示通知
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // 保存记录
  const handleSave = async (content: string, category: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, category }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '保存失败');
      }

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
      const response = await fetch(`${API_BASE_URL}/api/records/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      showNotification('记录删除成功', 'success');
      
    } catch (error) {
      console.error('删除记录失败:', error);
      showNotification('删除记录失败', 'error');
    }
  };

  // 搜索记录
  const handleSearch = (query: string) => {
    // 搜索功能由TaskList组件内部处理
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
      const response = await fetch(`${API_BASE_URL}/api/records/${updatedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTask),
      });

      if (!response.ok) {
        throw new Error('更新任务失败');
      }

      showNotification('任务更新成功', 'success');
      
      // 更新选中的任务
      setSelectedTask(updatedTask);
      
    } catch (error) {
      console.error('更新任务失败:', error);
      showNotification('更新任务失败', 'error');
    }
  };

  // 添加子任务
  const handleAddSubtask = async (parentId: number, content: string) => {
    showNotification('子任务添加成功', 'success');
  };

  // 删除子任务
  const handleDeleteSubtask = async (subtaskId: number) => {
    showNotification('子任务删除成功', 'success');
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* 通知栏 */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl transition-all backdrop-blur-sm ${
          notification.type === 'success' 
            ? 'bg-emerald-500/90 text-white border border-emerald-400/50' 
            : 'bg-red-500/90 text-white border border-red-400/50'
        }`}>
          <div className="font-medium">{notification.message}</div>
        </div>
      )}

      {/* 头部 */}
      <header className="backdrop-blur-lg bg-white/80 border-b border-slate-200/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">AI</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  AIGTD
                </h1>
                <p className="text-slate-500 mt-1 font-medium">智能任务管理系统</p>
              </div>
            </div>
            <div className="bg-gradient-to-r from-sky-50 to-blue-50 px-4 py-2 rounded-xl border border-sky-200/60">
              <span className="text-sm font-medium text-sky-700">任务管理平台</span>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className="flex h-[calc(100vh-136px)]">
        {/* 左侧任务列表 */}
        <main className="flex-1">
          <TaskList
            onViewDetail={handleViewDetail}
            onDelete={handleDelete}
            onSearch={handleSearch}
          />
        </main>

        {/* 右侧操作面板 */}
        <aside className="w-96">
          <RightPanel
            onSave={handleSave}
            onClear={handleClear}
            isLoading={isLoading}
          />
        </aside>
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