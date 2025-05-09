#!/bin/bash

# 启动前端和后端服务的开发脚本

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

echo -e "${GREEN}启动OCR Vue应用开发环境...${NC}"

# 启动后端服务
echo -e "${BLUE}正在启动后端服务...${NC}"
cd backend
npm install &
BACKEND_PID=$!

# 启动前端服务
echo -e "${BLUE}正在启动前端服务...${NC}"
cd ../frontend
npm install &
FRONTEND_PID=$!

# 等待安装完成
wait $BACKEND_PID
wait $FRONTEND_PID

# 启动服务
echo -e "${GREEN}依赖安装完成，正在启动服务...${NC}"

# 在后台启动后端服务
cd ../backend
npm run dev &
BACKEND_PID=$!
echo -e "${BLUE}后端服务已启动 (PID: $BACKEND_PID)${NC}"

# 在前台启动前端服务
cd ../frontend
echo -e "${BLUE}正在启动前端服务...${NC}"
npm run dev

# 清理
kill $BACKEND_PID
echo -e "${GREEN}开发环境已关闭${NC}" 