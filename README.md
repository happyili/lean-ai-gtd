# AIGTD - 快速记录系统

## 项目简介
AIGTD 是一款智能任务管理助手，目前已实现快速记录系统功能。该系统提供极简的输入界面，支持快速记录想法、任务和笔记。

## 技术栈
- **前端**: React + Next.js + TypeScript + Tailwind CSS
- **后端**: Python Flask + SQLAlchemy
- **数据库**: SQLite (本地存储)

## 功能特性
- ✅ 极简输入界面，支持快速记录
- ✅ 三种预设分类：想法、任务、笔记
- ✅ 快捷键支持 (Ctrl+Enter 保存, Ctrl+L 清空, Tab 切换分类)
- ✅ 可折叠历史记录侧边栏
- ✅ 实时搜索和过滤
- ✅ 二次确认删除
- ✅ 字符数限制 (5000字符)
- ✅ 响应式设计

## 快速开始

### 1. 启动后端服务

```bash
# 进入后端目录
cd backend

# 创建虚拟环境（推荐）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动Flask服务
python app.py
```

后端服务将在 `http://localhost:5000` 启动

### 2. 启动前端服务

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端服务将在 `http://localhost:3000` 启动

### 3. 访问应用

打开浏览器访问 `http://localhost:3000` 即可使用快速记录系统。

## 使用说明

### 快捷键操作
- `Ctrl+Enter` (Mac: `Cmd+Enter`): 快速保存记录
- `Ctrl+L` (Mac: `Cmd+L`): 清空输入内容  
- `Tab`: 切换分类标签

### 记录管理
- 支持想法、任务、笔记三种分类
- 历史记录实时搜索
- 删除记录需要二次确认
- 单条记录最大5000字符

## 开发计划

当前为第一个子项目 - 快速记录系统。
完整开发计划请查看 `plan.md` 文件。

下一步开发:
- [ ] 基础任务管理 (CRUD操作)
- [ ] 上下文回顾系统 (AI自动摘要)
- [ ] 智能任务拆解
- [ ] 决策辅助引擎

## 目录结构

```
AIGTD/
├── frontend/          # Next.js 前端应用
│   ├── src/
│   │   ├── app/       # 页面文件
│   │   └── components/ # React组件
├── backend/           # Flask 后端应用
│   ├── app/
│   │   ├── models/    # 数据模型
│   │   ├── routes/    # API路由
│   │   └── database/  # 数据库配置
├── data/              # SQLite数据库文件
└── docs/              # 文档文件
```

## API接口

### 记录管理
- `POST /api/records` - 创建新记录
- `GET /api/records` - 获取记录列表 (支持分页和搜索)
- `DELETE /api/records/{id}` - 删除记录
- `GET /api/records/search?q={query}` - 搜索记录

## 许可证
MIT License 