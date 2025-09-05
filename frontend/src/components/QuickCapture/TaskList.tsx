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
  const [expandedTask, setExpandedTask] = useState<number | null>(null);

  const handleTaskClick = (task: Record) => {
    if (expandedTask === task.id) {
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
      }
    };

    window.addEventListener('taskSearch', handleSearch);
    window.addEventListener('taskFilter', handleFilter);

    return () => {
      window.removeEventListener('taskSearch', handleSearch);
      window.removeEventListener('taskFilter', handleFilter);
    };
  }, []);

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
    <div className="h-full flex flex-col card">
      {/* 头部 */}
      <div className="p-6" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-heading-2" style={{ color: 'var(--text-primary)' }}>任务管理</h2>
          <div className="px-4 py-2 rounded-xl" style={{ background: 'var(--background-secondary)', border: '1px solid var(--border-light)' }}>
            <span className="text-body-small font-semibold" style={{ color: 'var(--text-secondary)' }}>共 {tasks.length} 个任务</span>
          </div>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-body font-semibold" style={{ color: 'var(--text-muted)' }}>加载中...</div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32" style={{ color: 'var(--text-muted)' }}>
            <div className="text-4xl mb-3">📋</div>
            <div className="text-body-large font-semibold">暂无任务</div>
            <div className="text-body-small mt-1">在右侧添加新任务开始工作</div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
            {tasks.map((task) => {
              const priorityInfo = priorityMap[task.priority as keyof typeof priorityMap] || priorityMap.medium;
              const statusInfo = statusMap[task.status as keyof typeof statusMap] || statusMap.active;
              const isExpanded = expandedTask === task.id;
              
              return (
                <div key={task.id} className="group">
                  {/* 任务单行显示 */}
                  <div 
                    className="flex items-center justify-between p-4 hover:bg-opacity-50 cursor-pointer transition-all"
                    style={{ backgroundColor: isExpanded ? 'var(--background-secondary)' : 'transparent' }}
                    onClick={() => handleTaskClick(task)}
                  >
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      {/* 展开/收缩指示器 */}
                      <button className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {isExpanded ? '▼' : '▶'}
                      </button>
                      
                      {/* 任务内容 */}
                      <div className="flex-1 min-w-0">
                        <span className="text-body font-medium truncate block" style={{ color: 'var(--text-primary)' }}>
                          {task.content}
                        </span>
                      </div>
                      
                      {/* 状态和优先级标签 */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${priorityInfo.color}`}>
                          {priorityInfo.label}
                        </span>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      
                      {/* 进度百分比 */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className="text-body-small font-medium" style={{ color: 'var(--text-secondary)' }}>
                          {task.progress || 0}%
                        </span>
                      </div>
                      
                      {/* 时间 */}
                      <div className="text-caption" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(task.created_at)}
                      </div>
                      
                      {/* 操作按钮 */}
                      <div className="flex items-center space-x-2">
                        {deleteConfirm === task.id ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(task.id);
                            }}
                            className="text-xs px-3 py-1 rounded-lg font-medium transition-all status-error"
                          >
                            确认删除
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(task.id);
                              setTimeout(() => setDeleteConfirm(null), 3000);
                            }}
                            className="text-xs px-3 py-1 rounded-lg font-medium transition-all btn-secondary"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 展开的详情区域 */}
                  {isExpanded && (
                    <div className="px-8 pb-4 card" style={{ backgroundColor: 'var(--background-secondary)' }}>
                      {/* 详细进度条 */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-body-small mb-2" style={{ color: 'var(--text-secondary)' }}>
                          <span className="font-medium">进度详情</span>
                          <span className="font-semibold">{task.progress || 0}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--border-light)' }}>
                          <div 
                            className="h-2 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${task.progress || 0}%`,
                              backgroundColor: 'var(--primary)'
                            }}
                          />
                        </div>
                      </div>

                      {/* 子任务信息 */}
                      {task.subtask_count && task.subtask_count > 0 && (
                        <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border-light)' }}>
                          <div className="text-body-small font-medium" style={{ color: 'var(--text-secondary)' }}>
                            📋 包含 {task.subtask_count} 个子任务
                          </div>
                        </div>
                      )}

                      {/* 操作按钮组 */}
                      <div className="flex items-center space-x-3">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetail(task);
                          }}
                          className="text-xs px-4 py-2 rounded-lg font-medium transition-all btn-primary"
                        >
                          详细编辑
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedTask(null);
                          }}
                          className="text-xs px-4 py-2 rounded-lg font-medium transition-all btn-secondary"
                        >
                          收起
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
