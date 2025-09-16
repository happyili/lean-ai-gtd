import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export default function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const { register } = useAuth();
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
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

    if (!formData.username.trim() || !formData.email.trim() || !formData.password) {
      setError('请填写所有字段');
      return;
    }

    setIsLoading(true);

    try {
      await register(
        formData.username,
        formData.email,
        formData.password
      );
      
      onSuccess?.();
      
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>注册</h2>
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
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded transition-colors"
            style={{ 
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)'
            }}
            placeholder="邮箱"
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
            backgroundColor: isDarkMode ? '#059669' : '#10b981',
            color: '#ffffff'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#047857' : '#059669';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#059669' : '#10b981';
            }
          }}
        >
          {isLoading ? '注册中...' : '注册'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          onClick={onSwitchToLogin}
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
          已有账户？登录
        </button>
      </div>
    </div>
  );
}