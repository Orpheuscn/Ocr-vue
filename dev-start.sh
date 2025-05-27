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
FRONTEND_PID_FILE="$LOG_DIR/frontend.pid"

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

  # 尝试使用brew services启动MongoDB
  if command -v brew >/dev/null 2>&1; then
    echo -e "${BLUE}尝试使用brew services启动MongoDB...${NC}"
    brew services start mongodb/brew/mongodb-community 2>/dev/null || brew services start mongodb-community 2>/dev/null

    # 等待一下让服务启动
    sleep 3

    if check_port $MONGODB_PORT > /dev/null; then
      echo -e "${GREEN}✓ MongoDB通过brew services启动成功${NC}"
      return 0
    fi
  fi

  # 如果brew services失败，尝试直接启动
  echo -e "${BLUE}尝试直接启动MongoDB...${NC}"

  # 使用默认数据目录或创建本地数据目录
  if [ -d "/usr/local/var/mongodb" ]; then
    MONGODB_DATA_DIR="/usr/local/var/mongodb"
    MONGODB_LOG_PATH="/usr/local/var/log/mongodb/mongo.log"
    mkdir -p "/usr/local/var/log/mongodb"
  else
    MONGODB_DATA_DIR="$APP_DIR/database/mongodb/data"
    MONGODB_LOG_PATH="$LOG_DIR/mongodb.log"
    mkdir -p "$MONGODB_DATA_DIR"
  fi

  # 启动MongoDB
  mongod --dbpath "$MONGODB_DATA_DIR" --port $MONGODB_PORT --fork --logpath "$MONGODB_LOG_PATH"

  if [ $? -eq 0 ]; then
    # 保存PID
    pgrep mongod > "$MONGODB_PID_FILE"
    wait_for_service $MONGODB_PORT "MongoDB"
    return $?
  else
    echo -e "${RED}✗ MongoDB启动失败${NC}"
    echo -e "${YELLOW}请检查MongoDB是否正确安装，或手动启动MongoDB服务${NC}"
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

  # 设置环境变量（与统一环境检测系统兼容）
  export NODE_ENV=development
  export FLASK_ENV=development
  export ENVIRONMENT=development

  # 检查Python服务启动脚本是否存在
  if [ ! -f "start.sh" ]; then
    echo -e "${RED}✗ Python服务启动脚本不存在: python-service/start.sh${NC}"
    cd "$APP_DIR"
    return 1
  fi

  # 确保启动脚本有执行权限
  chmod +x start.sh

  # 启动Python服务（后台运行）
  echo -e "${BLUE}调用Python服务启动脚本...${NC}"
  nohup ./start.sh > "$LOG_DIR/python.log" 2>&1 &
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

  # 启动前端开发服务器（后台运行）
  echo -e "${BLUE}启动前端开发服务器...${NC}"
  nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
  FRONTEND_PID=$!
  echo $FRONTEND_PID > "$LOG_DIR/frontend.pid"

  cd "$APP_DIR"
  wait_for_service $FRONTEND_PORT "Vue前端"

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 所有服务已启动完成！${NC}"
    echo -e "${GREEN}前端地址: http://localhost:$FRONTEND_PORT${NC}"
    echo -e "${GREEN}后端API: http://localhost:$BACKEND_PORT${NC}"
    echo -e "${GREEN}Python服务: http://localhost:$PYTHON_PORT${NC}"
    echo ""
    echo -e "${BLUE}服务日志文件位置：${NC}"
    echo -e "${GREEN}  前端日志: $LOG_DIR/frontend.log${NC}"
    echo -e "${GREEN}  后端日志: $LOG_DIR/backend.log${NC}"
    echo -e "${GREEN}  Python日志: $LOG_DIR/python.log${NC}"
    echo ""
    echo -e "${YELLOW}使用 './dev-start.sh stop' 停止所有服务${NC}"
    echo -e "${YELLOW}使用 './dev-start.sh status' 查看服务状态${NC}"
    return 0
  else
    return 1
  fi
}

