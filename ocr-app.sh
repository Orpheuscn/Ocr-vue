#!/bin/bash

# ==========================================
# OCR应用管理脚本
# ==========================================
# 此脚本用于管理OCR应用的所有组件:
# 1. MongoDB数据库服务
# 2. 后端API服务器
# 3. Nginx服务器(用于提供前端静态文件并代理API请求)
# 4. Python服务器(用于图像坐标映射功能)
# 
# 使用方法:
#   ./ocr-app.sh start - 启动所有服务
#   ./ocr-app.sh stop  - 安全停止所有服务
#   ./ocr-app.sh restart - 重启所有服务
#   ./ocr-app.sh status - 显示服务状态
#   ./ocr-app.sh monitor - 启动持续监控(作为守护进程运行)
# ==========================================

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

# 获取当前目录的绝对路径
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$APP_DIR/logs"
WATCHDOG_LOG="$LOG_DIR/watchdog.log"
PID_FILE="$LOG_DIR/app.pid"
WATCHDOG_PID_FILE="$LOG_DIR/watchdog.pid"
NGINX_CONF="$APP_DIR/nginx/nginx.conf"

# MongoDB配置
MONGODB_DIR="$APP_DIR/database/mongodb"
MONGODB_DATA="$MONGODB_DIR/data"
MONGODB_LOG="$LOG_DIR/mongodb.log"
MONGODB_PID_FILE="$LOG_DIR/mongodb.pid"
MONGODB_PORT=27017
MONGODB_CONFIG="$MONGODB_DIR/mongod.conf"

# Python服务配置
PYTHON_SERVICE_DIR="$APP_DIR/python-service"
PYTHON_VENV="$PYTHON_SERVICE_DIR/venv"
PYTHON_LOG="$LOG_DIR/python-service.log"
PYTHON_PID_FILE="$LOG_DIR/python-service.pid"
PYTHON_PORT=5000

# 功能函数：显示帮助信息
show_help() {
  echo -e "${GREEN}OCR Vue应用管理脚本${NC}"
  echo -e "用法: $0 {start|stop|restart|status|monitor}"
  echo -e "  start   - 启动所有服务"
  echo -e "  stop    - 安全停止所有服务"
  echo -e "  restart - 重启所有服务"
  echo -e "  status  - 显示服务状态"
  echo -e "  monitor - 启动持续监控(作为守护进程运行)"
}

# 功能函数：检查端口是否被占用
check_port() {
  local port=$1
  local usage=$(lsof -i :$port 2>/dev/null | grep LISTEN)
  if [ -z "$usage" ]; then
    # 再使用netstat检查一次，因为有时lsof可能无法显示结果
    usage=$(netstat -an | grep LISTEN | grep "\.$port")
  fi
  echo "$usage"
}

