#!/bin/bash

# ==========================================
# 重新部署前端服务脚本
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
SERVICE_NAME="textistext-frontend"

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  重新部署前端服务  ${NC}"
echo -e "${BLUE}===========================================${NC}"

# 函数：使用Cloud Build构建镜像
build_with_cloud_build() {
    echo -e "${BLUE}步骤 1: 使用Cloud Build构建镜像${NC}"

    cd frontend

    # 使用Cloud Build构建镜像
    gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME:latest .

    echo -e "${GREEN}✓ 镜像构建完成${NC}"
    cd ..
}

# 函数：部署到Cloud Run
deploy_to_cloud_run() {
    echo -e "${BLUE}步骤 2: 部署到Cloud Run${NC}"

    # 部署服务
    gcloud run deploy $SERVICE_NAME \
        --image gcr.io/$PROJECT_ID/$SERVICE_NAME:latest \
        --platform managed \
        --region $REGION \
        --allow-unauthenticated \
        --port 80 \
        --memory 512Mi \
        --cpu 1 \
        --min-instances 0 \
        --max-instances 10 \
        --timeout 300 \
        --set-env-vars="NODE_ENV=production"

    echo -e "${GREEN}✓ 服务部署完成${NC}"
}

# 函数：验证部署
verify_deployment() {
    echo -e "${BLUE}步骤 3: 验证部署${NC}"

    # 获取服务URL
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
    echo -e "${GREEN}服务URL: $SERVICE_URL${NC}"

    # 测试健康检查
    echo -e "${YELLOW}测试健康检查...${NC}"
    if curl -s -f "$SERVICE_URL/health" >/dev/null; then
        echo -e "${GREEN}✓ 健康检查通过${NC}"
    else
        echo -e "${RED}✗ 健康检查失败${NC}"
    fi

    # 测试域名访问
    echo -e "${YELLOW}测试域名访问...${NC}"
    if curl -s -I https://textistext.com | grep -q "200"; then
        echo -e "${GREEN}✓ 域名访问正常${NC}"
    else
        echo -e "${YELLOW}⚠ 域名访问可能需要几分钟生效${NC}"
    fi

    # 测试API代理
    echo -e "${YELLOW}测试API代理...${NC}"
    API_RESPONSE=$(curl -s https://textistext.com/api/health 2>/dev/null || echo "FAILED")
    if echo "$API_RESPONSE" | grep -q "status.*online"; then
        echo -e "${GREEN}✓ API代理正常工作${NC}"
    else
        echo -e "${YELLOW}⚠ API代理可能需要几分钟生效${NC}"
        echo -e "${BLUE}响应: $API_RESPONSE${NC}"
    fi
}

# 函数：显示部署总结
show_deployment_summary() {
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${GREEN}  部署完成！  ${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo ""
    echo -e "${YELLOW}当前架构:${NC}"
    echo -e "- 前端: Cloud Run (textistext-frontend) -> https://textistext.com"
    echo -e "- 后端: Cloud Run (textistext-backend)"
    echo -e "- API路由: 前端nginx代理 /api/* 到后端服务"
    echo -e "- SSL: Cloud Run自动管理的证书"
    echo ""
    echo -e "${YELLOW}访问地址:${NC}"
    echo -e "- 前端: https://textistext.com"
    echo -e "- API: https://textistext.com/api/health"
    echo ""
    echo -e "${YELLOW}监控命令:${NC}"
    echo -e "- 查看前端日志: gcloud logs read 'resource.type=cloud_run_revision AND resource.labels.service_name=textistext-frontend' --limit=50"
    echo -e "- 查看后端日志: gcloud logs read 'resource.type=cloud_run_revision AND resource.labels.service_name=textistext-backend' --limit=50"
}

# 主函数
main() {
    echo -e "${BLUE}开始重新部署前端服务...${NC}"

    build_with_cloud_build
    echo ""
    deploy_to_cloud_run
    echo ""
    verify_deployment
    echo ""
    show_deployment_summary

    echo -e "${GREEN}前端服务重新部署完成！${NC}"
}

# 执行主函数
main "$@"