# 停止所有服务
stop_services() {
  echo -e "${BLUE}停止所有开发服务...${NC}"

  # 停止前端服务
  echo -e "${BLUE}停止前端服务...${NC}"
  if [ -f "$FRONTEND_PID_FILE" ]; then
    FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
    if ps -p $FRONTEND_PID > /dev/null; then
      kill -9 $FRONTEND_PID 2>/dev/null
    fi
    rm -f "$FRONTEND_PID_FILE"
  fi
  FRONTEND_PIDS=$(lsof -ti :$FRONTEND_PORT 2>/dev/null)
  if [ -n "$FRONTEND_PIDS" ]; then
    kill -9 $FRONTEND_PIDS 2>/dev/null
  fi
  pkill -9 -f "vite.*--port $FRONTEND_PORT" 2>/dev/null
  pkill -9 -f "npm run dev" 2>/dev/null
  pkill -9 -f "vue-cli-service serve" 2>/dev/null
  echo -e "${GREEN}✓ 前端服务已停止${NC}"

  # 停止Python服务
  echo -e "${BLUE}停止Python服务...${NC}"
  if [ -f "$PYTHON_PID_FILE" ]; then
    PYTHON_PID=$(cat "$PYTHON_PID_FILE")
    if ps -p $PYTHON_PID > /dev/null; then
      kill -9 $PYTHON_PID 2>/dev/null
    fi
    rm -f "$PYTHON_PID_FILE"
  fi
  PYTHON_PIDS=$(lsof -ti :$PYTHON_PORT 2>/dev/null)
  if [ -n "$PYTHON_PIDS" ]; then
    kill -9 $PYTHON_PIDS 2>/dev/null
  fi
  echo -e "${GREEN}✓ Python服务已停止${NC}"

  # 停止Node.js后端
  echo -e "${BLUE}停止Node.js后端...${NC}"
  if [ -f "$BACKEND_PID_FILE" ]; then
    BACKEND_PID=$(cat "$BACKEND_PID_FILE")
    if ps -p $BACKEND_PID > /dev/null; then
      kill -9 $BACKEND_PID 2>/dev/null
    fi
    rm -f "$BACKEND_PID_FILE"
  fi
  BACKEND_PIDS=$(lsof -ti :$BACKEND_PORT 2>/dev/null)
  if [ -n "$BACKEND_PIDS" ]; then
    kill -9 $BACKEND_PIDS 2>/dev/null
  fi
  echo -e "${GREEN}✓ Node.js后端已停止${NC}"

  # 停止MongoDB
  echo -e "${BLUE}停止MongoDB...${NC}"
  # 先尝试通过brew services停止
  if command -v brew >/dev/null 2>&1; then
    brew services stop mongodb/brew/mongodb-community 2>/dev/null || brew services stop mongodb-community 2>/dev/null
  fi
  # 停止PID文件中的进程
  if [ -f "$MONGODB_PID_FILE" ]; then
    MONGODB_PID=$(cat "$MONGODB_PID_FILE")
    if ps -p $MONGODB_PID > /dev/null; then
      kill -9 $MONGODB_PID 2>/dev/null
    fi
    rm -f "$MONGODB_PID_FILE"
  fi
  # 停止端口上的进程
  MONGODB_PIDS=$(lsof -ti :$MONGODB_PORT 2>/dev/null)
  if [ -n "$MONGODB_PIDS" ]; then
    kill -9 $MONGODB_PIDS 2>/dev/null
  fi
  # 停止所有mongod进程
  pkill -9 mongod 2>/dev/null
  echo -e "${GREEN}✓ MongoDB已停止${NC}"

  # 清理所有PID文件
  rm -f "$MONGODB_PID_FILE" "$BACKEND_PID_FILE" "$PYTHON_PID_FILE" "$FRONTEND_PID_FILE"

  echo -e "${GREEN}所有服务已停止${NC}"
}

