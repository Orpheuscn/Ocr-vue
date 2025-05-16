#!/bin/bash

# ==========================================
# OCR应用服务监控看门狗脚本
# ==========================================
# 此脚本用于监控后端服务状态并在崩溃时自动重启
# 可以通过crontab定时执行，例如:
# */5 * * * * /path/to/ocr-vue-app/watchdog.sh > /dev/null 2>&1
# ==========================================

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

# 获取当前目录的绝对路径
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$APP_DIR/logs/watchdog.log"

# 创建日志目录
mkdir -p "$APP_DIR/logs"

# 日志函数
log() {
  echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 检查进程函数
check_process() {
  ps aux | grep "$1" | grep -v grep > /dev/null
  return $?
}

# 检查API健康状态
check_api_health() {
  # 增加重试机制
  local max_retries=3
  local retry=0
  
  while [ $retry -lt $max_retries ]; do
    # 请求健康检查API并保存响应
    local response=$(curl -s -m 5 http://localhost:3000/api/health)
    local curl_status=$?
    
    # 检查curl是否成功
    if [ $curl_status -eq 0 ] && [ ! -z "$response" ]; then
      # 检查数据库状态
      local db_status=$(echo $response | grep -o '"database":{"status":"[^"]*"' | cut -d'"' -f6)
      
      if [ "$db_status" == "connected" ]; then
        log "${GREEN}健康检查成功: 数据库已连接${NC}"
        return 0
      else
        log "${YELLOW}健康检查部分成功: API可用但数据库状态为 $db_status (尝试 $((retry+1))/$max_retries)${NC}"
      fi
    else
      log "${YELLOW}健康检查失败: API不可用 (尝试 $((retry+1))/$max_retries)${NC}"
    fi
    
    # 增加重试间隔
    retry=$((retry+1))
    [ $retry -lt $max_retries ] && sleep 2
  done
  
  return 1
}

# 启动后端服务
start_backend() {
  log "${BLUE}正在启动后端服务...${NC}"
  cd "$APP_DIR/backend"
  npm run dev > "$APP_DIR/logs/backend-$(date '+%Y%m%d-%H%M%S').log" 2>&1 &
  BACKEND_PID=$!
  log "${GREEN}后端服务已启动 (PID: $BACKEND_PID)${NC}"
  
  # 等待服务启动
  sleep 5
  
  # 检查服务是否成功启动
  if check_api_health; then
    log "${GREEN}后端服务启动成功并响应健康检查${NC}"
    return 0
  else
    log "${RED}后端服务启动后未能通过健康检查${NC}"
    return 1
  fi
}

# 主函数
main() {
  log "${BLUE}开始监控检查...${NC}"
  
  # 检查后端服务进程
  if check_process "node start.js"; then
    log "${GREEN}后端服务进程正在运行${NC}"
    
    # 检查API健康状态
    if check_api_health; then
      log "${GREEN}后端API健康状态正常${NC}"
      exit 0
    else
      log "${YELLOW}警告: 后端进程存在但API健康检查失败${NC}"
      
      # 获取进程ID并终止
      BACKEND_PID=$(ps aux | grep "node start.js" | grep -v grep | awk '{print $2}')
      if [ ! -z "$BACKEND_PID" ]; then
        log "${YELLOW}正在终止异常的后端进程 (PID: $BACKEND_PID)...${NC}"
        kill $BACKEND_PID
        sleep 2
      fi
      
      # 启动新的后端服务
      start_backend
    fi
  else
    log "${YELLOW}后端服务未运行，正在启动...${NC}"
    start_backend
  fi
  
  # 检查Nginx是否运行
  if check_process "nginx: master"; then
    log "${GREEN}Nginx服务正在运行${NC}"
  else
    log "${YELLOW}警告: Nginx服务未运行，尝试启动...${NC}"
    sudo nginx -c "$APP_DIR/nginx/nginx.conf"
    
    if [ $? -eq 0 ]; then
      log "${GREEN}Nginx服务已启动${NC}"
    else
      log "${RED}Nginx启动失败${NC}"
    fi
  fi
  
  log "${BLUE}监控检查完成${NC}"
}

# 运行主函数
main 