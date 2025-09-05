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

export default function TaskDetail({ 
  task, 
  onClose, 
  onUpdate, 
  onAddSubtask, 
  onDeleteSubtask 
}: TaskDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(task.content);
  const [newSubtaskContent, setNewSubtaskContent] = useState('');
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority || 'medium');
  const [progress, setProgress] = useState(task.progress || 0);
  const [subtasks, setSubtasks] = useState<Record[]>(task.subtasks || []);
  const [showCompleted, setShowCompleted] = useState(false);

  // 获取子任务
  useEffect(() => {
    fetchSubtasks();
  }, [task.id]);

  const fetchSubtasks = async () => {
    try {
      const response = await fetch(`http://localhost:5050/api/records/${task.id}/subtasks`);
      if (response.ok) {
        const data = await response.json();
        setSubtasks(data.subtasks || []);
      }
    } catch (error) {
      console.error('获取子任务失败:', error);
    }
  };

  const handleSave = () => {
    const updatedTask = {
      ...task,
      content: editedContent,
      status,
      priority,
      progress
    };
    onUpdate(updatedTask);
    setIsEditing(false);
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskContent.trim()) return;
    
    try {
      const response = await fetch(`http://localhost:5050/api/records/${task.id}/subtasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newSubtaskContent,
          category: 'task'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSubtasks([...subtasks, data.subtask]);
        setNewSubtaskContent('');
        onAddSubtask(task.id, newSubtaskContent);
      }
    } catch (error) {
      console.error('添加子任务失败:', error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: number) => {
    try {
      const response = await fetch(`http://localhost:5050/api/records/${subtaskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSubtasks(subtasks.filter(subtask => subtask.id !== subtaskId));
        onDeleteSubtask(subtaskId);
      }
    } catch (error) {
      console.error('删除子任务失败:', error);
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

  const filteredSubtasks = showCompleted 
    ? subtasks 
    : subtasks.filter(subtask => subtask.status !== 'completed');

  const completedCount = subtasks.filter(subtask => subtask.status === 'completed').length;
  const totalSubtasks = subtasks.length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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

            {/* 状态和优先级 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                <span className="text-sm font-semibold text-slate-600">进度</span>
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progress}
                      onChange={(e) => setProgress(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer"
                    />
                    <div className="text-center">
                      <span className="text-sm font-semibold text-sky-600">{progress}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-sky-500 to-blue-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-semibold text-slate-600">{progress}%</span>
                    </div>
                  </div>
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

            {/* 添加子任务 */}
            <div className="mb-6 p-6 bg-gradient-to-r from-slate-50/80 to-sky-50/80 rounded-2xl border border-slate-200/60 backdrop-blur-sm">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={newSubtaskContent}
                  onChange={(e) => setNewSubtaskContent(e.target.value)}
                  placeholder="添加新的子任务..."
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-300 bg-white/60 backdrop-blur-sm transition-all font-medium placeholder:text-slate-400"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                />
                <button
                  onClick={handleAddSubtask}
                  disabled={!newSubtaskContent.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white rounded-2xl disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  添加
                </button>
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
                filteredSubtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-4 p-4 bg-white/60 border border-slate-200/60 rounded-2xl hover:bg-white/80 hover:shadow-md transition-all duration-200 backdrop-blur-sm">
                    <input
                      type="checkbox"
                      checked={subtask.status === 'completed'}
                      onChange={() => {
                        // 这里可以添加更新子任务状态的逻辑
                      }}
                      className="rounded w-5 h-5"
                    />
                    <span className="flex-1 text-sm font-medium text-slate-700">{subtask.content}</span>
                    <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-xl font-medium">
                      {formatDate(subtask.created_at)}
                    </span>
                    <button
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="text-red-500 hover:text-red-700 text-sm bg-red-50 hover:bg-red-100 px-3 py-1 rounded-xl transition-all font-medium"
                    >
                      删除
                    </button>
                  </div>
                ))
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
