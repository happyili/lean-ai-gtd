import React, { useState, useEffect } from 'react';
import { X, Calendar, TrendingUp, AlertTriangle, RefreshCw, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiGet, apiPost } from '../utils/api';

interface WeeklyReportProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
}

interface TaskSummary {
  id: number;
  content: string;
  priority: string;
  status: string;
  task_type: string;
  created_at: string;
  updated_at: string;
  subtasks?: TaskSummary[];
  subtask_count?: number;
}

interface WeeklyReportData {
  week_info: {
    start_date: string;
    end_date: string;
    week_offset: number;
    is_current_week: boolean;
  };
  task_type_filter: string;
  new_tasks: TaskSummary[];
  completed_tasks: TaskSummary[];
  status_changed_tasks: TaskSummary[];
  deleted_tasks: TaskSummary[];
  stagnant_high_priority: Array<{
    task: TaskSummary;
    days_stagnant: number;
  }>;
  frequent_changes: TaskSummary[];
  summary: {
    total_new: number;
    total_completed: number;
    total_status_changed: number;
    total_deleted: number;
    stagnant_high_priority_count: number;
    frequent_changes_count: number;
  };
}

export default function WeeklyReport({ isOpen, onClose, accessToken }: WeeklyReportProps) {
  const [reportData, setReportData] = useState<WeeklyReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('all');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [taskSummary, setTaskSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // 获取周报数据
  const fetchWeeklyReport = async () => {
    if (!accessToken) return;
    
    setIsLoading(true);
    setError('');
    setAiAnalysis('');
    setTaskSummary('');
    
    try {
      const response = await apiGet(
        `/api/weekly-report?task_type=${taskTypeFilter}&week_offset=${weekOffset}`,
        '获取周报数据',
        accessToken
      );
      
      const result = await response.json();
      if (result.success) {
        setReportData(result.data);
      } else {
        setError(result.error || '获取周报数据失败');
      }
    } catch (err) {
      console.error('获取周报数据失败:', err);
      setError('获取周报数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 生成任务总结
  const generateTaskSummary = async () => {
    if (!accessToken || !reportData) return;
    
    setIsGeneratingSummary(true);
    
    try {
      const response = await apiPost(
        '/api/weekly-report/task-summary',
        {
          report_data: reportData
        },
        '生成任务总结',
        accessToken
      );
      
      const result = await response.json();
      if (result.success) {
        setTaskSummary(result.task_summary);
      } else {
        setError(result.error || '生成任务总结失败');
      }
    } catch (err) {
      console.error('生成任务总结失败:', err);
      setError('生成任务总结失败');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // 生成AI分析
  const generateAIAnalysis = async () => {
    if (!accessToken || !reportData) return;
    
    setIsAnalyzing(true);
    
    try {
      const response = await apiPost(
        '/api/weekly-report/ai-analysis',
        {
          report_data: reportData,
          custom_context: ''
        },
        '生成AI分析',
        accessToken
      );
      
      const result = await response.json();
      if (result.success) {
        setAiAnalysis(result.ai_analysis);
      } else {
        setError(result.error || '生成AI分析失败');
      }
    } catch (err) {
      console.error('生成AI分析失败:', err);
      setError('生成AI分析失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 初始化和数据更新
  useEffect(() => {
    if (isOpen && accessToken) {
      fetchWeeklyReport();
    }
  }, [isOpen, accessToken, taskTypeFilter, weekOffset]);

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });
  };

  // 获取周标题
  const getWeekTitle = () => {
    if (!reportData) return '';
    
    const { week_info } = reportData;
    const startDate = formatDate(week_info.start_date);
    const endDate = formatDate(week_info.end_date);
    
    if (week_info.is_current_week) {
      return `本周 (${startDate} - ${endDate})`;
    } else if (weekOffset === -1) {
      return `上周 (${startDate} - ${endDate})`;
    } else if (weekOffset === 1) {
      return `下周 (${startDate} - ${endDate})`;
    } else {
      return `${startDate} - ${endDate}`;
    }
  };

  // 渲染任务列表
  const renderTaskList = (tasks: TaskSummary[], title: string, icon: React.ReactNode, emptyMessage: string) => (
    <div className="mb-6">
      <div className="flex items-center mb-3">
        {icon}
        <h4 className="text-sm font-medium ml-2" style={{ color: 'var(--text-primary)' }}>
          {title} ({tasks.length})
        </h4>
      </div>
      
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-500 ml-6">{emptyMessage}</p>
      ) : (
        <div className="ml-6 space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="p-3 rounded-lg border" style={{ 
              backgroundColor: 'var(--background-secondary)',
              borderColor: 'var(--border-light)'
            }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {task.content}
                  </p>
                  <div className="flex items-center mt-1 space-x-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span className={`px-2 py-1 rounded ${
                      task.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                      task.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                      task.priority === 'medium' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {task.priority === 'urgent' ? '紧急' :
                       task.priority === 'high' ? '高优' :
                       task.priority === 'medium' ? '中优' : '低优'}
                    </span>
                    <span className={`px-2 py-1 rounded ${
                      task.task_type === 'work' ? 'bg-blue-100 text-blue-600' :
                      task.task_type === 'hobby' ? 'bg-green-100 text-green-600' :
                      'bg-purple-100 text-purple-600'
                    }`}>
                      {task.task_type === 'work' ? '工作' :
                       task.task_type === 'hobby' ? '业余' : '生活'}
                    </span>
                    {task.subtask_count && task.subtask_count > 0 && (
                      <span className="text-xs text-gray-500">
                        {task.subtask_count} 个子任务
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 子任务显示 */}
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="mt-2 ml-4 space-y-1">
                  {task.subtasks.map((subtask) => (
                    <div key={subtask.id} className="text-xs p-2 rounded" style={{
                      backgroundColor: 'var(--background-tertiary)',
                      color: 'var(--text-secondary)'
                    }}>
                      • {subtask.content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" style={{
        backgroundColor: 'var(--background-primary)',
        border: '1px solid var(--border-light)'
      }}>
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b" style={{
          borderColor: 'var(--border-light)',
          backgroundColor: 'var(--background-primary)'
        }}>
          <div className="flex items-center">
            <Calendar className="w-6 h-6 mr-3" style={{ color: 'var(--primary)' }} />
            <div>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                周报总结
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {getWeekTitle()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 控制栏 */}
        <div className="p-4 border-b" style={{ 
          borderColor: 'var(--border-light)',
          backgroundColor: 'var(--background-primary)'
        }}>
          <div className="flex items-center justify-between">
            {/* 周导航 */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setWeekOffset(weekOffset - 1)}
                className="p-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium px-3" style={{ color: 'var(--text-primary)' }}>
                {weekOffset === 0 ? '本周' : weekOffset === -1 ? '上周' : weekOffset === 1 ? '下周' : `${weekOffset > 0 ? '+' : ''}${weekOffset}周`}
              </span>
              <button
                onClick={() => setWeekOffset(weekOffset + 1)}
                className="p-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 任务类型过滤器 */}
            <div className="flex items-center space-x-2">
              <select
                value={taskTypeFilter}
                onChange={(e) => setTaskTypeFilter(e.target.value)}
                className="px-3 py-1 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--background-secondary)',
                  borderColor: 'var(--border-light)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="all">全部类型</option>
                <option value="work">工作</option>
                <option value="hobby">业余</option>
                <option value="life">生活</option>
              </select>
              
              <button
                onClick={fetchWeeklyReport}
                disabled={isLoading}
                className="px-3 py-1 rounded-lg text-sm font-medium transition-all flex items-center"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                刷新
              </button>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--background-primary)' }}>
          {error && (
            <div className="p-4 border-l-4 border-red-400" style={{
              backgroundColor: 'var(--error-bg, #fef2f2)',
              color: 'var(--error-text, #dc2626)'
            }}>
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: 'var(--primary)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>加载周报数据中...</p>
            </div>
          ) : reportData ? (
            <div className="p-6" style={{ backgroundColor: 'var(--background-primary)' }}>
              {/* 标签页 */}
              <div className="flex border-b mb-6" style={{ borderColor: 'var(--border-light)' }}>
                {[
                  { key: 'overview', label: '概览', icon: TrendingUp },
                  { key: 'details', label: '详细', icon: Calendar },
                  { key: 'analysis', label: 'AI分析', icon: Sparkles }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className="px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center"
                    style={{
                      color: activeTab === key ? 'var(--primary)' : 'var(--text-secondary)',
                      borderBottomColor: activeTab === key ? 'var(--primary)' : 'transparent',
                      backgroundColor: 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== key) {
                        e.currentTarget.style.color = 'var(--primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== key) {
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }
                    }}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {label}
                  </button>
                ))}
              </div>

              {/* 概览标签页 */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* 统计卡片 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: '新增任务', value: reportData.summary.total_new, colorVar: '--info' },
                      { label: '完成任务', value: reportData.summary.total_completed, colorVar: '--success' },
                      { label: '状态变更', value: reportData.summary.total_status_changed, colorVar: '--warning' },
                      { label: '删除任务', value: reportData.summary.total_deleted, colorVar: '--error' }
                    ].map(({ label, value, colorVar }) => (
                      <div key={label} className="p-4 rounded-lg border" style={{
                        backgroundColor: 'var(--background-secondary)',
                        borderColor: 'var(--border-light)'
                      }}>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                        <p className="text-2xl font-bold mt-1" style={{ 
                          color: `var(${colorVar}, var(--primary))` 
                        }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* 任务总结 */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                        📝 任务总结
                      </h4>
                      <button
                        onClick={generateTaskSummary}
                        disabled={isGeneratingSummary}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center"
                        style={{
                          backgroundColor: 'var(--accent-purple)',
                          color: 'white',
                          opacity: isGeneratingSummary ? 0.6 : 1
                        }}
                      >
                        <Sparkles className={`w-4 h-4 mr-2 ${isGeneratingSummary ? 'animate-pulse' : ''}`} />
                        {isGeneratingSummary ? '生成中...' : '生成总结'}
                      </button>
                    </div>

                    {taskSummary ? (
                      <div className="p-4 rounded-lg border" style={{
                        backgroundColor: 'var(--background-secondary)',
                        borderColor: 'var(--border-light)'
                      }}>
                        <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-primary)' }}>
                          {taskSummary.split('\n').map((line, index) => {
                            if (line.startsWith('**') && line.endsWith('**')) {
                              // 处理标题行
                              return (
                                <h5 key={index} className="font-semibold mt-4 mb-2" style={{ color: 'var(--primary)' }}>
                                  {line.replace(/\*\*/g, '')}
                                </h5>
                              );
                            } else if (line.trim()) {
                              // 处理内容行
                              return (
                                <p key={index} className="mb-2" style={{ color: 'var(--text-primary)' }}>
                                  {line}
                                </p>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                        <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" style={{ color: 'var(--text-secondary)' }} />
                        <p>点击"生成总结"按钮获取AI任务总结</p>
                      </div>
                    )}
                  </div>

                  {/* 问题提醒 */}
                  {(reportData.stagnant_high_priority.length > 0 || reportData.frequent_changes.length > 0) && (
                    <div className="p-4 rounded-lg border-l-4" style={{
                      backgroundColor: 'var(--background-secondary)',
                      borderLeftColor: 'var(--warning, #f59e0b)'
                    }}>
                      <div className="flex items-center mb-2">
                        <AlertTriangle className="w-5 h-5 mr-2" style={{ color: 'var(--warning, #f59e0b)' }} />
                        <h4 className="font-medium" style={{ color: 'var(--warning, #f59e0b)' }}>需要关注的问题</h4>
                      </div>
                      <ul className="text-sm space-y-1" style={{ color: 'var(--warning, #f59e0b)' }}>
                        {reportData.stagnant_high_priority.length > 0 && (
                          <li>• {reportData.stagnant_high_priority.length} 个高优先级任务长期停滞</li>
                        )}
                        {reportData.frequent_changes.length > 0 && (
                          <li>• {reportData.frequent_changes.length} 个任务频繁变更，可能规划不合理</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* 详细标签页 */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {renderTaskList(reportData.new_tasks, '新增任务', 
                    <TrendingUp className="w-4 h-4 text-blue-500" />, '本周没有新增任务')}
                  
                  {renderTaskList(reportData.completed_tasks, '完成任务', 
                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>, '本周没有完成任务')}
                  
                  {reportData.stagnant_high_priority.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center mb-3">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <h4 className="text-sm font-medium ml-2" style={{ color: 'var(--text-primary)' }}>
                          停滞的高优先级任务 ({reportData.stagnant_high_priority.length})
                        </h4>
                      </div>
                      <div className="ml-6 space-y-2">
                        {reportData.stagnant_high_priority.map(({ task, days_stagnant }) => (
                          <div key={task.id} className="p-3 rounded-lg border border-orange-200 bg-orange-50">
                            <p className="text-sm font-medium text-orange-800">{task.content}</p>
                            <p className="text-xs text-orange-600 mt-1">已停滞 {days_stagnant} 天</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {renderTaskList(reportData.status_changed_tasks, '状态变更任务', 
                    <RefreshCw className="w-4 h-4 text-orange-500" />, '本周没有任务状态变更')}
                  
                  {renderTaskList(reportData.deleted_tasks, '删除任务', 
                    <X className="w-4 h-4 text-red-500" />, '本周没有删除任务')}
                </div>
              )}

              {/* AI分析标签页 */}
              {activeTab === 'analysis' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                      AI深度分析
                    </h4>
                    <button
                      onClick={generateAIAnalysis}
                      disabled={isAnalyzing}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center"
                      style={{
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        opacity: isAnalyzing ? 0.6 : 1
                      }}
                    >
                      <Sparkles className={`w-4 h-4 mr-2 ${isAnalyzing ? 'animate-pulse' : ''}`} />
                      {isAnalyzing ? '分析中...' : '生成分析'}
                    </button>
                  </div>

                  {aiAnalysis ? (
                    <div className="p-4 rounded-lg border" style={{
                      backgroundColor: 'var(--background-secondary)',
                      borderColor: 'var(--border-light)'
                    }}>
                      <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-primary)' }}>
                        {aiAnalysis.split('\n').map((line, index) => (
                          <p key={index} className="mb-2" style={{ color: 'var(--text-primary)' }}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                      <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" style={{ color: 'var(--text-secondary)' }} />
                      <p>点击"生成分析"按钮获取AI深度分析</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
