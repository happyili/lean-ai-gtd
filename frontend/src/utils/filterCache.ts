/**
 * 筛选选项缓存工具
 * 用于在浏览器本地存储中保存和恢复用户的搜索和筛选选项
 */

// 筛选选项接口
export interface FilterOptions {
  searchQuery: string;
  statusFilter: string;
  priorityFilter: string;
  selectedTaskType: string;
  showAllLevels: boolean;
  selectedTaskManagementMode: 'tasks' | 'resources' | 'reminders' | 'ai-pomodoro';
  // 信息资源筛选选项
  infoResourceSearchQuery: string;
  infoResourceStatusFilter: string;
  infoResourceTypeFilter: string;
}

// 默认筛选选项
export const defaultFilterOptions: FilterOptions = {
  searchQuery: '',
  statusFilter: 'all',
  priorityFilter: 'all',
  selectedTaskType: 'all',
  showAllLevels: false,
  selectedTaskManagementMode: 'tasks',
  infoResourceSearchQuery: '',
  infoResourceStatusFilter: 'all',
  infoResourceTypeFilter: 'all',
};

// 本地存储键名
const FILTER_CACHE_KEY = 'aigtd_filter_options';

/**
 * 从本地存储加载筛选选项
 */
export function loadFilterOptions(): FilterOptions {
  try {
    const cached = localStorage.getItem(FILTER_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      // 合并默认选项和缓存选项，确保新增的选项有默认值
      return { ...defaultFilterOptions, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load filter options from cache:', error);
  }
  return defaultFilterOptions;
}

/**
 * 保存筛选选项到本地存储
 */
export function saveFilterOptions(options: FilterOptions): void {
  try {
    localStorage.setItem(FILTER_CACHE_KEY, JSON.stringify(options));
  } catch (error) {
    console.warn('Failed to save filter options to cache:', error);
  }
}

/**
 * 清除筛选选项缓存
 */
export function clearFilterOptions(): void {
  try {
    localStorage.removeItem(FILTER_CACHE_KEY);
  } catch (error) {
    console.warn('Failed to clear filter options cache:', error);
  }
}

/**
 * 更新特定的筛选选项
 */
export function updateFilterOption<K extends keyof FilterOptions>(
  key: K,
  value: FilterOptions[K]
): void {
  const currentOptions = loadFilterOptions();
  const updatedOptions = { ...currentOptions, [key]: value };
  saveFilterOptions(updatedOptions);
}
