#!/bin/bash

# AIGTD前端整合测试脚本
# 用于验证前端认证功能是否正常工作

echo "🚀 AIGTD前端整合功能测试"
echo "=================================="

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_frontend_build() {
    echo -e "${YELLOW}📦 测试前端构建...${NC}"
    cd /Users/yiling/git/AIGTD/frontend
    
    if npm run build > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 前端构建成功${NC}"
        return 0
    else
        echo -e "${RED}❌ 前端构建失败${NC}"
        return 1
    fi
}

test_typescript_compilation() {
    echo -e "${YELLOW}🔍 测试TypeScript编译...${NC}"
    cd /Users/yiling/git/AIGTD/frontend
    
    if npm run build > /dev/null 2>&1; then
        echo -e "${GREEN}✅ TypeScript编译成功${NC}"
        return 0
    else
        echo -e "${RED}❌ TypeScript编译失败${NC}"
        return 1
    fi
}

test_component_files() {
    echo -e "${YELLOW}📁 检查关键组件文件...${NC}"
    
    local components=(
        "/Users/yiling/git/AIGTD/frontend/src/components/Auth/ProtectedRoute.tsx"
        "/Users/yiling/git/AIGTD/frontend/src/components/Auth/AuthPage.tsx"
        "/Users/yiling/git/AIGTD/frontend/src/components/Auth/UserMenu.tsx"
        "/Users/yiling/git/AIGTD/frontend/src/AppRoutes.tsx"
        "/Users/yiling/git/AIGTD/frontend/src/contexts/AuthContext.tsx"
    )
    
    local all_exist=true
    for component in "${components[@]}"; do
        if [[ -f "$component" ]]; then
            echo -e "${GREEN}✅ $(basename "$component") 存在${NC}"
        else
            echo -e "${RED}❌ $(basename "$component") 不存在${NC}"
            all_exist=false
        fi
    done
    
    if $all_exist; then
        return 0
    else
        return 1
    fi
}

test_routing_setup() {
    echo -e "${YELLOW}🛣️  测试路由配置...${NC}"
    
    if grep -q "ProtectedRoute" /Users/yiling/git/AIGTD/frontend/src/AppRoutes.tsx; then
        echo -e "${GREEN}✅ 受保护路由配置存在${NC}"
    else
        echo -e "${RED}❌ 受保护路由配置缺失${NC}"
        return 1
    fi
    
    if grep -q "PublicRoute" /Users/yiling/git/AIGTD/frontend/src/AppRoutes.tsx; then
        echo -e "${GREEN}✅ 公开路由配置存在${NC}"
    else
        echo -e "${RED}❌ 公开路由配置缺失${NC}"
        return 1
    fi
    
    if grep -q "/login" /Users/yiling/git/AIGTD/frontend/src/AppRoutes.tsx; then
        echo -e "${GREEN}✅ 登录路由配置存在${NC}"
    else
        echo -e "${RED}❌ 登录路由配置缺失${NC}"
        return 1
    fi
    
    return 0
}

test_auth_context() {
    echo -e "${YELLOW}🔐 测试认证上下文...${NC}"
    
    local auth_context_file="/Users/yiling/git/AIGTD/frontend/src/contexts/AuthContext.tsx"
    
    if [[ ! -f "$auth_context_file" ]]; then
        echo -e "${RED}❌ 认证上下文文件不存在${NC}"
        return 1
    fi
    
    local required_functions=("login" "logout" "register" "refreshAccessToken" "updateUser")
    local all_functions=true
    
    for func in "${required_functions[@]}"; do
        if grep -q "$func" "$auth_context_file"; then
            echo -e "${GREEN}✅ $func 函数存在${NC}"
        else
            echo -e "${RED}❌ $func 函数缺失${NC}"
            all_functions=false
        fi
    done
    
    if $all_functions; then
        return 0
    else
        return 1
    fi
}

test_user_menu_features() {
    echo -e "${YELLOW}👤 测试用户菜单功能...${NC}"
    
    local user_menu_file="/Users/yiling/git/AIGTD/frontend/src/components/Auth/UserMenu.tsx"
    
    if [[ ! -f "$user_menu_file" ]]; then
        echo -e "${RED}❌ 用户菜单文件不存在${NC}"
        return 1
    fi
    
    local required_features=("getDisplayName" "getAvatarUrl" "handleLogout" "navigate")
    local all_features=true
    
    for feature in "${required_features[@]}"; do
        if grep -q "$feature" "$user_menu_file"; then
            echo -e "${GREEN}✅ $feature 功能存在${NC}"
        else
            echo -e "${RED}❌ $feature 功能缺失${NC}"
            all_features=false
        fi
    done
    
    if $all_features; then
        return 0
    else
        return 1
    fi
}

# 运行所有测试
run_all_tests() {
    echo "开始测试前端整合功能..."
    echo ""
    
    local test_results=()
    
    # 测试1：组件文件检查
    if test_component_files; then
        test_results+=("组件文件检查: 通过")
    else
        test_results+=("组件文件检查: 失败")
    fi
    
    echo ""
    
    # 测试2：路由配置检查
    if test_routing_setup; then
        test_results+=("路由配置检查: 通过")
    else
        test_results+=("路由配置检查: 失败")
    fi
    
    echo ""
    
    # 测试3：认证上下文检查
    if test_auth_context; then
        test_results+=("认证上下文检查: 通过")
    else
        test_results+=("认证上下文检查: 失败")
    fi
    
    echo ""
    
    # 测试4：用户菜单功能检查
    if test_user_menu_features; then
        test_results+=("用户菜单功能检查: 通过")
    else
        test_results+=("用户菜单功能检查: 失败")
    fi
    
    echo ""
    
    # 测试5：TypeScript编译检查
    if test_typescript_compilation; then
        test_results+=("TypeScript编译: 通过")
    else
        test_results+=("TypeScript编译: 失败")
    fi
    
    echo ""
    
    # 测试6：前端构建检查
    if test_frontend_build; then
        test_results+=("前端构建: 通过")
    else
        test_results+=("前端构建: 失败")
    fi
    
    echo ""
    echo "=================================="
    echo "测试总结："
    echo "=================================="
    
    local passed=0
    local failed=0
    
    for result in "${test_results[@]}"; do
        if [[ "$result" == *"通过"* ]]; then
            echo -e "${GREEN}$result${NC}"
            ((passed++))
        else
            echo -e "${RED}$result${NC}"
            ((failed++))
        fi
    done
    
    echo ""
    echo "=================================="
    echo -e "总计: ${GREEN}通过: $passed${NC}, ${RED}失败: $failed${NC}"
    echo "=================================="
    
    if [[ $failed -eq 0 ]]; then
        echo -e "${GREEN}🎉 所有测试都通过了！前端整合功能正常。${NC}"
        return 0
    else
        echo -e "${RED}❌ 部分测试失败，请检查相关问题。${NC}"
        return 1
    fi
}

# 主程序
main() {
    run_all_tests
}

# 运行主程序
main "$@"