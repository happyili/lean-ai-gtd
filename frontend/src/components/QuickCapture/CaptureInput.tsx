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
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-none">
      {/* 主输入区域 */}
      <div className="mb-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="记录您的想法、任务或笔记... (Ctrl+Enter 保存, Ctrl+L 清空, Tab 切换分类)"
          className="w-full h-48 p-4 border border-gray-300 rounded-none resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 text-base"
          disabled={isLoading}
        />
        <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
          <span>{content.length}/5000 字符</span>
          <span>支持快捷键操作</span>
        </div>
      </div>

      {/* 分类选择器 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择分类：
        </label>
        <div className="flex gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-none border ${
                selectedCategory === category.id
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
              disabled={isLoading}
            >
              <span className="mr-2">{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={!content.trim() || isLoading}
          className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-none transition-colors"
        >
          {isLoading ? '保存中...' : '添加记录'}
        </button>
        <button
          onClick={handleClear}
          disabled={isLoading}
          className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-700 font-medium py-2 px-4 rounded-none transition-colors"
        >
          清空内容
        </button>
      </div>
    </div>
  );
} 