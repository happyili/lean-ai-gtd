import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import LoginForm from '@/components/Auth/LoginForm';
import RegisterForm from '@/components/Auth/RegisterForm';

/**
 * 认证页面组件
 * 包含登录和注册表单的切换
 */
export default function AuthPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // 如果正在加载认证状态，显示加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">正在加载...</span>
      </div>
    );
  }

  // 如果用户已认证，重定向到首页或之前尝试访问的页面
  if (isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  // 切换到注册模式
  const handleSwitchToRegister = () => {
    setIsLoginMode(false);
    setShowForgotPassword(false);
  };

  // 切换到登录模式
  const handleSwitchToLogin = () => {
    setIsLoginMode(true);
    setShowForgotPassword(false);
  };

  // 显示忘记密码表单
  const handleForgotPassword = () => {
    setShowForgotPassword(true);
  };

  // 登录成功处理
  const handleLoginSuccess = () => {
    // 登录成功后，页面会自动重定向
    console.log('登录成功，正在重定向...');
  };

  // 注册成功处理
  const handleRegisterSuccess = () => {
    // 注册成功后自动切换到登录模式
    setIsLoginMode(true);
    setShowForgotPassword(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ 
      background: isDarkMode 
        ? 'linear-gradient(135deg, #242424 0%, #333333 25%, #242424 50%, #333333 75%, #242424 100%)'
        : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 25%, #ffffff 50%, #f1f5f9 75%, #ffffff 100%)',
      backgroundSize: '200% 200%',
      animation: 'gradientShift 8s ease-in-out infinite'
    }}>
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

          /* 白天模式样式变量 */
          .auth-page-light {
            --page-bg: linear-gradient(135deg, #ffffff 0%, #f8fafc 25%, #ffffff 50%, #f1f5f9 75%, #ffffff 100%);
            --card-bg: #ffffff;
            --card-border: #e2e8f0;
            --text-primary: #1e293b;
            --text-secondary: #475569;
            --text-muted: #64748b;
            --hover-bg: #f1f5f9;
            --border-color: #e2e8f0;
            --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            --brand-bg: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            --brand-text: #ffffff;
            --link-color: #3b82f6;
            --link-hover: #1d4ed8;
            --demo-bg: #dbeafe;
            --demo-border: #93c5fd;
            --demo-text: #1e40af;
          }

          /* 夜间模式样式变量 */
          .auth-page-dark {
            --page-bg: linear-gradient(135deg, #242424 0%, #333333 25%, #242424 50%, #333333 75%, #242424 100%);
            --card-bg: #333333;
            --card-border: #4b5563;
            --text-primary: #ffffff;
            --text-secondary: #d1d5db;
            --text-muted: #9ca3af;
            --hover-bg: #374151;
            --border-color: #4b5563;
            --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
            --brand-bg: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            --brand-text: #ffffff;
            --link-color: #60a5fa;
            --link-hover: #93c5fd;
            --demo-bg: #1e3a8a;
            --demo-border: #3b82f6;
            --demo-text: #dbeafe;
          }
        `}
      </style>
      
      <div className="w-full max-w-md mx-auto px-4">
        {/* Logo和品牌区域 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">

            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>AIGTD 智能任务系统</h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}></p>
            </div>
          </div>
        </div>

        {/* 主要认证区域 */}
        <div 
          className={`rounded-2xl shadow-xl overflow-hidden transition-all duration-300 ease-out ${
            isDarkMode ? 'auth-page-dark' : 'auth-page-light'
          }`}
          style={{ 
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow)',
            animation: 'fadeInScale 0.5s ease-out'
          }}
        >
          {/* 内容区域 */}
          <div className="p-8">
            {showForgotPassword ? (
              // 忘记密码表单
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: isDarkMode ? '#374151' : '#fef3c7' }}>
                    <span className="text-2xl" style={{ color: isDarkMode ? '#fbbf24' : '#d97706' }}>🔐</span>
                  </div>
                  <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>重置密码</h2>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>请输入您的邮箱地址，我们将发送重置密码的链接</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="resetEmail" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      邮箱地址
                    </label>
                    <input
                      type="email"
                      id="resetEmail"
                      className="w-full px-4 py-3 rounded-lg transition-colors"
                      style={{ 
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)'
                      }}
                      placeholder="请输入您的邮箱地址"
                    />
                  </div>

                  <button 
                    className="w-full font-semibold py-3 px-4 rounded-lg transition-colors"
                    style={{ 
                      backgroundColor: isDarkMode ? '#fbbf24' : '#d97706',
                      color: '#ffffff'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#f59e0b' : '#b45309';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#fbbf24' : '#d97706';
                    }}
                  >
                    发送重置链接
                  </button>
                </div>

                <div className="text-center">
                  <button
                    onClick={() => setShowForgotPassword(false)}
                    className="text-sm transition-colors"
                    style={{ color: 'var(--link-color)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--link-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--link-color)';
                    }}
                  >
                    返回登录
                  </button>
                </div>
              </div>
            ) : (
              // 登录或注册表单
              <>
                {isLoginMode ? (
                  <LoginForm
                    onSuccess={handleLoginSuccess}
                    onSwitchToRegister={handleSwitchToRegister}
                    onForgotPassword={handleForgotPassword}
                  />
                ) : (
                  <RegisterForm
                    onSuccess={handleRegisterSuccess}
                    onSwitchToLogin={handleSwitchToLogin}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* 底部信息 */}
        <div className="text-center mt-6">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            继续即表示您同意我们的
            <button 
              className="underline mx-1 transition-colors"
              style={{ color: 'var(--link-color)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--link-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--link-color)';
              }}
            >
              服务条款
            </button>
            和
            <button 
              className="underline mx-1 transition-colors"
              style={{ color: 'var(--link-color)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--link-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--link-color)';
              }}
            >
              隐私政策
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}