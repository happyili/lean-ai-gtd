import { useState, useEffect, useCallback } from 'react';
import CaptureInput from '@/components/QuickCapture/CaptureInput';
import RecordHistory from '@/components/QuickCapture/RecordHistory';

interface Record {
  id: number;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
  status: string;
}

const API_BASE_URL = 'http://localhost:5050';

export default function App() {
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 显示通知
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // 获取记录列表
  const fetchRecords = useCallback(async (search?: string) => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      
      const response = await fetch(`${API_BASE_URL}/api/records?${params}`);
      
      if (!response.ok) {
        throw new Error('获取记录失败');
      }
      
      const data = await response.json();
      setRecords(data.records || []);
    } catch (error) {
      console.error('获取记录失败:', error);
      showNotification('获取记录失败', 'error');
    }
  }, []);

  // 初始化时获取记录
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

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

      const data = await response.json();
      showNotification('记录保存成功！', 'success');
      
      // 重新获取记录列表
      await fetchRecords(searchQuery);
      
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
      
      // 重新获取记录列表
      await fetchRecords(searchQuery);
      
    } catch (error) {
      console.error('删除记录失败:', error);
      showNotification('删除记录失败', 'error');
    }
  };

  // 搜索记录
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    fetchRecords(query);
  };

  // 清空输入
  const handleClear = () => {
    // 目前只是清空输入框，无需额外操作
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
              <p className="text-gray-600 mt-1">快速记录系统 - 捕捉每一个灵感瞬间</p>
            </div>
            <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-sm">
              已记录 {records.length} 条内容
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className="flex max-w-7xl mx-auto">
        {/* 左侧输入区域 */}
        <main className={`flex-1 p-6 transition-all duration-300 ${
          isSidebarCollapsed ? 'mr-12' : 'mr-80'
        }`}>
          <div className="bg-white border border-gray-300 rounded-none shadow-sm">
            <CaptureInput 
              onSave={handleSave}
              onClear={handleClear}
              isLoading={isLoading}
            />
          </div>
          
          {/* 使用说明 */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-none">
            <h3 className="font-medium text-blue-900 mb-2">💡 使用提示</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 使用 <kbd className="px-1 py-0.5 bg-blue-200 rounded-none text-xs">Ctrl+Enter</kbd> 快速保存记录</li>
              <li>• 使用 <kbd className="px-1 py-0.5 bg-blue-200 rounded-none text-xs">Ctrl+L</kbd> 清空输入内容</li>
              <li>• 使用 <kbd className="px-1 py-0.5 bg-blue-200 rounded-none text-xs">Tab</kbd> 切换分类标签</li>
              <li>• 右侧历史记录支持实时搜索和快速删除</li>
            </ul>
          </div>
        </main>

        {/* 右侧历史记录 */}
        <aside className="fixed right-0 top-0 h-full">
          <div className="h-full pt-24"> {/* 为头部留出空间 */}
            <RecordHistory
              records={records}
              onDelete={handleDelete}
              onSearch={handleSearch}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
