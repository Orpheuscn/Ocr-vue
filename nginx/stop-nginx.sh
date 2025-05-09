#!/bin/bash

# 停止Nginx
echo "正在停止Nginx..."
nginx -s stop 2>/dev/null

# 检查Nginx是否已停止
if pgrep -x "nginx" > /dev/null; then
    echo "Nginx未能正常停止，尝试强制终止进程..."
    
    # 在macOS上使用pkill，在Linux上使用killall
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        pkill -9 nginx
    else
        # Linux
        killall -9 nginx
    fi
    
    # 再次检查
    if pgrep -x "nginx" > /dev/null; then
        echo "警告：无法终止Nginx进程，请手动终止。"
        exit 1
    else
        echo "Nginx进程已被强制终止。"
    fi
else
    echo "Nginx已成功停止。"
fi

echo "您可以使用 'nginx/start-nginx-dev.sh' 脚本重新启动Nginx。" 