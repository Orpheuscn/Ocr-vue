#!/bin/bash

# ==========================================
# 生产环境部署脚本
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
FRONTEND_SERVICE="textistext-frontend"

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  生产环境部署  ${NC}"
echo -e "${BLUE}===========================================${NC}"

echo -e "${YELLOW}注意: 此脚本会重新构建和部署前端到生产环境${NC}"
echo -e "${YELLOW}确认要继续吗? (y/N)${NC}"
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}部署已取消${NC}"
    exit 0
fi

# 函数：构建前端
build_frontend() {
    echo -e "${BLUE}步骤 1: 构建前端${NC}"
    
    cd frontend
    
    # 使用Cloud Build构建镜像
    gcloud builds submit --tag gcr.io/$PROJECT_ID/$FRONTEND_SERVICE:latest .
    
    echo -e "${GREEN}✓ 前端构建完成${NC}"
    cd ..
}

# 函数：部署到Cloud Run
deploy_frontend() {
    echo -e "${BLUE}步骤 2: 部署前端到Cloud Run${NC}"
    
    # 部署服务
    gcloud run deploy $FRONTEND_SERVICE \
        --image gcr.io/$PROJECT_ID/$FRONTEND_SERVICE:latest \
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
    
    echo -e "${GREEN}✓ 前端部署完成${NC}"
}

# 函数：验证部署
verify_deployment() {
    echo -e "${BLUE}步骤 3: 验证部署${NC}"
    
    # 检查域名映射状态
    echo -e "${YELLOW}检查域名映射状态...${NC}"
    DOMAIN_STATUS=$(gcloud beta run domain-mappings describe --domain=textistext.com --region=$REGION --format="value(status.conditions[].status)" | head -1)
    
    if [ "$DOMAIN_STATUS" = "True" ]; then
        echo -e "${GREEN}✓ 域名映射正常${NC}"
    else
        echo -e "${YELLOW}⚠ 域名映射可能还在配置中${NC}"
    fi
    
    # 测试前端访问
    echo -e "${YELLOW}测试前端访问...${NC}"
    if curl -s -I https://textistext.com | grep -q "200"; then
        echo -e "${GREEN}✓ 前端访问正常${NC}"
    else
        echo -e "${YELLOW}⚠ 前端访问可能需要几分钟生效${NC}"
    fi
}

# 函数：显示部署总结
show_summary() {
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${GREEN}  部署完成！  ${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo ""
    echo -e "${YELLOW}当前架构:${NC}"
    echo -e "- 前端: Cloud Run (textistext-frontend) -> https://textistext.com"
    echo -e "- 后端: Cloud Run (textistext-backend)"
    echo -e "- SSL: Cloud Run自动管理的证书"
    echo -e "- 路由: 前端直接映射到域名，后端通过API调用"
    echo ""
    echo -e "${YELLOW}访问地址:${NC}"
    echo -e "- 前端: https://textistext.com"
    echo -e "- 后端API: https://textistext-backend-cogbmejklq-uc.a.run.app/api"
    echo ""
    echo -e "${YELLOW}开发建议:${NC}"
    echo -e "- 日常开发使用: ./scripts/dev-start.sh"
    echo -e "- 只在需要发布新版本时运行此脚本"
}

# 主函数
main() {
    echo -e "${BLUE}开始生产环境部署...${NC}"
    
    build_frontend
    echo ""
    deploy_frontend
    echo ""
    verify_deployment
    echo ""
    show_summary
    
    echo -e "${GREEN}生产环境部署完成！${NC}"
}

# 执行主函数
main "$@"
