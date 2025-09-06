import { useState, useRef, useEffect } from 'react';

interface CaptureInputProps {
  onSave: (content: string, category: string) => void;
  onClear: () => void;
  isLoading?: boolean;
}

const categories = [
  { id: 'task', label: '任务', icon: '📋' },
  { id: 'idea', label: '想法', icon: '💡' },
  { id: 'note', label: '笔记', icon: '📝' },
];

export default function CaptureInput({ onSave, onClear, isLoading = false }: CaptureInputProps) {
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('task');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动聚焦到输入框
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // 处理快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'l') {
        e.preventDefault();
        handleClear();
      }
    }
    
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const currentIndex = categories.findIndex(cat => cat.id === selectedCategory);
      const nextIndex = (currentIndex + 1) % categories.length;
      setSelectedCategory(categories[nextIndex].id);
    }
  };

  const handleSave = () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      alert('请输入记录内容');
      return;
    }
    
    if (trimmedContent.length > 5000) {
      alert('记录内容不能超过5000字符');
      return;
    }
    
    onSave(trimmedContent, selectedCategory);
    setContent('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleClear = () => {
    setContent('');
    onClear();
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="w-full">
      {/* 主输入区域 */}
      <div className="mb-6">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="记录您的想法、任务或笔记... (⌘+Enter 保存, ⌘+L 清空, Tab 切换分类)"
          className="w-full h-80 p-4 rounded-xl resize-none form-input text-body transition-all"
          style={{ 
            backgroundColor: 'var(--card-background)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-light)'
          }}
          disabled={isLoading}
        />
        <div className="flex justify-between items-center mt-3 text-caption">
          <span style={{ color: 'var(--text-muted)' }}>{content.length}/5000 字符</span>
          <span className="px-3 py-1 rounded-lg" style={{ background: 'var(--background-secondary)', color: 'var(--text-tertiary)' }}>支持快捷键操作</span>
        </div>
      </div>

      {/* 分类选择器 */}
      <div className="mb-6">
        <label className="block text-body-small font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          选择分类：
        </label>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg text-body-small font-semibold transition-all ${
                selectedCategory === category.id ? 'btn-primary' : 'btn-secondary'
              }`}
              disabled={isLoading}
            >
              <span className="mr-2">{category.icon}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleSave}
          disabled={!content.trim() || isLoading}
          className="btn-primary py-3 px-4 rounded-lg text-body-small font-semibold transition-all"
        >
          {isLoading ? '保存中...' : '添加记录'}
        </button>
        <button
          onClick={handleClear}
          disabled={isLoading}
          className="btn-secondary py-3 px-4 rounded-lg text-body-small font-semibold transition-all"
        >
          清空内容
        </button>
      </div>
    </div>
  );
} 