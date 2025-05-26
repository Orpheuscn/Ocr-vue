#!/bin/bash

# ====================
# 本地开发环境启动脚本
# ====================
# 简化版本，只启动开发环境必需的服务：
# 1. MongoDB数据库
# 2. Node.js后端服务
# 3. Python服务
# 4. Vue前端服务

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 基础配置
APP_DIR=$(pwd)
LOG_DIR="$APP_DIR/logs"

# 服务端口配置
MONGODB_PORT=27017
BACKEND_PORT=3000
PYTHON_PORT=5001
FRONTEND_PORT=8082

# PID文件路径
MONGODB_PID_FILE="$LOG_DIR/mongodb.pid"
BACKEND_PID_FILE="$LOG_DIR/backend.pid"
PYTHON_PID_FILE="$LOG_DIR/python.pid"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 检查端口是否被占用
check_port() {
  local port=$1
  lsof -i :$port 2>/dev/null
}

# 等待服务启动
wait_for_service() {
  local port=$1
  local service_name=$2
  local max_wait=30
  local count=0
  
  echo -e "${BLUE}等待 $service_name 启动...${NC}"
  while [ $count -lt $max_wait ]; do
    if check_port $port > /dev/null; then
      echo -e "${GREEN}✓ $service_name 已启动 (端口 $port)${NC}"
      return 0
    fi
    sleep 1
    count=$((count + 1))
  done
  
  echo -e "${RED}✗ $service_name 启动超时${NC}"
  return 1
}

# 启动MongoDB
start_mongodb() {
  echo -e "${BLUE}启动MongoDB数据库...${NC}"
  
  # 检查是否已运行
  if check_port $MONGODB_PORT > /dev/null; then
    echo -e "${YELLOW}MongoDB已在运行${NC}"
    return 0
  fi
  
  # 创建数据目录
  mkdir -p "$APP_DIR/database/mongodb/data"
  
  # 启动MongoDB
  mongod --dbpath "$APP_DIR/database/mongodb/data" --port $MONGODB_PORT --fork --logpath "$LOG_DIR/mongodb.log"
  
  if [ $? -eq 0 ]; then
    # 保存PID
    pgrep mongod > "$MONGODB_PID_FILE"
    wait_for_service $MONGODB_PORT "MongoDB"
    return $?
  else
    echo -e "${RED}✗ MongoDB启动失败${NC}"
    return 1
  fi
}

# 启动Node.js后端
start_backend() {
  echo -e "${BLUE}启动Node.js后端服务...${NC}"
  
  # 检查是否已运行
  if check_port $BACKEND_PORT > /dev/null; then
    echo -e "${YELLOW}Node.js后端已在运行${NC}"
    return 0
  fi
  
  # 进入后端目录
  cd "$APP_DIR/backend"
  
  # 设置环境变量
  export NODE_ENV=development
  
  # 启动后端服务
  nohup node start.js dev > "$LOG_DIR/backend.log" 2>&1 &
  echo $! > "$BACKEND_PID_FILE"
  
  cd "$APP_DIR"
  wait_for_service $BACKEND_PORT "Node.js后端"
  return $?
}

# 启动Python服务
start_python() {
  echo -e "${BLUE}启动Python服务...${NC}"
  
  # 检查是否已运行
  if check_port $PYTHON_PORT > /dev/null; then
    echo -e "${YELLOW}Python服务已在运行${NC}"
    return 0
  fi
  
  # 进入Python服务目录
  cd "$APP_DIR/python-service"
  
  # 设置环境变量
  export NODE_ENV=development
  
  # 检查虚拟环境
  if [ ! -d "venv" ]; then
    echo -e "${RED}✗ Python虚拟环境不存在，请先运行: python -m venv venv${NC}"
    cd "$APP_DIR"
    return 1
  fi
  
  # 激活虚拟环境并启动服务
  source venv/bin/activate
  nohup python main.py > "$LOG_DIR/python.log" 2>&1 &
  echo $! > "$PYTHON_PID_FILE"
  
  cd "$APP_DIR"
  wait_for_service $PYTHON_PORT "Python服务"
  return $?
}

