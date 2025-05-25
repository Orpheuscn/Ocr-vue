#!/bin/bash

# ==========================================
# 本地开发启动脚本
# ==========================================

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  启动本地开发环境  ${NC}"
echo -e "${BLUE}===========================================${NC}"

# 检查是否在前端目录
if [ ! -f "frontend/package.json" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 进入前端目录
cd frontend

echo -e "${BLUE}当前开发配置:${NC}"
echo -e "${YELLOW}API 后端: https://textistext-backend-cogbmejklq-uc.a.run.app/api${NC}"
echo -e "${YELLOW}前端开发服务器: http://localhost:5173${NC}"
echo -e "${YELLOW}热重载: 启用${NC}"
echo ""

echo -e "${BLUE}启动开发服务器...${NC}"
echo -e "${YELLOW}提示: 代码修改后会自动重新加载，无需重新部署${NC}"
echo -e "${YELLOW}按 Ctrl+C 停止开发服务器${NC}"
echo ""

# 启动开发服务器
npm run dev
