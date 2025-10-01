/**
 * 筛选选项缓存功能演示
 * 这个文件展示了如何使用筛选选项缓存功能
 */

import { 
  loadFilterOptions, 
  saveFilterOptions, 
  updateFilterOption, 
  clearFilterOptions,
  type FilterOptions 
} from './filterCache';

/**
 * 演示基本的缓存操作
 */
export function demonstrateBasicCaching() {
  console.log('=== 筛选选项缓存功能演示 ===\n');

  // 1. 加载初始选项（应该是默认值）
  console.log('1. 加载初始筛选选项:');
  const initialOptions = loadFilterOptions();
  console.log(JSON.stringify(initialOptions, null, 2));

  // 2. 更新一些选项
  console.log('\n2. 更新筛选选项:');
  updateFilterOption('searchQuery', '工作任务');
  updateFilterOption('selectedTaskType', 'work');
  updateFilterOption('statusFilter', 'in_progress');
  updateFilterOption('priorityFilter', 'high');
  updateFilterOption('showAllLevels', true);
  
  console.log('已更新: searchQuery -> "工作任务"');
  console.log('已更新: selectedTaskType -> "work"');
  console.log('已更新: statusFilter -> "in_progress"');
  console.log('已更新: priorityFilter -> "high"');
  console.log('已更新: showAllLevels -> true');

  // 3. 验证更新后的选项
  console.log('\n3. 验证更新后的筛选选项:');
  const updatedOptions = loadFilterOptions();
  console.log(JSON.stringify(updatedOptions, null, 2));

  // 4. 批量保存选项
  console.log('\n4. 批量保存新的筛选选项:');
  const newOptions: FilterOptions = {
    searchQuery: '生活琐事',
    statusFilter: 'pending',
    priorityFilter: 'low',
    selectedTaskType: 'life',
    showAllLevels: false,
    selectedTaskManagementMode: 'resources',
    infoResourceSearchQuery: '重要文档',
    infoResourceStatusFilter: 'active',
    infoResourceTypeFilter: 'document'
  };
  
  saveFilterOptions(newOptions);
  console.log('已保存新的筛选选项组合');

  // 5. 验证批量保存的结果
  console.log('\n5. 验证批量保存的结果:');
  const batchSavedOptions = loadFilterOptions();
  console.log(JSON.stringify(batchSavedOptions, null, 2));

  // 6. 清除缓存
  console.log('\n6. 清除筛选选项缓存:');
  clearFilterOptions();
  console.log('缓存已清除');

  // 7. 验证清除后的状态
  console.log('\n7. 验证清除后的筛选选项:');
  const clearedOptions = loadFilterOptions();
  console.log(JSON.stringify(clearedOptions, null, 2));

  console.log('\n=== 演示完成 ===');
}

/**
 * 演示实际使用场景
 */
export function demonstrateRealWorldUsage() {
  console.log('=== 实际使用场景演示 ===\n');

  // 模拟用户操作序列
  console.log('模拟用户操作序列:');
  
  // 用户搜索工作相关任务
  console.log('1. 用户搜索 "项目会议"');
  updateFilterOption('searchQuery', '项目会议');
  
  // 用户筛选工作类型的高优先级任务
  console.log('2. 用户选择工作类型和高优先级');
  updateFilterOption('selectedTaskType', 'work');
  updateFilterOption('priorityFilter', 'high');
  
  // 用户切换到信息资源模式
  console.log('3. 用户切换到信息资源模式');
  updateFilterOption('selectedTaskManagementMode', 'resources');
  
  // 用户在信息资源中搜索
  console.log('4. 用户在信息资源中搜索 "会议纪要"');
  updateFilterOption('infoResourceSearchQuery', '会议纪要');
  updateFilterOption('infoResourceTypeFilter', 'document');
  
  // 显示最终状态
  console.log('\n最终的筛选选项状态:');
  const finalOptions = loadFilterOptions();
  console.log(JSON.stringify(finalOptions, null, 2));
  
  console.log('\n现在用户刷新页面，这些选项将会被保持！');
  console.log('\n=== 实际使用场景演示完成 ===');
}

/**
 * 演示错误处理
 */
export function demonstrateErrorHandling() {
  console.log('=== 错误处理演示 ===\n');

  // 模拟localStorage错误
  const originalSetItem = localStorage.setItem;
  const originalGetItem = localStorage.getItem;

  try {
    // 模拟存储错误
    console.log('1. 模拟localStorage存储错误:');
    localStorage.setItem = () => {
      throw new Error('Storage quota exceeded');
    };

    // 尝试保存选项（应该不会崩溃）
    updateFilterOption('searchQuery', 'test');
    console.log('✅ 存储错误被正确处理，应用没有崩溃');

    // 模拟读取错误
    console.log('\n2. 模拟localStorage读取错误:');
    localStorage.getItem = () => {
      throw new Error('Storage access denied');
    };

    // 尝试加载选项（应该返回默认值）
    const options = loadFilterOptions();
    console.log('✅ 读取错误被正确处理，返回默认选项');
    console.log('默认选项:', JSON.stringify(options, null, 2));

  } finally {
    // 恢复原始方法
    localStorage.setItem = originalSetItem;
    localStorage.getItem = originalGetItem;
  }

  console.log('\n=== 错误处理演示完成 ===');
}

// 如果直接运行此文件，执行演示
if (typeof window !== 'undefined' && window.location) {
  // 在浏览器环境中，可以通过控制台调用这些函数
  (window as any).filterCacheDemo = {
    basic: demonstrateBasicCaching,
    realWorld: demonstrateRealWorldUsage,
    errorHandling: demonstrateErrorHandling
  };
  
  console.log('筛选选项缓存演示功能已加载！');
  console.log('在控制台中运行以下命令来查看演示:');
  console.log('- filterCacheDemo.basic() - 基本功能演示');
  console.log('- filterCacheDemo.realWorld() - 实际使用场景演示');
  console.log('- filterCacheDemo.errorHandling() - 错误处理演示');
}
