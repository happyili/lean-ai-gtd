/**
 * API 工具类 - 统一的错误处理和HTTP请求管理
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';

/**
 * API错误类型
 */
export interface ApiError {
  error: string;
  error_code: string;
  details?: string;
  traceback?: string;
  suggestion?: string;
}

/**
 * 统一的API错误处理函数
 */
export const handleApiError = async (
  response: Response, 
  operation: string
): Promise<Response> => {
  if (!response.ok) {
    let errorData: ApiError;
    
    try {
      errorData = await response.json() as ApiError;
    } catch {
      errorData = { 
        error: '未知错误', 
        error_code: 'UNKNOWN_ERROR',
        details: '无法解析错误响应'
      };
    }
    
    console.error(`${operation} API Error:`, errorData);
    
    const errorMessage = errorData.error || `${operation}失败`;
    const errorCode = errorData.error_code || 'UNKNOWN_ERROR';
    const details = errorData.details || '';
    
    // 特殊处理数据库错误
    if (errorCode === 'DATABASE_ERROR' || 
        errorMessage.includes('no such column') || 
        errorMessage.includes('sqlite3.OperationalError') ||
        errorMessage.includes('OperationalError')) {
      throw new Error(`数据库错误: ${errorMessage}。${details ? `详情: ${details}` : ''}`);
    } else {
      throw new Error(`${operation}失败: ${errorMessage}`);
    }
  }
  
  return response;
};

/**
 * 封装的fetch函数，自动处理错误
 */
export const apiFetch = async (
  url: string,
  options: RequestInit = {},
  operation: string
): Promise<Response> => {
  const response = await fetch(`${API_BASE_URL}${url}`, options);
  return handleApiError(response, operation);
};

/**
 * GET请求封装
 */
export const apiGet = async (url: string, operation: string, token?: string): Promise<Response> => {
  const headers: HeadersInit = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return apiFetch(url, { method: 'GET', headers }, operation);
};

/**
 * POST请求封装
 */
export const apiPost = async (
  url: string, 
  data: any, 
  operation: string,
  token?: string
): Promise<Response> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return apiFetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  }, operation);
};

/**
 * PUT请求封装
 */
export const apiPut = async (
  url: string, 
  data: any, 
  operation: string,
  token?: string
): Promise<Response> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return apiFetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  }, operation);
};

/**
 * DELETE请求封装
 */
export const apiDelete = async (url: string, operation: string, token?: string): Promise<Response> => {
  const headers: HeadersInit = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return apiFetch(url, { method: 'DELETE', headers }, operation);
};

/**
 * 生成带查询参数的URL
 */
export const buildUrl = (baseUrl: string, params: Record<string, string | number | boolean>): string => {
  const url = new URL(`${API_BASE_URL}${baseUrl}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, String(value));
    }
  });
  return url.toString();
};

/**
 * API响应数据类型
 */
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  error_code?: string;
  message?: string;
  [key: string]: any;
}

/**
 * 分页响应数据类型
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  records: T[];
  total: number;
  page: number;
  pages: number;
  per_page: number;
}

/**
 * 不需要认证的POST请求封装（用于guest用户）
 */
export const apiPostPublic = async (
  url: string, 
  data: any, 
  operation: string
): Promise<Response> => {
  return apiFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }, operation);
};

/**
 * 不需要认证的PUT请求封装（用于guest用户）
 */
export const apiPutPublic = async (
  url: string, 
  data: any, 
  operation: string
): Promise<Response> => {
  return apiFetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }, operation);
};

/**
 * 不需要认证的DELETE请求封装（用于guest用户）
 */
export const apiDeletePublic = async (url: string, operation: string): Promise<Response> => {
  return apiFetch(url, { method: 'DELETE' }, operation);
};

/**
 * 更新番茄任务
 */
export const updatePomodoroTask = async (
  taskId: number,
  data: { 
    title?: string; 
    description?: string; 
    priority_score?: number; 
    estimated_pomodoros?: number; 
    ai_reasoning?: string 
  },
  token?: string
): Promise<any> => {
  const response = await apiPut(`/api/pomodoro/tasks/${taskId}`, data, '更新番茄任务', token);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || '更新番茄任务失败');
  }
  
  return result.data;
};


export default {
  handleApiError,
  apiFetch,
  apiGet,
  apiPost,
  apiPostPublic,
  apiPut,
  apiPutPublic,
  apiDelete,
  apiDeletePublic,
  buildUrl,
};