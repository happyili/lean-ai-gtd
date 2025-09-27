import { useState, useRef, useEffect } from 'react';
import { apiPost } from '../../utils/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  analysis?: any; // 5W1H分析结果
}

interface AIChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  tasks?: any[];
  accessToken?: string;
}

export default function AIChatSidebar({ isOpen, onClose, tasks = [], accessToken }: AIChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是你的AI任务助手。我可以基于你当前的任务进展回答问题，提供建议，或者帮助你分析任务优先级。有什么我可以帮助你的吗？',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [, setSelectedTaskForAnalysis] = useState<number | null>(null);
  const [show5W1HPanel, setShow5W1HPanel] = useState(false);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<string>('show5W1H');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送消息
  const handleSendMessage = async () => {
    const message = inputValue.trim();
    if (!message || isLoading) return;

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // 模拟AI响应（这里应该调用实际的AI API）
      setTimeout(() => {
        const responses = [
          '基于你当前的任务，我建议你先完成高优先级的工作任务，因为它们对项目进度影响更大。',
          '我看到你有几个进行中的任务。你可以考虑将大任务拆分成更小的子任务，这样更容易管理和完成。',
          '根据你的任务类型分布，工作任务占比较高。建议合理安排工作与生活任务的平衡。',
          '你的本周完成率很不错！继续保持这个节奏，记得适当休息。',
          '我注意到你有一些暂停的任务，需要重新评估它们的必要性吗？'
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: randomResponse,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error('AI回复失败:', error);
      setIsLoading(false);
    }
  };

  // 处理回车发送
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 执行5W1H分析
  const handle5W1HAnalysis = async (taskId: number) => {
    if (!accessToken) {
      console.error('需要登录才能使用AI分析功能');
      return;
    }

    setIsLoading(true);
    setSelectedTaskForAnalysis(taskId);

    try {
      const response = await apiPost(
        `/api/records/${taskId}/ai-analysis`,
        {
          context: "请使用5W1H框架进行深度分析，重点关注任务的价值、可行性和执行策略"
        },
        '5W1H分析',
        accessToken
      );

      const result = await response.json();
      
      if (result.analysis) {
        const analysisMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '已完成5W1H分析，请查看详细结果：',
          timestamp: new Date(),
          analysis: result.analysis
        };

        setMessages(prev => [...prev, analysisMessage]);
      }
    } catch (error) {
      console.error('5W1H分析失败:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `抱歉，5W1H分析失败了: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setSelectedTaskForAnalysis(null);
    }
  };

  // 执行增强任务拆解
  const handleEnhancedDecomposition = async (taskId: number) => {
    if (!accessToken) {
      console.error('需要登录才能使用增强任务拆解功能');
      return;
    }

    setIsLoading(true);
    setSelectedTaskForAnalysis(taskId);

    try {
      const response = await apiPost(
        `/api/records/${taskId}/enhanced-decomposition`,
        {
          context: "请使用增强算法进行智能任务拆解，重点关注复杂度分析、依赖关系和时间估算"
        },
        '增强任务拆解',
        accessToken
      );

      const result = await response.json();
      
      if (result.decomposition) {
        const analysisMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '已完成增强任务拆解分析，请查看详细结果：',
          timestamp: new Date(),
          analysis: result.decomposition
        };

        setMessages(prev => [...prev, analysisMessage]);
      }
    } catch (error) {
      console.error('增强任务拆解失败:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `抱歉，增强任务拆解失败了: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setSelectedTaskForAnalysis(null);
    }
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Shanghai' // 明确指定时区
    });
  };

  // 快捷问题建议
  const quickQuestions = [
    '分析我的任务优先级',
    '本周任务完成情况如何？',
    '有什么提高效率的建议？',
    '帮我规划今天的工作'
  ];

  // 5W1H快捷分析选项
  const quickAnalysisOptions = [
    { label: '📊 5W1H深度分析', action: 'show5W1H' },
    { label: '🧩 智能任务拆解', action: 'enhancedDecomposition' },
    { label: '🎯 任务价值评估', action: 'valueAnalysis' },
    { label: '⚡ 可行性判断', action: 'feasibilityCheck' }
  ];

  // 渲染5W1H分析结果
  const render5W1HAnalysis = (analysis: any) => {
    if (!analysis) return null;

    try {
      // 尝试解析分析结果
      const analysisData = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
      
      return (
        <div className="mt-3 p-3 rounded-lg" style={{ 
          backgroundColor: 'var(--background-secondary)',
          border: '1px solid var(--border-light)'
        }}>
          <h4 className="font-semibold mb-3 text-center" style={{ color: 'var(--text-primary)' }}>
            📊 5W1H深度分析结果
          </h4>
          
          <div className="space-y-3">
            {/* What */}
            {analysisData.what && (
              <div className="p-2 rounded" style={{ backgroundColor: 'var(--card-background)' }}>
                <h5 className="font-medium text-blue-600 mb-1">What (什么)</h5>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {analysisData.what.core_objective || '核心目标'}
                </p>
              </div>
            )}
            
            {/* Why */}
            {analysisData.why && (
              <div className="p-2 rounded" style={{ backgroundColor: 'var(--card-background)' }}>
                <h5 className="font-medium text-green-600 mb-1">Why (为什么)</h5>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {analysisData.why.value_proposition || '价值主张'}
                </p>
                {analysisData.why.importance_score && (
                  <div className="mt-1">
                    <span className="text-xs px-2 py-1 rounded" style={{ 
                      backgroundColor: 'var(--primary)', 
                      color: 'white' 
                    }}>
                      重要度: {analysisData.why.importance_score}/100
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* How */}
            {analysisData.how && (
              <div className="p-2 rounded" style={{ backgroundColor: 'var(--card-background)' }}>
                <h5 className="font-medium text-purple-600 mb-1">How (如何)</h5>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {analysisData.how.methodology || '执行方法'}
                </p>
                {analysisData.how.execution_steps && (
                  <ul className="mt-1 text-xs space-y-1">
                    {analysisData.how.execution_steps.slice(0, 3).map((step: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-1">•</span>
                        <span style={{ color: 'var(--text-muted)' }}>{step}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            
            {/* When */}
            {analysisData.when && (
              <div className="p-2 rounded" style={{ backgroundColor: 'var(--card-background)' }}>
                <h5 className="font-medium text-orange-600 mb-1">When (何时)</h5>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {analysisData.when.priority_level || 'medium'} 优先级
                  </span>
                  {analysisData.when.deadline && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {analysisData.when.deadline}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    } catch (error) {
      console.error('解析5W1H分析结果失败:', error);
      return (
        <div className="mt-3 p-3 rounded-lg text-center" style={{ 
          backgroundColor: 'var(--background-secondary)',
          border: '1px solid var(--border-light)',
          color: 'var(--text-muted)'
        }}>
          分析结果格式错误，无法显示
        </div>
      );
    }
  };

  // 渲染增强任务拆解结果
  const renderEnhancedDecomposition = (analysis: any) => {
    if (!analysis) return null;

    try {
      const decompositionData = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
      
      return (
        <div className="mt-3 p-3 rounded-lg" style={{ 
          backgroundColor: 'var(--background-secondary)',
          border: '1px solid var(--border-light)'
        }}>
          <h4 className="font-semibold mb-3 text-center" style={{ color: 'var(--text-primary)' }}>
            🧩 增强任务拆解结果
          </h4>
          
          <div className="space-y-3">
            {/* 任务分析概览 */}
            {decompositionData.task_analysis && (
              <div className="p-2 rounded" style={{ backgroundColor: 'var(--card-background)' }}>
                <h5 className="font-medium text-blue-600 mb-2">📊 任务分析</h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-medium">复杂度: </span>
                    <span className="px-2 py-1 rounded" style={{ 
                      backgroundColor: 'var(--primary)', 
                      color: 'white' 
                    }}>
                      {decompositionData.task_analysis.complexity_score || 5}/10
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">预估时间: </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {decompositionData.task_analysis.estimated_total_hours || 8}小时
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 子任务列表 */}
            {decompositionData.enhanced_subtasks && (
              <div className="p-2 rounded" style={{ backgroundColor: 'var(--card-background)' }}>
                <h5 className="font-medium text-green-600 mb-2">🔧 智能子任务</h5>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {decompositionData.enhanced_subtasks.slice(0, 4).map((subtask: any, index: number) => (
                    <div key={index} className="p-2 rounded text-xs" style={{ 
                      backgroundColor: 'var(--background-secondary)',
                      border: '1px solid var(--border-light)'
                    }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {subtask.title}
                        </span>
                        <div className="flex items-center space-x-1">
                          <span className={`px-2 py-1 rounded text-xs ${
                            subtask.complexity_level === 'easy' ? 'bg-green-100 text-green-600' :
                            subtask.complexity_level === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {subtask.complexity_level}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {subtask.estimated_hours}h
                          </span>
                        </div>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {subtask.description}
                      </p>
                      {subtask.dependencies && subtask.dependencies.length > 0 && (
                        <div className="mt-1">
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            依赖: {subtask.dependencies.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 执行策略 */}
            {decompositionData.execution_strategy && (
              <div className="p-2 rounded" style={{ backgroundColor: 'var(--card-background)' }}>
                <h5 className="font-medium text-purple-600 mb-2">🎯 执行策略</h5>
                {decompositionData.execution_strategy.recommended_order && (
                  <div className="text-xs">
                    <span className="font-medium">推荐顺序: </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {decompositionData.execution_strategy.recommended_order.slice(0, 3).join(' → ')}
                      {decompositionData.execution_strategy.recommended_order.length > 3 ? '...' : ''}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 优化建议 */}
            {decompositionData.optimization_suggestions && (
              <div className="p-2 rounded" style={{ backgroundColor: 'var(--card-background)' }}>
                <h5 className="font-medium text-orange-600 mb-1">💡 优化建议</h5>
                <ul className="text-xs space-y-1">
                  {decompositionData.optimization_suggestions.slice(0, 2).map((suggestion: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-1">•</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      );
    } catch (error) {
      console.error('解析增强任务拆解结果失败:', error);
      return (
        <div className="mt-3 p-3 rounded-lg text-center" style={{ 
          backgroundColor: 'var(--background-secondary)',
          border: '1px solid var(--border-light)',
          color: 'var(--text-muted)'
        }}>
          拆解结果格式错误，无法显示
        </div>
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 flex flex-col" style={{ 
      backgroundColor: 'var(--card-background)',
      borderLeft: '1px solid var(--border-light)'
    }}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-4" style={{ 
        borderBottom: '1px solid var(--border-light)', 
        backgroundColor: 'var(--background-secondary)' 
      }}>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ 
            background: 'var(--primary)' 
          }}>
            <span className="text-white text-sm font-bold">🤖</span>
          </div>
          <div>
            <h3 className="text-body font-semibold" style={{ color: 'var(--text-primary)' }}>
              AI助手
            </h3>
            <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
              基于 {tasks.length} 个任务进展
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:btn-secondary"
          style={{ color: 'var(--text-muted)' }}
        >
          ✕
        </button>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : ''
              }`}
              style={{
                backgroundColor: message.role === 'user' ? 'var(--primary)' : 'var(--background-secondary)',
                color: message.role === 'user' ? 'white' : 'var(--text-primary)',
                border: message.role === 'assistant' ? '1px solid var(--border-light)' : 'none'
              }}
            >
              <p className="text-body-small">{message.content}</p>
              
              {/* 如果有分析结果，根据内容类型显示不同的分析结果 */}
              {message.analysis && (
                message.content.includes('5W1H分析') ? 
                  render5W1HAnalysis(message.analysis) :
                message.content.includes('增强任务拆解') ?
                  renderEnhancedDecomposition(message.analysis) :
                  render5W1HAnalysis(message.analysis)
              )}
              
              <p className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-blue-100' : ''
              }`} style={{
                color: message.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)'
              }}>
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}
        
        {/* 加载指示器 */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="p-3 rounded-lg" style={{ 
              backgroundColor: 'var(--background-secondary)',
              border: '1px solid var(--border-light)'
            }}>
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--primary)' }}></div>
                  <div className="w-2 h-2 rounded-full animate-pulse delay-75" style={{ backgroundColor: 'var(--primary)' }}></div>
                  <div className="w-2 h-2 rounded-full animate-pulse delay-150" style={{ backgroundColor: 'var(--primary)' }}></div>
                </div>
                <span className="text-body-small" style={{ color: 'var(--text-muted)' }}>AI正在思考...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 快捷问题和5W1H分析 */}
      {messages.length <= 1 && (
        <div className="p-4 space-y-4" style={{ borderTop: '1px solid var(--border-light)' }}>
          {/* 常规快捷问题 */}
          <div>
            <p className="text-body-small font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              💡 试试这些问题：
            </p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInputValue(question)}
                  className="px-3 py-1 rounded-lg text-xs font-medium transition-all hover:btn-secondary"
                  style={{ 
                    backgroundColor: 'var(--background-secondary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          {/* 5W1H智能分析 */}
          {tasks && tasks.length > 0 && (
            <div>
              <p className="text-body-small font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                🧠 智能分析功能：
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {quickAnalysisOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedAnalysisType(option.action);
                      setShow5W1HPanel(true);
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-medium transition-all hover:btn-secondary"
                    style={{ 
                      backgroundColor: option.action === 'show5W1H' ? 'var(--primary)' : 'var(--background-secondary)',
                      color: option.action === 'show5W1H' ? 'white' : 'var(--text-secondary)',
                      border: `1px solid ${option.action === 'show5W1H' ? 'var(--primary)' : 'var(--border-light)'}`
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* 任务选择面板 */}
              {show5W1HPanel && (
                <div className="mt-3 p-3 rounded-lg" style={{ 
                  backgroundColor: 'var(--background-secondary)',
                  border: '1px solid var(--border-light)'
                }}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      选择要{selectedAnalysisType === 'show5W1H' ? '5W1H分析' : 
                               selectedAnalysisType === 'enhancedDecomposition' ? '智能拆解' : '分析'}的任务
                    </h4>
                    <button
                      onClick={() => setShow5W1HPanel(false)}
                      className="text-xs" style={{ color: 'var(--text-muted)' }}
                    >
                      取消
                    </button>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {tasks.slice(0, 5).map((task: any) => (
                      <button
                        key={task.id}
                        onClick={() => {
                          if (selectedAnalysisType === 'show5W1H') {
                            handle5W1HAnalysis(task.id);
                          } else if (selectedAnalysisType === 'enhancedDecomposition') {
                            handleEnhancedDecomposition(task.id);
                          }
                          setShow5W1HPanel(false);
                        }}
                        disabled={isLoading}
                        className="w-full text-left p-2 rounded text-xs transition-all hover:btn-secondary"
                        style={{ 
                          backgroundColor: 'var(--card-background)',
                          border: '1px solid var(--border-light)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        <div className="truncate">{task.content || '无标题任务'}</div>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          {task.priority || 'normal'} 优先级 • {task.status || 'active'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 输入区域 */}
      <div className="p-4" style={{ borderTop: '1px solid var(--border-light)' }}>
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入你的问题..."
              className="w-full p-3 rounded-lg form-input text-body-small resize-none"
              rows={2}
              style={{
                backgroundColor: 'var(--card-background)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-primary)'
              }}
              disabled={isLoading}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              按 Enter 发送，Shift + Enter 换行
            </p>
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: inputValue.trim() && !isLoading ? 'var(--primary)' : 'var(--text-disabled)',
              color: 'white',
              border: `1px solid ${inputValue.trim() && !isLoading ? 'var(--primary)' : 'var(--text-disabled)'}`
            }}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}