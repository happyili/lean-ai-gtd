import { useState, useEffect } from 'react';
import { apiPost, apiGet } from '../utils/api';
import ThinkingToolsPanel from './ThinkingToolsPanel';

interface TimeContext {
  time_context: string;
  available_minutes: number;
  difficulty_level: string;
  environment: string;
  user_energy: string;
  optimal_task_types: string[];
  focus_recommendations: string[];
  productivity_tips: string[];
}

interface RecommendedTask {
  task_id: string;
  title: string;
  estimated_time: number;
  suitability_score: number;
  execution_suggestion: string;
  quick_start_steps: string[];
  success_criteria: string;
  continuation_plan: string;
}

interface QuickAction {
  title: string;
  description: string;
  estimated_time: number;
  action_type: string;
}

interface FragmentedTimeManagerProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken?: string;
}

export default function FragmentedTimeManager({ isOpen, onClose, accessToken }: FragmentedTimeManagerProps) {
  const [availableMinutes, setAvailableMinutes] = useState(15);
  const [environment, setEnvironment] = useState<'mobile' | 'desktop' | 'offline'>('mobile');
  const [userEnergy, setUserEnergy] = useState<'high' | 'medium' | 'low'>('medium');
  const [timeContext, setTimeContext] = useState<TimeContext | null>(null);
  const [recommendedTasks, setRecommendedTasks] = useState<RecommendedTask[]>([]);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'context' | 'recommendations' | 'quick'>('context');
  const [showThinkingTools, setShowThinkingTools] = useState(false);

  // 分析时间上下文
  const analyzeTimeContext = async () => {
    setIsLoading(true);
    try {
      const response = await apiPost('/api/fragmented-time/analyze-context', {
        available_minutes: availableMinutes,
        environment: environment,
        user_energy: userEnergy
      }, '分析时间上下文');

      const result = await response.json();
      if (result.success) {
        setTimeContext(result.data);
        setActiveTab('context');
      }
    } catch (error) {
      console.error('时间上下文分析失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取任务推荐
  const getTaskRecommendations = async () => {
    if (!accessToken) {
      console.error('需要登录才能获取任务推荐');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiPost('/api/fragmented-time/recommend-tasks', {
        available_minutes: availableMinutes,
        environment: environment,
        user_energy: userEnergy
      }, '获取任务推荐', accessToken);

      const result = await response.json();
      if (result.success && result.recommendations) {
        setRecommendedTasks(result.recommendations.recommended_tasks || []);
        setActiveTab('recommendations');
      }
    } catch (error) {
      console.error('获取任务推荐失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取快速行动建议
  const getQuickActions = async () => {
    setIsLoading(true);
    try {
      const url = `/api/fragmented-time/quick-actions?available_minutes=${availableMinutes}&environment=${environment}`;
      const response = accessToken ? 
        await apiGet(url, '获取快速行动建议', accessToken) :
        await apiGet(url, '获取快速行动建议');

      const result = await response.json();
      if (result.success) {
        setQuickActions(result.quick_actions || []);
        setActiveTab('quick');
      }
    } catch (error) {
      console.error('获取快速行动建议失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化时分析时间上下文
  useEffect(() => {
    if (isOpen) {
      analyzeTimeContext();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(4px)'
    }}>
      <div className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl shadow-xl" style={{ 
        backgroundColor: 'var(--card-background)',
        border: '1px solid var(--border-light)'
      }}>
        {/* 极简头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ 
          borderColor: 'var(--border-light)'
        }}>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ 
              backgroundColor: 'var(--accent-sky)',
              opacity: 0.1
            }}>
              <span style={{ color: 'var(--accent-sky)', fontSize: '16px' }}>⏱️</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                碎片时间
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                智能场景识别
              </p>
            </div>
          </div>
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

        {/* 配置区域 */}
        <div className="p-6 border-b" style={{ borderColor: 'var(--border-light)' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 可用时间 */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                可用时间（分钟）
              </label>
              <input
                type="number"
                value={availableMinutes}
                onChange={(e) => setAvailableMinutes(parseInt(e.target.value) || 15)}
                min="1"
                max="120"
                className="w-full p-2 border rounded-lg"
                style={{
                  backgroundColor: 'var(--card-background)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* 环境类型 */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                环境类型
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as any)}
                className="w-full p-2 border rounded-lg"
                style={{
                  backgroundColor: 'var(--card-background)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="mobile">移动设备</option>
                <option value="desktop">桌面环境</option>
                <option value="offline">离线状态</option>
              </select>
            </div>

            {/* 精力水平 */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                精力水平
              </label>
              <select
                value={userEnergy}
                onChange={(e) => setUserEnergy(e.target.value as any)}
                className="w-full p-2 border rounded-lg"
                style={{
                  backgroundColor: 'var(--card-background)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="high">精力充沛</option>
                <option value="medium">中等精力</option>
                <option value="low">精力不足</option>
              </select>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={analyzeTimeContext}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'white',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? '分析中...' : '🔍 分析时间上下文'}
            </button>
            
            {accessToken && (
              <button
                onClick={getTaskRecommendations}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: 'var(--secondary)',
                  color: 'white',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? '推荐中...' : '🎯 智能任务推荐'}
              </button>
            )}
            
            <button
              onClick={getQuickActions}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'white',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? '生成中...' : '⚡ 快速行动建议'}
            </button>
            
            <button
              onClick={() => setShowThinkingTools(true)}
              className="px-4 py-2 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: 'var(--success)',
                color: 'white'
              }}
            >
              🧠 结构化思考
            </button>
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex border-b" style={{ borderColor: 'var(--border-light)' }}>
          {[
            { id: 'context', label: '时间上下文', icon: '🕐' },
            { id: 'recommendations', label: '任务推荐', icon: '🎯' },
            { id: 'quick', label: '快速行动', icon: '⚡' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 font-medium transition-all ${
                activeTab === tab.id ? 'border-b-2' : ''
              }`}
              style={{
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottomColor: activeTab === tab.id ? 'var(--primary)' : 'transparent'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 时间上下文标签页 */}
          {activeTab === 'context' && timeContext && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 场景信息 */}
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
                  <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                    📍 场景识别
                  </h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">时间场景:</span> {timeContext.time_context}</p>
                    <p><span className="font-medium">可用时间:</span> {timeContext.available_minutes} 分钟</p>
                    <p><span className="font-medium">难度级别:</span> {timeContext.difficulty_level}</p>
                    <p><span className="font-medium">环境:</span> {timeContext.environment}</p>
                  </div>
                </div>

                {/* 推荐任务类型 */}
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
                  <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                    🎯 适合的任务类型
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {timeContext.optimal_task_types.map((type, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 rounded-full text-sm"
                        style={{
                          backgroundColor: 'var(--primary)',
                          color: 'white'
                        }}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 专注建议 */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  🧠 专注建议
                </h3>
                <ul className="space-y-2">
                  {timeContext.focus_recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 生产力技巧 */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  💡 生产力技巧
                </h3>
                <ul className="space-y-2">
                  {timeContext.productivity_tips.map((tip, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 任务推荐标签页 */}
          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              {recommendedTasks.length > 0 ? (
                recommendedTasks.map((task, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--background-secondary)',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {task.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm px-2 py-1 rounded" style={{
                          backgroundColor: 'var(--primary)',
                          color: 'white'
                        }}>
                          {task.estimated_time}分钟
                        </span>
                        <span className="text-sm px-2 py-1 rounded" style={{
                          backgroundColor: task.suitability_score >= 90 ? 'var(--success)' :
                                         task.suitability_score >= 70 ? 'var(--warning)' : 'var(--error)',
                          color: 'white'
                        }}>
                          {task.suitability_score}分
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                      {task.execution_suggestion}
                    </p>
                    
                    {task.quick_start_steps && task.quick_start_steps.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                          快速开始步骤：
                        </h4>
                        <ol className="text-sm space-y-1">
                          {task.quick_start_steps.map((step, stepIndex) => (
                            <li key={stepIndex} style={{ color: 'var(--text-secondary)' }}>
                              {stepIndex + 1}. {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      <p><strong>成功标准:</strong> {task.success_criteria}</p>
                      {task.continuation_plan && (
                        <p><strong>延续计划:</strong> {task.continuation_plan}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  {accessToken ? '点击"智能任务推荐"获取个性化建议' : '请登录后获取个性化任务推荐'}
                </div>
              )}
            </div>
          )}

          {/* 快速行动标签页 */}
          {activeTab === 'quick' && (
            <div className="space-y-4">
              {quickActions.length > 0 ? (
                quickActions.map((action, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--background-secondary)',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {action.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm px-2 py-1 rounded" style={{
                          backgroundColor: 'var(--accent)',
                          color: 'white'
                        }}>
                          {action.estimated_time}分钟
                        </span>
                        <span className="text-xs px-2 py-1 rounded" style={{
                          backgroundColor: 'var(--background-tertiary)',
                          color: 'var(--text-muted)'
                        }}>
                          {action.action_type}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {action.description}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  点击"快速行动建议"获取即时可执行的建议
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
            {/* 结构化思考工具 */}
            <ThinkingToolsPanel
              isVisible={showThinkingTools}
              onClose={() => setShowThinkingTools(false)}
              accessToken={accessToken}
            />
    </div>
  );
}
