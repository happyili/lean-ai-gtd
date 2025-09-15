import { Play, Pause, SkipForward, CheckCircle, Clock, RotateCcw, Trash2, Edit2, Save, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { updatePomodoroTask } from '../../utils/api';

interface PomodoroTask {
  id: number;
  title: string;
  description: string;
  related_task_ids: string;
  priority_score: number;
  estimated_pomodoros: number;
  order_index: number;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  started_at: string | null;
  completed_at: string | null;
  pomodoros_completed: number;
  total_focus_time: number;
  ai_reasoning: string;
  created_at: string;
}

interface PomodoroTaskCardProps {
  task: PomodoroTask;
  index: number;
  activeTaskId: number | null;
  isTimerRunning: boolean;
  onStartTask: (taskId: number) => void;
  onCompleteTask: (taskId: number) => void;
  onSkipTask: (taskId: number) => void;
  onResetTask: (taskId: number) => void;
  onDeleteTask?: (taskId: number) => void; // 改为可选参数
  onToggleTimer: () => void;
  onTaskUpdate?: (taskId: number, updatedTask: PomodoroTask) => void; // 新增：任务更新回调
  compact?: boolean; // 是否使用紧凑模式
}

export default function PomodoroTaskCard({
  task,
  index,
  activeTaskId,
  isTimerRunning,
  onStartTask,
  onCompleteTask,
  onSkipTask,
  onResetTask,
  onDeleteTask,
  onToggleTimer,
  onTaskUpdate,
  compact = false
}: PomodoroTaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description);
  const [editPriorityScore, setEditPriorityScore] = useState(task.priority_score);
  const [editEstimatedPomodoros, setEditEstimatedPomodoros] = useState(task.estimated_pomodoros);
  const [editAiReasoning, setEditAiReasoning] = useState(task.ai_reasoning);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 当进入编辑模式时，自动聚焦输入框
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleTitleClick = () => {
    if (!isEditing) {
      setIsEditing(true);
      setEditTitle(task.title);
    }
  };

  const handleSave = async () => {
    if (!editTitle.trim()) {
      alert('任务标题不能为空');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const updateData = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        priority_score: editPriorityScore,
        estimated_pomodoros: editEstimatedPomodoros,
        ai_reasoning: editAiReasoning.trim()
      };
      
      const updatedTask = await updatePomodoroTask(task.id, updateData, token || undefined);
      
      if (onTaskUpdate) {
        onTaskUpdate(task.id, updatedTask);
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('更新任务失败:', error);
      alert('更新任务失败，请重试');
      // 恢复原值
      setEditTitle(task.title);
      setEditDescription(task.description);
      setEditPriorityScore(task.priority_score);
      setEditEstimatedPomodoros(task.estimated_pomodoros);
      setEditAiReasoning(task.ai_reasoning);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditPriorityScore(task.priority_score);
    setEditEstimatedPomodoros(task.estimated_pomodoros);
    setEditAiReasoning(task.ai_reasoning);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const progressPercent = Math.min(100, (task.pomodoros_completed / task.estimated_pomodoros) * 100);

  const getPriorityColor = (score: number) => {
    if (score >= 80) return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
    if (score >= 60) return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20';
    return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'active':
        return <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'skipped':
        return <SkipForward className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500" />;
    }
  };

  if (compact) {
    // 紧凑模式 - 用于banner展开面板
    return (
      <div
        className="relative overflow-hidden rounded-lg border transition-all cursor-pointer hover:shadow-sm"
        onClick={() => task.status === 'pending' && !activeTaskId ? onStartTask(task.id) : null}
        style={{ 
          height: '60px',
          borderColor: task.status === 'completed' 
            ? 'var(--success)' 
            : task.status === 'active'
            ? 'var(--info)'
            : task.status === 'skipped'
            ? 'var(--border-default)'
            : 'var(--border-light)',
          backgroundColor: 'var(--card-background)'
        }}
      >
        {/* 背景进度条 */}
        <div 
          className="absolute inset-0 transition-all duration-300"
          style={{
            background: task.status === 'pending' 
              ? `linear-gradient(to right, var(--background-secondary) 0%, var(--background-secondary) ${progressPercent}%, var(--card-background) ${progressPercent}%, var(--card-background) 100%)`
              : task.status === 'completed'
              ? 'linear-gradient(to right, var(--success-bg), var(--success-bg))'
              : task.status === 'active'
              ? 'linear-gradient(to right, var(--info-bg), var(--info-bg))'
              : task.status === 'skipped'
              ? 'linear-gradient(to right, var(--background-secondary), var(--background-secondary))'
              : 'linear-gradient(to right, var(--background-secondary), var(--card-background))'
          }}
        />
        
        {/* 内容层 */}
        <div className="relative z-10 p-3 h-full flex items-center justify-between">
          <div className="flex-1 min-w-0 flex items-center">
            <span 
              className="text-sm font-bold mr-2"
              style={{ color: 'var(--text-muted)' }}
            >
              #{index + 1}
            </span>
            {getStatusIcon(task.status)}
            <div className="ml-2 flex-1 min-w-0">
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSave}
                  className="text-sm font-semibold w-full bg-transparent border-none outline-none"
                  style={{ color: 'var(--text-primary)' }}
                  disabled={isSaving}
                />
              ) : (
                <h4 
                  className="text-sm font-semibold truncate leading-tight cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-1 py-0.5 rounded"
                  style={{ color: 'var(--text-primary)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTitleClick();
                  }}
                  title="点击编辑标题"
                >
                  {task.title}
                </h4>
              )}
              <div className="flex items-center text-xs space-x-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority_score)}`}>
                  {task.priority_score}
                </span>
                <span style={{ color: 'var(--text-tertiary)' }}>{task.estimated_pomodoros}🍅</span>
                <span style={{ color: 'var(--text-tertiary)' }}>{task.pomodoros_completed}/{task.estimated_pomodoros}</span>
              </div>
            </div>
          </div>
          
          {/* 按钮区域 - 只显示图标 */}
          <div className="flex items-center space-x-2 ml-3">
            {task.status === 'pending' && !activeTaskId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartTask(task.id);
                }}
                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                title="开始任务"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            
            {task.status === 'active' && activeTaskId === task.id && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleTimer();
                  }}
                  className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  title={isTimerRunning ? '暂停' : '继续'}
                >
                  {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCompleteTask(task.id);
                  }}
                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  title="完成任务"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              </>
            )}
            
            {task.status !== 'completed' && task.status !== 'skipped' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSkipTask(task.id);
                }}
                className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                title="跳过任务"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}

            {task.status !== 'pending' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResetTask(task.id);
                }}
                className="p-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                title="重置为未开始"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onDeleteTask) {
                  console.log('删除按钮被点击，taskId:', task.id);
                  onDeleteTask(task.id);
                } else {
                  console.error('onDeleteTask未定义');
                }
              }}
              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              title="删除任务"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 详细模式 - 用于PomodoroManager中的详细任务列表
  return (
    <div
      className="rounded-lg border-2 p-6 transition-all"
      style={{
        borderColor: task.status === 'completed' 
          ? 'var(--success)' 
          : task.status === 'active'
          ? 'var(--info)'
          : task.status === 'skipped'
          ? 'var(--border-default)'
          : 'var(--border-light)',
        backgroundColor: task.status === 'completed' 
          ? 'var(--success-bg)' 
          : task.status === 'active'
          ? 'var(--info-bg)'
          : task.status === 'skipped'
          ? 'var(--background-secondary)'
          : 'var(--card-background)'
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <span 
              className="text-2xl font-bold mr-3"
              style={{ color: 'var(--text-muted)' }}
            >
              #{index + 1}
            </span>
            {getStatusIcon(task.status)}
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
                className="text-lg font-semibold ml-2 bg-transparent border-none outline-none flex-1"
                style={{ color: 'var(--text-primary)' }}
                disabled={isSaving}
              />
            ) : (
              <h3 
                className="text-lg font-semibold ml-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded"
                style={{ color: 'var(--text-primary)' }}
                onClick={handleTitleClick}
                title="点击编辑标题"
              >
                {task.title}
              </h3>
            )}
            {isEditing ? (
              <input
                type="number"
                min="0"
                max="100"
                value={editPriorityScore}
                onChange={(e) => setEditPriorityScore(parseInt(e.target.value) || 0)}
                className="ml-3 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 border border-gray-300"
                style={{ width: '80px' }}
              />
            ) : (
              <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority_score)}`}>
                优先级 {task.priority_score}
              </span>
            )}
          </div>
          
          {isEditing ? (
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="输入任务描述"
            />
          ) : (
            <p 
              className="mb-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setIsEditing(true)}
              title="点击编辑描述"
            >
              {task.description || '点击添加描述'}
            </p>
          )}
          
          {isEditing ? (
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                AI建议:
              </label>
              <textarea
                value={editAiReasoning}
                onChange={(e) => setEditAiReasoning(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="输入AI建议或备注"
              />
            </div>
          ) : (
            task.ai_reasoning && (
              <div 
                className="border-l-4 p-3 mb-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                style={{
                  backgroundColor: 'var(--warning-bg)',
                  borderColor: 'var(--warning)'
                }}
                onClick={() => setIsEditing(true)}
                title="点击编辑AI建议"
              >
                <p 
                  className="text-sm"
                  style={{ color: 'var(--warning)' }}
                >
                  <strong>AI建议：</strong> {task.ai_reasoning}
                </p>
              </div>
            )
          )}
          
          <div 
            className="flex items-center text-sm space-x-4"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">预估番茄钟数:</label>
                <input
                  type="number"
                  min="1"
                  value={editEstimatedPomodoros}
                  onChange={(e) => setEditEstimatedPomodoros(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            ) : (
              <span>预估 {task.estimated_pomodoros} 个番茄钟</span>
            )}
            <span>已完成 {task.pomodoros_completed} 个</span>
            <span>专注时间 {task.total_focus_time} 分钟</span>
          </div>
        </div>
        
        <div className="flex flex-col space-y-2 ml-4">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
              >
                <Save className="w-4 h-4 mr-1" />
                {isSaving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center"
              >
                <X className="w-4 h-4 mr-1" />
                取消
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                编辑
              </button>
              {task.status === 'pending' && (
                <button
                  onClick={() => onStartTask(task.id)}
                  disabled={activeTaskId !== null}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center"
                >
                  <Play className="w-4 h-4 mr-1" />
                  开始
                </button>
              )}
            </>
          )}
          
          {task.status !== 'completed' && task.status !== 'skipped' && (
            <button
              onClick={() => onSkipTask(task.id)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
            >
              <SkipForward className="w-4 h-4 mr-1" />
              跳过
            </button>
          )}

          {task.status !== 'pending' && (
            <button
              onClick={() => onResetTask(task.id)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              重置
            </button>
          )}

          <button
            onClick={() => {
              if (onDeleteTask) {
                console.log('详细模式删除按钮被点击，taskId:', task.id);
                onDeleteTask(task.id);
              } else {
                console.error('onDeleteTask未定义 (详细模式)');
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            删除
          </button>
        </div>
      </div>
    </div>
  );
}
