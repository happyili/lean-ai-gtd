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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">任务详情</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* 基本信息 */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-2xl">📋</span>
              <div className="flex-1">
                {isEditing ? (
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                ) : (
                  <h3 className="text-xl font-semibold text-gray-900">{task.content}</h3>
                )}
              </div>
            </div>

            {/* 状态和优先级 */}
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">状态:</span>
                {isEditing ? (
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    statusOptions.find(opt => opt.value === status)?.color || 'bg-gray-100 text-gray-800'
                  }`}>
                    {statusOptions.find(opt => opt.value === status)?.label || status}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">优先级:</span>
                {isEditing ? (
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {priorityOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    priorityOptions.find(opt => opt.value === priority)?.color || 'bg-gray-100 text-gray-800'
                  }`}>
                    {priorityOptions.find(opt => opt.value === priority)?.label || priority}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">进度:</span>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progress}
                      onChange={(e) => setProgress(Number(e.target.value))}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-600">{progress}%</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{progress}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* 时间信息 */}
            <div className="text-sm text-gray-500 space-y-1">
              <div>创建时间: {formatDate(task.created_at)}</div>
              <div>更新时间: {formatDate(task.updated_at)}</div>
            </div>
          </div>

          {/* 子任务区域 */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                子任务 ({totalSubtasks})
                {completedCount > 0 && (
                  <span className="text-sm text-green-600 ml-2">
                    (已完成 {completedCount})
                  </span>
                )}
              </h4>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                    className="rounded"
                  />
                  显示已完成
                </label>
              </div>
            </div>

            {/* 添加子任务 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubtaskContent}
                  onChange={(e) => setNewSubtaskContent(e.target.value)}
                  placeholder="添加新的子任务..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                />
                <button
                  onClick={handleAddSubtask}
                  disabled={!newSubtaskContent.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  添加
                </button>
              </div>
            </div>

            {/* 子任务列表 */}
            <div className="space-y-2">
              {filteredSubtasks.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {subtasks.length === 0 ? '暂无子任务' : '没有符合条件的子任务'}
                </div>
              ) : (
                filteredSubtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={subtask.status === 'completed'}
                      onChange={() => {
                        // 这里可以添加更新子任务状态的逻辑
                      }}
                      className="rounded"
                    />
                    <span className="flex-1 text-sm text-gray-700">{subtask.content}</span>
                    <span className="text-xs text-gray-500">
                      {formatDate(subtask.created_at)}
                    </span>
                    <button
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
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
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setEditedContent(task.content);
                  setStatus(task.status);
                  setIsEditing(false);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                保存
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              编辑任务
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
