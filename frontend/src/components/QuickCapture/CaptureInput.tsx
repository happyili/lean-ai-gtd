import { useState, useRef, useEffect } from 'react';

interface CaptureInputProps {
  onSave: (content: string, category: string) => void;
  onClear: () => void;
  isLoading?: boolean;
}

const categories = [
  { id: 'idea', label: '想法', icon: '💡' },
  { id: 'task', label: '任务', icon: '📋' },
  { id: 'note', label: '笔记', icon: '📝' },
];

export default function CaptureInput({ onSave, onClear, isLoading = false }: CaptureInputProps) {
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('idea');
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
    <div className="w-full max-w-4xl mx-auto p-8">
      {/* 主输入区域 */}
      <div className="mb-6">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="记录您的想法、任务或笔记... (⌘+Enter 保存, ⌘+L 清空, Tab 切换分类)"
          className="w-full h-56 p-6 border border-slate-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-300 text-slate-700 text-base bg-slate-50/50 backdrop-blur-sm transition-all font-medium placeholder:text-slate-400"
          disabled={isLoading}
        />
        <div className="flex justify-between items-center mt-3 text-sm text-slate-500">
          <span className="font-medium">{content.length}/5000 字符</span>
          <span className="bg-slate-100 px-3 py-1 rounded-xl font-medium">支持快捷键操作</span>
        </div>
      </div>

      {/* 分类选择器 */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          选择分类：
        </label>
        <div className="flex gap-3">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-6 py-3 rounded-2xl border transition-all duration-200 font-semibold ${
                selectedCategory === category.id
                  ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white border-sky-400 shadow-lg shadow-sky-200'
                  : 'bg-white/60 text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 backdrop-blur-sm'
              }`}
              disabled={isLoading}
            >
              <span className="mr-2 text-lg">{category.icon}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={!content.trim() || isLoading}
          className="flex-1 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {isLoading ? '保存中...' : '添加记录'}
        </button>
        <button
          onClick={handleClear}
          disabled={isLoading}
          className="bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:cursor-not-allowed text-slate-700 font-semibold py-4 px-6 rounded-2xl transition-all duration-200 backdrop-blur-sm"
        >
          清空内容
        </button>
      </div>
    </div>
  );
} 