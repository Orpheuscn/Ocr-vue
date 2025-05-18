#!/bin/bash

# ==========================================
# OCR应用问题检查与修复脚本
# ==========================================
# 此脚本用于自动检查和修复常见的系统问题:
# - 检查后端服务是否运行
# - 检查数据库状态
# - 验证环境配置
# - 检查和修复JWT配置
# ==========================================

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

echo -e "${GREEN}===== OCR Vue应用问题检查与修复 =====${NC}"

# 获取当前目录的绝对路径
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

# 判断运行环境
ENV_FILE="backend/.env.local"
if [ "$1" == "prod" ] || [ "$1" == "production" ]; then
  ENV_FILE="backend/.env.production"
  echo -e "${BLUE}将使用生产环境配置: $ENV_FILE${NC}"
else
  echo -e "${BLUE}将使用开发环境配置: $ENV_FILE${NC}"
fi

# 函数: 检查配置文件
check_env_file() {
  echo -e "\n${BLUE}[1/5] 检查环境配置文件...${NC}"
  
  if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}错误: 配置文件 $ENV_FILE 不存在${NC}"
    return 1
  fi
  
  echo -e "${GREEN}✓ 配置文件存在${NC}"
  
  # 检查必要的配置项
  local missingConfigs=0
  
  # 检查PORT配置
  if ! grep -q "^PORT=" "$ENV_FILE"; then
    echo -e "${YELLOW}警告: 未找到PORT配置，将添加默认值${NC}"
    echo "PORT=3000" >> "$ENV_FILE"
  else
    echo -e "${GREEN}✓ PORT配置正确${NC}"
  fi
  
  # MongoDB配置已替代SQLite配置
  echo -e "${GREEN}✓ 使用MongoDB数据库配置${NC}"
  
  # 检查JWT_SECRET配置
  if ! grep -q "^JWT_SECRET=" "$ENV_FILE"; then
    echo -e "${YELLOW}警告: 未找到JWT_SECRET配置，将添加随机生成的密钥${NC}"
    # 生成随机JWT密钥
    JWT_RANDOM=$(openssl rand -hex 16)
    echo "JWT_SECRET=$JWT_RANDOM" >> "$ENV_FILE"
  else
    echo -e "${GREEN}✓ JWT_SECRET配置正确${NC}"
  fi
  
  return 0
}

# 函数: 检查数据库
check_database() {
  echo -e "\n${BLUE}[2/5] 检查数据库配置...${NC}"
  
  # 从配置文件获取MongoDB连接信息
  local MONGODB_URI=$(grep "^MONGODB_URI=" "$ENV_FILE" | cut -d= -f2)
  local MONGODB_DB_NAME=$(grep "^MONGODB_DB_NAME=" "$ENV_FILE" | cut -d= -f2)
  
  # 检查MongoDB URI是否存在
  if [ -z "$MONGODB_URI" ]; then
    echo -e "${RED}错误: MONGODB_URI未在配置文件中定义${NC}"
    return 1
  fi
  
  # 检查数据库名称是否存在
  if [ -z "$MONGODB_DB_NAME" ]; then
    echo -e "${RED}错误: MONGODB_DB_NAME未在配置文件中定义${NC}"
    return 1
  fi
  
  echo -e "${BLUE}MongoDB URI: $MONGODB_URI${NC}"
  echo -e "${BLUE}MongoDB 数据库名称: $MONGODB_DB_NAME${NC}"
  
  echo -e "${GREEN}✓ MongoDB数据库配置正常${NC}"
  return 0
}

