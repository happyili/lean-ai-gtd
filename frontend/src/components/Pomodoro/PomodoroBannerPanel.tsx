import { useState, useEffect } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '@/utils/api';
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
  onToggleExpanded?: () => void;
  refreshTrigger?: number; // 用于触发刷新的计数器
  onPomodoroChange?: () => void; // 回调函数，用于通知父组件番茄钟状态变化
}

export default function PomodoroBannerPanel({ 
  accessToken, 
  isExpanded,
  onToggleExpanded,
  refreshTrigger,
  onPomodoroChange
}: PomodoroBannerPanelProps) {
  const [tasks, setTasks] = useState<PomodoroTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  // localStorage keys
  const STORAGE_KEYS = {
    ACTIVE_TASK_ID: 'pomodoro_active_task_id',
    TIMER_MINUTES: 'pomodoro_timer_minutes',
    TIMER_SECONDS: 'pomodoro_timer_seconds',
    IS_TIMER_RUNNING: 'pomodoro_is_timer_running',
    PANEL_EXPANDED: 'pomodoro_panel_expanded'
  };

  // 保存状态到localStorage
  const saveStateToStorage = (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('保存状态到localStorage失败:', error);
    }
  };

  // 从localStorage加载状态
  const loadStateFromStorage = (key: string, defaultValue: any) => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.error('从localStorage加载状态失败:', error);
      return defaultValue;
    }
  };

  // 清除localStorage中的番茄钟状态
  const clearPomodoroState = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TASK_ID);
      localStorage.removeItem(STORAGE_KEYS.TIMER_MINUTES);
      localStorage.removeItem(STORAGE_KEYS.TIMER_SECONDS);
      localStorage.removeItem(STORAGE_KEYS.IS_TIMER_RUNNING);
    } catch (error) {
      console.error('清除localStorage状态失败:', error);
    }
  };

  // 加载番茄任务
  const loadPomodoroTasks = async () => {
    if (!accessToken) return;
    
    setLoading(true);
    try {
      const response = await apiGet('/api/pomodoro/tasks', '获取番茄任务', accessToken);
      const data = await response.json();
      if (data.success) {
        setTasks(data.data.tasks);
        
        // 检查是否有活跃任务
        const activeTask = data.data.tasks.find((task: PomodoroTask) => task.status === 'active');
        if (activeTask) {
          if (activeTask.id !== activeTaskId) {
            // 发现新的活跃任务，自动设置状态
            setActiveTaskId(activeTask.id);
            setTimerMinutes(25);
            setTimerSeconds(0);
            setIsTimerRunning(true);
            
            // 保存状态到localStorage
            saveStateToStorage(STORAGE_KEYS.ACTIVE_TASK_ID, activeTask.id);
            saveStateToStorage(STORAGE_KEYS.TIMER_MINUTES, 25);
            saveStateToStorage(STORAGE_KEYS.TIMER_SECONDS, 0);
            saveStateToStorage(STORAGE_KEYS.IS_TIMER_RUNNING, true);
            
            console.log('检测到新的活跃任务，自动切换到计时器模式:', activeTask.id);
          }
        } else {
          // 没有活跃任务，清除状态
          if (activeTaskId !== null) {
            setActiveTaskId(null);
            setIsTimerRunning(false);
            setTimerMinutes(25);
            setTimerSeconds(0);
            clearPomodoroState();
            console.log('没有活跃任务，清除计时器状态');
          }
        }
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
        onPomodoroChange?.(); // 通知父组件状态变化
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
        
        // 保存状态到localStorage
        saveStateToStorage(STORAGE_KEYS.ACTIVE_TASK_ID, taskId);
        saveStateToStorage(STORAGE_KEYS.TIMER_MINUTES, 25);
        saveStateToStorage(STORAGE_KEYS.TIMER_SECONDS, 0);
        saveStateToStorage(STORAGE_KEYS.IS_TIMER_RUNNING, true);
        
        // 自动展开面板
        if (onToggleExpanded && !isExpanded) {
          onToggleExpanded();
        }
        
        await loadPomodoroTasks();
        onPomodoroChange?.(); // 通知父组件状态变化
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
        
        // 清除localStorage中的番茄钟状态
        clearPomodoroState();
        
        await loadPomodoroTasks();
        
        // 重新排序任务：未完成的放在前面
        reorderTasksAfterCompletion();
        
        onPomodoroChange?.(); // 通知父组件状态变化
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
          
          // 清除localStorage中的番茄钟状态
          clearPomodoroState();
        }
        await loadPomodoroTasks();
        onPomodoroChange?.(); // 通知父组件状态变化
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
          
          // 清除localStorage中的番茄钟状态
          clearPomodoroState();
        }
        await loadPomodoroTasks();
        onPomodoroChange?.(); // 通知父组件状态变化
      }
    } catch (error) {
      console.error('重置任务失败:', error);
    }
  };

  // 删除番茄任务
  const deleteTask = async (taskId: number) => {
    if (!accessToken) return;

    try {
      const response = await apiDelete(`/api/pomodoro/tasks/${taskId}/delete`, '删除任务', accessToken);
      const data = await response.json();
      if (data.success) {
        if (activeTaskId === taskId) {
          // 先清除localStorage中的番茄钟状态
          clearPomodoroState();
          
          // 然后更新状态
          setActiveTaskId(null);
          setIsTimerRunning(false);
          setTimerMinutes(25);
          setTimerSeconds(0);
        }
        // 重新加载任务列表
        await loadPomodoroTasks();
        onPomodoroChange?.(); // 通知父组件状态变化
      }
    } catch (error) {
      console.error('删除任务失败:', error);
    }
  };

  // 完成任务后重新排序：未完成的放在前面
  const reorderTasksAfterCompletion = () => {
    setTasks(prevTasks => {
      // 分离已完成和未完成的任务
      const incompleteTasks = prevTasks.filter(task => 
        task.status === 'pending' || task.status === 'active' || task.status === 'skipped'
      );
      const completedTasks = prevTasks.filter(task => task.status === 'completed');
      
      // 未完成的任务按优先级和order_index排序
      incompleteTasks.sort((a, b) => {
        // 首先按状态排序：active > pending > skipped
        const statusOrder: { [key: string]: number } = { 'active': 0, 'pending': 1, 'skipped': 2 };
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;
        
        // 然后按优先级排序（高优先级在前）
        const priorityDiff = b.priority_score - a.priority_score;
        if (priorityDiff !== 0) return priorityDiff;
        
        // 最后按order_index排序
        return a.order_index - b.order_index;
      });
      
      // 已完成的任务按完成时间排序（最近完成的在前）
      completedTasks.sort((a, b) => {
        if (!a.completed_at || !b.completed_at) return 0;
        return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
      });
      
      // 合并：未完成的在前，已完成的在后
      return [...incompleteTasks, ...completedTasks];
    });
  };

  // 停止专注模式
  const stopFocusMode = async () => {
    if (!accessToken || !activeTaskId) return;
    
    setIsStopping(true);
    try {
      // 重置任务状态为未开始
      const response = await apiPost(`/api/pomodoro/tasks/${activeTaskId}/reset`, {}, '重置任务', accessToken);
      const data = await response.json();
      
      if (data.success) {
        // 清除本地状态
        setActiveTaskId(null);
        setIsTimerRunning(false);
        setTimerMinutes(25);
        setTimerSeconds(0);
        
        // 清除localStorage中的番茄钟状态
        clearPomodoroState();
        
        // 重新加载任务列表
        await loadPomodoroTasks();
        
        console.log('已停止专注模式并重置任务状态');
      } else {
        console.error('重置任务状态失败:', data.message);
      }
    } catch (error) {
      console.error('停止专注模式失败:', error);
    } finally {
      setIsStopping(false);
    }
  };

  // 番茄钟计时器
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTimerRunning && (timerMinutes > 0 || timerSeconds > 0)) {
      interval = setInterval(() => {
        if (timerSeconds > 0) {
          const newSeconds = timerSeconds - 1;
          setTimerSeconds(newSeconds);
          saveStateToStorage(STORAGE_KEYS.TIMER_SECONDS, newSeconds);
        } else if (timerMinutes > 0) {
          const newMinutes = timerMinutes - 1;
          setTimerMinutes(newMinutes);
          setTimerSeconds(59);
          saveStateToStorage(STORAGE_KEYS.TIMER_MINUTES, newMinutes);
          saveStateToStorage(STORAGE_KEYS.TIMER_SECONDS, 59);
        }
      }, 1000);
    } else if (isTimerRunning && timerMinutes === 0 && timerSeconds === 0) {
      // 番茄钟结束
      setIsTimerRunning(false);
      saveStateToStorage(STORAGE_KEYS.IS_TIMER_RUNNING, false);
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

  // 从localStorage恢复状态
  useEffect(() => {
    if (accessToken) {
      const storedActiveTaskId = loadStateFromStorage(STORAGE_KEYS.ACTIVE_TASK_ID, null);
      const storedTimerMinutes = loadStateFromStorage(STORAGE_KEYS.TIMER_MINUTES, 25);
      const storedTimerSeconds = loadStateFromStorage(STORAGE_KEYS.TIMER_SECONDS, 0);
      const storedIsTimerRunning = loadStateFromStorage(STORAGE_KEYS.IS_TIMER_RUNNING, false);
      
      if (storedActiveTaskId) {
        setActiveTaskId(storedActiveTaskId);
        setTimerMinutes(storedTimerMinutes);
        setTimerSeconds(storedTimerSeconds);
        setIsTimerRunning(storedIsTimerRunning);
        
        // 如果有活跃任务，自动展开面板
        if (onToggleExpanded && !isExpanded) {
          onToggleExpanded();
        }
        
        // 加载任务列表
        loadPomodoroTasks();
      }
    }
  }, [accessToken]);

  // 监听refreshTrigger变化，刷新任务列表
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0 && accessToken && isExpanded) {
      console.log('检测到refreshTrigger变化，刷新番茄任务列表');
      loadPomodoroTasks();
    }
  }, [refreshTrigger, accessToken, isExpanded]);

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
            ) : tasks.filter(task => task.status !== 'completed').length === 0 ? (
                <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                <h4 
                    className="text-lg font-semibold mb-2"
                    style={{ color: 'var(--text-primary)' }}
                >
                    暂无未完成的番茄任务
                </h4>
                <p 
                    className="mb-4"
                    style={{ color: 'var(--text-tertiary)' }}
                >
                    {tasks.length === 0 ? '点击"生成任务"让AI为你规划今日任务' : '所有任务都已完成！'}
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
                {/* 显示前4个未完成的任务 */}
                {tasks.filter(task => task.status !== 'completed').slice(0, 4).map((task, index) => (
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
                    onDeleteTask={deleteTask}
                    onTaskUpdate={(taskId, updatedTask) => {
                        setTasks(prev => prev.map(task => 
                            task.id === taskId ? updatedTask : task
                        ));
                    }}
                    onToggleTimer={() => setIsTimerRunning(!isTimerRunning)}
                    accessToken={accessToken}
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
                className="border-t p-2"
                style={{
                  borderColor: 'var(--border-light)',
                  backgroundColor: 'var(--error-bg)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
                }}
              >
                <div className="text-center">
                  {/* 计时器 - 更大字体 */}
                  <div 
                    className="text-2xl font-mono font-bold mb-4"
                    style={{ 
                      color: 'var(--error)',
                      textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {formatTime(timerMinutes, timerSeconds)} 
                  </div>
                  
                  {/* 专注任务标题 - 更大字体 */}
                  <div 
                    className="text-4xl font-semibold mb-3"
                    style={{ 
                      color: 'var(--error)',
                      fontWeight: '600'
                    }}
                  >
                     正在专注：{tasks.find(t => t.id === activeTaskId)?.title}
                  </div>
                  
                  {/* AI建议 - 新增显示 */}
                  {tasks.find(t => t.id === activeTaskId)?.ai_reasoning && (
                    <div className="py-3">
                      <p 
                        className="text-sm leading-relaxed"
                        style={{ 
                          color: 'var(--warning)',
                          fontStyle: 'italic'
                        }}
                      >
                        <strong>AI建议：</strong> {tasks.find(t => t.id === activeTaskId)?.ai_reasoning}
                      </p>
                    </div>
                  )}
                  
                  {/* 控制按钮 */}
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={() => {
                        const newIsRunning = !isTimerRunning;
                        setIsTimerRunning(newIsRunning);
                        saveStateToStorage(STORAGE_KEYS.IS_TIMER_RUNNING, newIsRunning);
                      }}
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
                    <button
                      onClick={stopFocusMode}
                      disabled={isStopping}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors text-base font-medium shadow-lg text-sm"
                    >
                      {isStopping ? '重置中...' : '停止并重置'}
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
