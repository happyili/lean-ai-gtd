import { useState, useEffect, useRef } from 'react';

interface PomodoroTask {
  id: string;
  title: string;
  description: string;
  estimatedTime: number;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

interface PomodoroFocusModeProps {
  isActive: boolean;
  task: PomodoroTask | null;
  onComplete: () => void;
  onPause: () => void;
  onStop: () => void;
}

export default function PomodoroFocusMode({ 
  isActive, 
  task, 
  onComplete, 
  onPause, 
  onStop 
}: PomodoroFocusModeProps) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 开始倒计时
  const startTimer = () => {
    if (!isRunning) {
      setIsRunning(true);
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // 时间到了
            setIsRunning(false);
            if (!isBreak) {
              // 工作时间结束，进入休息
              setIsBreak(true);
              setTimeLeft(5 * 60); // 5分钟休息
              // 播放提示音（如果需要）
              onComplete();
            } else {
              // 休息时间结束
              setIsBreak(false);
              setTimeLeft(25 * 60); // 重置为25分钟
              onComplete();
            }
            return prev;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // 暂停倒计时
  const pauseTimer = () => {
    if (isRunning) {
      setIsRunning(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      onPause();
    }
  };

  // 停止倒计时
  const stopTimer = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimeLeft(25 * 60);
    setIsBreak(false);
    onStop();
  };

  // 计算进度百分比
  const getProgress = () => {
    const totalTime = isBreak ? 5 * 60 : (task?.estimatedTime || 25) * 60;
    return ((totalTime - timeLeft) / totalTime) * 100;
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 重置时间当任务变化时
  useEffect(() => {
    if (task) {
      setTimeLeft((task.estimatedTime || 25) * 60);
      setIsBreak(false);
      setIsRunning(false);
    }
  }, [task]);

  if (!isActive || !task) return null;

  const priorityColors = {
    high: 'var(--error)',
    medium: 'var(--warning)',
    low: 'var(--success)'
  };

  return (
    <div 
      className="fixed top-12 left-0 right-0 z-50 shadow-lg transition-all duration-300"
      style={{ 
        backgroundColor: 'var(--card-background)',
        borderBottom: '1px solid var(--border-light)'
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* 任务信息 */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div 
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: isRunning ? priorityColors[task.priority] : 'var(--text-disabled)' }}
              ></div>
              <div>
                <h3 className="text-body font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {isBreak ? '🌱 休息时间' : `🍅 专注模式: ${task.title}`}
                </h3>
                <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
                  {isBreak ? '放松一下，为下一个番茄时钟做准备' : task.description}
                </p>
              </div>
            </div>
          </div>

          {/* 时间和控制 */}
          <div className="flex items-center space-x-6">
            {/* 进度条 */}
            <div className="flex items-center space-x-3">
              <div 
                className="w-32 h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--background-secondary)' }}
              >
                <div 
                  className="h-full transition-all duration-1000 rounded-full"
                  style={{ 
                    width: `${getProgress()}%`,
                    backgroundColor: isBreak ? 'var(--success)' : priorityColors[task.priority]
                  }}
                />
              </div>
              <div className="text-body-large font-mono font-bold min-w-[80px]" style={{ 
                color: isRunning ? priorityColors[task.priority] : 'var(--text-secondary)' 
              }}>
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* 控制按钮 */}
            <div className="flex items-center space-x-3">
              <button
                onClick={isRunning ? pauseTimer : startTimer}
                className="px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2"
                style={{
                  backgroundColor: isRunning ? 'var(--warning)' : priorityColors[task.priority],
                  color: 'white',
                  border: `1px solid ${isRunning ? 'var(--warning)' : priorityColors[task.priority]}`
                }}
              >
                <span>{isRunning ? '⏸️' : '▶️'}</span>
                <span>{isRunning ? '暂停' : '开始'}</span>
              </button>
              
              <button
                onClick={stopTimer}
                className="px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 btn-secondary"
              >
                <span>⏹️</span>
                <span>停止</span>
              </button>
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={stopTimer}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:btn-secondary"
              style={{ color: 'var(--text-muted)' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 额外信息栏 */}
        <div className="mt-3 flex items-center justify-between text-caption" style={{ color: 'var(--text-muted)' }}>
          <div className="flex items-center space-x-4">
            <span>📊 优先级: {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}</span>
            <span>🏷️ 类别: {task.category}</span>
            <span>⏱️ 预估: {task.estimatedTime}分钟</span>
          </div>
          <div className="flex items-center space-x-2">
            {isBreak && (
              <span className="px-2 py-1 rounded" style={{ 
                backgroundColor: 'var(--success-bg)', 
                color: 'var(--success)' 
              }}>
                休息中 😌
              </span>
            )}
            {isRunning && (
              <span className="px-2 py-1 rounded" style={{ 
                backgroundColor: 'var(--primary-light)', 
                color: 'var(--primary)' 
              }}>
                专注中 🔥
              </span>
            )}
            <span>💡 提示: 专注工作，避免分心</span>
          </div>
        </div>
      </div>
    </div>
  );
}