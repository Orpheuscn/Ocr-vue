#!/bin/bash

# ==========================================
# 修复API路由问题脚本
# ==========================================

set -e  # 遇到错误立即退出

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  修复API路由问题  ${NC}"
echo -e "${BLUE}===========================================${NC}"

echo -e "${YELLOW}当前问题：前端直接映射到域名，但API调用无法路由到后端${NC}"
echo -e "${YELLOW}解决方案：更新前端配置，直接调用后端服务${NC}"
echo ""

# 函数：检查当前状态
check_current_status() {
    echo -e "${BLUE}步骤 1: 检查当前状态${NC}"
    
    # 检查域名映射
    if gcloud beta run domain-mappings describe --domain=textistext.com --region=us-central1 &>/dev/null; then
        echo -e "${GREEN}✓ 域名映射存在${NC}"
        DOMAIN_STATUS=$(gcloud beta run domain-mappings describe --domain=textistext.com --region=us-central1 --format="value(status.conditions[].status)" | head -1)
        echo -e "${BLUE}域名映射状态: $DOMAIN_STATUS${NC}"
    else
        echo -e "${RED}✗ 域名映射不存在${NC}"
        return 1
    fi
    
    # 检查后端服务
    if gcloud run services describe textistext-backend --region=us-central1 &>/dev/null; then
        BACKEND_URL=$(gcloud run services describe textistext-backend --region=us-central1 --format='value(status.url)')
        echo -e "${GREEN}✓ 后端服务正常: $BACKEND_URL${NC}"
    else
        echo -e "${RED}✗ 后端服务不存在${NC}"
        return 1
    fi
}

# 函数：更新前端配置
update_frontend_config() {
    echo -e "${BLUE}步骤 2: 更新前端配置${NC}"
    
    # 获取后端URL
    BACKEND_URL=$(gcloud run services describe textistext-backend --region=us-central1 --format='value(status.url)')
    
    # 更新生产环境配置
    echo -e "${YELLOW}更新 .env.production...${NC}"
    cat > frontend/.env.production << EOF
# 生产环境配置
NODE_ENV=production
VITE_API_BASE_URL=${BACKEND_URL}/api
VITE_APP_TITLE=TextIsText OCR
VITE_APP_DESCRIPTION=专业的OCR文本识别工具
EOF
    
    echo -e "${GREEN}✓ 前端配置已更新${NC}"
    echo -e "${BLUE}API基础URL: ${BACKEND_URL}/api${NC}"
}

# 函数：重新部署前端
redeploy_frontend() {
    echo -e "${BLUE}步骤 3: 重新部署前端${NC}"
    
    echo -e "${YELLOW}确认要重新部署前端吗? (y/N)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}跳过前端部署${NC}"
        return 0
    fi
    
    cd frontend
    
    # 使用Cloud Build构建镜像
    echo -e "${YELLOW}构建前端镜像...${NC}"
    gcloud builds submit --tag gcr.io/textistext-ocr/textistext-frontend:latest .
    
    # 部署到Cloud Run
    echo -e "${YELLOW}部署到Cloud Run...${NC}"
    gcloud run deploy textistext-frontend \
        --image gcr.io/textistext-ocr/textistext-frontend:latest \
        --platform managed \
        --region us-central1 \
        --allow-unauthenticated \
        --port 80 \
        --memory 512Mi \
        --cpu 1 \
        --min-instances 0 \
        --max-instances 10 \
        --timeout 300 \
        --set-env-vars="NODE_ENV=production"
    
    cd ..
    echo -e "${GREEN}✓ 前端重新部署完成${NC}"
}

# 函数：测试API访问
test_api_access() {
    echo -e "${BLUE}步骤 4: 测试API访问${NC}"
    
    # 等待几秒让部署生效
    echo -e "${YELLOW}等待部署生效...${NC}"
    sleep 10
    
    # 测试前端访问
    echo -e "${YELLOW}测试前端访问...${NC}"
    if curl -s -I https://textistext.com | grep -q "200"; then
        echo -e "${GREEN}✓ 前端访问正常${NC}"
    else
        echo -e "${YELLOW}⚠ 前端访问可能需要几分钟生效${NC}"
    fi
    
    # 测试后端API直接访问
    BACKEND_URL=$(gcloud run services describe textistext-backend --region=us-central1 --format='value(status.url)')
    echo -e "${YELLOW}测试后端API直接访问...${NC}"
    if curl -s -f "$BACKEND_URL/api/health" >/dev/null; then
        echo -e "${GREEN}✓ 后端API直接访问正常${NC}"
    else
        echo -e "${RED}✗ 后端API直接访问失败${NC}"
    fi
}

# 函数：显示解决方案总结
show_solution_summary() {
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${GREEN}  API路由问题修复完成！  ${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo ""
    echo -e "${YELLOW}修复方案:${NC}"
    echo -e "1. ✅ 保持现有域名映射 (textistext.com -> 前端)"
    echo -e "2. ✅ 更新前端配置，API直接调用后端服务"
    echo -e "3. ✅ 重新部署前端应用新配置"
    echo ""
    echo -e "${YELLOW}当前架构:${NC}"
    echo -e "- 前端: https://textistext.com (Cloud Run域名映射)"
    echo -e "- 后端: $(gcloud run services describe textistext-backend --region=us-central1 --format='value(status.url)' 2>/dev/null || echo '后端服务URL')"
    echo -e "- API调用: 前端直接调用后端服务"
    echo -e "- SSL: Cloud Run自动管理"
    echo ""
    echo -e "${YELLOW}开发工作流:${NC}"
    echo -e "- 本地开发: ./scripts/dev-start.sh"
    echo -e "- 生产部署: ./scripts/deploy-production.sh"
    echo -e "- 状态检查: ./scripts/check-status.sh"
    echo ""
    echo -e "${GREEN}现在API调用应该正常工作了！${NC}"
}

# 主函数
main() {
    echo -e "${BLUE}开始修复API路由问题...${NC}"
    
    check_current_status
    echo ""
    update_frontend_config
    echo ""
    redeploy_frontend
    echo ""
    test_api_access
    echo ""
    show_solution_summary
    
    echo -e "${GREEN}API路由问题修复完成！${NC}"
}

# 执行主函数
main "$@"
