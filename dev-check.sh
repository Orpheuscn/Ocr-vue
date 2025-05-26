#!/bin/bash

# ====================
# 开发环境依赖检查脚本
# ====================
# 检查开发环境所需的所有依赖是否正确安装

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 开发环境依赖检查 ===${NC}"

# 检查Node.js
echo -e "${BLUE}检查Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js已安装: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js未安装${NC}"
    exit 1
fi

# 检查npm
echo -e "${BLUE}检查npm...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm已安装: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm未安装${NC}"
    exit 1
fi

# 检查Python
echo -e "${BLUE}检查Python...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓ Python已安装: $PYTHON_VERSION${NC}"
else
    echo -e "${RED}✗ Python3未安装${NC}"
    exit 1
fi

# 检查MongoDB
echo -e "${BLUE}检查MongoDB...${NC}"
if command -v mongod &> /dev/null; then
    MONGO_VERSION=$(mongod --version | head -n 1)
    echo -e "${GREEN}✓ MongoDB已安装: $MONGO_VERSION${NC}"
else
    echo -e "${RED}✗ MongoDB未安装${NC}"
    echo -e "${YELLOW}请安装MongoDB: brew install mongodb-community${NC}"
    exit 1
fi

# 检查后端依赖
echo -e "${BLUE}检查后端依赖...${NC}"
if [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}✓ 后端依赖已安装${NC}"
else
    echo -e "${YELLOW}! 后端依赖未安装，运行: cd backend && npm install${NC}"
fi

# 检查前端依赖
echo -e "${BLUE}检查前端依赖...${NC}"
if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✓ 前端依赖已安装${NC}"
else
    echo -e "${YELLOW}! 前端依赖未安装，运行: cd frontend && npm install${NC}"
fi

# 检查Python虚拟环境
echo -e "${BLUE}检查Python虚拟环境...${NC}"
if [ -d "python-service/venv" ]; then
    echo -e "${GREEN}✓ Python虚拟环境已创建${NC}"
    
    # 检查虚拟环境中的依赖
    if [ -f "python-service/venv/bin/python" ]; then
        echo -e "${GREEN}✓ Python虚拟环境可用${NC}"
    else
        echo -e "${YELLOW}! Python虚拟环境损坏，请重新创建${NC}"
    fi
else
    echo -e "${YELLOW}! Python虚拟环境未创建，运行: cd python-service && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt${NC}"
fi

# 检查环境配置文件
echo -e "${BLUE}检查环境配置文件...${NC}"

if [ -f "backend/.env.local" ]; then
    echo -e "${GREEN}✓ 后端环境配置文件存在${NC}"
else
    echo -e "${YELLOW}! 后端环境配置文件不存在，请创建 backend/.env.local${NC}"
fi

if [ -f "frontend/.env.local" ]; then
    echo -e "${GREEN}✓ 前端环境配置文件存在${NC}"
else
    echo -e "${YELLOW}! 前端环境配置文件不存在，请创建 frontend/.env.local${NC}"
fi

if [ -f "python-service/.env.local" ]; then
    echo -e "${GREEN}✓ Python服务环境配置文件存在${NC}"
else
    echo -e "${YELLOW}! Python服务环境配置文件不存在，请创建 python-service/.env.local${NC}"
fi

# 检查端口占用
echo -e "${BLUE}检查端口占用情况...${NC}"

PORTS=(27017 3000 5001 8082)
PORT_NAMES=("MongoDB" "Node.js后端" "Python服务" "Vue前端")

for i in "${!PORTS[@]}"; do
    PORT=${PORTS[$i]}
    NAME=${PORT_NAMES[$i]}
    
    if lsof -i :$PORT &> /dev/null; then
        echo -e "${YELLOW}! 端口 $PORT ($NAME) 已被占用${NC}"
        lsof -i :$PORT
    else
        echo -e "${GREEN}✓ 端口 $PORT ($NAME) 可用${NC}"
    fi
done

echo -e "${BLUE}=== 检查完成 ===${NC}"
echo -e "${GREEN}如果所有检查都通过，可以运行: ./dev-start.sh start${NC}"
