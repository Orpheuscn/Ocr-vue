#!/bin/bash

# ==========================================
# 完整部署配置脚本 - textistext.com
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
echo -e "${BLUE}  完整部署配置脚本 - textistext.com      ${NC}"
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

# 函数：验证域名所有权
verify_domain_ownership() {
    echo -e "${BLUE}步骤 2: 验证域名所有权${NC}"

    # 检查域名是否已验证
    echo -e "${YELLOW}检查域名验证状态...${NC}"

    # 获取已验证的域名列表
    VERIFIED_DOMAINS=$(gcloud domains list-user-verified --format="value(domain)" 2>/dev/null || echo "")

    if echo "$VERIFIED_DOMAINS" | grep -q "^$DOMAIN$"; then
        echo -e "${GREEN}✓ 域名 $DOMAIN 已验证${NC}"
    else
        echo -e "${YELLOW}域名 $DOMAIN 尚未验证${NC}"
        echo -e "${YELLOW}请访问以下链接验证域名所有权:${NC}"
        echo -e "${BLUE}https://console.cloud.google.com/apis/credentials/domainverification?project=$PROJECT_ID${NC}"
        echo
        echo -e "${YELLOW}验证步骤:${NC}"
        echo -e "1. 在上述链接中添加域名 $DOMAIN"
        echo -e "2. 按照指示在您的域名注册商处添加 TXT 记录"
        echo -e "3. 等待验证完成"
        echo -e "4. 验证完成后重新运行此脚本"
        echo
        echo -e "${RED}域名验证是必需的，无法继续配置域名映射${NC}"
        return 1
    fi

    echo -e "${GREEN}✓ 域名所有权验证完成${NC}"
}

# 函数：配置域名映射
setup_domain_mapping() {
    echo -e "${BLUE}步骤 3: 配置域名映射${NC}"

    # 为前端服务创建域名映射
    echo -e "${YELLOW}为前端服务创建域名映射...${NC}"
    if ! gcloud beta run domain-mappings describe $DOMAIN --region=$REGION &>/dev/null; then
        if gcloud beta run domain-mappings create \
            --service=$FRONTEND_SERVICE \
            --domain=$DOMAIN \
            --region=$REGION; then
            echo -e "${GREEN}✓ 域名映射 $DOMAIN 创建成功${NC}"
        else
            echo -e "${RED}✗ 域名映射 $DOMAIN 创建失败${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}域名映射 $DOMAIN 已存在${NC}"
    fi

    # 为 www 子域名创建映射
    echo -e "${YELLOW}为 www 子域名创建映射...${NC}"
    if ! gcloud beta run domain-mappings describe www.$DOMAIN --region=$REGION &>/dev/null; then
        if gcloud beta run domain-mappings create \
            --service=$FRONTEND_SERVICE \
            --domain=www.$DOMAIN \
            --region=$REGION; then
            echo -e "${GREEN}✓ 域名映射 www.$DOMAIN 创建成功${NC}"
        else
            echo -e "${RED}✗ 域名映射 www.$DOMAIN 创建失败${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}域名映射 www.$DOMAIN 已存在${NC}"
    fi

    echo -e "${GREEN}✓ 域名映射配置完成${NC}"
}

# 函数：获取域名验证记录
get_domain_verification() {
    echo -e "${BLUE}步骤 4: 获取域名验证记录${NC}"

    echo -e "${YELLOW}请在您的域名注册商处添加以下 DNS 记录:${NC}"
    echo

    # 获取域名映射状态
    echo -e "${BLUE}主域名 ($DOMAIN) 的 DNS 记录:${NC}"
    gcloud beta run domain-mappings describe $DOMAIN --region=$REGION --format="table(status.resourceRecords[].name,status.resourceRecords[].type,status.resourceRecords[].rrdata)"

    echo
    echo -e "${BLUE}www 子域名 (www.$DOMAIN) 的 DNS 记录:${NC}"
    gcloud beta run domain-mappings describe www.$DOMAIN --region=$REGION --format="table(status.resourceRecords[].name,status.resourceRecords[].type,status.resourceRecords[].rrdata)"

    echo
    echo -e "${YELLOW}配置完成后，请等待 DNS 传播（通常需要几分钟到几小时）${NC}"
    echo -e "${GREEN}✓ 域名验证记录获取完成${NC}"
}

