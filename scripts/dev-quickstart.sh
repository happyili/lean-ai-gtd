#!/bin/bash

# AIGTD开发环境快速启动脚本

echo "🚀 AIGTD开发环境启动器"
echo "======================"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 显示菜单
show_menu() {
    echo ""
    echo "请选择操作："
    echo "1. 启动前端开发服务器"
    echo "2. 运行测试"
    echo "3. 构建项目"
    echo "4. 运行前端整合测试"
    echo "5. 退出"
    echo ""
}

# 启动前端开发服务器
start_frontend() {
    echo -e "${YELLOW}🌐 启动前端开发服务器...${NC}"
    cd /Users/yiling/git/AIGTD/frontend
    npm run dev
}

# 运行测试
run_tests() {
    echo -e "${YELLOW}🧪 运行测试...${NC}"
    cd /Users/yiling/git/AIGTD/frontend
    npm run test 2>/dev/null || echo "测试脚本未配置"
}

# 构建项目
build_project() {
    echo -e "${YELLOW}🏗️  构建项目...${NC}"
    cd /Users/yiling/git/AIGTD/frontend
    npm run build
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 项目构建成功！${NC}"
    else
        echo -e "❌ 项目构建失败！${NC}"
    fi
}

# 运行前端整合测试
run_frontend_integration_test() {
    echo -e "${YELLOW}🔍 运行前端整合测试...${NC}"
    if [[ -f "/Users/yiling/git/AIGTD/frontend/scripts/test-frontend-integration.sh" ]]; then
        /Users/yiling/git/AIGTD/frontend/scripts/test-frontend-integration.sh
    else
        echo -e "❌ 前端整合测试脚本不存在${NC}"
    fi
}

# 主程序
main() {
    while true; do
        show_menu
        read -p "请输入选项 (1-5): " choice
        
        case $choice in
            1)
                start_frontend
                ;;
            2)
                run_tests
                ;;
            3)
                build_project
                ;;
            4)
                run_frontend_integration_test
                ;;
            5)
                echo -e "${GREEN}👋 再见！${NC}"
                exit 0
                ;;
            *)
                echo -e "❌ 无效选项，请输入 1-5"
                ;;
        esac
        
        echo ""
        read -p "按回车键继续..."
    done
}

# 检查是否在正确的目录
if [[ ! -f "/Users/yiling/git/AIGTD/frontend/package.json" ]]; then
    echo -e "❌ 错误：未找到前端项目文件"
    exit 1
fi

# 运行主程序
main