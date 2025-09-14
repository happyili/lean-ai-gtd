# CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

AIGTD is an intelligent task management system with multiple features.

**Frontend (React/TypeScript)**
- Main app container: `frontend/src/app/page.tsx` - Orchestrates all major components
- Authentication context: `frontend/src/contexts/AuthContext.tsx` - Global auth state management
**Backend (Flask/Python)**
- App factory: `backend/app/__init__.py` - Creates Flask app with blueprints
- Database initialization: `backend/app/database/init.py` - Handles SQLite/PostgreSQL setup
- Core Models:
  - `Record` - Core task/note/idea model with hierarchical support (parent/subtask)
  - `User` - Authentication and user management

## 数据库模型配置

### 模型设计原则
- `records` table: Flexible content storage (tasks) ， support parent/child relationships for subtasks
- `users` table: Authentication with JWT refresh token support. Both guest and authenticated user workflows supported。用户关联字段 `user_id` 支持 `nullable=True` 以支持访客模式
- Pomodoro tasks link back to original records via `related_task_ids`
- 主键使用 `BigInteger` + `autoincrement=True`
- 状态字段 `status` 实现软删除：`active/archived/deleted`
- 时间戳使用 UTC 时区：`datetime.now(timezone.utc)`
- 提供 `to_dict()` 方法，使用 `safe_isoformat()` 处理时间格式
- 实现 `soft_delete()`、`archive()`、`restore()` 方法
- 提供类方法：`get_user_items()`、`get_guest_items()`


## Development Commands

### Backend (Flask + Python + posgresSQL / sqllite)
```bash
python -m venv venv && source venv/bin/activate  # Create/activate virtual environment
cd backend
uv pip install -r requirements.txt                   # Install dependencies
python backend/app.py                                # Start Flask server (port 5050)
python migrate_*.py                                  # Run database migrations
```

### Frontend (React + Vite + TypeScript)
```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start development server (port 3000)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run test         # Run Vitest tests
npm run test:ui      # Run tests with UI
npm run test:run     # Run tests once
```

## Architecture Overview

**Authentication Flow:**
AuthContext → JWT tokens → Flask @token_required → User model

**Task Management Flow:**
TaskList component → API calls → Records blueprint → Record model → SQLite/PostgreSQL

**AI Pomodoro Flow:**
PomodoroManager → generate_pomodoro_tasks API → PomodoroIntelligenceService → 
OpenRouter/Claude AI → PomodoroTask model → Compressed UI display


### Frontend State Management

**React Context Pattern:**
- `AuthContext` manages global authentication state
- Local component state for UI interactions
- API utility layer (`utils/api.ts`) handles HTTP requests and error standardization

**Component Architecture:**
- Container components manage state and API calls
- Presentational components focus on UI rendering
- Shared utilities for common operations (auth, API, export)

### Backend Service Layer

**AI Integration Architecture:**
- OpenRouter integration for Claude AI access
- Support Prompt engineering for LLM access: task analysis and pomodoro generation

### Key Design Patterns

**Frontend:**
- React Hooks pattern for state management
- TypeScript interfaces for type safety
- Tailwind CSS for responsive design
- Lucide React for consistent iconography

**Backend:**
- Blueprint pattern for modular routing
- SQLAlchemy ORM with model relationships
- Decorator pattern for authentication (@token_required)
- Factory pattern for app creation (create_app())

**Database:**
- Single table inheritance for different record types (idea/task/note)
- Soft delete pattern via status field
- UTC timezone handling throughout
- Auto-increment IDs with BigInteger support

### Critical Integration Points

**API Data Format Consistency:**
- All timestamps use ISO format with 'Z' suffix
- Standardized error responses with error codes
- Consistent success/failure response structure

**Authentication Flow:**
- JWT tokens with refresh mechanism
- Guest user support (user_id = null)
- Rate limiting on auth endpoints

**AI Service Integration:**
- OpenRouter as AI provider abstraction
- Prompt templates for consistent AI interactions
- Error handling and fallback for AI failures

### Testing Strategy

**Unittest:**
- Always try to add unittest testcases to cover important and corner case logics for both frontend and backend.
- For each testcases, it should have clear asserts, and try best to avoid mocks.
- Test out that the unittest will fail if the logic is wrong. And leave the unittest to fail if you can't fix it. Never do mocks and fake logics to only pass unittests.

**Frontend:**
- Vitest for unit testing
- Testing Library for React component testing
- TypeScript compilation as build-time verification

**Backend:**
- Custom test scripts for database operations
- Integration testing for API endpoints
- Migration scripts for schema changes


### Development Patterns

**File Organization:**
- Backend: models/ routes/ services/ utils/ structure
- Frontend: components/ organized by feature areas
- Shared: API interfaces and types between frontend/backend

**Code Style:**
- TypeScript strict mode enabled
- ESLint for code quality
- Consistent error handling patterns
- UTC timezone usage throughout

## Environment Configuration

