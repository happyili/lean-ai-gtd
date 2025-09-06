#!/bin/bash

echo "🚀 AIGTD 部署脚本"
echo "=================="

# 检查是否安装了Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ 请先安装Vercel CLI: npm i -g vercel"
    exit 1
fi

# 检查是否登录Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 请先登录Vercel: vercel login"
    exit 1
fi

echo "✅ Vercel CLI 已安装并登录"

# 1. 部署后端
echo ""
echo "📦 部署后端..."
cd backend
vercel --prod --name aigtd-backend
BACKEND_URL=$(vercel ls | grep aigtd-backend | head -1 | awk '{print $2}')
echo "✅ 后端部署完成: https://$BACKEND_URL"

# 2. 设置前端环境变量
echo ""
echo "⚙️  配置前端环境变量..."
cd ../frontend
echo "VITE_API_BASE_URL=https://$BACKEND_URL" > .env.local
echo "✅ 前端环境变量已设置"

# 3. 部署前端
echo ""
echo "📦 部署前端..."
vercel --prod --name aigtd-frontend
FRONTEND_URL=$(vercel ls | grep aigtd-frontend | head -1 | awk '{print $2}')
echo "✅ 前端部署完成: https://$FRONTEND_URL"

echo ""
echo "🎉 部署完成！"
echo "前端地址: https://$FRONTEND_URL"
echo "后端地址: https://$BACKEND_URL"
echo ""
echo "⚠️  请记得在Vercel Dashboard中设置以下环境变量："
echo "后端环境变量："
echo "  - DATABASE_URL: postgresql://postgres:[YOUR-PASSWORD]@bkhfvcundjhzadxpdzuz.supabase.co:5432/postgres"
echo "  - OPENROUTER_API_KEY: 你的OpenRouter API密钥"
echo "  - FLASK_ENV: production"
echo "  - SECRET_KEY: 随机生成的密钥"
echo ""
echo "前端环境变量："
echo "  - VITE_API_BASE_URL: https://$BACKEND_URL"
