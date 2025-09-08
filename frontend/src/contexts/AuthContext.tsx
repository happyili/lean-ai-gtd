import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiGet, apiPost, apiDelete } from '@/utils/api';

// 用户数据接口
interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  is_active: boolean;
  is_verified: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

// 认证状态接口
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// 认证上下文接口
interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  checkUsername: (username: string) => Promise<boolean>;
  checkEmail: (email: string) => Promise<boolean>;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 认证提供者组件
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
    isLoading: true,
    isAuthenticated: false,
  });

  // 初始化认证状态
  useEffect(() => {
    initializeAuth();
  }, []);

  // 初始化认证
  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        // 验证Token有效性
        const isValid = await verifyToken(token);
        if (isValid) {
          // 获取用户信息
          const user = await fetchUserInfo();
          setAuthState(prev => ({
            ...prev,
            user,
            isAuthenticated: true,
            isLoading: false,
          }));
        } else {
          // Token无效，尝试刷新
          await refreshAccessToken();
        }
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('初始化认证失败:', error);
      // 清除无效Token
      clearTokens();
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
      }));
    }
  };

  // 验证Token
  const verifyToken = async (token: string): Promise<boolean> => {
    try {
      // 简单的Token验证 - 检查是否过期
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // 转换为毫秒
      return Date.now() < exp;
    } catch (error) {
      return false;
    }
  };

  // 获取用户信息
  const fetchUserInfo = async (): Promise<User> => {
    const response = await apiGet('/api/auth/user', '获取用户信息');
    const data = await response.json();
    return data.user;
  };

  // 登录
  const login = async (username: string, password: string): Promise<void> => {
    try {
      const response = await apiPost(
        '/api/auth/login',
        { username, password },
        '用户登录'
      );
      
      const data = await response.json();
      
      // 存储Token
      localStorage.setItem('accessToken', data.access_token);
      localStorage.setItem('refreshToken', data.refresh_token);
      
      // 更新状态
      setAuthState({
        user: data.user,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        isLoading: false,
        isAuthenticated: true,
      });
      
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  };

  // 注册
  const register = async (
    username: string,
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<void> => {
    try {
      const response = await apiPost(
        '/api/auth/register',
        { 
          username, 
          email, 
          password,
          first_name: firstName,
          last_name: lastName
        },
        '用户注册'
      );
      
      const data = await response.json();
      
      // 自动登录
      await login(username, password);
      
    } catch (error) {
      console.error('注册失败:', error);
      throw error;
    }
  };

  // 登出
  const logout = async (): Promise<void> => {
    try {
      if (authState.refreshToken) {
        await apiPost(
          '/api/auth/logout',
          {},
          '用户登出',
          authState.accessToken
        );
      }
    } catch (error) {
      console.error('登出失败:', error);
    } finally {
      clearTokens();
      setAuthState({
        user: null,
        accessToken: null,
        refreshToken: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  // 刷新访问Token
  const refreshAccessToken = async (): Promise<void> => {
    try {
      if (!authState.refreshToken) {
        throw new Error('没有刷新Token');
      }

      const response = await apiPost(
        '/api/auth/refresh',
        { refresh_token: authState.refreshToken },
        '刷新Token'
      );
      
      const data = await response.json();
      
      // 更新Token
      localStorage.setItem('accessToken', data.access_token);
      
      setAuthState(prev => ({
        ...prev,
        accessToken: data.access_token,
      }));
      
    } catch (error) {
      console.error('刷新Token失败:', error);
      // 刷新失败，需要重新登录
      clearTokens();
      setAuthState({
        user: null,
        accessToken: null,
        refreshToken: null,
        isLoading: false,
        isAuthenticated: false,
      });
      throw error;
    }
  };

  // 更新用户信息
  const updateUser = async (userData: Partial<User>): Promise<void> => {
    try {
      if (!authState.accessToken) {
        throw new Error('没有访问Token');
      }

      const response = await apiPost(
        '/api/auth/user',
        userData,
        '更新用户信息',
        authState.accessToken
      );
      
      const data = await response.json();
      
      setAuthState(prev => ({
        ...prev,
        user: data.user,
      }));
      
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  };

  // 修改密码
  const changePassword = async (oldPassword: string, newPassword: string): Promise<void> => {
    try {
      if (!authState.accessToken) {
        throw new Error('没有访问Token');
      }

      await apiPost(
        '/api/auth/change-password',
        { old_password: oldPassword, new_password: newPassword },
        '修改密码',
        authState.accessToken
      );
      
    } catch (error) {
      console.error('修改密码失败:', error);
      throw error;
    }
  };

  // 检查用户名是否可用
  const checkUsername = async (username: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/check-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });
      
      const data = await response.json();
      return data.available;
      
    } catch (error) {
      console.error('检查用户名失败:', error);
      return false;
    }
  };

  // 检查邮箱是否可用
  const checkEmail = async (email: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      return data.available;
      
    } catch (error) {
      console.error('检查邮箱失败:', error);
      return false;
    }
  };

  // 清除Token
  const clearTokens = (): void => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    refreshAccessToken,
    updateUser,
    changePassword,
    checkUsername,
    checkEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// 自定义Hook使用认证上下文
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth必须在AuthProvider内部使用');
  }
  return context;
};

// 导出类型
export type { User, AuthContextType };// AuthContext improvements