# 功能函数：检查服务状态
check_status() {
  echo -e "${BLUE}检查OCR应用服务状态...${NC}"
  
  # 检查MongoDB服务
  if pgrep mongod > /dev/null; then
    MONGODB_PID=$(pgrep mongod)
    echo -e "${GREEN}✓ MongoDB服务正在运行 (PID: $MONGODB_PID)${NC}"
    
    # 测试MongoDB连接
    if command -v mongosh &> /dev/null; then
      mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1
      MONGO_RESULT=$?
    else
      # 回退到旧版的mongo命令行工具
      mongo --eval "db.adminCommand('ping')" > /dev/null 2>&1
      MONGO_RESULT=$?
    fi

    if [ $MONGO_RESULT -eq 0 ]; then
      echo -e "${GREEN}✓ MongoDB连接测试成功${NC}"
    else
      echo -e "${YELLOW}警告: MongoDB服务已启动但连接测试失败${NC}"
      echo -e "${YELLOW}请检查日志: $MONGODB_LOG${NC}"
      # 虽然连接测试失败，但我们仍然返回成功，因为MongoDB服务可能已经启动
      # 后端应用将通过Node.js的MongoDB驱动连接，这可能会工作
    fi
  else
    echo -e "${RED}✗ MongoDB服务未运行${NC}"
  fi
  
  # 检查后端服务
  BACKEND_PID=$(ps aux | grep "node start.js" | grep -v grep | awk '{print $2}')
  if [ ! -z "$BACKEND_PID" ]; then
    echo -e "${GREEN}✓ 后端服务正在运行 (PID: $BACKEND_PID)${NC}"
  else
    echo -e "${RED}✗ 后端服务未运行${NC}"
  fi
  
  # 检查Nginx服务
  if ps aux | grep "nginx: master" | grep -v grep > /dev/null; then
    echo -e "${GREEN}✓ Nginx服务正在运行${NC}"
    # 检查Nginx端口
    PORTS_TO_CHECK=(8080 8443)
    for port in "${PORTS_TO_CHECK[@]}"; do
      PORT_USAGE=$(check_port $port)
      if [ ! -z "$PORT_USAGE" ]; then
        echo -e "${GREEN}  - 端口 $port 已绑定${NC}"
      else
        echo -e "${YELLOW}  - 警告: 端口 $port 未绑定${NC}"
      fi
    done
  else
    echo -e "${RED}✗ Nginx服务未运行${NC}"
  fi
  
  # 检查Python服务
  PYTHON_PID=$(pgrep -f "python.*server.py")
  if [ ! -z "$PYTHON_PID" ]; then
    echo -e "${GREEN}✓ Python服务正在运行 (PID: $PYTHON_PID)${NC}"
    
    # 检查Python服务端口
    PORT_USAGE=$(check_port $PYTHON_PORT)
    if [ ! -z "$PORT_USAGE" ]; then
      echo -e "${GREEN}  - 端口 $PYTHON_PORT 已绑定${NC}"
    else
      echo -e "${YELLOW}  - 警告: 端口 $PYTHON_PORT 未绑定${NC}"
    fi
    
    # 尝试请求Python服务
    if curl -s http://localhost:$PYTHON_PORT > /dev/null; then
      echo -e "${GREEN}  - Python服务响应正常${NC}"
    else
      echo -e "${YELLOW}  - 警告: Python服务端口已绑定但服务未响应${NC}"
    fi
  else
    echo -e "${RED}✗ Python服务未运行${NC}"
  fi
  
  # 检查持续监控服务
  if [ -f "$WATCHDOG_PID_FILE" ]; then
    MONITOR_PID=$(cat "$WATCHDOG_PID_FILE")
    if ps -p $MONITOR_PID > /dev/null; then
      echo -e "${GREEN}✓ 持续监控服务正在运行 (PID: $MONITOR_PID)${NC}"
    else
      echo -e "${YELLOW}! 持续监控服务PID文件存在但进程已停止${NC}"
      rm -f "$WATCHDOG_PID_FILE"
    fi
  else
    echo -e "${YELLOW}! 持续监控服务未运行${NC}"
  fi
  
  # 尝试API健康检查
  echo -e "${BLUE}尝试API健康检查...${NC}"
  health_response=$(curl -s -m 2 http://localhost:3000/api/health)
  if [ $? -eq 0 ] && [ ! -z "$health_response" ]; then
    # 检查数据库状态
    db_status=$(echo $health_response | grep -o '"database":{"status":"[^"]*"' | cut -d'"' -f6)
    if [ "$db_status" == "connected" ]; then
      echo -e "${GREEN}✓ API响应正常，数据库已连接${NC}"
    else
      echo -e "${YELLOW}! API响应正常，但数据库未连接 (状态: $db_status)${NC}"
    fi
  else
    echo -e "${RED}✗ API健康检查失败${NC}"
  fi
}

# 功能函数：安全停止所有服务
stop_services() {
  echo -e "${BLUE}正在安全停止所有OCR应用服务...${NC}"
  
  # 首先停止持续监控服务
  if [ -f "$WATCHDOG_PID_FILE" ]; then
    MONITOR_PID=$(cat "$WATCHDOG_PID_FILE")
    if ps -p $MONITOR_PID > /dev/null; then
      echo -e "${BLUE}停止持续监控服务 (PID: $MONITOR_PID)...${NC}"
      kill $MONITOR_PID
      sleep 1
      
      # 确认进程已停止
      if ps -p $MONITOR_PID > /dev/null; then
        echo -e "${YELLOW}持续监控服务未响应，尝试强制终止...${NC}"
        kill -9 $MONITOR_PID
        sleep 1
      fi
      
      if ! ps -p $MONITOR_PID > /dev/null; then
        echo -e "${GREEN}✓ 持续监控服务已停止${NC}"
        rm -f "$WATCHDOG_PID_FILE"
      else
        echo -e "${RED}✗ 无法停止持续监控服务${NC}"
      fi
    else
      echo -e "${YELLOW}持续监控服务PID文件存在但进程已停止${NC}"
      rm -f "$WATCHDOG_PID_FILE"
    fi
  fi
  
  # 停止Python服务
  stop_python_service
  if [ $? -ne 0 ]; then
    echo -e "${RED}Python服务停止失败，继续停止其他服务${NC}"
  fi
  
  # 先停止后端服务，确保关闭与 MongoDB 的连接
  BACKEND_PID=$(ps aux | grep "node start.js" | grep -v grep | awk '{print $2}')
  if [ ! -z "$BACKEND_PID" ]; then
    echo -e "${BLUE}正在停止后端服务 (PID: $BACKEND_PID)...${NC}"
    # 首先尝试优雅停止
    kill -SIGTERM $BACKEND_PID
    
    # 等待进程退出
    echo -e "${BLUE}等待后端服务停止...${NC}"
    WAIT_COUNT=0
    while ps -p $BACKEND_PID > /dev/null && [ $WAIT_COUNT -lt 10 ]; do
      sleep 1
      WAIT_COUNT=$((WAIT_COUNT+1))
    done
    
    # 如果进程仍在运行，强制终止
    if ps -p $BACKEND_PID > /dev/null; then
      echo -e "${YELLOW}后端服务未响应SIGTERM信号，正在强制终止...${NC}"
      kill -9 $BACKEND_PID
      sleep 1
    fi
    
    if ! ps -p $BACKEND_PID > /dev/null; then
      echo -e "${GREEN}✓ 后端服务已停止${NC}"
    else
      echo -e "${RED}✗ 无法停止后端服务${NC}"
      return 1
    fi
  else
    echo -e "${YELLOW}后端服务未运行${NC}"
  fi
  
  # 等待一秒，确保所有数据库连接已关闭
  sleep 1
  
  # 然后停止MongoDB数据库
  stop_mongodb
  
  # 停止Nginx服务
  if ps aux | grep "nginx: master" | grep -v grep > /dev/null; then
    echo -e "${BLUE}正在停止Nginx服务...${NC}"
    
    # 检查配置文件是否存在
    if [ ! -f "$NGINX_CONF" ]; then
      echo -e "${YELLOW}警告: Nginx配置文件不存在: $NGINX_CONF${NC}"
      echo -e "${YELLOW}尝试直接停止所有Nginx进程...${NC}"
    else
      # 正常方式停止Nginx
      echo -e "${BLUE}尝试使用配置文件停止Nginx: $NGINX_CONF${NC}"
      sudo nginx -s stop -c "$NGINX_CONF" 2>/dev/null
    fi
    
    # 等待Nginx停止
    sleep 2
    
    # 检查端口是否仍被占用
    PORTS_TO_CHECK=(8080 8443)
    PORTS_STILL_IN_USE=false
    
    for port in "${PORTS_TO_CHECK[@]}"; do
      PORT_USAGE=$(check_port $port)
      if [ ! -z "$PORT_USAGE" ]; then
        echo -e "${YELLOW}端口 $port 仍被占用，尝试查找进程...${NC}"
        PORTS_STILL_IN_USE=true
        echo -e "${YELLOW}占用端口 $port 的进程信息:${NC}"
        echo "$PORT_USAGE"
      fi
    done
    
    if [ "$PORTS_STILL_IN_USE" = true ]; then
      # 尝试找出所有Nginx进程
      NGINX_PIDS=$(ps aux | grep nginx | grep -v grep | awk '{print $2}')
      if [ ! -z "$NGINX_PIDS" ]; then
        echo -e "${YELLOW}找到以下Nginx进程，准备终止:${NC}"
        echo "$NGINX_PIDS"
        echo "$NGINX_PIDS" | xargs sudo kill -9
        echo -e "${GREEN}已终止所有Nginx进程${NC}"
      else
        echo -e "${YELLOW}未找到Nginx进程，但仍有端口被占用${NC}"
      fi
    else
      echo -e "${GREEN}所有端口已释放${NC}"
    fi
    
    # 最后检查一次端口状态
    sleep 1
    ALL_PORTS_FREE=true
    
    for port in "${PORTS_TO_CHECK[@]}"; do
      PORT_USAGE=$(check_port $port)
      if [ ! -z "$PORT_USAGE" ]; then
        echo -e "${RED}⚠️ 警告: 端口 $port 仍被占用，请手动检查:${NC}"
        echo "$PORT_USAGE"
        ALL_PORTS_FREE=false
      fi
    done
    
    if [ "$ALL_PORTS_FREE" = true ]; then
      echo -e "${GREEN}✅ Nginx已成功停止，所有端口已释放${NC}"
    else
      echo -e "${RED}无法完全停止Nginx，请手动处理${NC}"
      return 1
    fi
  else
    echo -e "${YELLOW}Nginx服务未运行${NC}"
  fi
  
  # 清理PID文件
  if [ -f "$PID_FILE" ]; then
    rm -f "$PID_FILE"
  fi
  
  echo -e "${GREEN}所有服务已安全停止${NC}"
  return 0
}

# 功能函数：启动Nginx服务
start_nginx() {
  echo -e "${BLUE}正在启动Nginx服务...${NC}"
  
  # 检查Nginx配置文件是否存在
  if [ ! -f "$NGINX_CONF" ]; then
    echo -e "${RED}错误: Nginx配置文件不存在: $NGINX_CONF${NC}"
    return 1
  fi
  
  # 检查Nginx配置是否正确
  echo -e "${BLUE}检查Nginx配置...${NC}"
  sudo nginx -t -c "$NGINX_CONF"
  if [ $? -ne 0 ]; then
    echo -e "${RED}错误: Nginx配置文件有误${NC}"
    return 1
  fi
  
  # 尝试停止已有的Nginx实例
  if ps aux | grep "nginx: master" | grep -v grep > /dev/null; then
    echo -e "${YELLOW}检测到Nginx已运行，尝试先停止...${NC}"
    sudo nginx -s stop > /dev/null 2>&1
    sleep 2
  fi
  
  # 启动Nginx
  echo -e "${BLUE}正在启动Nginx...${NC}"
  sudo nginx -c "$NGINX_CONF"
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Nginx服务已启动${NC}"
    
    # 检查端口绑定
    sleep 1
    PORTS_TO_CHECK=(8080 8443)
    ALL_PORTS_BOUND=true
    
    for port in "${PORTS_TO_CHECK[@]}"; do
      PORT_USAGE=$(check_port $port)
      if [ -z "$PORT_USAGE" ]; then
        echo -e "${YELLOW}警告: 端口 $port 未成功绑定${NC}"
        ALL_PORTS_BOUND=false
      else
        echo -e "${GREEN}✓ 端口 $port 已成功绑定${NC}"
      fi
    done
    
    if [ "$ALL_PORTS_BOUND" = true ]; then
      echo -e "${GREEN}✓ Nginx所有端口已成功绑定${NC}"
    else
      echo -e "${YELLOW}警告: 部分端口未成功绑定，但Nginx已启动${NC}"
    fi
    
    return 0
  else
    echo -e "${RED}✗ Nginx启动失败${NC}"
    return 1
  fi
}

# 功能函数：启动持续监控服务
start_monitor() {
  # 检查是否已经在运行
  if [ -f "$WATCHDOG_PID_FILE" ]; then
    MONITOR_PID=$(cat "$WATCHDOG_PID_FILE")
    if ps -p $MONITOR_PID > /dev/null; then
      echo -e "${YELLOW}持续监控服务已在运行 (PID: $MONITOR_PID)${NC}"
      return 0
    else
      echo -e "${YELLOW}清理过期的监控PID文件${NC}"
      rm -f "$WATCHDOG_PID_FILE"
    fi
  fi
  
  echo -e "${BLUE}启动持续监控服务...${NC}"
  
  # 创建一个后台循环来定期执行watchdog.sh
  (
    while true; do
      # 记录开始时间
      echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] 执行定期监控检查" >> "$WATCHDOG_LOG"
      
      # 执行watchdog脚本
      bash "$APP_DIR/watchdog.sh" >> "$WATCHDOG_LOG" 2>&1
      
      # 间隔5分钟
      sleep 300
    done
  ) &
  
  # 保存监控进程PID
  MONITOR_PID=$!
  echo $MONITOR_PID > "$WATCHDOG_PID_FILE"
  
  echo -e "${GREEN}✓ 持续监控服务已启动 (PID: $MONITOR_PID)${NC}"
  echo -e "${BLUE}监控日志将写入: $WATCHDOG_LOG${NC}"
  
  return 0
}

