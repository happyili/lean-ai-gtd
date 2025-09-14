import { useState, useEffect } from 'react';
import { Clock, Play, Pause, SkipForward, RefreshCw, CheckCircle, AlertCircle, BarChart3, RotateCcw } from 'lucide-react';
import { apiPost, apiGet } from '@/utils/api';

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
}

export default function PomodoroManager({ accessToken }: PomodoroManagerProps) {
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

  // 加载统计信息
  const loadStats = async () => {
    if (!accessToken) return;
    setStatsLoading(true);
    setStatsError(null);
    try {
      const response = await apiGet('/api/pomodoro/stats', '获取统计信息', accessToken);
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

  // 生成新的番茄任务
  const generateTasks = async () => {
    if (!accessToken) return;
    
    setGenerating(true);
    try {
      const response = await apiPost('/api/pomodoro/tasks/generate', {}, '生成番茄任务', accessToken);
      const data = await response.json();
      if (data.success) {
        setTasks(data.data.tasks);
        await loadStats();
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
        await loadStats();
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
        await loadStats();
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
        await loadStats();
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
    if (accessToken) {
      loadPomodoroTasks();
      loadStats();
    }
  }, [accessToken]);

  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPriorityColor = (score: number) => {
    if (score >= 80) return 'text-red-600 bg-red-50';
    if (score >= 60) return 'text-orange-600 bg-orange-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'active':
        return <Play className="w-5 h-5 text-blue-600" />;
      case 'skipped':
        return <SkipForward className="w-5 h-5 text-gray-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  if (!accessToken) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">请先登录以使用番茄钟功能</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Clock className="w-8 h-8 mr-2 text-red-500" />
            AI番茄钟
          </h1>
          <p className="text-gray-600 mt-1">AI为你智能规划今日最重要的任务</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={toggleStats}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            统计
          </button>
          
          <button
            onClick={generateTasks}
            disabled={generating}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
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
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-gray-600">加载统计中...</span>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.today_stats.today_pomodoros}</div>
                <div className="text-sm text-blue-800">今日番茄钟</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{stats.today_stats.today_completed_tasks}</div>
                <div className="text-sm text-green-800">今日完成任务</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">{stats.today_stats.today_focus_hours}h</div>
                <div className="text-sm text-purple-800">今日专注时间</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600">{stats.total_stats.completion_rate}%</div>
                <div className="text-sm text-orange-800">完成率</div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
              <div>
                <div className="text-gray-800 font-medium">暂无统计数据</div>
                <div className="text-sm text-gray-500">生成番茄任务或刷新以获取统计</div>
                {statsError && <div className="text-sm text-red-600 mt-1">{statsError}</div>}
              </div>
              <button
                onClick={loadStats}
                className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800 text-sm"
              >
                刷新
              </button>
            </div>
          )}
        </div>
      )}

      {/* 扁平化任务显示 - 紧贴banner下方 */}
      {tasks.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 justify-start">
            {tasks.slice(0, 6).map((task, index) => {
              const progressPercent = Math.min(100, (task.pomodoros_completed / task.estimated_pomodoros) * 100);
              return (
                <div
                  key={task.id}
                  className={`relative overflow-hidden rounded-lg border transition-all cursor-pointer hover:shadow-sm max-w-[600px] flex-1 min-w-[300px] ${
                    task.status === 'completed' 
                      ? 'border-green-200' 
                      : task.status === 'active'
                      ? 'border-blue-200'
                      : task.status === 'skipped'
                      ? 'border-gray-200'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => task.status === 'pending' && !activeTaskId ? startTask(task.id) : null}
                  style={{ height: '60px' }} // 减少高度
                >
                  {/* 背景进度条 */}
                  <div 
                    className={`absolute inset-0 transition-all duration-300 ${
                      task.status === 'completed'
                        ? 'bg-gradient-to-r from-green-50 to-green-100'
                        : task.status === 'active'
                        ? 'bg-gradient-to-r from-blue-50 to-blue-100'
                        : task.status === 'skipped'
                        ? 'bg-gradient-to-r from-gray-50 to-gray-100'
                        : 'bg-gradient-to-r from-gray-50 to-white'
                    }`}
                    style={{
                      background: task.status === 'pending' 
                        ? `linear-gradient(to right, #f9fafb 0%, #f9fafb ${progressPercent}%, #ffffff ${progressPercent}%, #ffffff 100%)`
                        : undefined
                    }}
                  />
                  
                  {/* 内容层 */}
                  <div className="relative z-10 p-3 h-full flex items-center justify-between">
                    <div className="flex-1 min-w-0 flex items-center">
                      <span className="text-sm font-bold text-gray-400 mr-2">#{index + 1}</span>
                      {getStatusIcon(task.status)}
                      <div className="ml-2 flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 truncate leading-tight">{task.title}</h4>
                        <div className="flex items-center text-xs text-gray-500 space-x-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority_score)}`}>
                            {task.priority_score}
                          </span>
                          <span>{task.estimated_pomodoros}🍅</span>
                          <span>{task.pomodoros_completed}/{task.estimated_pomodoros}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 按钮区域 - 只显示图标 */}
                    <div className="flex items-center space-x-2 ml-3">
                      {task.status === 'pending' && !activeTaskId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startTask(task.id);
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
                              setIsTimerRunning(!isTimerRunning);
                            }}
                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            title={isTimerRunning ? '暂停' : '继续'}
                          >
                            {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              completeTask(task.id);
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
                            skipTask(task.id);
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
                            resetTask(task.id);
                          }}
                          className="p-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                          title="重置为未开始"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 番茄钟计时器 */}
      {activeTaskId && (
        <div className="bg-red-50 rounded-lg p-6 mb-6 text-center">
          <div className="text-6xl font-mono font-bold text-red-600 mb-4">
            {formatTime(timerMinutes, timerSeconds)}
          </div>
          <div className="text-lg text-red-800 mb-4">
            正在专注：{tasks.find(t => t.id === activeTaskId)?.title}
          </div>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
            >
              {isTimerRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isTimerRunning ? '暂停' : '继续'}
            </button>
            <button
              onClick={() => activeTaskId && completeTask(activeTaskId)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              完成任务
            </button>
          </div>
        </div>
      )}

      {/* 详细任务列表 */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">加载中...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无番茄任务</h3>
            <p className="text-gray-600 mb-6">点击"生成我的番茄任务"让AI为你规划今日任务</p>
            <button
              onClick={generateTasks}
              disabled={generating}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
              {generating ? '生成中...' : '生成我的番茄任务'}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">详细任务信息</h2>
              <span className="text-sm text-gray-500">{tasks.length} 个任务</span>
            </div>
            {tasks.map((task, index) => (
            <div
              key={task.id}
              className={`rounded-lg border-2 p-6 transition-all ${
                task.status === 'completed' 
                  ? 'border-green-200 bg-green-50' 
                  : task.status === 'active'
                  ? 'border-blue-200 bg-blue-50'
                  : task.status === 'skipped'
                  ? 'border-gray-200 bg-gray-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-2xl font-bold text-gray-400 mr-3">#{index + 1}</span>
                    {getStatusIcon(task.status)}
                    <h3 className="text-lg font-semibold text-gray-900 ml-2">{task.title}</h3>
                    <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority_score)}`}>
                      优先级 {task.priority_score}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-3">{task.description}</p>
                  
                  {task.ai_reasoning && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3">
                      <p className="text-sm text-yellow-800">
                        <strong>AI建议：</strong> {task.ai_reasoning}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-gray-500 space-x-4">
                    <span>预估 {task.estimated_pomodoros} 个番茄钟</span>
                    <span>已完成 {task.pomodoros_completed} 个</span>
                    <span>专注时间 {task.total_focus_time} 分钟</span>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2 ml-4">
                  {task.status === 'pending' && (
                    <button
                      onClick={() => startTask(task.id)}
                      disabled={activeTaskId !== null}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      开始
                    </button>
                  )}
                  
                  {task.status !== 'completed' && task.status !== 'skipped' && (
                    <button
                      onClick={() => skipTask(task.id)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
                    >
                      <SkipForward className="w-4 h-4 mr-1" />
                      跳过
                    </button>
                  )}

                  {task.status !== 'pending' && (
                    <button
                      onClick={() => resetTask(task.id)}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      重置
                    </button>
                  )}
                </div>
              </div>
              
              {/* 进度条 */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>完成进度</span>
                  <span>{Math.round((task.pomodoros_completed / task.estimated_pomodoros) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (task.pomodoros_completed / task.estimated_pomodoros) * 100)}%`
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>
    </div>
  );
}