# 检查环境配置
check_environment() {
  echo -e "${BLUE}检查开发环境配置...${NC}"

  # 检查Node.js
  if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js已安装: $NODE_VERSION${NC}"
  else
    echo -e "${RED}✗ Node.js未安装${NC}"
    return 1
  fi

  # 检查Python（优先检查python3.9）
  if command -v python3.9 >/dev/null 2>&1; then
    PYTHON_VERSION=$(python3.9 --version)
    echo -e "${GREEN}✓ Python 3.9已安装: $PYTHON_VERSION${NC}"
  elif command -v python3 >/dev/null 2>&1; then
    PYTHON_VERSION=$(python3 --version 2>/dev/null || echo "Python版本检查失败")
    echo -e "${YELLOW}⚠ 找到Python3，但建议使用Python 3.9: $PYTHON_VERSION${NC}"
  else
    echo -e "${RED}✗ Python3未安装${NC}"
    return 1
  fi

  # 检查MongoDB
  if command -v mongod >/dev/null 2>&1; then
    MONGODB_VERSION=$(mongod --version | head -1)
    echo -e "${GREEN}✓ MongoDB已安装: $MONGODB_VERSION${NC}"
  else
    echo -e "${RED}✗ MongoDB未安装${NC}"
    return 1
  fi

  # 检查环境配置文件
  echo -e "${BLUE}检查环境配置文件...${NC}"

  if [ -f "$APP_DIR/backend/.env.local" ]; then
    echo -e "${GREEN}✓ 后端环境配置文件存在${NC}"
  else
    echo -e "${YELLOW}⚠ 后端环境配置文件不存在${NC}"
  fi

  if [ -f "$APP_DIR/frontend/.env.local" ]; then
    echo -e "${GREEN}✓ 前端环境配置文件存在${NC}"
  else
    echo -e "${YELLOW}⚠ 前端环境配置文件不存在${NC}"
  fi

  if [ -f "$APP_DIR/python-service/.env.local" ]; then
    echo -e "${GREEN}✓ Python服务环境配置文件存在${NC}"
  else
    echo -e "${YELLOW}⚠ Python服务环境配置文件不存在${NC}"
  fi

  # 检查代理配置（开发环境）
  echo -e "${BLUE}检查代理配置...${NC}"

  # 检查系统环境变量中的代理
  SYSTEM_PROXY_SET=false
  if [ -n "$HTTP_PROXY" ] || [ -n "$HTTPS_PROXY" ]; then
    SYSTEM_PROXY_SET=true
    echo -e "${GREEN}✓ 系统环境变量代理已配置${NC}"
    echo -e "${GREEN}  HTTP_PROXY: ${HTTP_PROXY:-未设置}${NC}"
    echo -e "${GREEN}  HTTPS_PROXY: ${HTTPS_PROXY:-未设置}${NC}"
  fi

  # 检查后端配置文件中的代理设置
  BACKEND_PROXY_SET=false
  if [ -f "$APP_DIR/backend/.env.local" ]; then
    BACKEND_HTTP_PROXY=$(grep "^HTTP_PROXY=" "$APP_DIR/backend/.env.local" 2>/dev/null | cut -d'=' -f2)
    BACKEND_HTTPS_PROXY=$(grep "^HTTPS_PROXY=" "$APP_DIR/backend/.env.local" 2>/dev/null | cut -d'=' -f2)
    FORCE_PROXY=$(grep "^FORCE_PROXY=" "$APP_DIR/backend/.env.local" 2>/dev/null | cut -d'=' -f2)

    if [ -n "$BACKEND_HTTP_PROXY" ] || [ -n "$BACKEND_HTTPS_PROXY" ] || [ "$FORCE_PROXY" = "true" ]; then
      BACKEND_PROXY_SET=true
      echo -e "${GREEN}✓ 后端配置文件代理已配置${NC}"
      echo -e "${GREEN}  HTTP_PROXY: ${BACKEND_HTTP_PROXY:-未设置}${NC}"
      echo -e "${GREEN}  HTTPS_PROXY: ${BACKEND_HTTPS_PROXY:-未设置}${NC}"
      echo -e "${GREEN}  FORCE_PROXY: ${FORCE_PROXY:-false}${NC}"
    fi
  fi

  # 检查Python服务配置文件中的代理设置
  PYTHON_PROXY_SET=false
  if [ -f "$APP_DIR/python-service/.env.local" ]; then
    PYTHON_HTTP_PROXY=$(grep "^HTTP_PROXY=" "$APP_DIR/python-service/.env.local" 2>/dev/null | cut -d'=' -f2)
    PYTHON_HTTPS_PROXY=$(grep "^HTTPS_PROXY=" "$APP_DIR/python-service/.env.local" 2>/dev/null | cut -d'=' -f2)

    if [ -n "$PYTHON_HTTP_PROXY" ] || [ -n "$PYTHON_HTTPS_PROXY" ]; then
      PYTHON_PROXY_SET=true
      echo -e "${GREEN}✓ Python服务配置文件代理已配置${NC}"
      echo -e "${GREEN}  HTTP_PROXY: ${PYTHON_HTTP_PROXY:-未设置}${NC}"
      echo -e "${GREEN}  HTTPS_PROXY: ${PYTHON_HTTPS_PROXY:-未设置}${NC}"
    fi
  fi

  # 总结代理配置状态
  if [ "$SYSTEM_PROXY_SET" = true ] || [ "$BACKEND_PROXY_SET" = true ] || [ "$PYTHON_PROXY_SET" = true ]; then
    echo -e "${GREEN}✓ 开发环境代理配置正常${NC}"
  else
    echo -e "${YELLOW}⚠ 开发环境代理未配置，如果网络访问有问题请设置代理${NC}"
    echo -e "${YELLOW}  建议在后端配置文件中设置: FORCE_PROXY=true${NC}"
    echo -e "${YELLOW}  建议设置代理地址: HTTP_PROXY=http://127.0.0.1:7890${NC}"
  fi

  return 0
}