# 功能函数：启动MongoDB数据库
start_mongodb() {
  echo -e "${BLUE}正在启动MongoDB数据库...${NC}"
  
  # 确保MongoDB目录存在
  mkdir -p "$MONGODB_DATA"
  mkdir -p "$LOG_DIR"
  
  # 检查mongod.conf是否存在
  if [ ! -f "$MONGODB_CONFIG" ]; then
    echo -e "${YELLOW}MongoDB配置文件不存在，创建默认配置...${NC}"
    # 创建默认配置文件
    cat > "$MONGODB_CONFIG" << EOF
storage:
  dbPath: ${MONGODB_DATA}
systemLog:
  destination: file
  path: ${MONGODB_LOG}
  logAppend: true
net:
  port: ${MONGODB_PORT}
  bindIp: 127.0.0.1
EOF
  fi
  
  # 检查MongoDB是否已经运行
  if pgrep mongod > /dev/null; then
    echo -e "${YELLOW}MongoDB已在运行，跳过启动步骤${NC}"
    return 0
  fi
  
  # 启动MongoDB
  echo -e "${BLUE}启动MongoDB服务...${NC}"
  mongod --config "$MONGODB_CONFIG" --fork
  
  if [ $? -eq 0 ]; then
    # 保存PID
    pgrep mongod > "$MONGODB_PID_FILE"
    echo -e "${GREEN}✓ MongoDB服务已成功启动${NC}"
    
    # 等待MongoDB完全启动
    echo -e "${BLUE}等待MongoDB初始化...${NC}"
    sleep 3
    
    # 测试MongoDB连接
    if command -v mongosh &> /dev/null; then
      mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1
      MONGO_RESULT=$?
    else
      # 回退到旧版的mongo命令行工具
      mongo --eval "db.adminCommand('ping')" > /dev/null 2>&1
      MONGO_RESULT=$?
    fi

    if [ $MONGO_RESULT -eq 0 ]; then
      echo -e "${GREEN}✓ MongoDB连接测试成功${NC}"
      return 0
    else
      echo -e "${YELLOW}警告: MongoDB服务已启动但连接测试失败${NC}"
      echo -e "${YELLOW}请检查日志: $MONGODB_LOG${NC}"
      # 虽然连接测试失败，但我们仍然返回成功，因为MongoDB服务可能已经启动
      # 后端应用将通过Node.js的MongoDB驱动连接，这可能会工作
      return 0
    fi
  else
    echo -e "${RED}✗ MongoDB启动失败${NC}"
    echo -e "${YELLOW}请检查日志: $MONGODB_LOG${NC}"
    return 1
  fi
}

