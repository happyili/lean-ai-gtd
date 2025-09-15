import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ProtectedRoute, { PublicRoute, AdminRoute } from '@/components/Auth/ProtectedRoute';
import AuthPage from '@/components/Auth/AuthPage';
import App from '@/app/page';

/**
 * 主应用路由配置
 * 统一管理所有路由和认证逻辑
 */
export default function AppRoutes() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
          {/* 公开路由 - 登录注册页面 */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <AuthPage />
              </PublicRoute>
            }
          />

          {/* 公开路由 - 主页（guest访问） */}
          <Route
            path="/"
            element={
              <App />
            }
          />

          {/* 受保护的路由 - 任务管理 */}
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          />

          {/* 受保护的路由 - 番茄时钟 */}
          <Route
            path="/pomodoro"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          />

          {/* 管理员路由 - 管理面板 */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">管理面板</h1>
                    <p className="text-gray-600">管理员功能开发中...</p>
                  </div>
                </div>
              </AdminRoute>
            }
          />

          {/* 用户资料页面 */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">用户资料</h1>
                    <p className="text-gray-600">用户资料功能开发中...</p>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          {/* 设置页面 */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">设置</h1>
                    <p className="text-gray-600">设置功能开发中...</p>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          {/* 404页面 */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-gray-400 text-4xl">❓</span>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">404</h1>
                  <p className="text-gray-600 mb-4">页面不存在</p>
                  <a
                    href="/"
                    className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    返回首页
                  </a>
                </div>
              </div>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
    </ThemeProvider>
  );
}