# 检查服务状态
check_status() {
  echo -e "${BLUE}检查服务状态...${NC}"

  # 检查MongoDB
  if check_port $MONGODB_PORT > /dev/null; then
    echo -e "${GREEN}✓ MongoDB运行中 (端口 $MONGODB_PORT)${NC}"
    # 尝试连接测试
    if command -v mongosh >/dev/null 2>&1; then
      if mongosh --eval "db.runCommand('ping')" --quiet >/dev/null 2>&1; then
        echo -e "${GREEN}  - 数据库连接正常${NC}"
      else
        echo -e "${YELLOW}  - 数据库连接测试失败${NC}"
      fi
    fi
  else
    echo -e "${RED}✗ MongoDB未运行${NC}"
  fi

  # 检查Node.js后端
  if check_port $BACKEND_PORT > /dev/null; then
    echo -e "${GREEN}✓ Node.js后端运行中 (端口 $BACKEND_PORT)${NC}"
    # 尝试健康检查
    if curl -s http://localhost:$BACKEND_PORT/api/health >/dev/null 2>&1; then
      echo -e "${GREEN}  - API健康检查通过${NC}"
    else
      echo -e "${YELLOW}  - API健康检查失败${NC}"
    fi
  else
    echo -e "${RED}✗ Node.js后端未运行${NC}"
  fi

  # 检查Python服务
  if check_port $PYTHON_PORT > /dev/null; then
    echo -e "${GREEN}✓ Python服务运行中 (端口 $PYTHON_PORT)${NC}"
    # 尝试健康检查
    if curl -s http://localhost:$PYTHON_PORT/ >/dev/null 2>&1; then
      echo -e "${GREEN}  - Python服务响应正常${NC}"
    else
      echo -e "${YELLOW}  - Python服务响应异常${NC}"
    fi
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

# 查看日志
show_logs() {
  echo -e "${BLUE}查看服务日志...${NC}"

  case "$1" in
    "frontend"|"前端")
      if [ -f "$LOG_DIR/frontend.log" ]; then
        echo -e "${GREEN}=== 前端服务日志 ===${NC}"
        tail -f "$LOG_DIR/frontend.log"
      else
        echo -e "${RED}前端日志文件不存在${NC}"
      fi
      ;;
    "backend"|"后端")
      if [ -f "$LOG_DIR/backend.log" ]; then
        echo -e "${GREEN}=== 后端服务日志 ===${NC}"
        tail -f "$LOG_DIR/backend.log"
      else
        echo -e "${RED}后端日志文件不存在${NC}"
      fi
      ;;
    "python"|"Python")
      if [ -f "$LOG_DIR/python.log" ]; then
        echo -e "${GREEN}=== Python服务日志 ===${NC}"
        tail -f "$LOG_DIR/python.log"
      else
        echo -e "${RED}Python日志文件不存在${NC}"
      fi
      ;;
    "mongodb"|"数据库")
      if [ -f "$LOG_DIR/mongodb.log" ]; then
        echo -e "${GREEN}=== MongoDB日志 ===${NC}"
        tail -f "$LOG_DIR/mongodb.log"
      else
        echo -e "${RED}MongoDB日志文件不存在${NC}"
      fi
      ;;
    "all"|"全部"|"")
      echo -e "${GREEN}=== 所有服务日志概览 ===${NC}"
      echo -e "${BLUE}前端日志 (最后10行):${NC}"
      if [ -f "$LOG_DIR/frontend.log" ]; then
        tail -10 "$LOG_DIR/frontend.log"
      else
        echo "前端日志文件不存在"
      fi
      echo ""
      echo -e "${BLUE}后端日志 (最后10行):${NC}"
      if [ -f "$LOG_DIR/backend.log" ]; then
        tail -10 "$LOG_DIR/backend.log"
      else
        echo "后端日志文件不存在"
      fi
      echo ""
      echo -e "${BLUE}Python日志 (最后10行):${NC}"
      if [ -f "$LOG_DIR/python.log" ]; then
        tail -10 "$LOG_DIR/python.log"
      else
        echo "Python日志文件不存在"
      fi
      ;;
    *)
      echo "用法: $0 logs [frontend|backend|python|mongodb|all]"
      echo ""
      echo "日志选项:"
      echo "  frontend  - 查看前端服务日志"
      echo "  backend   - 查看后端服务日志"
      echo "  python    - 查看Python服务日志"
      echo "  mongodb   - 查看MongoDB日志"
      echo "  all       - 查看所有服务日志概览"
      ;;
  esac
}