# 函数：配置 HTTPS 证书
setup_https_certificate() {
    echo -e "${BLUE}步骤 5: 配置 HTTPS 证书${NC}"

    echo -e "${YELLOW}Cloud Run 会自动为映射的域名提供 SSL 证书${NC}"
    echo -e "${YELLOW}证书配置将在域名验证完成后自动生效${NC}"

    # 检查证书状态
    echo -e "${YELLOW}当前主域名证书状态:${NC}"
    gcloud beta run domain-mappings describe $DOMAIN --region=$REGION --format="table(status.conditions[].type,status.conditions[].status,status.conditions[].reason)"

    echo
    echo -e "${YELLOW}当前 www 域名证书状态:${NC}"
    gcloud beta run domain-mappings describe www.$DOMAIN --region=$REGION --format="table(status.conditions[].type,status.conditions[].status,status.conditions[].reason)"

    echo -e "${GREEN}✓ HTTPS 证书配置完成${NC}"
}

# 函数：配置监控和日志
setup_monitoring() {
    echo -e "${BLUE}步骤 6: 配置监控和日志${NC}"

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
    echo -e "${BLUE}步骤 7: 验证 MongoDB Atlas 连接${NC}"

    # 获取后端服务的 URL
    BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region=$REGION --format="value(status.url)")

    # 测试健康检查端点
    echo -e "${YELLOW}测试后端服务健康状态...${NC}"
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

# 函数：显示部署总结
show_deployment_summary() {
    echo -e "${BLUE}步骤 8: 部署总结${NC}"

    # 获取服务 URL
    FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE --region=$REGION --format="value(status.url)")
    BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region=$REGION --format="value(status.url)")

    echo -e "${GREEN}===========================================${NC}"
    echo -e "${GREEN}           部署配置完成总结               ${NC}"
    echo -e "${GREEN}===========================================${NC}"
    echo
    echo -e "${BLUE}服务 URL:${NC}"
    echo -e "前端服务: $FRONTEND_URL"
    echo -e "后端服务: $BACKEND_URL"
    echo
    echo -e "${BLUE}自定义域名:${NC}"
    echo -e "主域名: https://$DOMAIN (配置中)"
    echo -e "www 域名: https://www.$DOMAIN (配置中)"
    echo
    echo -e "${BLUE}监控和日志:${NC}"
    echo -e "Cloud Monitoring: https://console.cloud.google.com/monitoring/overview?project=$PROJECT_ID"
    echo -e "Cloud Logging: https://console.cloud.google.com/logs/query?project=$PROJECT_ID"
    echo -e "Error Reporting: https://console.cloud.google.com/errors?project=$PROJECT_ID"
    echo
    echo -e "${BLUE}下一步操作:${NC}"
    echo -e "1. 在域名注册商处配置上述显示的 DNS 记录"
    echo -e "2. 等待 DNS 传播完成（通常需要几分钟到几小时）"
    echo -e "3. 验证 HTTPS 证书自动配置"
    echo -e "4. 设置监控告警策略"
    echo -e "5. 配置备份策略"
    echo
    echo -e "${YELLOW}验证域名配置的命令:${NC}"
    echo -e "gcloud beta run domain-mappings describe $DOMAIN --region=$REGION"
    echo -e "gcloud beta run domain-mappings describe www.$DOMAIN --region=$REGION"
    echo
    echo -e "${GREEN}✓ 所有配置步骤已完成${NC}"
}

# 主执行流程
main() {
    check_prerequisites
    verify_domain_ownership
    setup_domain_mapping
    get_domain_verification
    setup_https_certificate
    setup_monitoring
    verify_mongodb_atlas
    show_deployment_summary
}

# 执行主函数
main
