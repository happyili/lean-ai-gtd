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
 * Info Resources API 专用函数
 */
export const infoResourcesApi = {
  /**
   * 获取信息资源列表
   */
  getList: async (params: Record<string, string | number | boolean> = {}, token?: string): Promise<Response> => {
    const url = buildUrl('/api/info-resources', params);
    return apiGet(url.replace(API_BASE_URL, ''), '获取信息资源列表', token);
  },

  /**
   * 获取单个信息资源
   */
  getById: async (id: number, token?: string): Promise<Response> => {
    return apiGet(`/api/info-resources/${id}`, '获取信息资源详情', token);
  },

  /**
   * 创建信息资源
   */
  create: async (data: any, token?: string): Promise<Response> => {
    return apiPost('/api/info-resources', data, '创建信息资源', token);
  },

  /**
   * 更新信息资源
   */
  update: async (id: number, data: any, token?: string): Promise<Response> => {
    return apiPut(`/api/info-resources/${id}`, data, '更新信息资源', token);
  },

  /**
   * 删除信息资源
   */
  delete: async (id: number, token?: string): Promise<Response> => {
    return apiDelete(`/api/info-resources/${id}`, '删除信息资源', token);
  },

  /**
   * 归档信息资源
   */
  archive: async (id: number, token?: string): Promise<Response> => {
    return apiPost(`/api/info-resources/${id}/archive`, {}, '归档信息资源', token);
  },

  /**
   * 恢复信息资源
   */
  restore: async (id: number, token?: string): Promise<Response> => {
    return apiPost(`/api/info-resources/${id}/restore`, {}, '恢复信息资源', token);
  }
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
  infoResourcesApi,
};