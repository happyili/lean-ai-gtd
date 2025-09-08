import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredPermission?: string;
  fallback?: React.ReactNode;
}

/**
 * 受保护的路由组件
 * 用于需要认证才能访问的页面
 * 
 * @param children - 需要保护的子组件
 * @param requiredRole - 需要的角色（可选）
 * @param requiredPermission - 需要的权限（可选）
 * @param fallback - 未认证时显示的备用组件（可选）
 */
export default function ProtectedRoute({ 
  children, 
  requiredRole, 
  requiredPermission,
  fallback
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // 如果正在加载认证状态，显示加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">正在验证身份...</span>
      </div>
    );
  }

  // 检查用户是否已认证
  if (!isAuthenticated) {
    // 如果有备用组件，显示备用组件
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // 否则重定向到登录页面，并保存当前路径以便登录后返回
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 检查角色权限（如果指定了requiredRole）
  if (requiredRole && user) {
    const hasRole = user.is_admin;
    if (!hasRole) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">🚫</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">权限不足</h2>
            <p className="text-gray-600">您没有访问此页面的权限</p>
            <button
              onClick={() => window.history.back()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回
            </button>
          </div>
        </div>
      );
    }
  }

  // 检查特定权限（如果指定了requiredPermission）
  if (requiredPermission && user) {
    // 这里可以根据实际需求添加权限检查逻辑
    // 例如：检查用户是否有特定的权限标识
    const hasPermission = checkUserPermission(user, requiredPermission);
    if (!hasPermission) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">🚫</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">权限不足</h2>
            <p className="text-gray-600">您没有执行此操作的权限</p>
            <button
              onClick={() => window.history.back()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回
            </button>
          </div>
        </div>
      );
    }
  }

  // 所有检查都通过，渲染子组件
  return <>{children}</>;
}

/**
 * 检查用户权限的辅助函数
 * 可以根据实际需求扩展此函数
 */
function checkUserPermission(user: any, _permission: string): boolean {
  // 管理员拥有所有权限
  if (user.is_admin) {
    return true;
  }

  // 这里可以添加更复杂的权限检查逻辑
  // 例如：检查用户的权限列表、角色权限等
  
  // 默认返回false（没有权限）
  return false;
}

/**
 * 用于公开页面的路由组件
 * 如果用户已认证，重定向到首页
 */
export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 如果用户已认证，重定向到首页或之前尝试访问的页面
  if (isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}

/**
 * 用于管理员页面的路由组件
 * 需要管理员权限才能访问
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="admin">
      {children}
    </ProtectedRoute>
  );
}