import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  tasks?: any[];
}

export default function AIChatSidebar({ isOpen, onClose, tasks = [] }: AIChatSidebarProps) {
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

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // 快捷问题建议
  const quickQuestions = [
    '分析我的任务优先级',
    '本周任务完成情况如何？',
    '有什么提高效率的建议？',
    '帮我规划今天的工作'
  ];

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

      {/* 快捷问题 */}
      {messages.length <= 1 && (
        <div className="p-4" style={{ borderTop: '1px solid var(--border-light)' }}>
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