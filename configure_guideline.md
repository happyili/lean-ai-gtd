# AIGTD 新增服务配置指南

## 1. 请求注册和CORS配置

### 路由注册
- 在 `backend/app/__init__.py` 中导入并注册新蓝图：`app.register_blueprint(your_service_bp)`
- CORS已全局配置，新增服务自动获得跨域支持

### 路由文件结构
- 创建 `backend/app/routes/your_service.py`
- 使用 `Blueprint('your_service', __name__)` 创建蓝图
- 实现 `_get_access_context()` 函数处理用户/访客权限
- 所有路由使用统一响应处理：`create_error_response()` 和 `create_success_response()`

## 2. 统一响应处理
- 错误处理：使用 `ErrorCodes` 预定义错误码，避免硬编码错误信息。错误响应包含：`error`、`error_code`、`details`、`timestamp`。自动记录请求日志，包含 `method` 和 `endpoint` 参数
- 成功响应： 使用 `create_success_response()` 创建标准化成功响应。响应包含：`success: true`、`timestamp`、业务数据、可选 `message`

## 3. 数据库模型配置

### 模型设计原则
- 主键使用 `BigInteger` + `autoincrement=True`
- 用户关联字段 `user_id` 支持 `nullable=True` 以支持访客模式
- 状态字段 `status` 实现软删除：`active/archived/deleted`
- 时间戳使用 UTC 时区：`datetime.now(timezone.utc)`
- 提供 `to_dict()` 方法，使用 `safe_isoformat()` 处理时间格式
- 实现 `soft_delete()`、`archive()`、`restore()` 方法
- 提供类方法：`get_user_items()`、`get_guest_items()`

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
