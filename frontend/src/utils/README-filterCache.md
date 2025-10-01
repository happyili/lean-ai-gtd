# 筛选选项缓存功能

## 功能概述

筛选选项缓存功能允许用户的搜索和筛选设置在浏览器中持久化保存。当用户下次打开应用时，之前的筛选选项会自动恢复，提供更好的用户体验。

## 功能特性

- ✅ **自动保存**: 用户更改筛选选项时自动保存到浏览器本地存储
- ✅ **自动恢复**: 应用启动时自动从本地存储恢复之前的筛选选项
- ✅ **全面覆盖**: 支持所有筛选选项，包括：
  - 搜索查询
  - 任务状态筛选
  - 优先级筛选
  - 任务类型筛选
  - 显示层级设置
  - 任务管理模式
  - 信息资源筛选选项
- ✅ **错误处理**: 优雅处理localStorage错误和数据损坏
- ✅ **向后兼容**: 支持旧版本缓存数据的迁移
- ✅ **类型安全**: 完整的TypeScript类型支持

## 技术实现

### 核心文件

- `filterCache.ts` - 核心缓存逻辑
- `filterCacheDemo.ts` - 演示和测试功能
- `filterCache.test.ts` - 单元测试

### 数据结构

```typescript
interface FilterOptions {
  searchQuery: string;
  statusFilter: string;
  priorityFilter: string;
  selectedTaskType: string;
  showAllLevels: boolean;
  selectedTaskManagementMode: 'tasks' | 'resources' | 'reminders' | 'ai-pomodoro';
  infoResourceSearchQuery: string;
  infoResourceStatusFilter: string;
  infoResourceTypeFilter: string;
}
```

### 存储机制

- **存储位置**: `localStorage`
- **存储键**: `aigtd_filter_options`
- **数据格式**: JSON序列化的FilterOptions对象
- **容错机制**: 自动回退到默认值

## 使用方法

### 基本用法

```typescript
import { loadFilterOptions, updateFilterOption } from '@/utils/filterCache';

// 加载筛选选项
const options = loadFilterOptions();

// 更新单个选项
updateFilterOption('selectedTaskType', 'work');

// 批量保存选项
saveFilterOptions({
  searchQuery: '工作任务',
  selectedTaskType: 'work',
  statusFilter: 'in_progress',
  // ... 其他选项
});
```

### 在React组件中使用

```typescript
export default function MyComponent() {
  // 从缓存初始化状态
  const cachedOptions = loadFilterOptions();
  const [selectedTaskType, setSelectedTaskType] = useState(cachedOptions.selectedTaskType);

  // 更新状态时同时保存到缓存
  const handleTaskTypeChange = (newType: string) => {
    setSelectedTaskType(newType);
    updateFilterOption('selectedTaskType', newType);
  };

  // ...
}
```

## 开发和调试

### 开发环境演示

在开发环境中，可以在浏览器控制台中使用演示功能：

```javascript
// 基本功能演示
filterCacheDemo.basic();

// 实际使用场景演示
filterCacheDemo.realWorld();

// 错误处理演示
filterCacheDemo.errorHandling();
```

### 手动操作缓存

```javascript
// 查看当前缓存
console.log(JSON.parse(localStorage.getItem('aigtd_filter_options')));

// 清除缓存
localStorage.removeItem('aigtd_filter_options');

// 手动设置缓存
localStorage.setItem('aigtd_filter_options', JSON.stringify({
  searchQuery: 'test',
  selectedTaskType: 'work'
}));
```

## 测试

### 单元测试

```bash
npm run test filterCache.test.ts
```

### 手动测试

参考 `manual-filter-cache-test.md` 文件中的详细测试指南。

## 性能考虑

- **存储大小**: 筛选选项数据很小（通常<1KB），对localStorage影响微乎其微
- **读写频率**: 只在用户操作时写入，应用启动时读取一次
- **内存占用**: 缓存数据在内存中的占用可忽略不计

## 浏览器兼容性

- ✅ Chrome 4+
- ✅ Firefox 3.5+
- ✅ Safari 4+
- ✅ Edge 12+
- ✅ IE 8+

## 隐私和安全

- **数据范围**: 只存储用户的UI偏好设置，不包含敏感信息
- **存储位置**: 数据存储在用户本地浏览器中，不会发送到服务器
- **清除方式**: 用户可以通过清除浏览器数据来删除缓存

## 故障排除

### 常见问题

1. **筛选选项没有保存**
   - 检查浏览器是否支持localStorage
   - 检查是否在隐私/无痕模式下使用
   - 查看浏览器控制台是否有错误

2. **缓存数据损坏**
   - 应用会自动检测并恢复到默认值
   - 可以手动清除localStorage中的相关数据

3. **存储配额不足**
   - 应用会优雅处理存储错误
   - 考虑清理其他网站的localStorage数据

### 调试技巧

1. 在控制台中查看缓存状态
2. 使用开发者工具的Application/Storage面板
3. 运行演示函数来验证功能
4. 查看网络面板确认没有不必要的请求

## 未来改进

- [ ] 支持多用户配置文件
- [ ] 添加缓存过期机制
- [ ] 支持云端同步（可选）
- [ ] 添加更多自定义选项
