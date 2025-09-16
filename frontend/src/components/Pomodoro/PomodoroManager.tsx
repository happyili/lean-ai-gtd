import { useState, useEffect } from 'react';
import { Clock, RefreshCw, AlertCircle, BarChart3, Plus, X } from 'lucide-react';
import { apiPost, apiGet, apiDelete } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
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

interface PomodoroStats {
  total_stats: {
    total_tasks: number;
    completed_tasks: number;
    active_tasks: number;
    pending_tasks: number;
    skipped_tasks: number;
    total_pomodoros: number;
    total_focus_time: number;
    completion_rate: number;
  };
  today_stats: {
    today_completed_tasks: number;
    today_pomodoros: number;
    today_focus_time: number;
    today_focus_hours: number;
  };
}

interface PomodoroManagerProps {
  accessToken: string | null;
  onPomodoroChange?: () => void; // 回调函数，用于通知父组件番茄钟状态变化
  refreshTrigger?: number; // 用于触发刷新的计数器
}

export default function PomodoroManager({ accessToken, onPomodoroChange, refreshTrigger }: PomodoroManagerProps) {
  const { accessToken: authToken } = useAuth();
  const token = authToken || accessToken; // Use auth context token first, fallback to prop
  
  const [tasks, setTasks] = useState<PomodoroTask[]>([]);
  const [stats, setStats] = useState<PomodoroStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    title: '',
    description: '',
    priority_score: 50,
    estimated_pomodoros: 1,
    ai_reasoning: ''
  });

  // 加载番茄任务
  const loadPomodoroTasks = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await apiGet('/api/pomodoro/tasks', '获取番茄任务', token);
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

  // 加载统计信息
  const loadStats = async () => {
    if (!token) return;
    setStatsLoading(true);
    setStatsError(null);
    try {
      const response = await apiGet('/api/pomodoro/stats', '获取统计信息', token);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      } else {
        setStats(null);
        setStatsError(data.message || '获取统计信息失败');
      }
    } catch (error) {
      console.error('加载统计信息失败:', error);
      setStats(null);
      setStatsError(error instanceof Error ? error.message : '加载统计信息失败');
    } finally {
      setStatsLoading(false);
    }
  };

  // 切换统计面板时，若打开则刷新一次统计
  const toggleStats = () => {
    const next = !showStats;
    setShowStats(next);
    if (next) {
      loadStats();
    }
  };

  // 创建新的番茄任务
  const createTask = async () => {
    if (!token || !createFormData.title.trim()) return;
    
    try {
      const response = await apiPost('/api/pomodoro/tasks', createFormData, '创建番茄任务', token);
      const data = await response.json();
      if (data.success) {
        setTasks(prev => [...prev, data.data]);
        setShowCreateForm(false);
        setCreateFormData({
          title: '',
          description: '',
          priority_score: 50,
          estimated_pomodoros: 1,
          ai_reasoning: ''
        });
        await loadStats();
        onPomodoroChange?.(); // 通知父组件状态变化
      } else {
        console.error('创建番茄任务失败:', data.message);
      }
    } catch (error) {
      console.error('创建番茄任务失败:', error);
    }
  };

  // 生成新的番茄任务
  const generateTasks = async () => {
    if (!token) return;
    
    setGenerating(true);
    try {
      const response = await apiPost('/api/pomodoro/tasks/generate', {}, '生成番茄任务', token);
      const data = await response.json();
      if (data.success) {
        setTasks(data.data.tasks);
        await loadStats();
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
    if (!token) return;
    
    try {
      const response = await apiPost(`/api/pomodoro/tasks/${taskId}/start`, {}, '开始任务', token);
      const data = await response.json();
      if (data.success) {
        setActiveTaskId(taskId);
        setTimerMinutes(25);
        setTimerSeconds(0);
        setIsTimerRunning(true);
        await loadPomodoroTasks();
        onPomodoroChange?.(); // 通知父组件状态变化
      }
    } catch (error) {
      console.error('开始任务失败:', error);
    }
  };

  // 完成番茄任务
  const completeTask = async (taskId: number) => {
    if (!token) return;
    
    try {
      const focusMinutes = 25 - timerMinutes + (timerSeconds > 0 ? 1 : 0);
      const response = await apiPost(`/api/pomodoro/tasks/${taskId}/complete`, { focus_minutes: focusMinutes }, '完成任务', token);
      const data = await response.json();
      if (data.success) {
        setActiveTaskId(null);
        setIsTimerRunning(false);
        setTimerMinutes(25);
        setTimerSeconds(0);
        await loadPomodoroTasks();
        await loadStats();
        onPomodoroChange?.(); // 通知父组件状态变化
      }
    } catch (error) {
      console.error('完成任务失败:', error);
    }
  };

  // 跳过番茄任务
  const skipTask = async (taskId: number) => {
    if (!token) return;
    
    try {
      const response = await apiPost(`/api/pomodoro/tasks/${taskId}/skip`, {}, '跳过任务', token);
      const data = await response.json();
      if (data.success) {
        if (activeTaskId === taskId) {
          setActiveTaskId(null);
          setIsTimerRunning(false);
          setTimerMinutes(25);
          setTimerSeconds(0);
        }
        await loadPomodoroTasks();
        await loadStats();
        onPomodoroChange?.(); // 通知父组件状态变化
      }
    } catch (error) {
      console.error('跳过任务失败:', error);
    }
  };

  // 重置番茄任务到未开始
  const resetTask = async (taskId: number) => {
    if (!token) return;

    try {
      const response = await apiPost(`/api/pomodoro/tasks/${taskId}/reset`, {}, '重置任务', token);
      const data = await response.json();
      if (data.success) {
        if (activeTaskId === taskId) {
          setActiveTaskId(null);
          setIsTimerRunning(false);
          setTimerMinutes(25);
          setTimerSeconds(0);
        }
        await loadPomodoroTasks();
        await loadStats();
        onPomodoroChange?.(); // 通知父组件状态变化
      }
    } catch (error) {
      console.error('重置任务失败:', error);
    }
  };

  // 删除番茄任务
  const deleteTask = async (taskId: number) => {
    if (!token) return;

    try {
      const response = await apiDelete(`/api/pomodoro/tasks/${taskId}/delete`, '删除任务', token);
      const data = await response.json();
      if (data.success) {
        if (activeTaskId === taskId) {
          setActiveTaskId(null);
          setIsTimerRunning(false);
          setTimerMinutes(25);
          setTimerSeconds(0);
        }
        await loadPomodoroTasks();
        await loadStats();
        onPomodoroChange?.(); // 通知父组件状态变化
      }
    } catch (error) {
      console.error('删除任务失败:', error);
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
    if (token) {
      loadPomodoroTasks();
      loadStats();
    }
  }, [token]);

  // 监听refreshTrigger变化，刷新任务列表
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0 && token) {
      console.log('PomodoroManager检测到refreshTrigger变化，刷新任务列表');
      loadPomodoroTasks();
      loadStats();
    }
  }, [refreshTrigger, token]);



  if (!token) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>请先登录以使用番茄钟功能</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 card">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center" style={{ color: 'var(--text-primary)' }}>
            <Clock className="w-8 h-8 mr-2" style={{ color: 'var(--accent-red)' }} />
            AI番茄钟
          </h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>AI为你智能规划今日最重要的任务</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={toggleStats}
            className="px-4 py-2 rounded-lg transition-colors flex items-center"
            style={{ 
              backgroundColor: 'var(--background-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--border-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
            }}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            统计
          </button>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 rounded-lg transition-colors flex items-center"
            style={{ 
              backgroundColor: 'var(--success)',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--success-bg)';
              e.currentTarget.style.color = 'var(--success)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--success)';
              e.currentTarget.style.color = 'white';
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            新建任务
          </button>
          
          <button
            onClick={generateTasks}
            disabled={generating}
            className="px-6 py-2 rounded-lg transition-colors flex items-center disabled:opacity-50"
            style={{ 
              backgroundColor: 'var(--primary)',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              if (!generating) {
                e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!generating) {
                e.currentTarget.style.backgroundColor = 'var(--primary)';
              }
            }}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            {generating ? '生成中...' : '生成我的番茄任务'}
          </button>
        </div>
      </div>

      {/* 统计信息面板 */}
      {showStats && (
        <div className="mb-6">
          {statsLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 mr-2" style={{ borderColor: 'var(--primary)' }}></div>
              <span style={{ color: 'var(--text-secondary)' }}>加载统计中...</span>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--info-bg)' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--info)' }}>{stats.today_stats.today_pomodoros}</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>今日番茄钟</div>
              </div>
              <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--success-bg)' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{stats.today_stats.today_completed_tasks}</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>今日完成任务</div>
              </div>
              <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--accent-purple-bg)' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--accent-purple)' }}>{stats.today_stats.today_focus_hours}h</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>今日专注时间</div>
              </div>
              <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--warning-bg)' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>{stats.total_stats.completion_rate}%</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>完成率</div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 rounded-lg flex items-center justify-between" style={{ 
              backgroundColor: 'var(--background-secondary)',
              border: '1px solid var(--border-light)'
            }}>
              <div>
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>暂无统计数据</div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>生成番茄任务或刷新以获取统计</div>
                {statsError && <div className="text-sm mt-1" style={{ color: 'var(--error)' }}>{statsError}</div>}
              </div>
              <button
                onClick={loadStats}
                className="px-3 py-1 rounded text-sm transition-colors"
                style={{ 
                  backgroundColor: 'var(--primary)',
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--primary)';
                }}
              >
                刷新
              </button>
            </div>
          )}
        </div>
      )}

      {/* 创建任务表单 */}
      {showCreateForm && (
        <div className="mb-6 rounded-lg p-6" style={{ 
          backgroundColor: 'var(--card-background)',
          border: '1px solid var(--border-light)'
        }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>创建新番茄任务</h3>
            <button
              onClick={() => setShowCreateForm(false)}
              className="p-2 rounded-lg transition-colors"
              style={{ 
                color: 'var(--text-muted)',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                任务标题 *
              </label>
              <input
                type="text"
                value={createFormData.title}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                style={{
                  backgroundColor: 'var(--background-secondary)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)'
                }}
                placeholder="输入任务标题"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                任务描述
              </label>
              <textarea
                value={createFormData.description}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                style={{
                  backgroundColor: 'var(--background-secondary)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)'
                }}
                rows={3}
                placeholder="输入任务描述"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  优先级分数
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={createFormData.priority_score}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, priority_score: parseInt(e.target.value) || 50 }))}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  style={{
                    backgroundColor: 'var(--background-secondary)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  预估番茄钟数
                </label>
                <input
                  type="number"
                  min="1"
                  value={createFormData.estimated_pomodoros}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, estimated_pomodoros: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  style={{
                    backgroundColor: 'var(--background-secondary)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                AI建议
              </label>
              <textarea
                value={createFormData.ai_reasoning}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, ai_reasoning: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                style={{
                  backgroundColor: 'var(--background-secondary)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)'
                }}
                rows={2}
                placeholder="输入AI建议或备注"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                取消
              </button>
              <button
                onClick={createTask}
                disabled={!createFormData.title.trim()}
                className="px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                style={{ 
                  backgroundColor: 'var(--primary)',
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--primary)';
                  }
                }}
              >
                创建任务
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 详细任务列表 */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--primary)' }}></div>
            <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>加载中...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
            <Clock className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>暂无番茄任务</h3>
            <p style={{ color: 'var(--text-secondary)' }}>点击上方的"生成我的番茄任务"让AI为你规划今日任务</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>详细任务信息</h2>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{tasks.length} 个任务</span>
            </div>
            {tasks.map((task, index) => (
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
                  onPomodoroChange?.();
                }}
                onToggleTimer={() => setIsTimerRunning(!isTimerRunning)}
                compact={false}
                token={token}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
