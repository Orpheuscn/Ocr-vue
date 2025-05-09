#!/bin/bash

# 获取脚本所在的目录路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 检查是否安装了Nginx
if ! command -v nginx &> /dev/null; then
    echo "错误：未安装Nginx。请先安装Nginx后再运行此脚本。"
    echo "可以通过以下命令安装Nginx："
    echo "MacOS: brew install nginx"
    echo "Ubuntu/Debian: sudo apt install nginx"
    echo "CentOS/RHEL: sudo yum install nginx"
    exit 1
fi

# 创建日志目录
mkdir -p "$PROJECT_DIR/logs"

# 检查前端构建是否存在
if [ ! -d "$PROJECT_DIR/frontend/dist" ]; then
    echo "警告：前端构建目录不存在。请先构建前端应用。"
    echo "可以通过以下命令构建前端："
    echo "cd $PROJECT_DIR/frontend && npm run build"
    
    read -p "是否现在构建前端？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "正在构建前端应用..."
        cd "$PROJECT_DIR/frontend" && npm run build
        
        if [ $? -ne 0 ]; then
            echo "前端构建失败，请检查错误并重试。"
            exit 1
        fi
        
        echo "前端构建成功。"
    else
        echo "请先构建前端应用再运行此脚本。"
        exit 1
    fi
fi

# 检查后端是否正在运行
if ! nc -z localhost 3000 &> /dev/null; then
    echo "警告：后端服务似乎没有在运行。"
    echo "请确保后端服务已启动并在3000端口监听。"
    echo "可以通过以下命令启动后端："
    echo "cd $PROJECT_DIR/backend && npm start"
    
    read -p "是否现在启动后端？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "正在后台启动后端服务..."
        cd "$PROJECT_DIR/backend" && npm start &
        echo "后端服务已启动，请等待几秒钟让服务完全初始化。"
        sleep 5
    else
        echo "请确保后端服务已启动。"
    fi
fi

# 检查SSL证书
if [ ! -f "$SCRIPT_DIR/ssl/cert.pem" ] || [ ! -f "$SCRIPT_DIR/ssl/key.pem" ]; then
    echo "SSL证书文件不存在，请使用mkcert生成受信任的证书..."
    echo "运行以下命令生成证书："
    echo "mkcert -install"
    echo "mkcert -key-file $SCRIPT_DIR/ssl/key.pem -cert-file $SCRIPT_DIR/ssl/cert.pem localhost 127.0.0.1 ::1"
    exit 1
    
    # 不再自动生成自签名证书，因为我们使用mkcert生成受信任的证书
    # echo "SSL证书文件不存在，正在生成自签名证书..."
    # mkdir -p "$SCRIPT_DIR/ssl"
    # openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    #     -keyout "$SCRIPT_DIR/ssl/key.pem" \
    #     -out "$SCRIPT_DIR/ssl/cert.pem" \
    #     -subj "/CN=localhost" \
    #     -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" 2>/dev/null
    # 
    # # 对于macOS 10.14及更早版本，可能不支持-addext选项
    # if [ $? -ne 0 ]; then
    #     echo "使用兼容性命令生成SSL证书..."
    #     openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    #         -keyout "$SCRIPT_DIR/ssl/key.pem" \
    #         -out "$SCRIPT_DIR/ssl/cert.pem" \
    #         -subj "/CN=localhost"
    # fi
    # 
    # echo "SSL证书生成成功。"
fi

# 停止可能已经运行的Nginx
nginx -s stop 2>/dev/null

# 启动Nginx
echo "正在启动Nginx..."
cd "$PROJECT_DIR" && nginx -c "$SCRIPT_DIR/nginx.conf" -p "$PROJECT_DIR"

if [ $? -ne 0 ]; then
    echo "Nginx启动失败，请检查配置文件和错误日志。"
    exit 1
fi

echo "======================================================"
echo "    Nginx已成功启动！"
echo "    - HTTP服务：http://localhost:8000"
echo "    - HTTPS服务：https://localhost:8443（已配置受信任证书）"
echo "======================================================"
echo "若要停止Nginx，请运行：./nginx/stop-nginx.sh"
echo "若要重新加载配置，请运行：nginx -s reload" 