# 功能函数：停止MongoDB数据库
stop_mongodb() {
  echo -e "${BLUE}正在停止MongoDB数据库...${NC}"
  
  # 先检查是否有其他进程仍在使用MongoDB
  echo -e "${BLUE}检查是否有其他进程仍在使用MongoDB...${NC}"
  MONGO_CONNECTIONS=$(lsof -i:27017 | grep -v mongod | wc -l)
  if [ $MONGO_CONNECTIONS -gt 0 ]; then
    echo -e "${YELLOW}警告: 检测到还有 $MONGO_CONNECTIONS 个连接到MongoDB的进程${NC}"
    echo -e "${BLUE}等待这些连接关闭 (5秒)...${NC}"
    sleep 5
  fi
  
  # 检查PID文件
  if [ -f "$MONGODB_PID_FILE" ]; then
    MONGODB_PID=$(cat "$MONGODB_PID_FILE")
    if ps -p $MONGODB_PID > /dev/null; then
      echo -e "${BLUE}尝试优雅关闭MongoDB进程 (PID: $MONGODB_PID)...${NC}"
      
      # 先尝试使用mongosh优雅关闭
      echo -e "${BLUE}执行优雅关闭命令...${NC}"
      mongosh admin --eval "db.adminCommand({shutdown: 1, force: false})" 2>/dev/null
      
      # 等待更长时间以确保关闭完成
      echo -e "${BLUE}等待MongoDB关闭 (5秒)...${NC}"
      WAIT_COUNT=0
      while ps -p $MONGODB_PID > /dev/null && [ $WAIT_COUNT -lt 5 ]; do
        sleep 1
        WAIT_COUNT=$((WAIT_COUNT+1))
      done
      
      # 如果优雅关闭失败，尝试发送SIGTERM信号
      if ps -p $MONGODB_PID > /dev/null; then
        echo -e "${YELLOW}优雅关闭失败，尝试发送SIGTERM信号...${NC}"
        kill -SIGTERM $MONGODB_PID
        sleep 3
      fi
      
      # 如果进程仍在运行，尝试pkill
      if ps -p $MONGODB_PID > /dev/null; then
        echo -e "${YELLOW}SIGTERM信号失败，尝试pkill...${NC}"
        pkill mongod
        sleep 2
      fi
      
      # 最后尝试强制终止
      if ps -p $MONGODB_PID > /dev/null; then
        echo -e "${YELLOW}所有关闭尝试失败，强制终止MongoDB...${NC}"
        kill -9 $MONGODB_PID
        sleep 1
      fi
      
      if ! ps -p $MONGODB_PID > /dev/null; then
        echo -e "${GREEN}✓ MongoDB已成功停止${NC}"
        rm -f "$MONGODB_PID_FILE"
      else
        echo -e "${RED}✗ 无法停止MongoDB${NC}"
        return 1
      fi
    else
      echo -e "${YELLOW}MongoDB PID文件存在但进程已停止${NC}"
      rm -f "$MONGODB_PID_FILE"
    fi
  elif pgrep mongod > /dev/null; then
    echo -e "${YELLOW}未找到MongoDB PID文件，但检测到mongod进程${NC}"
    echo -e "${BLUE}尝试停止所有MongoDB实例...${NC}"
    
    # 先尝试优雅关闭
    echo -e "${BLUE}执行优雅关闭命令...${NC}"
    mongosh admin --eval "db.adminCommand({shutdown: 1, force: false})" 2>/dev/null
    sleep 3
    
    # 如果进程仍在运行，尝试pkill
    if pgrep mongod > /dev/null; then
      echo -e "${YELLOW}优雅关闭失败，尝试pkill...${NC}"
      pkill mongod
      sleep 2
    fi
    
    # 最后尝试强制终止
    if pgrep mongod > /dev/null; then
      echo -e "${YELLOW}所有关闭尝试失败，强制终止MongoDB...${NC}"
      pkill -9 mongod
      sleep 1
    fi
    
    if ! pgrep mongod > /dev/null; then
      echo -e "${GREEN}✓ MongoDB已成功停止${NC}"
    else
      echo -e "${RED}✗ 无法停止MongoDB${NC}"
      return 1
    fi
  else
    echo -e "${YELLOW}MongoDB未运行${NC}"
  fi
  
  # 最后等待一下，确保所有资源都已释放
  sleep 2
  echo -e "${GREEN}MongoDB关闭完成${NC}"
  return 0
}

