/**
 * 筛选选项缓存功能测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  loadFilterOptions, 
  saveFilterOptions, 
  updateFilterOption, 
  clearFilterOptions,
  defaultFilterOptions,
  type FilterOptions 
} from '../utils/filterCache';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('FilterCache', () => {
  beforeEach(() => {
    // 清空localStorage
    localStorageMock.clear();
  });

  it('should return default options when no cache exists', () => {
    const options = loadFilterOptions();
    expect(options).toEqual(defaultFilterOptions);
  });

  it('should save and load filter options correctly', () => {
    const testOptions: FilterOptions = {
      searchQuery: 'test search',
      statusFilter: 'pending',
      priorityFilter: 'high',
      selectedTaskType: 'work',
      showAllLevels: true,
      selectedTaskManagementMode: 'resources',
      infoResourceSearchQuery: 'info search',
      infoResourceStatusFilter: 'active',
      infoResourceTypeFilter: 'document'
    };

    saveFilterOptions(testOptions);
    const loadedOptions = loadFilterOptions();
    
    expect(loadedOptions).toEqual(testOptions);
  });

  it('should update specific filter option', () => {
    // 先保存一些初始选项
    const initialOptions: FilterOptions = {
      ...defaultFilterOptions,
      selectedTaskType: 'life'
    };
    saveFilterOptions(initialOptions);

    // 更新特定选项
    updateFilterOption('selectedTaskType', 'work');
    updateFilterOption('statusFilter', 'in_progress');

    const updatedOptions = loadFilterOptions();
    expect(updatedOptions.selectedTaskType).toBe('work');
    expect(updatedOptions.statusFilter).toBe('in_progress');
    // 其他选项应该保持不变
    expect(updatedOptions.priorityFilter).toBe(defaultFilterOptions.priorityFilter);
  });

  it('should clear filter options cache', () => {
    const testOptions: FilterOptions = {
      ...defaultFilterOptions,
      selectedTaskType: 'work',
      statusFilter: 'pending'
    };

    saveFilterOptions(testOptions);
    clearFilterOptions();
    
    const loadedOptions = loadFilterOptions();
    expect(loadedOptions).toEqual(defaultFilterOptions);
  });

  it('should handle corrupted cache gracefully', () => {
    // 模拟损坏的缓存数据
    localStorageMock.setItem('aigtd_filter_options', 'invalid json');
    
    const options = loadFilterOptions();
    expect(options).toEqual(defaultFilterOptions);
  });

  it('should merge cached options with default options for backward compatibility', () => {
    // 模拟旧版本的缓存数据（缺少新字段）
    const oldCacheData = {
      searchQuery: 'old search',
      statusFilter: 'pending',
      selectedTaskType: 'work'
      // 缺少新增的字段
    };
    
    localStorageMock.setItem('aigtd_filter_options', JSON.stringify(oldCacheData));
    
    const loadedOptions = loadFilterOptions();
    
    // 应该包含旧的数据
    expect(loadedOptions.searchQuery).toBe('old search');
    expect(loadedOptions.statusFilter).toBe('pending');
    expect(loadedOptions.selectedTaskType).toBe('work');
    
    // 应该包含新字段的默认值
    expect(loadedOptions.showAllLevels).toBe(defaultFilterOptions.showAllLevels);
    expect(loadedOptions.selectedTaskManagementMode).toBe(defaultFilterOptions.selectedTaskManagementMode);
    expect(loadedOptions.infoResourceSearchQuery).toBe(defaultFilterOptions.infoResourceSearchQuery);
  });

  it('should handle localStorage errors gracefully', () => {
    // 模拟localStorage错误
    const originalSetItem = localStorageMock.setItem;
    localStorageMock.setItem = () => {
      throw new Error('Storage quota exceeded');
    };

    // 应该不会抛出错误
    expect(() => {
      saveFilterOptions(defaultFilterOptions);
    }).not.toThrow();

    expect(() => {
      updateFilterOption('selectedTaskType', 'work');
    }).not.toThrow();

    // 恢复原始方法
    localStorageMock.setItem = originalSetItem;
  });
});
