import { Play, Pause, SkipForward, CheckCircle, Clock, RotateCcw, Trash2 } from 'lucide-react';

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
  compact = false
}: PomodoroTaskCardProps) {
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
              <h4 
                className="text-sm font-semibold truncate leading-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {task.title}
              </h4>
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
            <h3 
              className="text-lg font-semibold ml-2"
              style={{ color: 'var(--text-primary)' }}
            >
              {task.title}
            </h3>
            <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority_score)}`}>
              优先级 {task.priority_score}
            </span>
          </div>
          
          <p 
            className="mb-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            {task.description}
          </p>
          
          {task.ai_reasoning && (
            <div 
              className="border-l-4 p-3 mb-3"
              style={{
                backgroundColor: 'var(--warning-bg)',
                borderColor: 'var(--warning)'
              }}
            >
              <p 
                className="text-sm"
                style={{ color: 'var(--warning)' }}
              >
                <strong>AI建议：</strong> {task.ai_reasoning}
              </p>
            </div>
          )}
          
          <div 
            className="flex items-center text-sm space-x-4"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <span>预估 {task.estimated_pomodoros} 个番茄钟</span>
            <span>已完成 {task.pomodoros_completed} 个</span>
            <span>专注时间 {task.total_focus_time} 分钟</span>
          </div>
        </div>
        
        <div className="flex flex-col space-y-2 ml-4">
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
