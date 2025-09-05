import { useState, useEffect } from 'react';

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

interface TaskListProps {
  onViewDetail: (record: Record) => void;
  onDelete: (id: number) => void;
  onSearch: (query: string) => void;
}

const priorityMap = {
  low: { label: '低', color: 'bg-gray-100 text-gray-800' },
  medium: { label: '中', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: '高', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: '紧急', color: 'bg-red-100 text-red-800' }
};

const statusMap = {
  active: { label: '进行中', color: 'bg-blue-100 text-blue-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
  paused: { label: '暂停', color: 'bg-yellow-100 text-yellow-800' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-800' }
};

export default function TaskList({ onViewDetail, onDelete, onSearch }: TaskListProps) {
  const [tasks, setTasks] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // 获取任务列表
  const fetchTasks = async (search?: string, status?: string, priority?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status && status !== 'all') params.append('status', status);
      if (priority && priority !== 'all') params.append('priority', priority);
      params.append('category', 'task');
      params.append('include_subtasks', 'true');
      
      const response = await fetch(`http://localhost:5050/api/records?${params}`);
      
      if (!response.ok) {
        throw new Error('获取任务失败');
      }
      
      const data = await response.json();
      setTasks(data.records || []);
    } catch (error) {
      console.error('获取任务失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化时获取任务
  useEffect(() => {
    fetchTasks();
  }, []);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks(searchQuery, statusFilter, priorityFilter);
      onSearch(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, priorityFilter]);

  const handleDelete = async (id: number) => {
    if (deleteConfirm === id) {
      try {
        const response = await fetch(`http://localhost:5050/api/records/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('删除失败');
        }

        // 重新获取任务列表
        await fetchTasks(searchQuery, statusFilter, priorityFilter);
        onDelete(id);
        setDeleteConfirm(null);
      } catch (error) {
        console.error('删除任务失败:', error);
      }
    } else {
      setDeleteConfirm(id);
      // 3秒后自动取消确认状态
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return '刚刚';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}小时前`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 头部 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">任务管理</h2>
          <div className="text-sm text-gray-500">
            共 {tasks.length} 个任务
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="space-y-3">
          {/* 搜索框 */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索任务..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
          </div>

          {/* 筛选器 */}
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有状态</option>
              <option value="active">进行中</option>
              <option value="completed">已完成</option>
              <option value="paused">暂停</option>
              <option value="cancelled">已取消</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有优先级</option>
              <option value="urgent">紧急</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <div>暂无任务</div>
            <div className="text-sm">在右侧添加新任务开始工作</div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {tasks.map((task) => {
              const priorityInfo = priorityMap[task.priority as keyof typeof priorityMap] || priorityMap.medium;
              const statusInfo = statusMap[task.status as keyof typeof statusMap] || statusMap.active;
              
              return (
                <div
                  key={task.id}
                  className="group p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer"
                  onClick={() => onViewDetail(task)}
                >
                  {/* 任务头部 */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {truncateContent(task.content, 80)}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{formatDate(task.created_at)}</span>
                        {task.subtask_count && task.subtask_count > 0 && (
                          <span>• {task.subtask_count} 个子任务</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityInfo.color}`}>
                        {priorityInfo.label}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* 进度条 */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>进度</span>
                      <span>{task.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${task.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      点击查看详情
                    </div>
                    <div className="flex items-center gap-2">
                      {deleteConfirm === task.id ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(task.id);
                          }}
                          className="text-xs px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          确认删除
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(task.id);
                          }}
                          className="text-xs px-3 py-1 bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-600 rounded-lg"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