# 功能函数：启动Python服务
start_python_service() {
  echo -e "${BLUE}正在启动Python服务...${NC}"
  
  # 检查Python服务是否已经运行
  if pgrep -f "python.*server.py" > /dev/null; then
    echo -e "${YELLOW}Python服务已在运行，跳过启动步骤${NC}"
    return 0
  fi
  
  # 确保Python服务目录存在
  if [ ! -d "$PYTHON_SERVICE_DIR" ]; then
    echo -e "${RED}错误: Python服务目录不存在: $PYTHON_SERVICE_DIR${NC}"
    return 1
  fi
  
  # 检查虚拟环境是否存在
  if [ ! -d "$PYTHON_VENV" ]; then
    echo -e "${YELLOW}Python虚拟环境不存在，正在创建...${NC}"
    cd "$PYTHON_SERVICE_DIR"
    python3.9 -m venv venv
    
    if [ $? -ne 0 ]; then
      echo -e "${RED}错误: 无法创建Python虚拟环境${NC}"
      return 1
    fi
  fi
  
  # 准备启动Python服务
  cd "$PYTHON_SERVICE_DIR"
  
  # 确保upload目录存在
  mkdir -p "$PYTHON_SERVICE_DIR/uploads/results"
  
  echo -e "${BLUE}激活虚拟环境并启动Python服务...${NC}"
  # 启动Python服务并记录日志
  (
    source "$PYTHON_VENV/bin/activate"
    python server.py > "$PYTHON_LOG" 2>&1 &
    echo $! > "$PYTHON_PID_FILE"
  )
  
  # 检查进程是否启动
  if [ ! -f "$PYTHON_PID_FILE" ]; then
    echo -e "${RED}✗ Python服务启动失败${NC}"
    return 1
  fi
  
  PYTHON_PID=$(cat "$PYTHON_PID_FILE")
  if ! ps -p $PYTHON_PID > /dev/null; then
    echo -e "${RED}✗ Python服务进程启动失败${NC}"
    echo -e "${YELLOW}请检查日志: $PYTHON_LOG${NC}"
    return 1
  fi
  
  echo -e "${GREEN}✓ Python服务已成功启动 (PID: $PYTHON_PID)${NC}"
  
  # 等待服务完全启动
  echo -e "${BLUE}等待Python服务初始化...${NC}"
  
  # 设置最大等待时间和尝试间隔
  MAX_WAIT_TIME=60  # 最长等徆60秒
  INTERVAL=5        # 每5秒检查一次
  ELAPSED=0
  
  # 循环等待直到服务响应或超时
  while [ $ELAPSED -lt $MAX_WAIT_TIME ]; do
    if curl -s http://localhost:$PYTHON_PORT/test > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Python服务响应正常，用时 $ELAPSED 秒${NC}"
      return 0
    fi
    
    # 如果服务还没有响应，等待一段时间再次尝试
    echo -e "${BLUE}Python服务正在启动中... (已等待 $ELAPSED 秒)${NC}"
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
    
    # 检查进程是否仍然存在
    if ! ps -p $PYTHON_PID > /dev/null; then
      echo -e "${RED}✗ Python服务进程已终止${NC}"
      echo -e "${YELLOW}请检查日志: $PYTHON_LOG${NC}"
      return 1
    fi
  done
  
  # 如果超时但进程仍然存在，继续执行
  echo -e "${YELLOW}警告: Python服务已启动但在 $MAX_WAIT_TIME 秒内未响应请求${NC}"
  echo -e "${YELLOW}服务可能需要更多时间初始化，继续执行后续步骤${NC}"
  echo -e "${YELLOW}如需调试，请检查日志: $PYTHON_LOG${NC}"
  return 0
}

