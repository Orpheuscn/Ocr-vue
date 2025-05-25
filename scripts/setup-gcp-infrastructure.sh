#!/bin/bash

# ==========================================
# Google Cloud Platform 基础设施设置脚本
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
REGION="us-central1"
DOMAIN="textistext.com"

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  Google Cloud Platform 基础设施设置  ${NC}"
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
        "run.googleapis.com"
        "cloudbuild.googleapis.com"
        "containerregistry.googleapis.com"
        "vision.googleapis.com"
        "secretmanager.googleapis.com"
        "compute.googleapis.com"
        "dns.googleapis.com"
        "certificatemanager.googleapis.com"
        "networkservices.googleapis.com"
    )
    
    for api in "${apis[@]}"; do
        echo -e "${BLUE}启用 $api...${NC}"
        gcloud services enable $api
    done
    
    echo -e "${GREEN}✓ API 启用完成${NC}"
}

# 函数：创建 Secret Manager 密钥
create_secrets() {
    echo -e "${BLUE}步骤 3: 创建 Secret Manager 密钥${NC}"
    
    # 检查并创建 JWT Secret
    if ! gcloud secrets describe jwt-secret &>/dev/null; then
        echo -e "${BLUE}创建 JWT Secret...${NC}"
        echo -n "$(openssl rand -base64 32)" | gcloud secrets create jwt-secret --data-file=-
    fi
    
    # 提示用户输入 MongoDB URI
    echo -e "${YELLOW}请输入 MongoDB Atlas 连接字符串:${NC}"
    read -s mongodb_uri
    if ! gcloud secrets describe mongodb-uri &>/dev/null; then
        echo -n "$mongodb_uri" | gcloud secrets create mongodb-uri --data-file=-
    else
        echo -n "$mongodb_uri" | gcloud secrets versions add mongodb-uri --data-file=-
    fi
    
    # 提示用户输入 Google Vision API Key
    echo -e "${YELLOW}请输入 Google Vision API Key:${NC}"
    read -s vision_api_key
    if ! gcloud secrets describe google-vision-api-key &>/dev/null; then
        echo -n "$vision_api_key" | gcloud secrets create google-vision-api-key --data-file=-
    else
        echo -n "$vision_api_key" | gcloud secrets versions add google-vision-api-key --data-file=-
    fi
    
    echo -e "${GREEN}✓ Secret Manager 密钥创建完成${NC}"
}

# 函数：创建 Cloud Run 服务账户
create_service_account() {
    echo -e "${BLUE}步骤 4: 创建服务账户${NC}"
    
    SA_NAME="textistext-runner"
    SA_EMAIL="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"
    
    # 创建服务账户
    if ! gcloud iam service-accounts describe $SA_EMAIL &>/dev/null; then
        gcloud iam service-accounts create $SA_NAME \
            --display-name="TextIsText Cloud Run Service Account"
    fi
    
    # 授予必要权限
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SA_EMAIL" \
        --role="roles/secretmanager.secretAccessor"
    
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SA_EMAIL" \
        --role="roles/cloudsql.client"
    
    echo -e "${GREEN}✓ 服务账户创建完成${NC}"
}

# 函数：设置 Cloud DNS
setup_dns() {
    echo -e "${BLUE}步骤 5: 设置 Cloud DNS${NC}"
    
    ZONE_NAME="textistext-zone"
    
    # 创建 DNS 区域
    if ! gcloud dns managed-zones describe $ZONE_NAME &>/dev/null; then
        gcloud dns managed-zones create $ZONE_NAME \
            --description="DNS zone for textistext.com" \
            --dns-name="$DOMAIN."
    fi
    
    # 获取名称服务器
    echo -e "${YELLOW}请在您的域名注册商处设置以下名称服务器:${NC}"
    gcloud dns managed-zones describe $ZONE_NAME --format="value(nameServers[].join(' '))"
    
    echo -e "${GREEN}✓ Cloud DNS 设置完成${NC}"
}

# 函数：显示下一步操作
show_next_steps() {
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${GREEN}  基础设施设置完成！${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo ""
    echo -e "${YELLOW}下一步操作:${NC}"
    echo ""
    echo -e "${BLUE}1. 设置 GitHub Secrets:${NC}"
    echo -e "   在 GitHub 仓库设置中添加以下 Secrets:"
    echo -e "   - GCP_SA_KEY: 服务账户密钥 JSON"
    echo ""
    echo -e "${BLUE}2. 配置域名 DNS:${NC}"
    echo -e "   在域名注册商处设置上面显示的名称服务器"
    echo ""
    echo -e "${BLUE}3. 推送代码触发部署:${NC}"
    echo -e "   git push origin main"
    echo ""
    echo -e "${YELLOW}项目 ID: $PROJECT_ID${NC}"
    echo -e "${YELLOW}区域: $REGION${NC}"
}

# 主函数
main() {
    echo -e "${BLUE}开始基础设施设置...${NC}"
    
    create_project
    enable_apis
    create_secrets
    create_service_account
    setup_dns
    show_next_steps
    
    echo -e "${GREEN}基础设施设置完成！${NC}"
}

# 执行主函数
main "$@"
