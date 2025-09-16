import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  onForgotPassword?: () => void;
}

export default function LoginForm({ onSuccess, onSwitchToRegister, onForgotPassword }: LoginFormProps) {
  // 暂时忽略未使用的参数
  void onForgotPassword;
  const { login } = useAuth();
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.username.trim() || !formData.password) {
      setError('请填写用户名和密码');
      return;
    }

    setIsLoading(true);

    try {
      await login(formData.username, formData.password);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>登录</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div 
            className="border rounded p-3 text-sm"
            style={{ 
              backgroundColor: isDarkMode ? '#7f1d1d' : '#fef2f2',
              borderColor: isDarkMode ? '#991b1b' : '#fecaca',
              color: isDarkMode ? '#fca5a5' : '#dc2626'
            }}
          >
            {error}
          </div>
        )}

        <div>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded transition-colors"
            style={{ 
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)'
            }}
            placeholder="用户名"
            disabled={isLoading}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--link-color)';
              e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-color)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded transition-colors"
            style={{ 
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)'
            }}
            placeholder="密码"
            disabled={isLoading}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--link-color)';
              e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-color)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
          style={{ 
            backgroundColor: 'var(--link-color)',
            color: '#ffffff'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = 'var(--link-hover)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = 'var(--link-color)';
            }
          }}
        >
          {isLoading ? '登录中...' : '登录'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          onClick={onSwitchToRegister}
          className="text-sm transition-colors"
          style={{ color: 'var(--link-color)' }}
          disabled={isLoading}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.color = 'var(--link-hover)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.color = 'var(--link-color)';
            }
          }}
        >
          注册新账户
        </button>
      </div>
    </div>
  );
}