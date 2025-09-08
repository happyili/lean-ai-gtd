#!/bin/bash

# AIGTD项目快捷命令别名
# 将此文件内容添加到您的 ~/.zshrc 或 ~/.bashrc 文件中

echo "添加以下别名到您的 shell 配置文件："
echo ""
echo "# AIGTD项目快捷命令"
echo "alias aigtd-dev='cd /Users/yiling/git/AIGTD && ./scripts/dev-quickstart.sh'"
echo "alias aigtd-frontend='cd /Users/yiling/git/AIGTD/frontend && npm run dev'"
echo "alias aigtd-build='cd /Users/yiling/git/AIGTD/frontend && npm run build'"
echo "alias aigtd-test='cd /Users/yiling/git/AIGTD/frontend && ./scripts/test-frontend-integration.sh'"
echo "alias aigtd-lint='cd /Users/yiling/git/AIGTD/frontend && npm run lint'"
echo ""
echo "使用方法："
echo "  aigtd-dev     - 启动开发环境选择菜单"
echo "  aigtd-frontend - 直接启动前端开发服务器"
echo "  aigtd-build   - 构建前端项目"
echo "  aigtd-test    - 运行前端整合测试"
echo "  aigtd-lint    - 运行代码检查"
echo ""
echo "将这些别名添加到您的 ~/.zshrc 或 ~/.bashrc 文件中，然后运行 source ~/.zshrc 或重启终端即可使用。"