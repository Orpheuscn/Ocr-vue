#!/bin/bash

# ==========================================
# Google Cloud 部署脚本 - textistext.com
# ==========================================

set -e  # 遇到错误立即退出

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

# 配置变量
PROJECT_ID="textistext-ocr"
VM_NAME="textistext-vm"
ZONE="us-central1-a"
MACHINE_TYPE="e2-standard-2"
DOMAIN="textistext.com"

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  Google Cloud 部署脚本 - textistext.com  ${NC}"
echo -e "${BLUE}===========================================${NC}"

# 检查是否安装了 gcloud CLI
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}错误: 未找到 gcloud CLI${NC}"
    echo -e "${YELLOW}请先安装 Google Cloud CLI: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

# 函数：创建项目
create_project() {
    echo -e "${BLUE}步骤 1: 创建 Google Cloud 项目${NC}"
    
    # 检查项目是否已存在
    if gcloud projects describe $PROJECT_ID &>/dev/null; then
        echo -e "${YELLOW}项目 $PROJECT_ID 已存在${NC}"
    else
        echo -e "${BLUE}创建项目 $PROJECT_ID...${NC}"
        gcloud projects create $PROJECT_ID --name="TextIsText OCR App"
    fi
    
    # 设置当前项目
    gcloud config set project $PROJECT_ID
    echo -e "${GREEN}✓ 项目设置完成${NC}"
}

# 函数：启用 API
enable_apis() {
    echo -e "${BLUE}步骤 2: 启用必要的 API${NC}"
    
    apis=(
        "compute.googleapis.com"
        "vision.googleapis.com"
        "dns.googleapis.com"
        "monitoring.googleapis.com"
    )
    
    for api in "${apis[@]}"; do
        echo -e "${BLUE}启用 $api...${NC}"
        gcloud services enable $api
    done
    
    echo -e "${GREEN}✓ API 启用完成${NC}"
}

# 函数：创建防火墙规则
create_firewall_rules() {
    echo -e "${BLUE}步骤 3: 创建防火墙规则${NC}"
    
    # HTTP/HTTPS 规则
    if ! gcloud compute firewall-rules describe allow-http-https &>/dev/null; then
        gcloud compute firewall-rules create allow-http-https \
            --allow tcp:80,tcp:443 \
            --source-ranges 0.0.0.0/0 \
            --target-tags http-server,https-server \
            --description "Allow HTTP and HTTPS traffic"
    fi
    
    # 自定义端口规则 (开发用)
    if ! gcloud compute firewall-rules describe allow-custom-ports &>/dev/null; then
        gcloud compute firewall-rules create allow-custom-ports \
            --allow tcp:3000,tcp:5001,tcp:8080,tcp:8443 \
            --source-ranges 0.0.0.0/0 \
            --target-tags http-server \
            --description "Allow custom application ports"
    fi
    
    echo -e "${GREEN}✓ 防火墙规则创建完成${NC}"
}

# 函数：创建 VM 实例
create_vm() {
    echo -e "${BLUE}步骤 4: 创建 VM 实例${NC}"
    
    # 检查 VM 是否已存在
    if gcloud compute instances describe $VM_NAME --zone=$ZONE &>/dev/null; then
        echo -e "${YELLOW}VM $VM_NAME 已存在${NC}"
        return
    fi
    
    # 创建启动脚本
    startup_script='#!/bin/bash
apt-get update
apt-get install -y curl wget gnupg2 software-properties-common git

# 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 安装 Python 和依赖
apt-get install -y python3 python3-pip python3-venv build-essential libssl-dev libffi-dev python3-dev

# 安装 MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update
apt-get install -y mongodb-org
systemctl start mongod
systemctl enable mongod

# 安装 RabbitMQ
apt-get install -y rabbitmq-server
systemctl start rabbitmq-server
systemctl enable rabbitmq-server
rabbitmq-plugins enable rabbitmq_management

# 安装 Nginx
apt-get install -y nginx
systemctl start nginx
systemctl enable nginx

# 安装 Certbot
apt-get install -y certbot python3-certbot-nginx

echo "服务器初始化完成" > /var/log/startup-complete.log
'
    
    echo -e "${BLUE}创建 VM 实例 $VM_NAME...${NC}"
    gcloud compute instances create $VM_NAME \
        --zone=$ZONE \
        --machine-type=$MACHINE_TYPE \
        --boot-disk-size=50GB \
        --boot-disk-type=pd-standard \
        --image-family=ubuntu-2004-lts \
        --image-project=ubuntu-os-cloud \
        --tags=http-server,https-server \
        --metadata=startup-script="$startup_script"
    
    echo -e "${GREEN}✓ VM 实例创建完成${NC}"
}