**Backend Environment Variables:**
- `DATABASE_URL` - SQLite or PostgreSQL connection string
  - Local database: DATABASE_URL=sqlite:////Users/yiling/git/AIGTD/data/aigtd.db
  - Remote database: DATABASE_URL=postgresql://postgres.bkhfvcundjhzadxpdzuz:XXMWy3ququkVFAje@aws-1-us-east-2.pooler.supabase.com:5432/postgres
- `JWT_SECRET_KEY` - Token signing secret
- OpenRouter API credentials for AI integration

**Frontend Environment Variables:**
- `VITE_API_BASE_URL` - Backend API base URL (default: http://localhost:5050)

## Database Management

**Migration Strategy:**
- `migrations/`: sql migration scripts for sqllite(local db) and posgresSQL on supabase(remote)
- Manual migration scripts in backend/ directory
- Schema deployment via `deploy_schema.py`
- Separate migration for pomodoro features
- first test out the migration on local database, and then prepare the migration script for migration on production database (need to be supabase & posgresSQL compatible)

**Database Initialization:**
- Auto-detection of SQLite vs PostgreSQL
- Table creation with proper indexes
- Admin user setup for development


## Commit & Pull Request Guidelines
- Commit messages: Conventional style recommended — `feat(frontend): add task filter`, `fix(backend): correct JWT expiry`.
- PRs: include summary, linked issues, reproduction/fix notes, and screenshots for UI.
- Keep PRs small; update docs and `.env.example` when changing configuration.

## Security & Configuration
- Never commit secrets. Copy `env.example` → `.env` (root/backend) and set `VITE_API_BASE_URL`, `JWT_SECRET_KEY`, DB URL, etc.
- CORS and ports: backend defaults to `5050`; frontend points to `VITE_API_BASE_URL`.


# AIGTD 新增服务配置指南

## 4. 迁移脚本配置

### 本地迁移脚本
- 创建 `backend/migrate_your_table.py`
- 检测数据库类型（SQLite/PostgreSQL）并生成兼容SQL
- 创建必要索引：用户状态、状态、标题等
- 支持 `--rollback` 参数回滚迁移

### SQL迁移文件
- SQLite版本：`migrations/sqllite/001_your_table.sql`
- Supabase版本：`migrations/supabase/001_your_table.sql`
- 包含表结构、索引、触发器（更新 `updated_at`）

## 5. 测试配置

### 后端测试
- 创建 `backend/test_your_service.py`
- 测试错误响应：缺少字段、无效值、认证错误
- 测试成功响应：CRUD操作、搜索过滤
- 验证统一响应格式和错误码

### 前端测试
- 创建 `frontend/tests/your-service.test.tsx`
- Mock API调用，测试组件渲染和交互
- 验证错误处理和成功响应处理

## 6. 部署配置

### 环境变量
- `DATABASE_URL`：数据库连接字符串
- `JWT_SECRET_KEY`：JWT密钥
- `DEBUG_LOGGING`：调试日志开关
- `VERBOSE_LOGGING`：详细日志开关

### 部署脚本
- 更新 `deploy.sh` 包含新迁移脚本
- 运行迁移验证和API测试

## 7. 配置检查清单

### 必需文件 
- [ ] `backend/app/models/your_model.py` - 数据模型
- [ ] `backend/app/routes/your_service.py` - API路由
- [ ] `backend/migrate_your_table.py` - 迁移脚本
- [ ] `migrations/sqllite/001_your_table.sql` - SQLite迁移
- [ ] `migrations/supabase/001_your_table.sql` - Supabase迁移
- [ ] `backend/test_your_service.py` - 后端测试
- [ ] `frontend/tests/your-service.test.tsx` - 前端测试

### 配置更新
- [ ] `backend/app/__init__.py` - 注册蓝图
- [ ] `.env` - 环境变量
- [ ] `deploy.sh` - 部署脚本

### 功能验证
- [ ] 支持用户/访客模式
- [ ] 实现软删除
- [ ] 使用统一响应处理
- [ ] 自动日志记录
- [ ] 错误码标准化
- [ ] 时间戳UTC格式
- [ ] 数据库索引优化
- [ ] CRUD操作完整
- [ ] 搜索过滤功能

## 8. 常见问题

- **CORS错误**：检查前端URL是否在 `origins` 配置中
- **迁移失败**：验证SQL语法兼容性，检查表名冲突
- **权限错误**：确认 `get_current_user()` 和JWT token有效性
- **响应格式不一致**：强制使用 `create_error_response()` 和 `create_success_response()`
- **时间格式错误**：使用 `safe_isoformat()` 处理时间戳
- **数据库性能**：创建必要索引，避免全表扫描
- **日志缺失**：确保调用响应函数时传入 `method` 和 `endpoint` 参数

## 9. 最佳实践

- **代码组织**：按功能模块分离，使用蓝图模式
- **数据库设计**：支持多租户，实现软删除，使用UTC时区
- **测试策略**：单元测试 + 集成测试 + 错误场景测试
- **安全考虑**：输入验证、SQL注入防护、权限控制
- **性能优化**：数据库索引、查询优化、响应缓存
- **错误处理**：统一错误码、详细错误信息、自动日志记录
