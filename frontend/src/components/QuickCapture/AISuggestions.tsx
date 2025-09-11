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
  prompt_used?: string;
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
  const [contextInput, setContextInput] = useState(''); // 上下文信息
  const [showContextEditor, setShowContextEditor] = useState(false);
  const defaultPrompt = `你是一个专业的任务管理和项目分析专家。请基于以下任务上下文信息，提供详细的智能分析建议。\n\n## 任务上下文\n{{CONTEXT}}\n\n## 分析要求\n请从以下三个维度进行深入分析，并以JSON格式输出结果：\n\n1. **执行策略建议(execution_strategy)**\n   - 分析当前任务的执行情况和瓶颈\n   - 提供具体的执行方法和步骤建议\n   - 建议优化的执行顺序和重点关注领域\n   - 给出时间管理和资源分配建议\n\n2. **潜在机会发掘(opportunities)**\n   - 识别任务中的潜在价值和机会点\n   - 发现可能的延伸方向和拓展空间\n   - 分析任务完成后的后续机会\n   - 提供创新思路和增值建议\n\n3. **子任务拆分建议(subtask_suggestions)**\n   - 将主任务分解为具体的可执行子任务\n   - 每个子任务应该具体、可衡量、可在合理时间内完成\n   - 考虑子任务之间的依赖关系和执行顺序\n   - 提供3-8个具体的子任务建议\n\n## 输出格式\n请严格按照以下JSON格式输出，确保内容实用且具体：\n\n{\n  "execution_strategy": {\n    "summary": "执行策略总结（50字以内）",\n    "key_points": ["要点1", "要点2", "要点3"],\n    "recommendations": ["建议1", "建议2"]\n  },\n  "opportunities": {\n    "summary": "机会发掘总结（50字以内）",\n    "potential_areas": ["机会1", "机会2"],\n    "value_propositions": ["价值1", "价值2"]\n  },\n  "subtask_suggestions": [\n    {"title": "子任务1", "description": "描述", "priority": "high/medium/low", "estimated_time": "预估时间", "dependencies": []}\n  ]\n}`;
  const [promptTemplate, setPromptTemplate] = useState(defaultPrompt);

  // 加载任务上下文（标题、详情、子任务）
  useEffect(() => {
    const loadContext = async () => {
      if (!isVisible || !taskId) return;
      try {
        const headers: HeadersInit = {};
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

        // 获取任务详情
        const recordRes = await fetch(`/api/records/${taskId}`, { headers });
        const recordData = await recordRes.json();
        const record = recordData?.record || {};

        // 获取所有子任务（包含完成与未完成）
        const subtasksRes = await fetch(`/api/records/${taskId}/subtasks?include_inactive=true`, { headers });
        const subtasksData = await subtasksRes.json();
        const subtasks = (subtasksData?.subtasks || []) as any[];

        const completed = subtasks.filter(s => s.status === 'completed');
        const incomplete = subtasks.filter(s => s.status !== 'completed');

        const fmtList = (items: any[]) => {
          if (!items || items.length === 0) return '（无）';
          return items.map((it: any, idx: number) => `- ${idx + 1}. ${it.content}`).join('\n');
        };

        const ctx = [
          `任务标题: ${record.content || ''}`,
          `任务详情: ${record.progress_notes || '（无）'}`,
          `已完成子任务(${completed.length}):\n${fmtList(completed)}`,
          `未完成子任务(${incomplete.length}):\n${fmtList(incomplete)}`,
        ].join('\n\n');

        setContextInput(ctx);
      } catch (e) {
        // 忽略上下文加载错误
      }
    };

    loadContext();
  }, [isVisible, taskId, accessToken]);

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
      
      // 添加提示词模板
      if (promptTemplate.trim()) {
        payload.customPrompt = promptTemplate.trim();
      }
      
      // 添加模式信息
      if (mode === 'strategy') {
        payload.mode = 'strategy';
      }
      
      // 默认让 AI 分析包含已完成/暂停等非 active 子任务，以便复盘与策略
      const response = await apiPost(
        `/api/records/${taskId}/ai-analysis`,
        { include_inactive_subtasks: true, ...payload },
        'AI分析',
        accessToken
      );

      const data = await response.json();
      if (!data || !data.analysis) {
        throw new Error('AI 分析结果格式错误');
      }
      setAnalysis(data.analysis);

      // 自动展开设置，便于用户查看/编辑
      setShowContextEditor(true);
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

              {/* 上下文编辑器/显示 */}
              {showContextEditor && (
                <div
                  className="mb-6 p-4 rounded-xl space-y-4"
                  style={{
                    backgroundColor: 'var(--background-secondary)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  
                   <div 
                    className="mb-6 p-4 rounded-xl"
                    style={{
                      backgroundColor: 'var(--info-bg)',
                      border: '1px solid var(--info)'
                    }}>
                     <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      上下文信息:
                     </label>
                     <textarea
                       value={contextInput}
                       onChange={(e) => setContextInput(e.target.value)}
                       placeholder="系统已生成任务标题、详情、子任务等上下文，可在此补充或修改..."
                       className="w-full p-3 rounded-lg text-sm form-input"
                      rows={6}
                       style={{
                         backgroundColor: 'var(--card-background)',
                         color: 'var(--text-primary)'
                       }}
                     />
                   </div>
                   
                   <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      提示词（支持使用 {'{'}{'{'}CONTEXT{'}'}{'}'} 宏变量）:
                    </label>
                     <textarea
                       value={promptTemplate}
                       onChange={(e) => setPromptTemplate(e.target.value)}
                       placeholder="输入自定义的AI分析提示词，使用 {{CONTEXT}} 引用上方的上下文信息..."
                       className="w-full p-3 rounded-lg text-sm form-input"
                      rows={10}
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
              {(contextInput || promptTemplate) && (
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
