import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiDelete } from '@/utils/api';

interface Record {
  id: number;
  content: string;
  category: string;
  parent_id?: number;
  priority?: string;
  progress_notes?: string;
  created_at: string;
  updated_at: string;
  status: string;
  task_type?: string; // work/hobby/life - 工作/业余/生活
  subtask_count?: number;
  subtasks?: Record[];
}

interface TaskDetailProps {
  task: Record;
  onClose: () => void;
  onUpdate: (task: Record) => void;
  onAddSubtask: (parentId: number, content: string) => void;
  onDeleteSubtask: (subtaskId: number) => void;
}

const statusOptions = [
  { value: 'active', label: '进行中', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: '已完成', color: 'bg-green-100 text-green-800' },
  { value: 'paused', label: '暂停', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'cancelled', label: '已取消', color: 'bg-red-100 text-red-800' }
];

const priorityOptions = [
  { value: 'low', label: '低', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: '中', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: '高', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: '紧急', color: 'bg-red-100 text-red-800' }
];

const taskTypeOptions = [
  { value: 'work', label: '工作', color: 'bg-blue-100 text-blue-800' },
  { value: 'hobby', label: '业余', color: 'bg-green-100 text-green-800' },
  { value: 'life', label: '生活', color: 'bg-purple-100 text-purple-800' }
];

const priorityWeight = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1
};

const statusOptionsForFilter = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '进行中' },
  { value: 'pending', label: '待办' },
  { value: 'completed', label: '已完成' },
  { value: 'paused', label: '暂停' }
];

