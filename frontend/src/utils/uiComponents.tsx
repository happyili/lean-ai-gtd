// 统一的UI组件样式工具函数
// 用于保持任务和子任务条目的类型、优先级、状态、时间、删除按钮等UI组件风格一致

import React from 'react';

// 任务类型映射
export const taskTypeMap = {
  work: { label: '工作', color: 'info', icon: '💼' },
  hobby: { label: '业余', color: 'success', icon: '🎨' },
  life: { label: '生活', color: 'purple', icon: '🏠' }
};

// 优先级映射
export const priorityMap = {
  low: { label: '低', color: 'muted' },
  medium: { label: '中', color: 'warning' },
  high: { label: '高', color: 'error' },
  urgent: { label: '紧急', color: 'error' }
};

// 状态映射
export const statusMap = {
  active: { label: '进行中', color: 'info' },
  completed: { label: '已完成', color: 'success' },
  paused: { label: '暂停', color: 'warning' },
  cancelled: { label: '已取消', color: 'error' }
};

// 分类映射（用于RecordHistory）
export const categoryMap = {
  idea: { label: '想法', icon: '💡', color: 'text-yellow-600' },
  task: { label: '任务', icon: '📋', color: 'text-blue-600' },
  note: { label: '笔记', icon: '📝', color: 'text-green-600' },
  general: { label: '通用', icon: '📄', color: 'text-gray-600' }
};

// 获取任务类型样式
export const getTaskTypeStyle = (colorType: string) => {
  switch (colorType) {
    case 'info':
      return { 
        backgroundColor: 'transparent', 
        color: 'var(--info)'
      };
    case 'success':
      return { 
        backgroundColor: 'transparent', 
        color: 'var(--success)'
      };
    case 'purple':
      return { 
        backgroundColor: 'transparent', 
        color: 'var(--accent-purple)'
      };
    default:
      return { 
        backgroundColor: 'transparent', 
        color: 'var(--text-muted)'
      };
  }
};

// 获取优先级样式
export const getPriorityStyle = (colorType: string) => {
  switch (colorType) {
    case 'muted':
      return { 
        backgroundColor: 'transparent', 
        color: 'var(--text-muted)'
      };
    case 'warning':
      return { 
        backgroundColor: 'transparent', 
        color: 'var(--warning)'
      };
    case 'amber':
      return { 
        backgroundColor: 'var(--accent-amber-bg)', 
        color: 'var(--accent-amber)'
      };
    case 'error':
      return { 
        backgroundColor: 'var(--error-bg)', 
        color: 'var(--error)'
      };
    default:
      return { 
        backgroundColor: 'transparent', 
        color: 'var(--text-muted)'
      };
  }
};

// 获取状态样式
export const getStatusStyle = (colorType: string) => {
  switch (colorType) {
    case 'info':
      return { 
        backgroundColor: 'transparent', 
        color: 'var(--info)'
      };
    case 'success':
      return { 
        backgroundColor: 'transparent', 
        color: 'var(--success)'
      };
    case 'warning':
      return { 
        backgroundColor: 'transparent', 
        color: 'var(--warning)'
      };
    case 'error':
      return { 
        backgroundColor: 'transparent', 
        color: 'var(--error)'
      };
    case 'muted':
      return { 
        backgroundColor: 'transparent', 
        color: 'var(--text-muted)'
      };
    default:
      return { 
        backgroundColor: 'transparent', 
        color: 'var(--text-muted)'
      };
  }
};

// 统一的时间格式化函数
export const formatDate = (dateString: string) => {
  if (!dateString) {
    return '未知时间';
  }
  
  try {
    // 确保正确解析UTC时间
    const date = new Date(dateString);
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return '时间格式错误';
    }
    
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return '刚刚';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}小时前`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  } catch (error) {
    console.error('Date formatting error:', error, 'for date:', dateString);
    return '时间格式错误';
  }
};

// 详细时间格式化函数（用于详情页面）
export const formatDetailedDate = (dateString: string) => {
  if (!dateString) {
    return '未知时间';
  }
  
  try {
    const date = new Date(dateString);
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return '时间格式错误';
    }
    
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Shanghai' // 明确指定时区
    });
  } catch (error) {
    console.error('Detailed date formatting error:', error, 'for date:', dateString);
    return '时间格式错误';
  }
};

// 统一的标签组件样式
export const getTagStyle = (type: 'taskType' | 'priority' | 'status', value: string) => {
  let colorType = 'default';
  
  if (type === 'taskType') {
    colorType = taskTypeMap[value as keyof typeof taskTypeMap]?.color || 'default';
    return getTaskTypeStyle(colorType);
  } else if (type === 'priority') {
    colorType = priorityMap[value as keyof typeof priorityMap]?.color || 'default';
    return getPriorityStyle(colorType);
  } else if (type === 'status') {
    colorType = statusMap[value as keyof typeof statusMap]?.color || 'default';
    return getStatusStyle(colorType);
  }
  
  return getStatusStyle('default');
};

// 统一的删除按钮组件
export interface DeleteButtonProps {
  id: number;
  deleteConfirm: number | null;
  onDelete: (id: number) => void;
  onSetDeleteConfirm: (id: number) => void;
  size?: 'small' | 'medium';
  className?: string;
}

export const DeleteButton = ({ 
  id, 
  deleteConfirm, 
  onDelete, 
  onSetDeleteConfirm, 
  size = 'small',
  className = ''
}: DeleteButtonProps) => {
  const isConfirming = deleteConfirm === id;
  
  const baseClasses = size === 'small' 
    ? 'text-xs px-2 py-1 rounded font-medium transition-all hover:opacity-80'
    : 'px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80';
  
  if (isConfirming) {
    return (
      <button
        onClick={() => onDelete(id)}
        className={`${baseClasses} ${className}`}
        style={{ color: 'var(--error)' }}
      >
        确认删除
      </button>
    );
  }
  
  return (
    <button
      onClick={() => {
        onSetDeleteConfirm(id);
        setTimeout(() => onSetDeleteConfirm(0), 3000);
      }}
      className={`mobile-delete-btn w-6 h-6 rounded flex items-center justify-center transition-all hover:opacity-80 ${className}`}
      style={{ color: 'var(--text-muted)' }}
      title="删除"
    >
      ✕
    </button>
  );
};

// 统一的下拉菜单样式
export const getDropdownStyle = () => ({
  className: "absolute top-full right-0 mt-1 py-1 rounded-lg shadow-lg min-w-24",
  style: { 
    backgroundColor: 'var(--card-background, #ffffff)',
    border: '1px solid var(--border-light)',
    zIndex: 9999,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.15), 0 2px 4px -1px rgba(0, 0, 0, 0.1)',
    background: 'var(--card-background, #ffffff)', // 确保背景色正确应用，带回退值
    opacity: 1 // 强制不透明
  } as React.CSSProperties
});

// 统一的下拉菜单项样式
export const getDropdownItemStyle = (isSelected: boolean) => ({
  className: `w-full text-left px-3 py-1 text-xs font-medium hover:btn-secondary transition-all ${
    isSelected ? 'font-bold' : ''
  }`,
  style: { 
    color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
    backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent'
  }
});

// 统一的标签按钮样式
export const getTagButtonStyle = (isSelected: boolean, customStyle?: React.CSSProperties) => ({
  className: `px-2 py-1 rounded-lg text-xs font-medium cursor-pointer hover:opacity-80 transition-all flex items-center space-x-1`,
  style: {
    ...customStyle,
    ...(isSelected ? {} : {})
  }
});
