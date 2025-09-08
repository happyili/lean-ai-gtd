import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/Auth/LoginForm';
import RegisterForm from '@/components/Auth/RegisterForm';

/**
 * 认证页面组件
 * 包含登录和注册表单的切换
 */
export default function AuthPage() {
  const { isAuthenticated, isLoading } = useAuth();
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md mx-auto px-4">
        {/* Logo和品牌区域 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-xl font-bold">AI</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">AIGTD</h1>
              <p className="text-sm text-gray-600">智能任务管理系统</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {isLoginMode ? '登录您的账户' : '创建新账户'}
          </div>
        </div>

        {/* 主要认证区域 */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* 标签切换 */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={handleSwitchToLogin}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                isLoginMode
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              登录
            </button>
            <button
              onClick={handleSwitchToRegister}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                !isLoginMode
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              注册
            </button>
          </div>

          {/* 内容区域 */}
          <div className="p-8">
            {showForgotPassword ? (
              // 忘记密码表单
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-yellow-600 text-2xl">🔐</span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">重置密码</h2>
                  <p className="text-gray-600 text-sm">请输入您的邮箱地址，我们将发送重置密码的链接</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 mb-2">
                      邮箱地址
                    </label>
                    <input
                      type="email"
                      id="resetEmail"
                      className="form-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="请输入您的邮箱地址"
                    />
                  </div>

                  <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                    发送重置链接
                  </button>
                </div>

                <div className="text-center">
                  <button
                    onClick={() => setShowForgotPassword(false)}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
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
          <p className="text-xs text-gray-500">
            继续即表示您同意我们的
            <button className="text-blue-600 hover:text-blue-800 underline mx-1">
              服务条款
            </button>
            和
            <button className="text-blue-600 hover:text-blue-800 underline mx-1">
              隐私政策
            </button>
          </p>
        </div>

        {/* 演示账户提示 */}
        {isLoginMode && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800 text-center">
              <span className="font-medium">💡 提示：</span>
              使用测试账户登录：用户名 admin，密码 admin123
            </p>
          </div>
        )}
      </div>
    </div>
  );
}