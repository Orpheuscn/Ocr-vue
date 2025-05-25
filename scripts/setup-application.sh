#!/bin/bash

# ==========================================
# 应用部署脚本 - 在 Google Cloud VM 上运行
# ==========================================

set -e  # 遇到错误立即退出

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

# 配置变量
APP_DIR="/var/www/textistext"
DOMAIN="textistext.com"
BACKEND_PORT="3000"
PYTHON_PORT="5001"

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  应用部署脚本 - textistext.com  ${NC}"
echo -e "${BLUE}===========================================${NC}"

# 检查是否为 root 用户
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}请不要以 root 用户运行此脚本${NC}"
   exit 1
fi

# 函数：创建应用目录
setup_directories() {
    echo -e "${BLUE}步骤 1: 设置应用目录${NC}"
    
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
    
    echo -e "${GREEN}✓ 应用目录创建完成${NC}"
}

# 函数：部署代码 (需要用户手动上传)
deploy_code() {
    echo -e "${BLUE}步骤 2: 部署应用代码${NC}"
    
    if [ ! -d "$APP_DIR/backend" ] || [ ! -d "$APP_DIR/frontend" ] || [ ! -d "$APP_DIR/python-service" ]; then
        echo -e "${YELLOW}请先将您的代码上传到 $APP_DIR${NC}"
        echo -e "${YELLOW}您可以使用以下方法之一:${NC}"
        echo -e "${YELLOW}1. 使用 git clone (如果代码在 GitHub 上)${NC}"
        echo -e "${YELLOW}2. 使用 scp 从本地上传${NC}"
        echo -e "${YELLOW}3. 使用 rsync 同步文件${NC}"
        echo ""
        echo -e "${BLUE}示例命令:${NC}"
        echo -e "cd $APP_DIR"
        echo -e "git clone <your-repo-url> ."
        echo -e "或者从本地:"
        echo -e "scp -r /path/to/your/ocr-vue-app/* username@vm-ip:$APP_DIR/"
        echo ""
        read -p "代码上传完成后按 Enter 继续..."
    fi
    
    if [ ! -d "$APP_DIR/backend" ]; then
        echo -e "${RED}错误: 未找到后端代码目录${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ 代码部署检查完成${NC}"
}

# 函数：安装后端依赖
install_backend_deps() {
    echo -e "${BLUE}步骤 3: 安装后端依赖${NC}"
    
    cd $APP_DIR/backend
    
    if [ ! -f "package.json" ]; then
        echo -e "${RED}错误: 未找到 package.json${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}安装 Node.js 依赖...${NC}"
    npm install
    
    echo -e "${GREEN}✓ 后端依赖安装完成${NC}"
}

# 函数：安装 Python 依赖
install_python_deps() {
    echo -e "${BLUE}步骤 4: 安装 Python 依赖${NC}"
    
    cd $APP_DIR/python-service
    
    if [ ! -f "requirements.txt" ]; then
        echo -e "${RED}错误: 未找到 requirements.txt${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}创建 Python 虚拟环境...${NC}"
    python3 -m venv venv
    
    echo -e "${BLUE}激活虚拟环境并安装依赖...${NC}"
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    
    echo -e "${GREEN}✓ Python 依赖安装完成${NC}"
}

# 函数：构建前端
build_frontend() {
    echo -e "${BLUE}步骤 5: 构建前端${NC}"
    
    cd $APP_DIR/frontend
    
    if [ ! -f "package.json" ]; then
        echo -e "${RED}错误: 未找到前端 package.json${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}安装前端依赖...${NC}"
    npm install
    
    echo -e "${BLUE}构建生产版本...${NC}"
    npm run build
    
    if [ ! -d "dist" ]; then
        echo -e "${RED}错误: 前端构建失败${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ 前端构建完成${NC}"
}

# 函数：配置环境变量
setup_env_config() {
    echo -e "${BLUE}步骤 6: 配置环境变量${NC}"
    
    cd $APP_DIR/backend
    
    if [ ! -f ".env.example" ]; then
        echo -e "${RED}错误: 未找到 .env.example${NC}"
        exit 1
    fi
    
    if [ ! -f ".env.production" ]; then
        echo -e "${BLUE}创建生产环境配置...${NC}"
        cp .env.example .env.production
        
        echo -e "${YELLOW}请编辑 .env.production 文件，设置以下重要配置:${NC}"
        echo -e "- GOOGLE_VISION_API_KEY"
        echo -e "- JWT_SECRET"
        echo -e "- SESSION_SECRET"
        echo -e "- CSRF_SECRET"
        echo ""
        read -p "配置完成后按 Enter 继续..."
    fi
    
    echo -e "${GREEN}✓ 环境配置完成${NC}"
}