# 启动前端服务
start_frontend() {
  echo -e "${BLUE}启动Vue前端服务...${NC}"
  
  # 检查是否已运行
  if check_port $FRONTEND_PORT > /dev/null; then
    echo -e "${YELLOW}前端服务已在运行${NC}"
    echo -e "${GREEN}前端地址: http://localhost:$FRONTEND_PORT${NC}"
    return 0
  fi
  
  # 进入前端目录
  cd "$APP_DIR/frontend"
  
  # 启动前端开发服务器
  echo -e "${BLUE}启动前端开发服务器...${NC}"
  npm run dev &
  
  cd "$APP_DIR"
  wait_for_service $FRONTEND_PORT "Vue前端"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 所有服务已启动完成！${NC}"
    echo -e "${GREEN}前端地址: http://localhost:$FRONTEND_PORT${NC}"
    echo -e "${GREEN}后端API: http://localhost:$BACKEND_PORT${NC}"
    echo -e "${GREEN}Python服务: http://localhost:$PYTHON_PORT${NC}"
    return 0
  else
    return 1
  fi
}

# 停止所有服务
stop_services() {
  echo -e "${BLUE}停止所有开发服务...${NC}"
  
  # 停止前端 (通常是npm run dev)
  pkill -f "vite.*--port $FRONTEND_PORT" 2>/dev/null
  pkill -f "npm run dev" 2>/dev/null
  
  # 停止Python服务
  if [ -f "$PYTHON_PID_FILE" ]; then
    PYTHON_PID=$(cat "$PYTHON_PID_FILE")
    if ps -p $PYTHON_PID > /dev/null; then
      kill $PYTHON_PID
      echo -e "${GREEN}✓ Python服务已停止${NC}"
    fi
    rm -f "$PYTHON_PID_FILE"
  fi
  
  # 停止Node.js后端
  if [ -f "$BACKEND_PID_FILE" ]; then
    BACKEND_PID=$(cat "$BACKEND_PID_FILE")
    if ps -p $BACKEND_PID > /dev/null; then
      kill $BACKEND_PID
      echo -e "${GREEN}✓ Node.js后端已停止${NC}"
    fi
    rm -f "$BACKEND_PID_FILE"
  fi
  
  # 停止MongoDB
  if [ -f "$MONGODB_PID_FILE" ]; then
    MONGODB_PID=$(cat "$MONGODB_PID_FILE")
    if ps -p $MONGODB_PID > /dev/null; then
      kill $MONGODB_PID
      echo -e "${GREEN}✓ MongoDB已停止${NC}"
    fi
    rm -f "$MONGODB_PID_FILE"
  fi
  
  echo -e "${GREEN}所有服务已停止${NC}"
}

# 检查服务状态
check_status() {
  echo -e "${BLUE}检查服务状态...${NC}"
  
  # 检查MongoDB
  if check_port $MONGODB_PORT > /dev/null; then
    echo -e "${GREEN}✓ MongoDB运行中 (端口 $MONGODB_PORT)${NC}"
  else
    echo -e "${RED}✗ MongoDB未运行${NC}"
  fi
  
  # 检查Node.js后端
  if check_port $BACKEND_PORT > /dev/null; then
    echo -e "${GREEN}✓ Node.js后端运行中 (端口 $BACKEND_PORT)${NC}"
  else
    echo -e "${RED}✗ Node.js后端未运行${NC}"
  fi
  
  # 检查Python服务
  if check_port $PYTHON_PORT > /dev/null; then
    echo -e "${GREEN}✓ Python服务运行中 (端口 $PYTHON_PORT)${NC}"
  else
    echo -e "${RED}✗ Python服务未运行${NC}"
  fi
  
  # 检查前端
  if check_port $FRONTEND_PORT > /dev/null; then
    echo -e "${GREEN}✓ Vue前端运行中 (端口 $FRONTEND_PORT)${NC}"
    echo -e "${GREEN}  访问地址: http://localhost:$FRONTEND_PORT${NC}"
  else
    echo -e "${RED}✗ Vue前端未运行${NC}"
  fi
}

# 主函数
main() {
  case "$1" in
    "start")
      echo -e "${GREEN}=== 启动本地开发环境 ===${NC}"
      start_mongodb && start_backend && start_python && start_frontend
      ;;
    "stop")
      stop_services
      ;;
    "restart")
      stop_services
      sleep 2
      echo -e "${GREEN}=== 重启本地开发环境 ===${NC}"
      start_mongodb && start_backend && start_python && start_frontend
      ;;
    "status")
      check_status
      ;;
    *)
      echo "用法: $0 {start|stop|restart|status}"
      echo ""
      echo "命令说明:"
      echo "  start   - 启动所有开发服务"
      echo "  stop    - 停止所有开发服务"
      echo "  restart - 重启所有开发服务"
      echo "  status  - 检查服务状态"
      exit 1
      ;;
  esac
}

# 执行主函数
main "$@"