# 功能函数：停止Python服务
stop_python_service() {
  echo -e "${BLUE}正在停止Python服务...${NC}"
  
  # 检查PID文件
  if [ -f "$PYTHON_PID_FILE" ]; then
    PYTHON_PID=$(cat "$PYTHON_PID_FILE")
    if ps -p $PYTHON_PID > /dev/null; then
      echo -e "${BLUE}尝试停止Python服务 (PID: $PYTHON_PID)...${NC}"
      
      # 首先尝试优雅停止（SIGTERM）
      kill -SIGTERM $PYTHON_PID
      
      # 等待进程退出
      echo -e "${BLUE}等待Python服务停止...${NC}"
      WAIT_COUNT=0
      while ps -p $PYTHON_PID > /dev/null && [ $WAIT_COUNT -lt 10 ]; do
        sleep 1
        WAIT_COUNT=$((WAIT_COUNT+1))
      done
      
      # 如果进程仍在运行，强制终止
      if ps -p $PYTHON_PID > /dev/null; then
        echo -e "${YELLOW}Python服务未响应SIGTERM信号，正在强制终止...${NC}"
        kill -9 $PYTHON_PID
        sleep 1
      fi
      
      if ! ps -p $PYTHON_PID > /dev/null; then
        echo -e "${GREEN}✓ Python服务已停止${NC}"
        rm -f "$PYTHON_PID_FILE"
      else
        echo -e "${RED}✗ 无法停止Python服务${NC}"
        return 1
      fi
    else
      echo -e "${YELLOW}Python服务PID文件存在但进程已停止${NC}"
      rm -f "$PYTHON_PID_FILE"
    fi
  elif pgrep -f "python.*server.py" > /dev/null; then
    echo -e "${YELLOW}未找到Python服务PID文件，但检测到Python服务进程${NC}"
    PYTHON_PID=$(pgrep -f "python.*server.py")
    echo -e "${BLUE}尝试终止Python服务进程 (PID: $PYTHON_PID)...${NC}"
    
    # 尝试终止进程
    kill $PYTHON_PID
    sleep 2
    
    # 如果进程仍在运行，强制终止
    if ps -p $PYTHON_PID > /dev/null; then
      echo -e "${YELLOW}Python服务未响应，尝试强制终止...${NC}"
      kill -9 $PYTHON_PID
      sleep 1
    fi
    
    if ! ps -p $PYTHON_PID > /dev/null; then
      echo -e "${GREEN}✓ Python服务已停止${NC}"
    else
      echo -e "${RED}✗ 无法停止Python服务${NC}"
      return 1
    fi
  else
    echo -e "${YELLOW}Python服务未运行${NC}"
  fi
  
  return 0
}

