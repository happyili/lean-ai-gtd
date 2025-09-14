import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { exportTasksToExcel, importTasksFromExcel } from '@/utils/exportTasks';

/**
 * 用户菜单组件
 * 显示当前用户信息，提供用户相关操作
 */
export default function UserMenu() {
  const { user, logout, isLoading, isAuthenticated, accessToken } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // 处理导入任务
  const handleImportTasks = () => {
    setIsOpen(false);
    fileInputRef.current?.click();
  };

  // 处理文件选择
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('请选择Excel文件（.xlsx或.xls格式）');
      return;
    }

    setIsImporting(true);

    try {
      const result = await importTasksFromExcel(file, accessToken || undefined);
      
      // 构建结果消息
      let message = `导入完成！\n`;
      message += `成功导入: ${result.success} 个任务\n`;
      message += `跳过重复: ${result.skipped} 个任务\n`;
      
      if (result.errors.length > 0) {
        message += `导入失败: ${result.errors.length} 个任务\n\n`;
        message += '错误详情:\n' + result.errors.slice(0, 5).join('\n');
        if (result.errors.length > 5) {
          message += `\n... 还有 ${result.errors.length - 5} 个错误`;
        }
      }

      // 显示详情（可选）
      if (result.details.length > 0) {
        const showDetails = confirm(message + '\n\n是否查看详细导入信息？');
        if (showDetails) {
          const detailMessage = '导入详情:\n' + result.details.slice(0, 20).join('\n');
          if (result.details.length > 20) {
            alert(detailMessage + `\n... 还有 ${result.details.length - 20} 条记录`);
          } else {
            alert(detailMessage);
          }
        }
      } else {
        alert(message);
      }

      // 刷新页面以显示新导入的任务
      if (result.success > 0) {
        window.location.reload();
      }

    } catch (error) {
      console.error('导入任务失败:', error);
      alert(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsImporting(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 处理导出任务
  const handleExportTasks = async () => {
    setIsExporting(true);
    setIsOpen(false);
    
    try {
      await exportTasksToExcel(accessToken || undefined);
      // 这里可以添加成功通知，但由于没有通知系统，暂时用console.log
      console.log('任务导出成功！');
    } catch (error) {
      console.error('导出任务失败:', error);
      // 这里可以添加错误通知
      alert(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsExporting(false);
    }
  };

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
      <style>
        {`
          @keyframes gradientShift {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }
          
          @keyframes fadeInScale {
            0% {
              opacity: 0;
              transform: scale(0.9) translateY(-10px);
              filter: blur(2px);
            }
            20% {
              opacity: 0.8;
              transform: scale(0.95) translateY(-5px);
              filter: blur(1px);
            }
            100% {
              opacity: 1;
              transform: scale(1) translateY(0px);
              filter: blur(0px);
            }
          }
          
          @keyframes fadeOutScale {
            0% {
              opacity: 1;
              transform: scale(1) translateY(0px);
              filter: blur(0px);
            }
            100% {
              opacity: 0;
              transform: scale(0.9) translateY(-10px);
              filter: blur(2px);
            }
          }
        `}
      </style>
      {/* 永久挂载的隐藏文件输入，用于导入任务，避免下拉关闭时卸载导致 onChange 丢失 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      {/* 用户头像和名称按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-xs font-medium transition-all rounded-md hover:opacity-80 active:scale-95"
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
        <div 
          className={`absolute right-0 w-64 shadow-xl rounded-xl z-50 overflow-hidden transition-all duration-200 ease-out ${
            isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-85 -translate-y-2 pointer-events-none'
          }`}
          style={{ 
            background: 'linear-gradient(135deg, #242424 0%, #333333 25%, #242424 50%, #333333 75%, #242424 100%)',
            backgroundSize: '200% 200%',
            animation: isOpen ? 'gradientShift 3s ease-in-out infinite, fadeInScale 0.3s ease-out' : 'none',
            border: '1px solid #333333'
          }}
        >
            {/* 用户信息头部 */}
            <div className="p-3" style={{ backgroundColor: 'rgb(36, 36, 36)' }}>
              <div className="flex items-center space-x-3">
                {/* 大头像 */}
                {getAvatarUrl() ? (
                  <img
                    src={getAvatarUrl()}
                    alt={getDisplayName()}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 flex items-center justify-center">
                    <span className="text-white text-lg font-medium">
                      {getInitials()}
                    </span>
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate text-white">
                    {getDisplayName()}
                  </div>
                  <div className="text-xs truncate text-gray-300">
                    {user.email}
                  </div>
                  {user.is_admin && (
                    <div className="text-xs text-purple-400 font-medium mt-1">
                      管理员
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 用户统计信息 */}
            <div className="p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#333333' }}>
                  <div className="text-lg font-semibold text-white">
                    {user.created_at ? formatDate(user.created_at) : '-'}
                  </div>
                  <div className="text-xs text-gray-200">
                    注册时间
                  </div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#333333' }}>
                  <div className="text-lg font-semibold text-white">
                    {user.last_login_at ? formatDate(user.last_login_at) : '-'}
                  </div>
                  <div className="text-xs text-gray-200">
                    最后登录
                  </div>
                </div>
              </div>
            </div>

          {/* 菜单选项 */}
          <div className="py-1">
            <button
              onClick={() => {
                navigate('/profile');
                setIsOpen(false);
              }}
              className="w-full text-left px-2 py-2 text-sm transition-all flex items-center space-x-3 rounded-lg mx-2"
              style={{ 
                color: '#d1d5db',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span className="w-5 h-5 flex items-center justify-center text-gray-400">👤</span>
              <span>个人资料</span>
            </button>

            <button
              onClick={handleExportTasks}
              disabled={isExporting}
              className="w-full text-left px-2 py-2 text-sm transition-all flex items-center space-x-3 disabled:opacity-50 rounded-lg mx-2"
              style={{ 
                color: isExporting ? '#6b7280' : '#d1d5db',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                if (!isExporting) {
                  e.currentTarget.style.backgroundColor = '#374151';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span className="w-5 h-5 flex items-center justify-center text-gray-400">
                {isExporting ? '⏳' : '📊'}
              </span>
              <span>{isExporting ? '导出中...' : '导出任务'}</span>
            </button>

            <button
              onClick={handleImportTasks}
              disabled={isImporting}
              className="w-full text-left px-2 py-2 text-sm transition-all flex items-center space-x-3 disabled:opacity-50 rounded-lg mx-2"
              style={{ 
                color: isImporting ? '#6b7280' : '#d1d5db',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                if (!isImporting) {
                  e.currentTarget.style.backgroundColor = '#374151';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span className="w-5 h-5 flex items-center justify-center text-gray-400">
                {isImporting ? '⏳' : '📥'}
              </span>
              <span>{isImporting ? '导入中...' : '导入任务'}</span>
            </button>

            <button
              onClick={() => {
                navigate('/settings');
                setIsOpen(false);
              }}
              className="w-full text-left px-2 py-2 text-sm transition-all flex items-center space-x-3 rounded-lg mx-2"
              style={{ 
                color: '#d1d5db',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span className="w-5 h-5 flex items-center justify-center text-gray-400">⚙️</span>
              <span>设置</span>
            </button>

            {user.is_admin && (
              <button
                onClick={() => {
                  navigate('/admin');
                  setIsOpen(false);
                }}
                className="w-full text-left px-2 py-2 text-sm transition-all flex items-center space-x-3 rounded-lg mx-2"
                style={{ 
                  color: '#d1d5db',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span className="w-5 h-5 flex items-center justify-center text-gray-400">🔧</span>
                <span>管理面板</span>
              </button>
            )}

            <div className="border-t border-gray-700 my-1"></div>

            <button
              onClick={handleLogout}
              className="w-full text-left px-2 py-2 text-sm transition-all flex items-center space-x-3 rounded-lg mx-2"
              style={{ 
                color: '#ef4444',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span className="w-5 h-5 flex items-center justify-center text-red-400">🚪</span>
              <span>退出登录</span>
            </button>
          </div>
        </div>
    </div>
  );
}