export default function TaskDetail({ 
  task, 
  onClose, 
  onUpdate, 
  onAddSubtask, 
  onDeleteSubtask 
}: TaskDetailProps) {
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 显示通知
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(task.content);
  const [newSubtaskContent, setNewSubtaskContent] = useState('');
  const [newSubtaskPriority, setNewSubtaskPriority] = useState('medium');
  const [newSubtaskTaskType, setNewSubtaskTaskType] = useState(task.task_type || 'work');
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority || 'medium');
  const [taskType, setTaskType] = useState(task.task_type || 'work');
  const [progressNotes, setProgressNotes] = useState(task.progress_notes || '');
  const [subtasks, setSubtasks] = useState<Record[]>(task.subtasks || []);
  const [showCompleted, setShowCompleted] = useState(false);
  const [sortBy, setSortBy] = useState<'priority' | 'created' | 'status'>('priority');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // 获取子任务
  useEffect(() => {
    fetchSubtasks();
  }, [task.id]);

  const fetchSubtasks = async () => {
    try {
      const response = await apiGet(
        `/api/records/${task.id}/subtasks`,
        '获取子任务'
      );
      const data = await response.json();
      setSubtasks(data.subtasks || []);
    } catch (error) {
      console.error('获取子任务失败:', error);
      // 显示错误信息给用户
      showNotification(`获取子任务失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    }
  };

  const handleSave = () => {
    const updatedTask = {
      ...task,
      content: editedContent,
      status,
      priority,
      task_type: taskType,
      progress_notes: progressNotes
    };
    onUpdate(updatedTask);
    setIsEditing(false);
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskContent.trim()) return;
    
    try {
      const response = await apiPost(
        `/api/records/${task.id}/subtasks`,
        {
          content: newSubtaskContent,
          category: 'task',
          priority: newSubtaskPriority,
          task_type: newSubtaskTaskType
        },
        '添加子任务'
      );

      const data = await response.json();
      setSubtasks([...subtasks, data.subtask]);
      setNewSubtaskContent('');
      setNewSubtaskPriority('medium');
      setNewSubtaskTaskType(task.task_type || 'work');
      onAddSubtask(task.id, newSubtaskContent);
    } catch (error) {
      console.error('添加子任务失败:', error);
      showNotification(`添加子任务失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    }
  };

  const handleDeleteSubtask = async (subtaskId: number) => {
    try {
      await apiDelete(
        `/api/records/${subtaskId}`,
        '删除子任务'
      );

      setSubtasks(subtasks.filter(subtask => subtask.id !== subtaskId));
      onDeleteSubtask(subtaskId);
    } catch (error) {
      console.error('删除子任务失败:', error);
      showNotification(`删除子任务失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    }
  };

  const handleUpdateSubtaskStatus = async (subtaskId: number, newStatus: string) => {
    try {
      const { apiPut } = await import('@/utils/api');
      
      await apiPut(
        `/api/records/${subtaskId}`,
        { status: newStatus },
        '更新子任务状态'
      );

      // 更新本地状态
      setSubtasks(prevSubtasks => 
        prevSubtasks.map(subtask => 
          subtask.id === subtaskId 
            ? { ...subtask, status: newStatus }
            : subtask
        )
      );
    } catch (error) {
      console.error('更新子任务状态失败:', error);
      showNotification(`更新子任务状态失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const sortSubtasks = (subtasks: Record[]) => {
    return [...subtasks].sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
          const priorityB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
          return priorityB - priorityA; // Higher priority first
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // Newer first
        case 'status':
          const statusOrder = { active: 1, pending: 2, paused: 3, completed: 4, cancelled: 5 };
          const statusA = statusOrder[a.status as keyof typeof statusOrder] || 6;
          const statusB = statusOrder[b.status as keyof typeof statusOrder] || 6;
          return statusA - statusB;
        default:
          return 0;
      }
    });
  };

  const filteredSubtasks = (() => {
    let result = subtasks;
    
    // Filter by status
    if (filterStatus !== 'all') {
      if (filterStatus === 'pending') {
        result = result.filter(subtask => !['completed', 'cancelled'].includes(subtask.status));
      } else {
        result = result.filter(subtask => subtask.status === filterStatus);
      }
    }
    
    // Filter by completion status
    if (!showCompleted) {
      result = result.filter(subtask => subtask.status !== 'completed');
    }
    
    // Sort the results
    return sortSubtasks(result);
  })();

  const completedCount = subtasks.filter(subtask => subtask.status === 'completed').length;
  const totalSubtasks = subtasks.length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
      
      <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-slate-200/60">
        {/* 头部 */}
        <div className="flex items-center justify-between p-8 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-sky-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg font-bold">📋</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">任务详情</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-slate-100/60 hover:bg-slate-200/60 rounded-2xl flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all duration-200 backdrop-blur-sm"
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* 基本信息 */}
          <div className="mb-8">
            <div className="flex items-start gap-6 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-sky-100 rounded-3xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">📋</span>
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full p-4 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-300 bg-slate-50/50 backdrop-blur-sm transition-all font-medium"
                    rows={4}
                  />
                ) : (
                  <h3 className="text-xl font-bold text-slate-800 leading-relaxed">{task.content}</h3>
                )}
              </div>
            </div>

            {/* 状态、优先级和任务类型 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">状态</span>
                {isEditing ? (
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-300 bg-slate-50/50 backdrop-blur-sm transition-all font-medium"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex px-4 py-2 rounded-2xl text-xs font-semibold ${
                    statusOptions.find(opt => opt.value === status)?.color || 'bg-slate-100 text-slate-800'
                  }`}>
                    {statusOptions.find(opt => opt.value === status)?.label || status}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">优先级</span>
                {isEditing ? (
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-300 bg-slate-50/50 backdrop-blur-sm transition-all font-medium"
                  >
                    {priorityOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex px-4 py-2 rounded-2xl text-xs font-semibold ${
                    priorityOptions.find(opt => opt.value === priority)?.color || 'bg-slate-100 text-slate-800'
                  }`}>
                    {priorityOptions.find(opt => opt.value === priority)?.label || priority}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">任务类型</span>
                {isEditing ? (
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-300 bg-slate-50/50 backdrop-blur-sm transition-all font-medium"
                  >
                    {taskTypeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex px-4 py-2 rounded-2xl text-xs font-semibold ${
                    taskTypeOptions.find(opt => opt.value === taskType)?.color || 'bg-slate-100 text-slate-800'
                  }`}>
                    {taskTypeOptions.find(opt => opt.value === taskType)?.label || taskType}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">进展记录</span>
                {isEditing ? (
                  <textarea
                    value={progressNotes}
                    onChange={(e) => setProgressNotes(e.target.value)}
                    placeholder="记录当前进展情况、遇到的问题和难点..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-300 bg-slate-50/50 backdrop-blur-sm transition-all font-medium resize-none"
                    rows={3}
                  />
                ) : progressNotes ? (
                  <div className="px-4 py-3 bg-slate-50/60 rounded-2xl border border-slate-200/60">
                    <span className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{progressNotes}</span>
                  </div>
                ) : (
                  <span className="text-sm text-slate-400 italic">暂无进展记录</span>
                )}
              </div>
            </div>

            {/* 时间信息 */}
            <div className="bg-slate-50/60 rounded-2xl p-6 backdrop-blur-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">创建时间:</span>
                  <span className="font-medium">{formatDate(task.created_at)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">更新时间:</span>
                  <span className="font-medium">{formatDate(task.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 子任务区域 */}
          <div className="border-t border-slate-200/60 pt-8">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xl font-bold text-slate-800">
                子任务 ({totalSubtasks})
                {completedCount > 0 && (
                  <span className="text-sm text-emerald-600 ml-3 bg-emerald-50 px-3 py-1 rounded-xl font-semibold">
                    已完成 {completedCount}
                  </span>
                )}
              </h4>
              <div className="flex items-center gap-3">
                {/* 排序选择 */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'priority' | 'created' | 'status')}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 bg-white/60 backdrop-blur-sm"
                >
                  <option value="priority">按优先级排序</option>
                  <option value="created">按创建时间排序</option>
                  <option value="status">按状态排序</option>
                </select>
                
                {/* 状态筛选 */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 bg-white/60 backdrop-blur-sm"
                >
                  {statusOptionsForFilter.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                
                {/* 显示已完成复选框 */}
                <label className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100/60 px-4 py-2 rounded-2xl backdrop-blur-sm">
                  <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                    className="rounded w-4 h-4"
                  />
                  <span className="font-medium">显示已完成</span>
                </label>
              </div>
            </div>

            {/* 添加子任务 */}
            <div className="mb-6 p-6 bg-gradient-to-r from-slate-50/80 to-sky-50/80 rounded-2xl border border-slate-200/60 backdrop-blur-sm">
              <div className="space-y-3">
                {/* 子任务内容输入 */}
                <input
                  type="text"
                  value={newSubtaskContent}
                  onChange={(e) => setNewSubtaskContent(e.target.value)}
                  placeholder="添加新的子任务..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-300 bg-white/60 backdrop-blur-sm transition-all font-medium placeholder:text-slate-400"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                />
                
                {/* 选项控制 */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 font-medium">优先级:</label>
                    <select
                      value={newSubtaskPriority}
                      onChange={(e) => setNewSubtaskPriority(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/40 bg-white/60"
                    >
                      {priorityOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 font-medium">类型:</label>
                    <select
                      value={newSubtaskTaskType}
                      onChange={(e) => setNewSubtaskTaskType(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/40 bg-white/60"
                    >
                      {taskTypeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <button
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskContent.trim()}
                    className="px-4 py-1.5 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white rounded-lg disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed font-medium transition-all duration-200 shadow hover:shadow-md"
                  >
                    添加子任务
                  </button>
                </div>
              </div>
            </div>

            {/* 子任务列表 */}
            <div className="space-y-3">
              {filteredSubtasks.length === 0 ? (
                <div className="text-center text-slate-500 py-12 bg-slate-50/60 rounded-2xl backdrop-blur-sm">
                  <div className="text-4xl mb-3">📋</div>
                  <div className="font-semibold">
                    {subtasks.length === 0 ? '暂无子任务' : '没有符合条件的子任务'}
                  </div>
                </div>
              ) : (
                filteredSubtasks.map((subtask) => {
                  const subtaskPriorityInfo = priorityOptions.find(opt => opt.value === subtask.priority);
                  const subtaskStatusInfo = statusOptions.find(opt => opt.value === subtask.status);
                  const subtaskTaskTypeInfo = taskTypeOptions.find(opt => opt.value === subtask.task_type);
                  
                  return (
                    <div key={subtask.id} className="flex items-center gap-3 p-4 bg-white/60 border border-slate-200/60 rounded-2xl hover:bg-white/80 hover:shadow-md transition-all duration-200 backdrop-blur-sm">
                      <input
                        type="checkbox"
                        checked={subtask.status === 'completed'}
                        onChange={() => {
                          const newStatus = subtask.status === 'completed' ? 'active' : 'completed';
                          handleUpdateSubtaskStatus(subtask.id, newStatus);
                        }}
                        className="rounded w-5 h-5 flex-shrink-0"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-slate-700 truncate">{subtask.content}</span>
                          
                          {/* 优先级标签 */}
                          {subtaskPriorityInfo && (
                            <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-semibold ${subtaskPriorityInfo.color}`}>
                              {subtaskPriorityInfo.label}
                            </span>
                          )}
                          
                          {/* 状态标签 */}
                          {subtaskStatusInfo && (
                            <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-semibold ${subtaskStatusInfo.color}`}>
                              {subtaskStatusInfo.label}
                            </span>
                          )}
                          
                          {/* 任务类型标签 */}
                          {subtaskTaskTypeInfo && (
                            <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-semibold ${subtaskTaskTypeInfo.color}`}>
                              {subtaskTaskTypeInfo.label}
                            </span>
                          )}
                        </div>
                        
                        {/* 创建时间 */}
                        <div className="text-xs text-slate-500">
                          创建于 {formatDate(subtask.created_at)}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteSubtask(subtask.id)}
                        className="text-red-500 hover:text-red-700 text-sm bg-red-50 hover:bg-red-100 px-3 py-1 rounded-xl transition-all font-medium flex-shrink-0"
                      >
                        删除
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 底部操作按钮 */}
        <div className="flex items-center justify-end gap-4 p-8 border-t border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-sky-50/80 backdrop-blur-sm">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setEditedContent(task.content);
                  setStatus(task.status);
                  setPriority(task.priority || 'medium');
                  setTaskType(task.task_type || 'work');
                  setProgressNotes(task.progress_notes || '');
                  setIsEditing(false);
                }}
                className="px-6 py-3 text-slate-600 border border-slate-200 rounded-2xl hover:bg-slate-50 font-semibold transition-all backdrop-blur-sm"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white rounded-2xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                保存
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white rounded-2xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              编辑任务
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
