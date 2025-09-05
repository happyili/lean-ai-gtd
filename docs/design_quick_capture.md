# 快速记录系统 (Quick Capture) - 设计方案

## 功能概述
实现极简的输入界面，让用户能够快速记录想法、任务、笔记等内容，作为整个AIGTD系统的数据入口。

## 核心需求分析
基于PRD第4.1节：
- ✅ 极简输入界面
- ✅ 支持文本快速记录
- ✅ 支持桌面端
- 🔄 移动端适配（后续版本）
- 🔄 语音输入（未来可选）

## 设计方案

### 1. 界面设计 (UI/UX)
#### 主界面
- **布局**: 单页面应用，顶部大型文本输入框 + 底部简单操作按钮
- **输入框**: 
  - 多行文本域 (textarea)
  - 占据屏幕主要区域 (60-70%)
  - 自动聚焦，支持快捷键
  - 占位符提示："记录您的想法、任务或笔记..."

#### 操作区域
- **保存按钮**: "添加记录" (主要操作)
- **快速分类**: 3个预设标签 - "想法"、"任务"、"笔记"
- **清空按钮**: "清空内容"

#### 历史记录区域
- **侧边栏**: 显示最近10条记录
- **搜索功能**: 简单的文本搜索
- **删除功能**: 单条记录删除

### 2. 数据结构
```sql
-- 记录表 (records)
CREATE TABLE records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,           -- 记录内容
    category VARCHAR(20) DEFAULT 'general',  -- 分类: idea/task/note/general
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active'      -- 状态: active/archived/deleted
);
```

### 3. 技术架构
#### 前端 (Next.js + React)
```
src/
  components/
    QuickCapture/
      CaptureInput.jsx      -- 主输入组件
      CategorySelector.jsx  -- 分类选择器
      RecordHistory.jsx     -- 历史记录组件
  pages/
    index.js               -- 主页面
  styles/
    globals.css           -- 全局样式
```

#### 后端 (Flask)
```
app/
  models/
    record.py             -- 记录数据模型
  routes/
    records.py            -- 记录相关API
  database/
    init.py              -- 数据库初始化
  app.py                 -- Flask应用入口
```

#### API接口设计
- `POST /api/records` - 创建新记录
- `GET /api/records` - 获取记录列表
- `DELETE /api/records/{id}` - 删除记录
- `GET /api/records/search?q={query}` - 搜索记录

### 4. 用户交互流程
1. **快速记录**:
   用户输入 → 选择分类(可选) → 点击保存 → 成功提示 → 清空输入框
   
2. **查看历史**:
   查看侧边栏 → 点击记录查看详情 → 可选择删除

3. **搜索记录**:
   输入搜索关键词 → 实时过滤显示结果

## 关键技术决策

### 数据存储策略
- **本地优先**: 使用本地SQLite作为主要存储
- **云端同步**: 预留Supabase接口，后续实现同步
- **离线支持**: 确保无网络时也能正常使用

### 性能优化
- **虚拟滚动**: 历史记录超过100条时启用
- **防抖搜索**: 搜索输入300ms延迟
- **本地缓存**: 缓存最近查看的记录

## 设计问题与考虑

### 🤔 需要确认的设计问题：

2. **历史记录展示**:
   - 可折叠/隐藏的侧边栏

4. **记录长度限制**:
   - 单条记录最大字符数限制：5000字符

5. **删除确认**:
   - 删除记录需要二次确认

## 测试用例设计

### 功能测试
1. **输入测试**:
   - 正常文本输入和保存
   - 空内容保存（应该提示错误）
   - 超长文本输入处理
   - 特殊字符输入（emoji、符号等）

2. **分类测试**:
   - 不选择分类的默认处理
   - 切换分类后保存
   - 分类显示和过滤功能

3. **历史记录测试**:
   - 记录列表正确显示
   - 搜索功能准确性
   - 删除功能正常工作
   - 记录排序（最新在前）

### 性能测试
1. **大量数据**:
   - 1000条记录的加载性能
   - 搜索响应时间
   - 页面渲染流畅度

### 兼容性测试
1. **浏览器兼容**:
   - Chrome/Firefox/Safari
   - 响应式设计（桌面/平板）

## 下一步计划
1. ✅ 设计方案确认
2. 📋 开发环境搭建
3. 🛠️ 前端界面开发
4. 🔧 后端API开发
5. 🗄️ 数据库集成
6. 🧪 功能测试
7. 🚀 部署上线

---

**请确认以上设计方案，特别是标注🤔的设计问题。确认后我将开始开发工作。** 