# 函数：获取 VM IP
get_vm_ip() {
    echo -e "${BLUE}步骤 5: 获取 VM 外部 IP${NC}"
    
    VM_IP=$(gcloud compute instances describe $VM_NAME --zone=$ZONE --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
    
    echo -e "${GREEN}✓ VM 外部 IP: $VM_IP${NC}"
    echo -e "${YELLOW}请在 GoDaddy 中设置以下 DNS 记录:${NC}"
    echo -e "${YELLOW}类型: A, 名称: @, 值: $VM_IP${NC}"
    echo -e "${YELLOW}类型: A, 名称: www, 值: $VM_IP${NC}"
}

# 函数：等待 VM 启动完成
wait_for_vm() {
    echo -e "${BLUE}步骤 6: 等待 VM 启动完成${NC}"
    
    echo -e "${YELLOW}等待 VM 启动和初始化脚本完成...${NC}"
    
    for i in {1..30}; do
        if gcloud compute ssh $VM_NAME --zone=$ZONE --command="test -f /var/log/startup-complete.log" &>/dev/null; then
            echo -e "${GREEN}✓ VM 启动完成${NC}"
            return
        fi
        echo -e "${YELLOW}等待中... ($i/30)${NC}"
        sleep 30
    done
    
    echo -e "${RED}警告: VM 可能仍在初始化中${NC}"
}

# 函数：显示下一步操作
show_next_steps() {
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${GREEN}  部署基础设施创建完成！${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo ""
    echo -e "${YELLOW}下一步操作:${NC}"
    echo ""
    echo -e "${BLUE}1. 配置 DNS (在 GoDaddy):${NC}"
    echo -e "   类型: A, 名称: @, 值: $VM_IP"
    echo -e "   类型: A, 名称: www, 值: $VM_IP"
    echo ""
    echo -e "${BLUE}2. 连接到 VM:${NC}"
    echo -e "   gcloud compute ssh $VM_NAME --zone=$ZONE"
    echo ""
    echo -e "${BLUE}3. 部署应用代码:${NC}"
    echo -e "   # 在 VM 中执行"
    echo -e "   sudo mkdir -p /var/www/textistext"
    echo -e "   sudo chown \$USER:\$USER /var/www/textistext"
    echo -e "   cd /var/www/textistext"
    echo -e "   # 上传您的代码到这个目录"
    echo ""
    echo -e "${BLUE}4. 配置 SSL 证书 (DNS 生效后):${NC}"
    echo -e "   sudo certbot --nginx -d textistext.com -d www.textistext.com"
    echo ""
    echo -e "${YELLOW}项目 ID: $PROJECT_ID${NC}"
    echo -e "${YELLOW}VM 名称: $VM_NAME${NC}"
    echo -e "${YELLOW}区域: $ZONE${NC}"
    echo -e "${YELLOW}外部 IP: $VM_IP${NC}"
}

# 主函数
main() {
    echo -e "${BLUE}开始部署流程...${NC}"
    
    create_project
    enable_apis
    create_firewall_rules
    create_vm
    get_vm_ip
    wait_for_vm
    show_next_steps
    
    echo -e "${GREEN}部署脚本执行完成！${NC}"
}

# 执行主函数
main "$@"
