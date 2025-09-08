import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export default function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const { register, checkUsername, checkEmail } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    agreeToTerms: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
    
    // 清除对应字段的验证错误
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // 实时验证
  const validateField = async (field: string, value: string) => {
    const errors: Record<string, string> = {};
    
    switch (field) {
      case 'username':
        if (value.length < 3) {
          errors.username = '用户名至少需要3个字符';
        } else if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
          errors.username = '用户名只能包含字母、数字、下划线和连字符';
        } else {
          const isAvailable = await checkUsername(value);
          if (!isAvailable) {
            errors.username = '用户名已被使用';
          }
        }
        break;
        
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.email = '请输入有效的邮箱地址';
        } else {
          const isAvailable = await checkEmail(value);
          if (!isAvailable) {
            errors.email = '邮箱已被注册';
          }
        }
        break;
        
      case 'password':
        if (value.length < 8) {
          errors.password = '密码至少需要8个字符';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|])/.test(value)) {
          errors.password = '密码必须包含大小写字母、数字和特殊字符';
        }
        break;
        
      case 'confirmPassword':
        if (value !== formData.password) {
          errors.confirmPassword = '两次输入的密码不一致';
        }
        break;
    }
    
    setValidationErrors(prev => ({ ...prev, ...errors }));
  };

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value.trim()) {
      await validateField(name, value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 验证所有字段
    const errors: Record<string, string> = {};
    
    if (!formData.username.trim()) {
      errors.username = '请输入用户名';
    }
    if (!formData.email.trim()) {
      errors.email = '请输入邮箱';
    }
    if (!formData.password) {
      errors.password = '请输入密码';
    }
    if (!formData.confirmPassword) {
      errors.confirmPassword = '请确认密码';
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致';
    }
    if (!formData.agreeToTerms) {
      errors.agreeToTerms = '请同意服务条款';
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      await register(
        formData.username,
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName
      );
      
      onSuccess?.();
      
    } catch (err: any) {
      setError(err.message || '注册失败，请检查输入信息');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|]/.test(password)) strength++;
    
    const labels = ['很弱', '弱', '一般', '强', '很强'];
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600'];
    
    return { strength, label: labels[strength], color: colors[strength] };
  };

  const strength = passwordStrength(formData.password);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="card p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">📝</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">创建账户</h2>
          <p className="text-gray-600">加入AIGTD，开始您的任务管理之旅</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-red-500 mr-2">⚠️</span>
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                名字
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="您的名字"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                姓氏
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="form-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="您的姓氏"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                用户名 *
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`form-input w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  validationErrors.username ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="请输入用户名"
                required
                disabled={isLoading}
              />
              {validationErrors.username && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.username}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">3-20个字符，只能包含字母、数字、下划线和连字符</p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                邮箱地址 *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`form-input w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  validationErrors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="请输入邮箱地址"
                required
                disabled={isLoading}
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                密码 *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`form-input w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    validationErrors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="请输入密码"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
              )}
              
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className={`w-16 h-2 rounded ${strength.color}`}></div>
                    <span className="text-xs text-gray-600">密码强度: {strength.label}</span>
                  </div>
                </div>
              )}
              
              <p className="mt-1 text-xs text-gray-500">
                至少8个字符，包含大小写字母、数字和特殊字符
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                确认密码 *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`form-input w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="请再次输入密码"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="agreeToTerms"
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              required
              disabled={isLoading}
            />
            <label htmlFor="agreeToTerms" className="ml-2 text-sm text-gray-600">
              我已阅读并同意
              <button type="button" className="text-blue-600 hover:text-blue-800 underline ml-1">
                服务条款
              </button>
              和
              <button type="button" className="text-blue-600 hover:text-blue-800 underline ml-1">
                隐私政策
              </button>
            </label>
          </div>
          {validationErrors.agreeToTerms && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.agreeToTerms}</p>
          )}

          <button
            type="submit"
            disabled={isLoading || Object.keys(validationErrors).length > 0}
            className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                注册中...
              </>
            ) : (
              '创建账户'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            已有账户？{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
              disabled={isLoading}
            >
              立即登录
            </button>
          </p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            注册即表示您同意我们的服务条款和隐私政策
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterForm;// RegisterForm component features
