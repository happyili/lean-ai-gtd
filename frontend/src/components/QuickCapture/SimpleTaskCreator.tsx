import { useState } from 'react';

interface SimpleTaskCreatorProps {
  onSave: (taskData: TaskCreateData) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

interface TaskCreateData {
  content: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  taskType: 'work' | 'hobby' | 'life';
  estimatedTime?: number;
  tags?: string[];
}

export default function SimpleTaskCreator({ onSave, onClose, isLoading = false }: SimpleTaskCreatorProps) {
  const [formData, setFormData] = useState<TaskCreateData>({
    content: '',
    category: 'task',
    priority: 'medium',
    taskType: 'work',
    estimatedTime: 25,
    tags: []
  });
  const [tagInput, setTagInput] = useState('');

  // 处理输入变化
  const handleInputChange = (field: keyof TaskCreateData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 添加标签
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags?.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag]
      }));
      setTagInput('');
    }
  };

  // 移除标签
  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (e.currentTarget === document.querySelector('input[placeholder*="标签"]')) {
        addTag();
      } else {
        handleSubmit();
      }
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!formData.content.trim()) return;
    
    try {
      await onSave(formData);
      // 重置表单
      setFormData({
        content: '',
        category: 'task',
        priority: 'medium',
        taskType: 'work',
        estimatedTime: 25,
        tags: []
      });
    } catch (error) {
      console.error('保存任务失败:', error);
    }
  };

  const priorityOptions = [
    { value: 'low', label: '低优先级', color: 'var(--success)', bg: 'var(--success-bg)' },
    { value: 'medium', label: '中优先级', color: 'var(--warning)', bg: 'var(--warning-bg)' },
    { value: 'high', label: '高优先级', color: 'var(--error)', bg: 'var(--error-bg)' },
    { value: 'urgent', label: '紧急', color: 'var(--error)', bg: 'var(--error-bg)' }
  ];

  const taskTypeOptions = [
    { value: 'work', label: '工作', icon: '💼' },
    { value: 'hobby', label: '业余', icon: '🎨' },
    { value: 'life', label: '生活', icon: '🏠' }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg" onKeyDown={handleKeyPress}>
        <div className="card p-6 space-y-6" style={{ 
          backgroundColor: 'var(--card-background)',
          border: '1px solid var(--border-light)'
        }}>
          {/* 任务内容输入 */}
          <div className="space-y-2">
            <textarea
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="记录您的想法、任务或笔记... (⌘+Enter 保存, Esc 关闭)"
              className="w-full p-4 rounded-lg form-input text-body resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              style={{
                backgroundColor: 'var(--background-secondary)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-primary)'
              }}
              autoFocus
              disabled={isLoading}
            />
            <div className="flex justify-between items-center text-caption" style={{ color: 'var(--text-muted)' }}>
              <span>支持快捷键操作</span>
              <span>{formData.content.length}/5000 字符</span>
            </div>
          </div>

          {/* 任务详情设置 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 优先级选择 */}
            <div className="space-y-2">
              <label className="text-body-small font-medium" style={{ color: 'var(--text-secondary)' }}>
                优先级
              </label>
              <div className="flex flex-wrap gap-2">
                {priorityOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleInputChange('priority', option.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                      formData.priority === option.value ? 'ring-2 ring-offset-1' : ''
                    }`}
                    style={{
                      backgroundColor: formData.priority === option.value ? option.bg : 'var(--background-secondary)',
                      color: formData.priority === option.value ? option.color : 'var(--text-secondary)',
                      borderColor: formData.priority === option.value ? option.color : 'var(--border-light)',
                      ringColor: option.color
                    }}
                    disabled={isLoading}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 任务类型选择 */}
            <div className="space-y-2">
              <label className="text-body-small font-medium" style={{ color: 'var(--text-secondary)' }}>
                任务类型
              </label>
              <div className="flex flex-wrap gap-2">
                {taskTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleInputChange('taskType', option.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border flex items-center space-x-1 ${
                      formData.taskType === option.value ? 'btn-primary' : 'hover:btn-secondary'
                    }`}
                    style={{
                      backgroundColor: formData.taskType === option.value ? 'var(--primary)' : 'var(--background-secondary)',
                      color: formData.taskType === option.value ? 'white' : 'var(--text-secondary)',
                      borderColor: formData.taskType === option.value ? 'var(--primary)' : 'var(--border-light)'
                    }}
                    disabled={isLoading}
                  >
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 预估时间 */}
            <div className="space-y-2">
              <label className="text-body-small font-medium" style={{ color: 'var(--text-secondary)' }}>
                预估时间 (分钟)
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  value={formData.estimatedTime || ''}
                  onChange={(e) => handleInputChange('estimatedTime', parseInt(e.target.value) || undefined)}
                  placeholder="25"
                  min="5"
                  max="480"
                  step="5"
                  className="w-24 px-3 py-2 rounded form-input text-center"
                  style={{
                    backgroundColor: 'var(--background-secondary)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-primary)'
                  }}
                  disabled={isLoading}
                />
                <div className="flex space-x-1">
                  {[15, 25, 45, 90].map(time => (
                    <button
                      key={time}
                      onClick={() => handleInputChange('estimatedTime', time)}
                      className={`px-2 py-1 rounded text-xs transition-all ${
                        formData.estimatedTime === time ? 'btn-primary' : 'btn-secondary'
                      }`}
                      disabled={isLoading}
                    >
                      {time}min
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 标签输入 */}
            <div className="space-y-2">
              <label className="text-body-small font-medium" style={{ color: 'var(--text-secondary)' }}>
                标签
              </label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="添加标签..."
                    className="flex-1 px-3 py-2 rounded form-input text-xs"
                    style={{
                      backgroundColor: 'var(--background-secondary)',
                      border: '1px solid var(--border-light)',
                      color: 'var(--text-primary)'
                    }}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                  />
                  <button
                    onClick={addTag}
                    className="px-3 py-2 rounded text-xs font-medium btn-secondary"
                    disabled={isLoading || !tagInput.trim()}
                  >
                    添加
                  </button>
                </div>
                {formData.tags && formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: 'var(--info-bg)',
                          color: 'var(--info)',
                          border: '1px solid var(--info)'
                        }}
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 text-xs hover:text-red-600"
                          disabled={isLoading}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between pt-4" style={{ 
            borderTop: '1px solid var(--border-light)' 
          }}>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-body-small font-medium transition-all btn-secondary"
              disabled={isLoading}
            >
              取消
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="text-caption" style={{ color: 'var(--text-muted)' }}>
                ⌘+Enter 快速保存
              </div>
              <button
                onClick={handleSubmit}
                disabled={!formData.content.trim() || isLoading}
                className="px-6 py-2 rounded-lg text-body-small font-medium transition-all"
                style={{
                  backgroundColor: formData.content.trim() && !isLoading ? 'var(--primary)' : 'var(--text-disabled)',
                  color: 'white',
                  border: `1px solid ${formData.content.trim() && !isLoading ? 'var(--primary)' : 'var(--text-disabled)'}`
                }}
              >
                {isLoading ? '保存中...' : '创建任务'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}