# 功能函数：启动所有服务
start_services() {
  echo -e "${GREEN}===== OCR Vue应用启动脚本 =====${NC}"
  echo -e "${BLUE}此脚本将启动后端服务和Nginx服务器${NC}"

  cd "$APP_DIR"

  # 确保日志目录存在
  mkdir -p "$LOG_DIR"

  # 确保数据库目录存在
  mkdir -p "$APP_DIR/database"
  
  # 检查前端代码是否发生变化
  echo -e "${BLUE}检查前端代码是否发生变化...${NC}"
  FRONTEND_DIR="$APP_DIR/frontend"
  FRONTEND_DIST="$FRONTEND_DIR/dist"
  FRONTEND_SRC="$FRONTEND_DIR/src"
  FRONTEND_HASH_FILE="$FRONTEND_DIST/.build-hash"
  
  # 计算前端源代码的哈希值
  if command -v find &> /dev/null && command -v md5sum &> /dev/null; then
    CURRENT_HASH=$(find "$FRONTEND_SRC" -type f -name "*.vue" -o -name "*.js" | sort | xargs md5sum | md5sum | cut -d' ' -f1)
  elif command -v find &> /dev/null && command -v md5 &> /dev/null; then
    # macOS使用md5而不是md5sum
    CURRENT_HASH=$(find "$FRONTEND_SRC" -type f -name "*.vue" -o -name "*.js" | sort | xargs md5 | md5)
  else
    echo -e "${YELLOW}警告: 无法计算文件哈希，将强制重新构建前端${NC}"
    CURRENT_HASH="force-rebuild"
  fi
  
  # 检查是否需要重新构建
  NEED_REBUILD=false
  if [ ! -d "$FRONTEND_DIST" ] || [ ! -f "$FRONTEND_HASH_FILE" ]; then
    echo -e "${YELLOW}前端尚未构建，将进行构建...${NC}"
    NEED_REBUILD=true
  else
    PREVIOUS_HASH=$(cat "$FRONTEND_HASH_FILE")
    if [ "$CURRENT_HASH" != "$PREVIOUS_HASH" ]; then
      echo -e "${YELLOW}检测到前端代码变化，需要重新构建${NC}"
      NEED_REBUILD=true
    else
      echo -e "${GREEN}前端代码无变化，跳过构建步骤${NC}"
    fi
  fi
  
  # 如果需要，重新构建前端
  if [ "$NEED_REBUILD" = true ]; then
    echo -e "${BLUE}正在构建前端应用...${NC}"
    cd "$FRONTEND_DIR"
    
    # 检查Node模块是否已安装
    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
      echo -e "${YELLOW}安装前端依赖...${NC}"
      npm install
    fi
    
    # 构建前端
    npm run build
    
    # 检查构建是否成功
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}前端构建成功${NC}"
      # 保存哈希值以便下次检测
      echo "$CURRENT_HASH" > "$FRONTEND_HASH_FILE"
    else
      echo -e "${RED}前端构建失败${NC}"
      echo -e "${YELLOW}将使用现有构建(如果存在)${NC}"
    fi
    
    # 返回到应用根目录
    cd "$APP_DIR"
  fi
  
  # 启动MongoDB数据库
  start_mongodb
  if [ $? -ne 0 ]; then
    echo -e "${RED}MongoDB启动失败，应用可能无法正常工作${NC}"
    echo -e "${YELLOW}请检查MongoDB日志: $MONGODB_LOG${NC}"
    
    # 询问是否继续
    read -p "是否仍要继续启动应用? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo -e "${RED}应用启动已取消${NC}"
      return 1
    fi
    echo -e "${YELLOW}继续启动应用，但可能会出现数据库连接错误${NC}"
  fi

  # 检查后端服务是否已运行
  BACKEND_PID=$(ps aux | grep "node start.js" | grep -v grep | awk '{print $2}')
  if [ ! -z "$BACKEND_PID" ]; then
    echo -e "${YELLOW}后端服务似乎已在运行 (PID: $BACKEND_PID)${NC}"
    echo -e "${BLUE}正在停止现有后端服务...${NC}"
    kill $BACKEND_PID
    sleep 2
    
    # 确认进程已停止
    if ps -p $BACKEND_PID > /dev/null; then
      echo -e "${YELLOW}进程仍在运行，尝试强制终止...${NC}"
      kill -9 $BACKEND_PID
      sleep 1
    fi
  fi

  # 启动后端服务
  echo -e "${BLUE}正在启动后端服务...${NC}"
  cd "$APP_DIR/backend"
  
  # 检查Node模块是否已安装
  if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo -e "${YELLOW}安装Node依赖...${NC}"
    npm install
  fi
  
  # 启动后端服务
  LOG_FILE="$LOG_DIR/backend-$(date '+%Y%m%d-%H%M%S').log"
  npm run dev > "$LOG_FILE" 2>&1 &
  BACKEND_PID=$!
  echo -e "${GREEN}后端服务已启动 (PID: $BACKEND_PID)${NC}"
  echo -e "${BLUE}日志保存在: $LOG_FILE${NC}"
  
  # 记录PID到文件
  echo "$BACKEND_PID" > "$PID_FILE"
  
  # 等待后端服务初始化
  echo -e "${BLUE}等待后端服务初始化...${NC}"
  
  # 添加更可靠的等待和检查逻辑
  max_retries=60 # 增加重试次数，最多等待2分钟
  retries=0
  backend_ready=false
  
  while [ $retries -lt $max_retries ]; do
    # 检查进程是否还在运行
    if ! ps -p $BACKEND_PID > /dev/null; then
      echo -e "${RED}错误: 后端进程意外终止${NC}"
      echo -e "${YELLOW}查看日志了解详情: $LOG_FILE${NC}"
      
      # 显示最后20行日志
      echo -e "${YELLOW}最后的日志内容:${NC}"
      tail -n 20 "$LOG_FILE"
      return 1
    fi
    
    # 尝试访问健康检查API
    health_response=$(curl -s -m 2 http://localhost:3000/api/health)
    if [ $? -eq 0 ] && [ ! -z "$health_response" ]; then
      # 检查数据库状态
      db_status=$(echo $health_response | grep -o '"database":{"status":"[^"]*"' | cut -d'"' -f6)
      
      if [ "$db_status" == "connected" ]; then
        echo -e "${GREEN}✓ 后端服务已完全初始化，数据库已连接${NC}"
        backend_ready=true
        break
      else
        echo -e "${YELLOW}等待数据库连接... ($retries/$max_retries)${NC}"
      fi
    else
      echo -e "${YELLOW}等待API服务可用... ($retries/$max_retries)${NC}"
    fi
    
    retries=$((retries+1))
    sleep 2
  done
  
  if [ "$backend_ready" != "true" ]; then
    echo -e "${YELLOW}警告: 后端服务在预期时间内未能完成数据库连接${NC}"
    echo -e "${YELLOW}系统将继续运行，前端将显示'正在连接'状态${NC}"
    echo -e "${YELLOW}持续监控服务将稍后尝试修复数据库连接${NC}"
  fi

  # 启动Nginx
  start_nginx
  if [ $? -ne 0 ]; then
    echo -e "${RED}Nginx启动失败，但后端服务已成功启动${NC}"
    echo -e "${YELLOW}您可能需要手动启动Nginx${NC}"
  fi

  # 启动Python服务
  start_python_service
  if [ $? -ne 0 ]; then
    echo -e "${RED}Python服务启动失败，但其他服务已成功启动${NC}"
    echo -e "${YELLOW}您可能需要手动启动Python服务${NC}"
  fi

  # 启动持续监控服务
  start_monitor
  
  # 显示访问信息
  echo -e "\n${GREEN}==========================================${NC}"
  echo -e "${GREEN}OCR应用启动完成!${NC}"
  echo -e "${GREEN}您可以通过以下地址访问:${NC}"
  echo -e "${BLUE}HTTP:  http://localhost:8080${NC}"
  echo -e "${BLUE}HTTPS: https://localhost:8443${NC}"
  echo -e "${GREEN}==========================================${NC}"
  echo -e "${YELLOW}提示: 使用 '$0 stop' 可以安全停止所有服务${NC}"
  echo -e "${YELLOW}      使用 '$0 status' 可以检查服务状态${NC}"
  
  return 0
}

# 功能函数：重启所有服务
restart_services() {
  echo -e "${BLUE}正在重启OCR应用服务...${NC}"
  stop_services
  sleep 2
  start_services
}

# 主逻辑：解析命令行参数
case "$1" in
  start)
    start_services
    ;;
  stop)
    stop_services
    ;;
  restart)
    restart_services
    ;;
  status)
    check_status
    ;;
  monitor)
    start_monitor
    ;;
  *)
    show_help
    exit 1
    ;;
esac

exit $? 