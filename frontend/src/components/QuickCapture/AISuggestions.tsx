import { useState, useEffect } from 'react';
import { apiPost } from '@/utils/api';

interface AIAnalysis {
  execution_strategy: {
    summary: string;
    key_points: string[];
    recommendations: string[];
  };
  opportunities: {
    summary: string;
    potential_areas: string[];
    value_propositions: string[];
  };
  subtask_suggestions: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    estimated_time: string;
    dependencies: string[];
  }>;
}

interface AISuggestionsProps {
  taskId: number;
  onCreateSubtasks: (suggestions: AIAnalysis['subtask_suggestions']) => void;
  isVisible: boolean;
  onClose: () => void;
  mode?: 'strategy' | 'full'; // 模式：strategy 只显示策略建议，full 显示完整分析
  autoStart?: boolean; // 自动开始分析，跳过确认对话框
  accessToken?: string; // 认证token
}

export default function AISuggestions({ 
  taskId, 
  onCreateSubtasks, 
  isVisible, 
  onClose,
  mode = 'full', // 默认显示完整分析
  autoStart = false, // 默认不自动开始
  accessToken // 认证token
}: AISuggestionsProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubtasks, setSelectedSubtasks] = useState<Set<number>>(new Set());
  const [contextInput, setContextInput] = useState('');
  const [showContextEditor, setShowContextEditor] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  // 自动开始分析
  useEffect(() => {
    if (isVisible && autoStart && !analysis && !isLoading && !error) {
      handleAnalyzeTask();
    }
  }, [isVisible, autoStart, analysis, isLoading, error]);

  const handleAnalyzeTask = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const payload: any = {};
      
      // 添加上下文信息
      if (contextInput.trim()) {
        payload.context = contextInput.trim();
      }
      
      // 添加自定义提示词
      if (customPrompt.trim()) {
        payload.customPrompt = customPrompt.trim();
      }
      
      // 添加模式信息
      if (mode === 'strategy') {
        payload.mode = 'strategy';
      }
      
      const response = await apiPost(
        `/api/records/${taskId}/ai-analysis`,
        payload,
        'AI分析',
        accessToken
      );

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI分析失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理重新生成
  const handleRegenerate = async () => {
    setAnalysis(null); // 清除现有分析结果
    await handleAnalyzeTask();
  };

  // 保存上下文和提示词
  const handleSaveContext = () => {
    // 这里可以添加保存到本地存储或发送到后端的逻辑
    // 当前实现：直接关闭编辑器并重新分析
    setShowContextEditor(false);
    handleRegenerate();
  };

  const handleSubtaskToggle = (index: number) => {
    const newSelected = new Set(selectedSubtasks);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSubtasks(newSelected);
  };

  const handleCreateSelectedSubtasks = async () => {
    if (!analysis || selectedSubtasks.size === 0) return;

    const selectedSuggestions = analysis.subtask_suggestions.filter(
      (_, index) => selectedSubtasks.has(index)
    );

    try {
      await apiPost(
        `/api/records/${taskId}/create-subtasks-from-ai`,
        {
          subtask_suggestions: selectedSuggestions
        },
        '创建AI建议的子任务',
        accessToken
      );

      onCreateSubtasks(selectedSuggestions);
      setSelectedSubtasks(new Set());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建子任务失败');
    }
  };

  const priorityColors = {
    high: 'text-red-600',
    medium: 'text-yellow-600', 
    low: 'text-gray-600'
  };

  const priorityLabels = {
    high: '高',
    medium: '中',
    low: '低'
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-4xl w-full max-h-[90vh] overflow-hidden" style={{ 
        backgroundColor: 'var(--card-background)',
        border: '1px solid var(--border-light)'
      }}>
        {/* 头部 */}
        <div className="flex items-center justify-between p-6" style={{ 
          borderBottom: '1px solid var(--border-light)', 
          backgroundColor: 'var(--background-secondary)' 
        }}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg" style={{ 
              background: 'var(--primary)' 
            }}>
              <span className="text-white text-lg font-bold">{mode === 'strategy' ? '🎯' : '🤖'}</span>
            </div>
            <h2 className="text-heading-2 font-bold" style={{ color: 'var(--text-primary)' }}>
              {mode === 'strategy' ? '策略建议' : 'AI智能分析'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all hover:btn-secondary"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {!analysis && !isLoading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ 
                backgroundColor: 'var(--primary)', 
                opacity: 0.1 
              }}>
                <span className="text-3xl">{mode === 'strategy' ? '🎯' : '🤖'}</span>
              </div>
              <div className="text-body-large font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                {mode === 'strategy' ? 'AI策略建议' : 'AI智能分析助手'}
              </div>
              <div className="text-body-small mb-6" style={{ color: 'var(--text-muted)' }}>
                {mode === 'strategy' 
                  ? '基于当前任务进展，AI将为您提供详细的执行策略建议和任务拆分方案' 
                  : '基于当前任务进展，AI将为您提供执行策略建议、潜在机会发掘和任务拆分建议'
                }
              </div>
              <button
                onClick={handleAnalyzeTask}
                className="btn-primary px-6 py-3 rounded-xl font-semibold"
              >
                🚀 开始{mode === 'strategy' ? '策略分析' : 'AI分析'}
              </button>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-pulse mb-4">
                <div className="w-12 h-12 rounded-full mx-auto mb-4" style={{ 
                  backgroundColor: 'var(--primary)', 
                  opacity: 0.6 
                }}></div>
              </div>
              <div className="text-body font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {mode === 'strategy' ? 'AI正在生成策略建议...' : 'AI正在分析中...'}
              </div>
              <div className="text-body-small mt-2" style={{ color: 'var(--text-muted)' }}>
                请稍等，这可能需要几秒钟
              </div>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 status-error">
                <span className="text-3xl">⚠️</span>
              </div>
              <div className="text-body font-semibold mb-2" style={{ color: 'var(--error)' }}>
                分析失败
              </div>
              <div className="text-body-small mb-6" style={{ color: 'var(--text-muted)' }}>
                {error}
              </div>
              <button
                onClick={handleAnalyzeTask}
                className="btn-secondary px-6 py-3 rounded-xl font-semibold"
              >
                重试
              </button>
            </div>
          )}

          {analysis && (
            <>
              {/* 上下文编辑和重新生成控制 */}
              <div
                className="mb-6 flex items-center justify-between p-4 rounded-xl"
                style={{
                  backgroundColor: 'var(--background-secondary)',
                  border: '1px solid var(--border-light)'
                }}
              >
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowContextEditor(!showContextEditor)}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 btn-secondary"
                  >
                    <span>⚙️</span>
                    <span>{showContextEditor ? '隐藏设置' : '高级设置'}</span>
                  </button>
                  <button
                    onClick={handleRegenerate}
                    className="px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center space-x-1"
                    style={{
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary)',
                      border: '1px solid var(--primary)'
                    }}
                  >
                    <span>🔄</span>
                    <span>重新生成</span>
                  </button>
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  当前模式: {mode === 'strategy' ? '策略建议' : '完整分析'}
                </div>
              </div>

              {/* 上下文编辑器/显示 */}
              {showContextEditor && (
                <div
                  className="mb-6 p-4 rounded-xl space-y-4"
                  style={{
                    backgroundColor: 'var(--background-secondary)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  {/* 显示当前设置 */}
                  {(contextInput || customPrompt) && (
                    <div
                      className="space-y-3 p-3 rounded-lg"
                      style={{
                        backgroundColor: 'var(--card-background)',
                        border: '1px solid var(--border-light)'
                      }}
                    >
                      <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>当前设置:</div>
                      {contextInput && (
                        <div>
                          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>上下文信息:</div>
                          <div
                            className="text-sm p-2 rounded border max-h-20 overflow-y-auto"
                            style={{
                              color: 'var(--text-secondary)',
                              backgroundColor: 'var(--background-secondary)',
                              border: '1px solid var(--border-light)'
                            }}
                          >
                            {contextInput}
                          </div>
                        </div>
                      )}
                      {customPrompt && (
                        <div>
                          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>自定义提示词:</div>
                          <div
                            className="text-sm p-2 rounded border max-h-20 overflow-y-auto"
                            style={{
                              color: 'var(--text-secondary)',
                              backgroundColor: 'var(--background-secondary)',
                              border: '1px solid var(--border-light)'
                            }}
                          >
                            {customPrompt}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      额外上下文信息:
                    </label>
                    <textarea
                      value={contextInput}
                      onChange={(e) => setContextInput(e.target.value)}
                      placeholder="添加任务背景、目标、约束条件等额外信息..."
                      className="w-full p-3 rounded-lg text-sm form-input"
                      rows={3}
                      style={{
                        backgroundColor: 'var(--card-background)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      自定义提示词 (可选):
                    </label>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="输入自定义的AI分析提示词..."
                      className="w-full p-3 rounded-lg text-sm form-input"
                      rows={3}
                      style={{
                        backgroundColor: 'var(--card-background)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowContextEditor(false)}
                      className="px-3 py-2 rounded-lg text-sm btn-secondary"
                    >
                      关闭
                    </button>
                    <button
                      onClick={handleSaveContext}
                      className="px-3 py-2 rounded-lg text-sm btn-primary"
                    >
                      保存并重新分析
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-8">
                
                {/* 当前任务上下文信息 */}
                {mode === 'strategy' && (
                  <div
                    className="mb-6 p-4 rounded-xl"
                    style={{
                      backgroundColor: 'var(--info-bg)',
                      border: '1px solid var(--info)'
                    }}
                  >
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-lg">📋</span>
                      <h3 className="text-lg font-bold" style={{ color: 'var(--info)' }}>
                        当前任务信息
                      </h3>
                    </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                        <span className="font-medium" style={{ color: 'var(--info)' }}>任务内容:</span>
                        <div
                          className="mt-1 p-2 rounded border"
                          style={{
                            color: 'var(--text-primary)',
                            backgroundColor: 'var(--card-background)',
                            border: '1px solid var(--border-light)'
                          }}
                        >
                          {/* 这里可以显示任务内容，需要从props传入 */}
                          任务ID: {taskId}
                        </div>
                      </div>
                      {contextInput && (
                        <div>
                          <span className="font-medium" style={{ color: 'var(--info)' }}>额外上下文:</span>
                          <div
                            className="mt-1 p-2 rounded border max-h-20 overflow-y-auto"
                            style={{
                              color: 'var(--text-primary)',
                              backgroundColor: 'var(--card-background)',
                              border: '1px solid var(--border-light)'
                            }}
                          >
                            {contextInput}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              {/* 执行策略建议 */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">📋</span>
                  <h3 className="text-heading-3 font-bold" style={{ color: 'var(--text-primary)' }}>
                    执行策略建议
                  </h3>
                </div>
                <div className="card p-4" style={{ 
                  backgroundColor: 'var(--background-secondary)',
                  border: '1px solid var(--border-light)'
                }}>
                  <div className="text-body font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                    {analysis.execution_strategy.summary}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="text-body-small font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                        关键要点：
                      </div>
                      <ul className="space-y-1">
                        {analysis.execution_strategy.key_points.map((point, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="text-body-small mt-1" style={{ color: 'var(--primary)' }}>•</span>
                            <span className="text-body-small" style={{ color: 'var(--text-primary)' }}>
                              {point}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <div className="text-body-small font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                        详细建议：
                      </div>
                      <ul className="space-y-1">
                        {analysis.execution_strategy.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="text-body-small mt-1" style={{ color: 'var(--success)' }}>✓</span>
                            <span className="text-body-small" style={{ color: 'var(--text-primary)' }}>
                              {rec}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 潜在机会发掘 */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">💡</span>
                  <h3 className="text-heading-3 font-bold" style={{ color: 'var(--text-primary)' }}>
                    潜在机会发掘
                  </h3>
                </div>
                <div className="card p-4" style={{ 
                  backgroundColor: 'var(--background-secondary)',
                  border: '1px solid var(--border-light)'
                }}>
                  <div className="text-body font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                    {analysis.opportunities.summary}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-body-small font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                        潜在领域：
                      </div>
                      <ul className="space-y-1">
                        {analysis.opportunities.potential_areas.map((area, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="text-body-small mt-1" style={{ color: 'var(--accent-amber)' }}>◆</span>
                            <span className="text-body-small" style={{ color: 'var(--text-primary)' }}>
                              {area}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <div className="text-body-small font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                        价值主张：
                      </div>
                      <ul className="space-y-1">
                        {analysis.opportunities.value_propositions.map((value, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="text-body-small mt-1" style={{ color: 'var(--accent-emerald)' }}>★</span>
                            <span className="text-body-small" style={{ color: 'var(--text-primary)' }}>
                              {value}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 子任务拆分建议 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🔧</span>
                    <h3 className="text-heading-3 font-bold" style={{ color: 'var(--text-primary)' }}>
                      子任务拆分建议
                    </h3>
                  </div>
                  {selectedSubtasks.size > 0 && (
                    <button
                      onClick={handleCreateSelectedSubtasks}
                      className="btn-primary px-4 py-2 rounded-lg text-body-small font-semibold"
                    >
                      创建选中的 {selectedSubtasks.size} 个子任务
                    </button>
                  )}
                </div>
                
                <div className="space-y-3">
                  {analysis.subtask_suggestions.map((suggestion, index) => (
                    <div 
                      key={index}
                      className="card p-4 transition-all hover:shadow-md cursor-pointer"
                      style={{ 
                        backgroundColor: selectedSubtasks.has(index) ? 'var(--primary-light)' : 'var(--background-secondary)',
                        border: `1px solid ${selectedSubtasks.has(index) ? 'var(--primary)' : 'var(--border-light)'}`
                      }}
                      onClick={() => handleSubtaskToggle(index)}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedSubtasks.has(index)}
                          onChange={() => handleSubtaskToggle(index)}
                          className="mt-1 w-4 h-4 rounded"
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-body font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {suggestion.title}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                priorityColors[suggestion.priority]
                              }`}>
                                {priorityLabels[suggestion.priority]}
                              </span>
                              {suggestion.estimated_time && (
                                <span className="px-2 py-1 rounded text-xs font-medium" style={{ 
                                  backgroundColor: 'var(--info-bg)', 
                                  color: 'var(--info)' 
                                }}>
                                  {suggestion.estimated_time}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-body-small" style={{ color: 'var(--text-secondary)' }}>
                            {suggestion.description}
                          </p>
                          {suggestion.dependencies.length > 0 && (
                            <div className="text-caption" style={{ color: 'var(--text-muted)' }}>
                              依赖: {suggestion.dependencies.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {analysis.subtask_suggestions.length === 0 && (
                  <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    AI暂未生成子任务建议
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        </div>

        {/* 底部操作 */}
        {analysis && (
          <div className="flex items-center justify-between p-6" style={{ 
            borderTop: '1px solid var(--border-light)', 
            backgroundColor: 'var(--background-secondary)' 
          }}>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleAnalyzeTask}
                className="btn-secondary px-4 py-2 rounded-lg text-body-small font-semibold"
              >
                🔄 重新分析
              </button>
              {(contextInput || customPrompt) && (
                <button
                  onClick={() => setShowContextEditor(!showContextEditor)}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-colors btn-secondary"
                >
                  📋 {showContextEditor ? '隐藏设置' : '查看当前设置'}
                </button>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-caption" style={{ color: 'var(--text-muted)' }}>
                已选择 {selectedSubtasks.size} 个子任务
              </span>
              {selectedSubtasks.size > 0 && (
                <button
                  onClick={handleCreateSelectedSubtasks}
                  className="btn-primary px-4 py-2 rounded-lg text-body-small font-semibold"
                >
                  创建选中的子任务
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
