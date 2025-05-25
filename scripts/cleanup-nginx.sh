#!/bin/bash

# ==========================================
# 清理 nginx 相关配置脚本
# ==========================================

set -e  # 遇到错误立即退出

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  清理 nginx 相关配置  ${NC}"
echo -e "${BLUE}===========================================${NC}"

# 函数：备份nginx配置
backup_nginx_configs() {
    echo -e "${BLUE}步骤 1: 备份 nginx 配置文件${NC}"
    
    BACKUP_DIR="backup/nginx-configs-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # 备份nginx配置文件
    if [ -f "nginx/nginx.conf" ]; then
        cp nginx/nginx.conf "$BACKUP_DIR/"
        echo -e "${GREEN}✓ 备份 nginx/nginx.conf${NC}"
    fi
    
    if [ -f "frontend/nginx.conf" ]; then
        cp frontend/nginx.conf "$BACKUP_DIR/"
        echo -e "${GREEN}✓ 备份 frontend/nginx.conf${NC}"
    fi
    
    # 备份docker相关文件中的nginx配置
    if [ -f "frontend/Dockerfile" ]; then
        cp frontend/Dockerfile "$BACKUP_DIR/"
        echo -e "${GREEN}✓ 备份 frontend/Dockerfile${NC}"
    fi
    
    echo -e "${GREEN}✓ 配置文件已备份到 $BACKUP_DIR${NC}"
}

# 函数：更新前端Dockerfile
update_frontend_dockerfile() {
    echo -e "${BLUE}步骤 2: 更新前端 Dockerfile${NC}"
    
    if [ -f "frontend/Dockerfile" ]; then
        # 创建新的简化Dockerfile
        cat > frontend/Dockerfile << 'EOF'
# 构建阶段
FROM node:18-alpine as build-stage

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段 - 使用nginx服务静态文件
FROM nginx:alpine

# 复制构建的文件到nginx目录
COPY --from=build-stage /app/dist /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
EOF
        echo -e "${GREEN}✓ 更新 frontend/Dockerfile${NC}"
    fi
}

# 函数：创建简化的nginx配置
create_simple_nginx_config() {
    echo -e "${BLUE}步骤 3: 创建简化的 nginx 配置${NC}"
    
    # 为前端容器创建简化的nginx配置
    cat > frontend/nginx.conf << 'EOF'
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # 基本设置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        # 处理 SPA 路由
        location / {
            try_files $uri $uri/ /index.html;
        }

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # 健康检查
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # 错误页面
        error_page 404 /index.html;
        error_page 500 502 503 504 /50x.html;
        location = /50x.html {
            root /usr/share/nginx/html;
        }
    }
}
EOF
    echo -e "${GREEN}✓ 创建简化的 nginx 配置${NC}"
}

# 函数：更新前端环境配置
update_frontend_env() {
    echo -e "${BLUE}步骤 4: 更新前端环境配置${NC}"
    
    # 更新前端的API基础URL配置
    if [ -f "frontend/.env.production" ]; then
        # 备份原文件
        cp frontend/.env.production "backup/nginx-configs-$(date +%Y%m%d-%H%M%S)/.env.production.backup"
        
        # 更新API URL指向负载均衡器
        sed -i.bak 's|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=https://textistext.com/api|' frontend/.env.production
        echo -e "${GREEN}✓ 更新前端生产环境配置${NC}"
    fi
}

# 函数：显示清理总结
show_cleanup_summary() {
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${GREEN}  nginx 配置清理完成！${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo ""
    echo -e "${YELLOW}已完成的操作:${NC}"
    echo -e "1. ✓ 备份了原有的 nginx 配置文件"
    echo -e "2. ✓ 更新了前端 Dockerfile"
    echo -e "3. ✓ 创建了简化的 nginx 配置"
    echo -e "4. ✓ 更新了前端环境配置"
    echo ""
    echo -e "${YELLOW}现在的架构:${NC}"
    echo -e "- 前端: Cloud Run 容器 (简化的 nginx)"
    echo -e "- 后端: Cloud Run 容器"
    echo -e "- 负载均衡: Google Cloud Load Balancing"
    echo -e "- 域名: https://textistext.com"
    echo -e "- SSL: Google 管理的 SSL 证书"
    echo ""
    echo -e "${YELLOW}下一步:${NC}"
    echo -e "1. 重新构建和部署前端容器"
    echo -e "2. 验证负载均衡器配置"
    echo -e "3. 测试完整的应用功能"
}

# 主函数
main() {
    echo -e "${BLUE}开始清理 nginx 配置...${NC}"
    
    backup_nginx_configs
    echo ""
    update_frontend_dockerfile
    echo ""
    create_simple_nginx_config
    echo ""
    update_frontend_env
    echo ""
    show_cleanup_summary
    
    echo -e "${GREEN}nginx 配置清理完成！${NC}"
}

# 执行主函数
main "$@"
