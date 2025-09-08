import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 用户菜单组件
 * 显示当前用户信息，提供用户相关操作
 */
export default function UserMenu() {
  const { user, logout, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 处理登出
  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
      // 登出后页面会自动重定向到登录页面
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  // 获取用户显示名称
  const getDisplayName = () => {
    if (!user) return '用户';
    
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.first_name) {
      return user.first_name;
    } else if (user.last_name) {
      return user.last_name;
    } else {
      return user.username;
    }
  };

  // 获取用户头像URL
  const getAvatarUrl = () => {
    if (user?.avatar_url) {
      return user.avatar_url;
    }
    // 如果没有头像，使用默认头像
    return undefined;
  };

  // 获取用户首字母（用于默认头像）
  const getInitials = () => {
    if (!user) return 'U';
    
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    } else if (user.first_name) {
      return user.first_name.charAt(0).toUpperCase();
    } else if (user.last_name) {
      return user.last_name.charAt(0).toUpperCase();
    } else {
      return user.username.charAt(0).toUpperCase();
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1">
        <div className="w-5 h-5 rounded-full bg-gray-300 animate-pulse"></div>
        <span className="text-sm text-gray-400">加载中...</span>
      </div>
    );
  }

  // Guest用户显示
  if (!isAuthenticated) {
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={() => navigate('/login')}
          className="px-3 py-1 text-xs font-medium transition-all rounded-md hover:btn-secondary border border-gray-300 hover:bg-gray-100"
          style={{ color: 'var(--text-secondary)' }}
        >
          登录
        </button>
        <button
          onClick={() => navigate('/login')}
          className="px-3 py-1 text-xs font-medium transition-all rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          注册
        </button>
      </div>
    );
  }

  // 已登录用户显示用户菜单
  if (!user) {
    return null; // 如果没有用户信息，不显示用户菜单
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 用户头像和名称按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1 text-xs font-medium transition-all rounded-md hover:opacity-80 active:scale-95"
        style={{ 
          color: 'var(--text-secondary)',
          backgroundColor: 'transparent',
          border: '1px solid transparent'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
          e.currentTarget.style.borderColor = 'var(--border-light)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.borderColor = 'transparent';
        }}
      >
        {/* 用户头像 */}
        {getAvatarUrl() ? (
          <img
            src={getAvatarUrl()}
            alt={getDisplayName()}
            className="w-5 h-5 rounded-full object-cover"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-xs font-medium">
              {getInitials()}
            </span>
          </div>
        )}
        
        {/* 用户名称 */}
        <span className="hidden sm:inline">
          {getDisplayName()}
        </span>
        
        {/* 下拉箭头 */}
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 card shadow-lg z-50" style={{ backgroundColor: 'var(--card-background)' }}>
          {/* 用户信息头部 */}
          <div className="p-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
            <div className="flex items-center space-x-3">
              {/* 大头像 */}
              {getAvatarUrl() ? (
                <img
                  src={getAvatarUrl()}
                  alt={getDisplayName()}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-lg font-medium">
                    {getInitials()}
                  </span>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {getDisplayName()}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {user.email}
                </div>
                {user.is_admin && (
                  <div className="text-xs text-blue-600 font-medium mt-1">
                    管理员
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 用户统计信息 */}
          <div className="p-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {user.created_at ? formatDate(user.created_at) : '-'}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  注册时间
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {user.last_login_at ? formatDate(user.last_login_at) : '-'}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  最后登录
                </div>
              </div>
            </div>
          </div>

          {/* 菜单选项 */}
          <div className="py-2">
            <button
              onClick={() => {
                navigate('/profile');
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm transition-all flex items-center space-x-3 hover:opacity-80 active:scale-95"
              style={{ 
                color: 'var(--text-secondary)',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span className="w-4 h-4 flex items-center justify-center">👤</span>
              <span>个人资料</span>
            </button>

            <button
              onClick={() => {
                navigate('/settings');
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm transition-all flex items-center space-x-3 hover:opacity-80 active:scale-95"
              style={{ 
                color: 'var(--text-secondary)',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span className="w-4 h-4 flex items-center justify-center">⚙️</span>
              <span>设置</span>
            </button>

            {user.is_admin && (
              <button
                onClick={() => {
                  navigate('/admin');
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm transition-all flex items-center space-x-3 hover:opacity-80 active:scale-95"
                style={{ 
                  color: 'var(--text-secondary)',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span className="w-4 h-4 flex items-center justify-center">🔧</span>
                <span>管理面板</span>
              </button>
            )}

            <hr className="my-2" style={{ borderColor: 'var(--border-light)' }} />

            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm transition-all flex items-center space-x-3 hover:opacity-80 active:scale-95"
              style={{ 
                color: 'var(--error)',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--error-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span className="w-4 h-4 flex items-center justify-center">🚪</span>
              <span>退出登录</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}