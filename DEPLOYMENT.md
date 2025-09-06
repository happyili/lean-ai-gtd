# AIGTD 部署指南

## 部署架构
- **前端**: Vercel (React + Vite)
- **后端**: Vercel Serverless Functions (Flask)
- **数据库**: Supabase (PostgreSQL)
- **AI服务**: OpenRouter API

## 部署步骤

### 1. 准备Supabase数据库

1. 访问 [Supabase](https://supabase.com) 创建新项目
2. 在项目设置中获取数据库连接信息：
   - Database URL： https://bkhfvcundjhzadxpdzuz.supabase.co 
   - API Key： xxx
3. 在SQL编辑器中运行 `supabase/migrations/001_create_records_table.sql`

### 2. 准备OpenRouter API

1. 访问 [OpenRouter](https://openrouter.ai) 注册账号
2. 获取API Key
3. 确保有足够的API额度

### 3. 部署后端到Vercel

方法1：使用部署脚本（推荐）
   ```bash
   ./deploy.sh
   ```

方法2：手动修复
1. 先部署后端
```bash
cd backend
vercel --prod --name aigtd-backend
```
记录后端URL（例如：https://aigtd-backend-xxx.vercel.app）

2. 设置前端环境变量
```bash
cd frontend
echo "VITE_API_BASE_URL=https://aigtd-backend-xxx.vercel.app" > .env.local
```

3. 部署前端
```bash
vercel --prod --name aigtd-frontend
```

4. 在Vercel Dashboard中设置环境变量

**后端环境变量：**
- `DATABASE_URL`: postgresql://postgres:[YOUR-PASSWORD]@bkhfvcundjhzadxpdzuz.supabase.co:5432/postgres
- `OPENROUTER_API_KEY`: 你的OpenRouter API密钥
- `FLASK_ENV`: production
- `SECRET_KEY`: 随机生成的密钥

**前端环境变量：**
- `VITE_API_BASE_URL`: https://aigtd-backend-xxx.vercel.app

### 5. 配置域名和路由

1. 在Vercel Dashboard中配置自定义域名
2. 确保前端路由正确指向后端API
3. 测试所有功能是否正常工作

## 环境变量说明

### 后端环境变量
- `DATABASE_URL`: Supabase PostgreSQL连接字符串
- `OPENROUTER_API_KEY`: OpenRouter API密钥
- `FLASK_ENV`: 运行环境 (production)
- `SECRET_KEY`: Flask应用密钥

### 前端环境变量
- `VITE_API_BASE_URL`: 后端API的基础URL

## 数据库迁移

如果需要在Supabase中手动创建表结构，可以运行以下SQL：

```sql
-- 创建records表
CREATE TABLE IF NOT EXISTS records (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    category VARCHAR(20) DEFAULT 'general',
    parent_id INTEGER REFERENCES records(id),
    priority VARCHAR(20) DEFAULT 'medium',
    progress INTEGER DEFAULT 0,
    progress_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active'
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_records_parent_id ON records(parent_id);
CREATE INDEX IF NOT EXISTS idx_records_status ON records(status);
CREATE INDEX IF NOT EXISTS idx_records_category ON records(category);
CREATE INDEX IF NOT EXISTS idx_records_priority ON records(priority);
```

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查DATABASE_URL是否正确
   - 确认Supabase项目状态正常

2. **API调用失败**
   - 检查VITE_API_BASE_URL是否正确
   - 确认后端部署成功

3. **CORS错误**
   - 确认后端CORS配置正确
   - 检查域名配置

### 监控和日志

- Vercel Dashboard查看部署状态和日志
- Supabase Dashboard查看数据库状态
- 使用Vercel Analytics监控应用性能

## 成本估算

- **Vercel**: 免费额度通常足够小型项目
- **Supabase**: 免费额度包含500MB数据库和50,000次API调用
- **OpenRouter**: 按API调用次数计费，具体价格查看官网

## 安全建议

1. 定期更新依赖包
2. 使用强密码和API密钥
3. 启用Supabase的行级安全策略
4. 监控API使用情况
5. 定期备份数据库
