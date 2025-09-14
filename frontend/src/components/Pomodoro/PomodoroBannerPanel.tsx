import { useState, useEffect } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { apiGet, apiPost } from '@/utils/api';
import PomodoroTaskCard from './PomodoroTaskCard';

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

interface PomodoroBannerPanelProps {
  accessToken: string | null;
  isExpanded: boolean;
}

export default function PomodoroBannerPanel({ 
  accessToken, 
  isExpanded
}: PomodoroBannerPanelProps) {
  const [tasks, setTasks] = useState<PomodoroTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // 加载番茄任务
  const loadPomodoroTasks = async () => {
    if (!accessToken) return;
    
    setLoading(true);
    try {
      const response = await apiGet('/api/pomodoro/tasks', '获取番茄任务', accessToken);
      const data = await response.json();
      if (data.success) {
        setTasks(data.data.tasks);
      }
    } catch (error) {
      console.error('加载番茄任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 生成新的番茄任务
  const generateTasks = async () => {
    if (!accessToken) return;
    
    setGenerating(true);
    try {
      const response = await apiPost('/api/pomodoro/tasks/generate', {}, '生成番茄任务', accessToken);
      const data = await response.json();
      if (data.success) {
        setTasks(data.data.tasks);
      } else {
        console.error('生成番茄任务失败:', data.message);
      }
    } catch (error) {
      console.error('生成番茄任务失败:', error);
    } finally {
      setGenerating(false);
    }
  };

  // 开始番茄任务
  const startTask = async (taskId: number) => {
    if (!accessToken) return;
    
    try {
      const response = await apiPost(`/api/pomodoro/tasks/${taskId}/start`, {}, '开始任务', accessToken);
      const data = await response.json();
      if (data.success) {
        setActiveTaskId(taskId);
        setTimerMinutes(25);
        setTimerSeconds(0);
        setIsTimerRunning(true);
        await loadPomodoroTasks();
      }
    } catch (error) {
      console.error('开始任务失败:', error);
    }
  };

  // 完成番茄任务
  const completeTask = async (taskId: number) => {
    if (!accessToken) return;
    
    try {
      const focusMinutes = 25 - timerMinutes + (timerSeconds > 0 ? 1 : 0);
      const response = await apiPost(`/api/pomodoro/tasks/${taskId}/complete`, { focus_minutes: focusMinutes }, '完成任务', accessToken);
      const data = await response.json();
      if (data.success) {
        setActiveTaskId(null);
        setIsTimerRunning(false);
        setTimerMinutes(25);
        setTimerSeconds(0);
        await loadPomodoroTasks();
      }
    } catch (error) {
      console.error('完成任务失败:', error);
    }
  };

  // 跳过番茄任务
  const skipTask = async (taskId: number) => {
    if (!accessToken) return;
    
    try {
      const response = await apiPost(`/api/pomodoro/tasks/${taskId}/skip`, {}, '跳过任务', accessToken);
      const data = await response.json();
      if (data.success) {
        if (activeTaskId === taskId) {
          setActiveTaskId(null);
          setIsTimerRunning(false);
          setTimerMinutes(25);
          setTimerSeconds(0);
        }
        await loadPomodoroTasks();
      }
    } catch (error) {
      console.error('跳过任务失败:', error);
    }
  };

  // 重置番茄任务到未开始
  const resetTask = async (taskId: number) => {
    if (!accessToken) return;

    try {
      const response = await apiPost(`/api/pomodoro/tasks/${taskId}/reset`, {}, '重置任务', accessToken);
      const data = await response.json();
      if (data.success) {
        if (activeTaskId === taskId) {
          setActiveTaskId(null);
          setIsTimerRunning(false);
          setTimerMinutes(25);
          setTimerSeconds(0);
        }
        await loadPomodoroTasks();
      }
    } catch (error) {
      console.error('重置任务失败:', error);
    }
  };

  // 番茄钟计时器
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTimerRunning && (timerMinutes > 0 || timerSeconds > 0)) {
      interval = setInterval(() => {
        if (timerSeconds > 0) {
          setTimerSeconds(timerSeconds - 1);
        } else if (timerMinutes > 0) {
          setTimerMinutes(timerMinutes - 1);
          setTimerSeconds(59);
        }
      }, 1000);
    } else if (isTimerRunning && timerMinutes === 0 && timerSeconds === 0) {
      // 番茄钟结束
      setIsTimerRunning(false);
      if (activeTaskId) {
        completeTask(activeTaskId);
      }
    }

    return () => clearInterval(interval);
  }, [isTimerRunning, timerMinutes, timerSeconds, activeTaskId]);

  // 初始加载
  useEffect(() => {
    if (accessToken && isExpanded) {
      loadPomodoroTasks();
    }
  }, [accessToken, isExpanded]);

  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!accessToken) return null;

  return (
    <div className="w-full top-[48px]">
      {/* 展开的面板 */}
      {isExpanded && (
        <div className="mx-auto max-w-7xl p-2">
            {/* 任务列表 */}
            {!activeTaskId && (
            <div>
            {loading ? (
                <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mr-2"></div>
                <span style={{ color: 'var(--text-tertiary)' }}>加载中...</span>
                </div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                <h4 
                    className="text-lg font-semibold mb-2"
                    style={{ color: 'var(--text-primary)' }}
                >
                    暂无番茄任务
                </h4>
                <p 
                    className="mb-4"
                    style={{ color: 'var(--text-tertiary)' }}
                >
                    点击"生成任务"让AI为你规划今日任务
                </p>
                <button
                    onClick={generateTasks}
                    disabled={generating}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center mx-auto"
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                    {generating ? '生成中...' : '生成我的番茄任务'}
                </button>
                </div>
            ) : (
                <div className="space-y-3 flex flex-wrap gap-2 justify-start">
                {/* 显示前4个任务 */}
                {tasks.slice(0, 4).map((task, index) => (
                    <PomodoroTaskCard
                    key={task.id}
                    task={task}
                    index={index}
                    activeTaskId={activeTaskId}
                    isTimerRunning={isTimerRunning}
                    onStartTask={startTask}
                    onCompleteTask={completeTask}
                    onSkipTask={skipTask}
                    onResetTask={resetTask}
                    onToggleTimer={() => setIsTimerRunning(!isTimerRunning)}
                    compact={true}
                    />
                ))}
                
                </div>
            )}
            </div>
            )}

            {/* 番茄钟计时器 */}
            {activeTaskId && (
              <div 
                className="border-t p-4"
                style={{
                  borderColor: 'var(--border-light)',
                  backgroundColor: 'var(--error-bg)'
                }}
              >
                <div className="text-center">
                  <div 
                    className="text-3xl font-mono font-bold mb-2"
                    style={{ color: 'var(--error)' }}
                  >
                    {formatTime(timerMinutes, timerSeconds)}
                  </div>
                  <div 
                    className="text-sm mb-3"
                    style={{ color: 'var(--error)' }}
                  >
                    正在专注：{tasks.find(t => t.id === activeTaskId)?.title}
                  </div>
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center text-sm"
                    >
                      {isTimerRunning ? '暂停' : '继续'}
                    </button>
                    <button
                      onClick={() => activeTaskId && completeTask(activeTaskId)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      完成任务
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