# 主函数
main() {
  case "$1" in
    "start")
      echo -e "${GREEN}=== 启动本地开发环境 ===${NC}"
      # 先检查环境配置
      if ! check_environment; then
        echo -e "${RED}环境检查失败，请先解决上述问题${NC}"
        exit 1
      fi
      echo ""
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
    "check"|"env")
      check_environment
      ;;
    "test")
      echo -e "${GREEN}=== 测试开发环境 ===${NC}"
      check_environment
      echo ""
      check_status
      echo ""
      echo -e "${BLUE}测试环境检测系统...${NC}"
      if [ -f "$APP_DIR/Test/backend-environment-simple-test.js" ]; then
        node "$APP_DIR/Test/backend-environment-simple-test.js"
      else
        echo -e "${YELLOW}后端环境测试脚本不存在${NC}"
      fi
      ;;
    "logs")
      show_logs "$2"
      ;;
    *)
      echo "用法: $0 {start|stop|restart|status|check|test|logs}"
      echo ""
      echo "命令说明:"
      echo "  start   - 启动所有开发服务"
      echo "  stop    - 停止所有开发服务"
      echo "  restart - 重启所有开发服务"
      echo "  status  - 检查服务状态"
      echo "  check   - 检查开发环境配置"
      echo "  test    - 全面测试开发环境"
      echo "  logs    - 查看服务日志"
      echo ""
      echo "示例:"
      echo "  $0 start              # 启动开发环境"
      echo "  $0 check              # 检查环境配置"
      echo "  $0 test               # 测试所有功能"
      echo "  $0 logs frontend      # 查看前端日志"
      echo "  $0 logs all           # 查看所有日志概览"
      exit 1
      ;;
  esac
}

# 执行主函数
main "$@"
