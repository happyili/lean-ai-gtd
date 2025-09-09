/**
 * 带认证的API工具类 - 自动处理token刷新
 */

import { apiFetch, handleApiError } from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';

/**
 * 带认证的API请求封装
 */
export const apiWithAuth = async (
  url: string,
  options: RequestInit = {},
  operation: string
): Promise<Response> => {
  const token = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!token) {
    throw new Error('用户未登录');
  }
  
  // 添加认证头
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
  };
  
  const requestOptions = {
    ...options,
    headers,
  };
  
  try {
    // 尝试原始请求
    const response = await apiFetch(url, requestOptions, operation);
    return response;
  } catch (error: any) {
    // 如果是401错误且还有refresh token，尝试刷新
    if (error.message.includes('401') && refreshToken) {
      console.log('Token可能已过期，尝试刷新...');
      
      try {
        // 刷新token
        const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          
          // 更新存储的token
          localStorage.setItem('accessToken', refreshData.access_token);
          
          // 使用新token重试原始请求
          const newHeaders = {
            ...options.headers,
            'Authorization': `Bearer ${refreshData.access_token}`,
          };
          
          const retryOptions = {
            ...options,
            headers: newHeaders,
          };
          
          return await apiFetch(url, retryOptions, operation);
        } else {
          // 刷新失败，清除token
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          throw new Error('Token刷新失败，请重新登录');
        }
      } catch (refreshError) {
        // 刷新失败，清除token
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        throw new Error('Token刷新失败，请重新登录');
      }
    }
    
    // 其他错误直接抛出
    throw error;
  }
};

/**
 * 带认证的GET请求
 */
export const apiGetWithAuth = async (url: string, operation: string): Promise<Response> => {
  return apiWithAuth(url, { method: 'GET' }, operation);
};

/**
 * 带认证的POST请求
 */
export const apiPostWithAuth = async (
  url: string, 
  data: any, 
  operation: string
): Promise<Response> => {
  return apiWithAuth(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }, operation);
};

/**
 * 带认证的PUT请求
 */
export const apiPutWithAuth = async (
  url: string, 
  data: any, 
  operation: string
): Promise<Response> => {
  return apiWithAuth(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }, operation);
};

/**
 * 带认证的DELETE请求
 */
export const apiDeleteWithAuth = async (url: string, operation: string): Promise<Response> => {
  return apiWithAuth(url, { method: 'DELETE' }, operation);
};