# 函数：配置 Nginx
setup_nginx() {
    echo -e "${BLUE}步骤 7: 配置 Nginx${NC}"
    
    # 创建 Nginx 配置文件
    sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL 配置将由 Let's Encrypt 自动添加
    
    # 前端静态文件
    location / {
        root $APP_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        
        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # 后端 API
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 安全头部
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
}
EOF

    # 启用站点
    sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
    
    # 测试配置
    sudo nginx -t
    
    # 重新加载 Nginx
    sudo systemctl reload nginx
    
    echo -e "${GREEN}✓ Nginx 配置完成${NC}"
}

# 函数：创建系统服务
create_services() {
    echo -e "${BLUE}步骤 8: 创建系统服务${NC}"
    
    # 创建后端服务
    sudo tee /etc/systemd/system/textistext-backend.service > /dev/null <<EOF
[Unit]
Description=TextIsText Backend Service
After=network.target mongod.service rabbitmq-server.service

[Service]
Type=simple
User=www-data
WorkingDirectory=$APP_DIR/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node start.js prod
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # 创建 Python 服务
    sudo tee /etc/systemd/system/textistext-python.service > /dev/null <<EOF
[Unit]
Description=TextIsText Python Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$APP_DIR/python-service
Environment=FLASK_ENV=production
ExecStart=$APP_DIR/python-service/venv/bin/python main.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # 设置文件权限
    sudo chown -R www-data:www-data $APP_DIR
    sudo chmod -R 755 $APP_DIR
    
    # 重新加载 systemd
    sudo systemctl daemon-reload
    
    # 启用服务
    sudo systemctl enable textistext-backend
    sudo systemctl enable textistext-python
    
    echo -e "${GREEN}✓ 系统服务创建完成${NC}"
}

# 函数：启动服务
start_services() {
    echo -e "${BLUE}步骤 9: 启动应用服务${NC}"
    
    # 启动后端服务
    echo -e "${BLUE}启动后端服务...${NC}"
    sudo systemctl start textistext-backend
    
    # 启动 Python 服务
    echo -e "${BLUE}启动 Python 服务...${NC}"
    sudo systemctl start textistext-python
    
    # 检查服务状态
    sleep 5
    
    if sudo systemctl is-active --quiet textistext-backend; then
        echo -e "${GREEN}✓ 后端服务启动成功${NC}"
    else
        echo -e "${RED}✗ 后端服务启动失败${NC}"
        sudo systemctl status textistext-backend
    fi
    
    if sudo systemctl is-active --quiet textistext-python; then
        echo -e "${GREEN}✓ Python 服务启动成功${NC}"
    else
        echo -e "${RED}✗ Python 服务启动失败${NC}"
        sudo systemctl status textistext-python
    fi
}

# 函数：显示完成信息
show_completion() {
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${GREEN}  应用部署完成！${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo ""
    echo -e "${YELLOW}下一步操作:${NC}"
    echo ""
    echo -e "${BLUE}1. 申请 SSL 证书 (确保 DNS 已生效):${NC}"
    echo -e "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
    echo ""
    echo -e "${BLUE}2. 检查服务状态:${NC}"
    echo -e "   sudo systemctl status textistext-backend"
    echo -e "   sudo systemctl status textistext-python"
    echo ""
    echo -e "${BLUE}3. 查看日志:${NC}"
    echo -e "   sudo journalctl -u textistext-backend -f"
    echo -e "   sudo journalctl -u textistext-python -f"
    echo ""
    echo -e "${BLUE}4. 测试应用:${NC}"
    echo -e "   curl http://localhost:$BACKEND_PORT/api/health"
    echo -e "   curl http://localhost:$PYTHON_PORT/health"
    echo ""
    echo -e "${YELLOW}应用地址: https://$DOMAIN${NC}"
}

# 主函数
main() {
    echo -e "${BLUE}开始应用部署...${NC}"
    
    setup_directories
    deploy_code
    install_backend_deps
    install_python_deps
    build_frontend
    setup_env_config
    setup_nginx
    create_services
    start_services
    show_completion
    
    echo -e "${GREEN}应用部署脚本执行完成！${NC}"
}

# 执行主函数
main "$@"
