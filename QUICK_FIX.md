# 快速修复 Vercel 环境变量错误

## 问题
```
Error: Environment Variable "VITE_API_BASE_URL" references Secret "vite_api_base_url", which does not exist.
```

## 解决方案

### 方法1：使用部署脚本（推荐）

1. 运行部署脚本：
   ```bash
   ./deploy.sh
   ```

### 方法2：手动修复

#### 1. 先部署后端
```bash
cd backend
vercel --prod --name aigtd-backend
```
记录后端URL（例如：https://aigtd-backend-xxx.vercel.app）

#### 2. 设置前端环境变量
```bash
cd frontend
echo "VITE_API_BASE_URL=https://aigtd-backend-xxx.vercel.app" > .env.local
```

#### 3. 部署前端
```bash
vercel --prod --name aigtd-frontend
```

#### 4. 在Vercel Dashboard中设置环境变量

**后端环境变量：**
- `DATABASE_URL`: postgresql://postgres:[YOUR-PASSWORD]@bkhfvcundjhzadxpdzuz.supabase.co:5432/postgres
- `OPENROUTER_API_KEY`: 你的OpenRouter API密钥
- `FLASK_ENV`: production
- `SECRET_KEY`: 随机生成的密钥

**前端环境变量：**
- `VITE_API_BASE_URL`: https://aigtd-backend-xxx.vercel.app

## 为什么会出现这个错误？

Vercel的环境变量引用语法 `@vite_api_base_url` 是用于引用Vercel Secrets的，但我们在vercel.json中直接引用了不存在的Secret。

## 正确的做法

1. 在代码中直接使用环境变量名：`process.env.VITE_API_BASE_URL`
2. 在Vercel Dashboard中设置环境变量
3. 或者在本地创建 `.env.local` 文件

## 验证部署

部署完成后，访问前端URL，检查：
1. 页面是否正常加载
2. 任务列表是否显示
3. 创建任务功能是否正常
4. AI功能是否工作