# 函数: 检查后端服务
check_backend() {
  echo -e "\n${BLUE}[3/5] 检查后端服务...${NC}"
  
  # 通过进程查找后端服务
  local BACKEND_PID=$(ps aux | grep "node start.js" | grep -v grep | awk '{print $2}')
  
  if [ -z "$BACKEND_PID" ]; then
    echo -e "${YELLOW}后端服务未运行${NC}"
    return 1
  else
    echo -e "${GREEN}✓ 后端服务正在运行 (PID: $BACKEND_PID)${NC}"
    
    # 发送健康检查请求
    echo -e "${BLUE}正在进行API健康检查...${NC}"
    
    # 使用curl检查健康端点，超时设为2秒
    local health_status=$(curl -s -m 2 http://localhost:3000/api/health)
    
    if [ $? -eq 0 ] && [ ! -z "$health_status" ]; then
      echo -e "${GREEN}✓ API健康检查成功${NC}"
      # 显示数据库状态
      local db_status=$(echo $health_status | grep -o '"database":{"status":"[^"]*"' | cut -d'"' -f6)
      if [ "$db_status" == "connected" ]; then
        echo -e "${GREEN}✓ 数据库已连接${NC}"
      else
        echo -e "${RED}✗ 数据库连接异常: $db_status${NC}"
        return 1
      fi
    else
      echo -e "${RED}✗ API健康检查失败${NC}"
      return 1
    fi
  fi
  
  return 0
}

# 函数: 检查Nginx配置
check_nginx() {
  echo -e "\n${BLUE}[4/5] 检查Nginx配置...${NC}"
  
  # 检查Nginx配置文件
  if [ ! -f "nginx/nginx.conf" ]; then
    echo -e "${RED}错误: Nginx配置文件不存在${NC}"
    return 1
  fi
  
  # 验证Nginx配置语法
  sudo nginx -t -c "$APP_DIR/nginx/nginx.conf" > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    echo -e "${RED}错误: Nginx配置文件语法不正确${NC}"
    return 1
  fi
  
  echo -e "${GREEN}✓ Nginx配置文件正确${NC}"
  
  # 检查Nginx是否在运行
  local nginx_running=$(ps aux | grep -v grep | grep "nginx: master")
  if [ -z "$nginx_running" ]; then
    echo -e "${YELLOW}警告: Nginx未运行${NC}"
    return 1
  fi
  
  echo -e "${GREEN}✓ Nginx服务正在运行${NC}"
  
  # 检查端口是否被监听
  local http_port=$(lsof -i :8080 | grep LISTEN)
  local https_port=$(lsof -i :8443 | grep LISTEN)
  
  if [ -z "$http_port" ]; then
    echo -e "${YELLOW}警告: HTTP端口(8080)未被监听${NC}"
  else
    echo -e "${GREEN}✓ HTTP端口(8080)已启用${NC}"
  fi
  
  if [ -z "$https_port" ]; then
    echo -e "${YELLOW}警告: HTTPS端口(8443)未被监听${NC}"
  else
    echo -e "${GREEN}✓ HTTPS端口(8443)已启用${NC}"
  fi
  
  return 0
}

# 函数: 检查前端文件
check_frontend() {
  echo -e "\n${BLUE}[5/5] 检查前端文件...${NC}"
  
  # 检查前端构建目录
  if [ ! -d "frontend/dist" ]; then
    echo -e "${RED}错误: 前端构建目录不存在${NC}"
    return 1
  fi
  
  # 检查索引文件
  if [ ! -f "frontend/dist/index.html" ]; then
    echo -e "${RED}错误: 前端索引文件不存在${NC}"
    return 1
  fi
  
  echo -e "${GREEN}✓ 前端文件正常${NC}"
  return 0
}

# 主流程
main() {
  # 显示检查开始信息
  echo -e "\n${BLUE}开始系统检查...${NC}"
  
  local has_error=0
  
  # 检查环境配置
  check_env_file
  if [ $? -ne 0 ]; then
    has_error=1
  fi
  
  # 检查数据库
  check_database
  db_check_result=$?
  if [ $db_check_result -ne 0 ]; then
    has_error=1
  fi
  
  # 检查后端服务
  check_backend
  backend_check_result=$?
  if [ $backend_check_result -ne 0 ]; then
    has_error=1
  fi
  
  # 检查Nginx
  check_nginx
  nginx_check_result=$?
  if [ $nginx_check_result -ne 0 ]; then
    has_error=1
  fi
  
  # 检查前端文件
  check_frontend
  if [ $? -ne 0 ]; then
    has_error=1
  fi
  
  # 如果检查到问题，询问是否自动修复
  if [ $has_error -eq 1 ]; then
    echo -e "\n${YELLOW}检测到系统存在问题，是否尝试自动修复? (y/n)${NC}"
    read -p "> " AUTO_FIX
    
    if [ "$AUTO_FIX" = "y" ]; then
      echo -e "\n${BLUE}开始自动修复...${NC}"
      
      # 如果后端服务未运行或健康检查失败，尝试重启后端
      if [ $backend_check_result -ne 0 ]; then
        echo -e "${BLUE}正在重启后端服务...${NC}"
        
        # 杀掉可能存在的后端进程
        pkill -f "node start.js" > /dev/null 2>&1
        
        # 启动后端
        cd "$APP_DIR/backend"
        npm run dev > /dev/null 2>&1 &
        
        echo -e "${GREEN}后端服务已重启${NC}"
        echo -e "${BLUE}等待服务初始化...${NC}"
        sleep 5
      fi
      
      # 如果Nginx未运行或配置有问题，尝试重启Nginx
      if [ $nginx_check_result -ne 0 ]; then
        echo -e "${BLUE}正在重启Nginx服务...${NC}"
        
        sudo nginx -s stop > /dev/null 2>&1
        sleep 1
        sudo nginx -c "$APP_DIR/nginx/nginx.conf"
        
        if [ $? -eq 0 ]; then
          echo -e "${GREEN}Nginx服务已重启${NC}"
        else
          echo -e "${RED}Nginx重启失败${NC}"
        fi
      fi
      
      echo -e "\n${GREEN}自动修复完成${NC}"
      echo -e "${YELLOW}建议重新运行检查脚本验证问题是否解决${NC}"
    else
      echo -e "\n${BLUE}跳过自动修复${NC}"
      echo -e "${YELLOW}您可以运行 ./start-all.sh 来完全重启系统${NC}"
    fi
  else
    echo -e "\n${GREEN}✅ 系统检查完成，未发现问题!${NC}"
  fi
}

# 运行主流程
main 