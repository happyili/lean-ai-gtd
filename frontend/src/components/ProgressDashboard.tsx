import { useState, useEffect } from 'react';
import { apiPost, apiGet } from '../utils/api';

interface ProgressStats {
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  active_tasks: number;
}

interface BottleneckTask {
  id: number;
  content: string;
  days_stuck: number;
  progress: number;
  status: string;
}

interface TrendData {
  date: string;
  created_tasks: number;
  completed_tasks: number;
  net_change: number;
}

interface AIInsight {
  category: string;
  insight: string;
  evidence: string;
  impact_level: string;
}

interface Recommendation {
  title: string;
  description: string;
  priority: string;
  expected_impact: string;
  implementation_difficulty: string;
  timeline: string;
}

interface ProgressDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken?: string;
}

export default function ProgressDashboard({ isOpen, onClose, accessToken }: ProgressDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'bottlenecks' | 'insights'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState(30);
  
  // 数据状态
  const [progressStats, setProgressStats] = useState<ProgressStats | null>(null);
  const [efficiencyScore, setEfficiencyScore] = useState<number>(0);
  const [trendDirection, setTrendDirection] = useState<string>('stable');
  const [bottleneckTasks, setBottleneckTasks] = useState<BottleneckTask[]>([]);
  const [trendsData, setTrendsData] = useState<TrendData[]>([]);
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // 获取进度概览
  const fetchProgressSummary = async () => {
    if (!accessToken) return;
    
    setIsLoading(true);
    try {
      const response = await apiGet(
        `/api/progress/summary?days=${timeRange}`,
        '获取进度概览',
        accessToken
      );
      
      const result = await response.json();
      if (result.success) {
        setProgressStats(result.basic_stats);
        setEfficiencyScore(result.efficiency_score);
        setTrendDirection(result.trend_direction);
      }
    } catch (error) {
      console.error('获取进度概览失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取瓶颈分析
  const fetchBottlenecks = async () => {
    if (!accessToken) return;
    
    setIsLoading(true);
    try {
      const response = await apiGet(
        `/api/progress/bottlenecks?days=${timeRange}`,
        '获取瓶颈分析',
        accessToken
      );
      
      const result = await response.json();
      if (result.success) {
        setBottleneckTasks(result.stuck_high_priority_tasks || []);
      }
    } catch (error) {
      console.error('获取瓶颈分析失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取趋势数据
  const fetchTrends = async () => {
    if (!accessToken) return;
    
    setIsLoading(true);
    try {
      const response = await apiGet(
        `/api/progress/trends?days=${timeRange}`,
        '获取趋势数据',
        accessToken
      );
      
      const result = await response.json();
      if (result.success) {
        setTrendsData(result.daily_statistics || []);
      }
    } catch (error) {
      console.error('获取趋势数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取AI洞察
  const fetchAIInsights = async () => {
    if (!accessToken) return;
    
    setIsLoading(true);
    try {
      const response = await apiPost(
        '/api/progress/analyze',
        { days: timeRange },
        '获取AI洞察',
        accessToken
      );
      
      const result = await response.json();
      if (result.success && result.ai_insights) {
        setAIInsights(result.ai_insights.core_insights || []);
        setRecommendations(result.ai_insights.actionable_recommendations || []);
      }
    } catch (error) {
      console.error('获取AI洞察失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化数据
  useEffect(() => {
    if (isOpen && accessToken) {
      fetchProgressSummary();
    }
  }, [isOpen, timeRange, accessToken]);

  // 切换标签页时加载对应数据
  useEffect(() => {
    if (!isOpen || !accessToken) return;
    
    switch (activeTab) {
      case 'trends':
        fetchTrends();
        break;
      case 'bottlenecks':
        fetchBottlenecks();
        break;
      case 'insights':
        fetchAIInsights();
        break;
    }
  }, [activeTab, isOpen, accessToken]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(4px)'
    }}>
      <div className="w-full max-w-5xl max-h-[85vh] flex flex-col rounded-2xl shadow-xl" style={{ 
        backgroundColor: 'var(--card-background)',
        border: '1px solid var(--border-light)'
      }}>
        {/* 极简头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ 
          borderColor: 'var(--border-light)'
        }}>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ 
              backgroundColor: 'var(--primary)',
              opacity: 0.1
            }}>
              <span style={{ color: 'var(--primary)', fontSize: '16px' }}>📊</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                进度分析
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                任务效率洞察
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 极简时间选择 */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(parseInt(e.target.value))}
              className="px-3 py-1 rounded-lg text-xs border-0 transition-all"
              style={{
                backgroundColor: 'var(--background-secondary)',
                color: 'var(--text-secondary)'
              }}
            >
              <option value={7}>7天</option>
              <option value={30}>30天</option>
              <option value={90}>90天</option>
            </select>
            
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
              style={{ 
                color: 'var(--text-muted)',
                backgroundColor: 'transparent'
              }}
            >
              <span style={{ fontSize: '14px' }}>✕</span>
            </button>
          </div>
        </div>

        {/* 极简标签页 */}
        <div className="flex px-6" style={{ borderBottom: '1px solid var(--border-light)' }}>
          {[
            { id: 'overview', label: '概览', icon: '📈' },
            { id: 'trends', label: '趋势', icon: '📊' },
            { id: 'bottlenecks', label: '瓶颈', icon: '⚠️' },
            { id: 'insights', label: 'AI洞察', icon: '✨' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-sm font-medium transition-all ${
                activeTab === tab.id ? 'border-b-2' : ''
              }`}
              style={{
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                borderBottomColor: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                backgroundColor: 'transparent'
              }}
            >
              <span style={{ fontSize: '12px', marginRight: '4px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 极简内容区域 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* 概览标签页 */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* 极简核心指标 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--background-secondary)' }}>
                  <div className="text-center">
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>总任务</p>
                    <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {progressStats?.total_tasks || 0}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--background-secondary)' }}>
                  <div className="text-center">
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>已完成</p>
                    <p className="text-xl font-semibold" style={{ color: 'var(--success)' }}>
                      {progressStats?.completed_tasks || 0}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--background-secondary)' }}>
                  <div className="text-center">
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>完成率</p>
                    <p className="text-xl font-semibold" style={{ color: 'var(--primary)' }}>
                      {progressStats?.completion_rate || 0}%
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--background-secondary)' }}>
                  <div className="text-center">
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>效率评分</p>
                    <p className="text-xl font-semibold" style={{ 
                      color: efficiencyScore >= 80 ? 'var(--success)' :
                             efficiencyScore >= 60 ? 'var(--warning)' : 'var(--error)'
                    }}>
                      {efficiencyScore}
                    </p>
                  </div>
                </div>
              </div>

              {/* 趋势指示器 */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  📈 整体趋势
                </h3>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    trendDirection === 'improving' ? 'bg-green-100 text-green-800' :
                    trendDirection === 'declining' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {trendDirection === 'improving' ? '📈 改善中' :
                     trendDirection === 'declining' ? '📉 下降中' : '➡️ 稳定'}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    基于最近{timeRange}天的数据分析
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 趋势标签页 */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                📊 任务完成趋势
              </h3>
              
              {trendsData.length > 0 ? (
                <div className="space-y-4">
                  {/* 简化的趋势图表 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
                      <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                        最近7天完成情况
                      </h4>
                      <div className="space-y-2">
                        {trendsData.slice(-7).map((day, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {new Date(day.date).toLocaleDateString()}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-green-600">+{day.completed_tasks}</span>
                              <span className="text-sm text-blue-600">创建{day.created_tasks}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
                      <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                        统计摘要
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            平均每日完成:
                          </span>
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {trendsData.length > 0 ? 
                              Math.round(trendsData.reduce((sum, d) => sum + d.completed_tasks, 0) / trendsData.length) : 0
                            } 个
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            平均每日创建:
                          </span>
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {trendsData.length > 0 ? 
                              Math.round(trendsData.reduce((sum, d) => sum + d.created_tasks, 0) / trendsData.length) : 0
                            } 个
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  {isLoading ? '加载中...' : '暂无趋势数据'}
                </div>
              )}
            </div>
          )}

          {/* 瓶颈标签页 */}
          {activeTab === 'bottlenecks' && (
            <div className="space-y-6">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                🚫 瓶颈分析
              </h3>
              
              {bottleneckTasks.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                    停滞的高优先级任务
                  </h4>
                  {bottleneckTasks.map((task, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--background-secondary)',
                        border: '1px solid var(--border-light)'
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {task.content}
                        </h5>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm px-2 py-1 rounded bg-red-100 text-red-600">
                            停滞 {task.days_stuck} 天
                          </span>
                          <span className="text-sm px-2 py-1 rounded bg-blue-100 text-blue-600">
                            进度 {task.progress}%
                          </span>
                        </div>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        状态: {task.status} | 任务ID: {task.id}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  {isLoading ? '分析中...' : '🎉 没有发现明显瓶颈，继续保持！'}
                </div>
              )}
            </div>
          )}

          {/* AI洞察标签页 */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                🧠 AI智能洞察
              </h3>
              
              {/* 核心洞察 */}
              {aiInsights.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                    核心洞察
                  </h4>
                  {aiInsights.map((insight, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--background-secondary)',
                        border: '1px solid var(--border-light)'
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          insight.impact_level === 'high' ? 'bg-red-100 text-red-600' :
                          insight.impact_level === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                          {insight.impact_level} 影响
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {insight.category}
                        </span>
                      </div>
                      <p className="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
                        {insight.insight}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        证据: {insight.evidence}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              
              {/* 改进建议 */}
              {recommendations.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                    改进建议
                  </h4>
                  {recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--background-secondary)',
                        border: '1px solid var(--border-light)'
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {rec.title}
                        </h5>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-600' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                        {rec.description}
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="font-medium">预期影响: </span>
                          <span style={{ color: 'var(--text-muted)' }}>{rec.expected_impact}</span>
                        </div>
                        <div>
                          <span className="font-medium">实施难度: </span>
                          <span style={{ color: 'var(--text-muted)' }}>{rec.implementation_difficulty}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs">
                        <span className="font-medium">时间框架: </span>
                        <span style={{ color: 'var(--text-muted)' }}>{rec.timeline}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {aiInsights.length === 0 && recommendations.length === 0 && (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  {isLoading ? '🧠 AI正在分析中...' : '点击刷新获取AI洞察'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
