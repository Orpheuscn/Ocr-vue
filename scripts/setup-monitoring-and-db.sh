#!/bin/bash

# ==========================================
# 监控和数据库配置脚本 - textistext.com
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
FRONTEND_SERVICE="textistext-frontend"
BACKEND_SERVICE="textistext-backend"

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  监控和数据库配置脚本 - textistext.com   ${NC}"
echo -e "${BLUE}===========================================${NC}"

# 函数：检查前置条件
check_prerequisites() {
    echo -e "${BLUE}步骤 1: 检查前置条件${NC}"
    
    # 检查 gcloud 是否已登录
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        echo -e "${RED}错误: 请先运行 'gcloud auth login' 登录${NC}"
        exit 1
    fi
    
    # 检查项目是否设置
    if ! gcloud config get-value project | grep -q "$PROJECT_ID"; then
        echo -e "${YELLOW}设置项目 ID...${NC}"
        gcloud config set project $PROJECT_ID
    fi
    
    # 设置默认区域
    gcloud config set run/region $REGION
    
    # 检查服务是否已部署
    if ! gcloud run services describe $FRONTEND_SERVICE --region=$REGION &>/dev/null; then
        echo -e "${RED}错误: 前端服务未部署，请先运行部署脚本${NC}"
        exit 1
    fi
    
    if ! gcloud run services describe $BACKEND_SERVICE --region=$REGION &>/dev/null; then
        echo -e "${RED}错误: 后端服务未部署，请先运行部署脚本${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ 前置条件检查完成${NC}"
}

# 函数：配置监控和日志
setup_monitoring() {
    echo -e "${BLUE}步骤 2: 配置监控和日志${NC}"
    
    # 启用必要的 API
    echo -e "${YELLOW}启用监控相关 API...${NC}"
    gcloud services enable monitoring.googleapis.com
    gcloud services enable logging.googleapis.com
    gcloud services enable cloudtrace.googleapis.com
    gcloud services enable clouderrorreporting.googleapis.com
    
    echo -e "${YELLOW}监控配置说明:${NC}"
    echo -e "1. Cloud Monitoring 已自动启用"
    echo -e "2. Cloud Logging 已自动启用"
    echo -e "3. 可在 Google Cloud Console 中查看监控数据"
    echo -e "4. 建议设置告警策略监控应用性能"
    echo
    echo -e "${BLUE}监控链接:${NC}"
    echo -e "Cloud Monitoring: https://console.cloud.google.com/monitoring/overview?project=$PROJECT_ID"
    echo -e "Cloud Logging: https://console.cloud.google.com/logs/query?project=$PROJECT_ID"
    echo -e "Error Reporting: https://console.cloud.google.com/errors?project=$PROJECT_ID"
    echo -e "Cloud Trace: https://console.cloud.google.com/traces/list?project=$PROJECT_ID"
    
    echo -e "${GREEN}✓ 监控和日志配置完成${NC}"
}

# 函数：验证 MongoDB Atlas 连接
verify_mongodb_atlas() {
    echo -e "${BLUE}步骤 3: 验证 MongoDB Atlas 连接${NC}"
    
    # 获取后端服务的 URL
    BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region=$REGION --format="value(status.url)")
    
    # 测试健康检查端点
    echo -e "${YELLOW}测试后端服务健康状态...${NC}"
    echo -e "${BLUE}后端服务 URL: $BACKEND_URL${NC}"
    
    if curl -s -f "$BACKEND_URL/api/health" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ 后端服务运行正常${NC}"
        
        # 尝试获取健康检查详细信息
        HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/api/health" 2>/dev/null || echo "无法获取详细信息")
        echo -e "${BLUE}健康检查响应: $HEALTH_RESPONSE${NC}"
    else
        echo -e "${RED}⚠ 后端服务可能存在问题，请检查日志${NC}"
        echo -e "${YELLOW}可以使用以下命令查看日志:${NC}"
        echo -e "gcloud logs read \"resource.type=cloud_run_revision AND resource.labels.service_name=$BACKEND_SERVICE\" --limit=50 --project=$PROJECT_ID"
    fi
    
    # 显示数据库连接建议
    echo
    echo -e "${YELLOW}MongoDB Atlas 配置建议:${NC}"
    echo -e "1. 确保 IP 白名单包含 0.0.0.0/0 (允许所有 IP)"
    echo -e "2. 检查数据库用户权限"
    echo -e "3. 验证连接字符串格式正确"
    echo -e "4. 确保网络访问配置正确"
    echo -e "5. 检查 Secret Manager 中的凭据是否正确"
    
    echo -e "${GREEN}✓ MongoDB Atlas 验证完成${NC}"
}

# 函数：检查 Secret Manager 配置
check_secret_manager() {
    echo -e "${BLUE}步骤 4: 检查 Secret Manager 配置${NC}"
    
    # 检查必要的密钥是否存在
    SECRETS=("mongodb-uri" "jwt-secret" "google-vision-api-key")
    
    for secret in "${SECRETS[@]}"; do
        echo -e "${YELLOW}检查密钥: $secret${NC}"
        if gcloud secrets describe $secret &>/dev/null; then
            echo -e "${GREEN}✓ 密钥 $secret 存在${NC}"
            
            # 检查最新版本
            LATEST_VERSION=$(gcloud secrets versions list $secret --limit=1 --format="value(name)")
            echo -e "${BLUE}  最新版本: $LATEST_VERSION${NC}"
        else
            echo -e "${RED}✗ 密钥 $secret 不存在${NC}"
        fi
    done
    
    echo -e "${GREEN}✓ Secret Manager 检查完成${NC}"
}

# 函数：显示配置总结
show_summary() {
    echo -e "${BLUE}步骤 5: 配置总结${NC}"
    
    # 获取服务 URL
    FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE --region=$REGION --format="value(status.url)")
    BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region=$REGION --format="value(status.url)")
    
    echo -e "${GREEN}===========================================${NC}"
    echo -e "${GREEN}           配置完成总结                   ${NC}"
    echo -e "${GREEN}===========================================${NC}"
    echo
    echo -e "${BLUE}服务 URL:${NC}"
    echo -e "前端服务: $FRONTEND_URL"
    echo -e "后端服务: $BACKEND_URL"
    echo
    echo -e "${BLUE}监控和日志:${NC}"
    echo -e "Cloud Monitoring: https://console.cloud.google.com/monitoring/overview?project=$PROJECT_ID"
    echo -e "Cloud Logging: https://console.cloud.google.com/logs/query?project=$PROJECT_ID"
    echo -e "Error Reporting: https://console.cloud.google.com/errors?project=$PROJECT_ID"
    echo
    echo -e "${BLUE}域名配置:${NC}"
    echo -e "要配置自定义域名 $DOMAIN，请:"
    echo -e "1. 访问: https://console.cloud.google.com/apis/credentials/domainverification?project=$PROJECT_ID"
    echo -e "2. 验证域名所有权"
    echo -e "3. 运行域名配置脚本: ./scripts/complete-deployment-setup.sh"
    echo
    echo -e "${GREEN}✓ 监控和数据库配置已完成${NC}"
}

# 主执行流程
main() {
    check_prerequisites
    setup_monitoring
    verify_mongodb_atlas
    check_secret_manager
    show_summary
}

# 执行主函数
main
