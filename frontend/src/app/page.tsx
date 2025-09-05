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
    <div className="min-h-screen bg-gray-50">
      {/* 通知栏 */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all ${
          notification.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      {/* 头部 */}
      <header className="bg-white border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AIGTD</h1>
              <p className="text-gray-600 mt-1">任务管理系统 - 高效管理您的任务和想法</p>
            </div>
            <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-sm">
              任务管理平台
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className="flex h-[calc(100vh-120px)]">
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