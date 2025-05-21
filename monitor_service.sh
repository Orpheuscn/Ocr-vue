#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

# 配置
HOST="localhost"
PORT=5000
INTERVAL=5  # 检查间隔（秒）
MAX_CHECKS=100  # 最大检查次数

# 函数：检查端口是否开放
check_port() {
    nc -z -w 2 $HOST $PORT > /dev/null 2>&1
    return $?
}

# 函数：检查健康检查端点
check_health() {
    response=$(curl -s -m 2 http://$HOST:$PORT/health)
    curl_status=$?
    
    if [ $curl_status -eq 0 ] && [ ! -z "$response" ]; then
        # 尝试解析JSON响应
        status=$(echo $response | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        
        if [ "$status" == "healthy" ]; then
            echo -e "${GREEN}健康检查成功: 状态为 healthy${NC}"
            return 0
        elif [ "$status" == "ok" ]; then
            echo -e "${YELLOW}健康检查部分成功: 状态为 ok（应为 healthy）${NC}"
            return 1
        else
            echo -e "${YELLOW}健康检查部分成功: 状态为 $status${NC}"
            return 1
        fi
    else
        echo -e "${RED}健康检查失败: 端点不可用${NC}"
        return 2
    fi
}

# 函数：检查根路径
check_root() {
    response=$(curl -s -m 2 http://$HOST:$PORT/)
    curl_status=$?
    
    if [ $curl_status -eq 0 ] && [ ! -z "$response" ]; then
        echo -e "${GREEN}根路径可访问: $response${NC}"
        return 0
    else
        echo -e "${RED}根路径不可访问${NC}"
        return 1
    fi
}

# 函数：检查进程
check_process() {
    # 检查Python进程
    python_count=$(ps aux | grep -E "python.*main.py|gunicorn.*main:create_app" | grep -v grep | wc -l)
    
    if [ $python_count -gt 0 ]; then
        echo -e "${GREEN}Python服务进程正在运行: 找到 $python_count 个进程${NC}"
        
        # 显示进程详情
        echo -e "${BLUE}进程详情:${NC}"
        ps aux | grep -E "python.*main.py|gunicorn.*main:create_app" | grep -v grep
        
        return 0
    else
        echo -e "${RED}Python服务进程未运行${NC}"
        return 1
    fi
}

# 函数：显示最新日志
show_logs() {
    echo -e "${BLUE}最新日志:${NC}"
    
    # 显示gunicorn错误日志
    if [ -f "logs/gunicorn_error.log" ]; then
        echo -e "${YELLOW}gunicorn错误日志:${NC}"
        tail -n 5 logs/gunicorn_error.log
    fi
    
    # 显示最新的Python服务日志
    latest_log=$(ls -t logs/python-service-*.log | head -n 1)
    if [ ! -z "$latest_log" ]; then
        echo -e "${YELLOW}最新Python服务日志 ($latest_log):${NC}"
        tail -n 10 "$latest_log"
    fi
    
    # 显示watchdog日志
    if [ -f "logs/watchdog.log" ]; then
        echo -e "${YELLOW}watchdog日志:${NC}"
        tail -n 5 logs/watchdog.log
    fi
}

# 主循环
echo -e "${BLUE}开始监控Python服务...${NC}"
echo -e "${BLUE}按 Ctrl+C 停止监控${NC}"
echo

count=0
while [ $count -lt $MAX_CHECKS ]; do
    count=$((count+1))
    
    echo -e "${BLUE}=== 检查 #$count ($(date '+%Y-%m-%d %H:%M:%S')) ===${NC}"
    
    # 检查端口
    if check_port; then
        echo -e "${GREEN}端口 $PORT 已开放${NC}"
        
        # 检查健康检查端点
        check_health
        health_status=$?
        
        # 检查根路径
        check_root
        root_status=$?
        
        # 如果健康检查和根路径都失败，可能是服务有问题
        if [ $health_status -ne 0 ] && [ $root_status -ne 0 ]; then
            echo -e "${RED}警告: 服务可能存在问题${NC}"
        fi
    else
        echo -e "${RED}端口 $PORT 未开放${NC}"
    fi
    
    # 检查进程
    check_process
    
    # 显示日志
    show_logs
    
    echo
    echo -e "${BLUE}等待 $INTERVAL 秒后进行下一次检查...${NC}"
    sleep $INTERVAL
done

echo -e "${BLUE}监控完成${NC}"
