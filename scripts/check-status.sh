#!/bin/bash

# ==========================================
# 系统状态检查脚本
# ==========================================

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  系统状态检查  ${NC}"
echo -e "${BLUE}===========================================${NC}"

# 函数：检查Cloud Run服务
check_cloud_run_services() {
    echo -e "${BLUE}步骤 1: 检查Cloud Run服务${NC}"
    
    # 检查前端服务
    if gcloud run services describe textistext-frontend --region=us-central1 &>/dev/null; then
        FRONTEND_URL=$(gcloud run services describe textistext-frontend --region=us-central1 --format='value(status.url)')
        echo -e "${GREEN}✓ 前端服务运行正常: $FRONTEND_URL${NC}"
    else
        echo -e "${RED}✗ 前端服务未找到${NC}"
    fi
    
    # 检查后端服务
    if gcloud run services describe textistext-backend --region=us-central1 &>/dev/null; then
        BACKEND_URL=$(gcloud run services describe textistext-backend --region=us-central1 --format='value(status.url)')
        echo -e "${GREEN}✓ 后端服务运行正常: $BACKEND_URL${NC}"
    else
        echo -e "${RED}✗ 后端服务未找到${NC}"
    fi
}

# 函数：检查域名映射
check_domain_mapping() {
    echo -e "${BLUE}步骤 2: 检查域名映射${NC}"
    
    if gcloud beta run domain-mappings describe --domain=textistext.com --region=us-central1 &>/dev/null; then
        DOMAIN_STATUS=$(gcloud beta run domain-mappings describe --domain=textistext.com --region=us-central1 --format="value(status.conditions[].status)" | head -1)
        
        if [ "$DOMAIN_STATUS" = "True" ]; then
            echo -e "${GREEN}✓ 域名映射正常 (textistext.com)${NC}"
        else
            echo -e "${YELLOW}⚠ 域名映射正在配置中${NC}"
        fi
        
        # 显示DNS记录
        echo -e "${BLUE}DNS记录:${NC}"
        gcloud beta run domain-mappings describe --domain=textistext.com --region=us-central1 --format="value(status.resourceRecords[].rrdata)" | head -4
    else
        echo -e "${RED}✗ 域名映射未找到${NC}"
    fi
}

# 函数：测试服务访问
test_service_access() {
    echo -e "${BLUE}步骤 3: 测试服务访问${NC}"
    
    # 测试前端访问
    echo -e "${YELLOW}测试前端访问...${NC}"
    if curl -s -I https://textistext.com | grep -q "200"; then
        echo -e "${GREEN}✓ 前端访问正常 (https://textistext.com)${NC}"
    else
        echo -e "${YELLOW}⚠ 前端访问异常${NC}"
    fi
    
    # 测试后端访问
    echo -e "${YELLOW}测试后端访问...${NC}"
    BACKEND_URL=$(gcloud run services describe textistext-backend --region=us-central1 --format='value(status.url)' 2>/dev/null)
    if [ ! -z "$BACKEND_URL" ]; then
        if curl -s -f "$BACKEND_URL/api/health" >/dev/null; then
            echo -e "${GREEN}✓ 后端访问正常 ($BACKEND_URL/api/health)${NC}"
        else
            echo -e "${YELLOW}⚠ 后端访问异常${NC}"
        fi
    fi
}

# 函数：显示系统总结
show_system_summary() {
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${GREEN}  系统状态总结  ${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo ""
    echo -e "${YELLOW}当前架构:${NC}"
    echo -e "- 前端: Cloud Run (textistext-frontend) -> https://textistext.com"
    echo -e "- 后端: Cloud Run (textistext-backend)"
    echo -e "- 数据库: MongoDB Atlas"
    echo -e "- SSL: Cloud Run自动管理的证书"
    echo ""
    echo -e "${YELLOW}开发工作流:${NC}"
    echo -e "1. 日常开发: ./scripts/dev-start.sh (热重载，连接云端后端)"
    echo -e "2. 生产部署: ./scripts/deploy-production.sh (仅在发布时使用)"
    echo -e "3. 状态检查: ./scripts/check-status.sh (当前脚本)"
    echo ""
    echo -e "${YELLOW}有用的命令:${NC}"
    echo -e "- 查看前端日志: gcloud logs read 'resource.type=cloud_run_revision AND resource.labels.service_name=textistext-frontend' --limit=20"
    echo -e "- 查看后端日志: gcloud logs read 'resource.type=cloud_run_revision AND resource.labels.service_name=textistext-backend' --limit=20"
}

# 主函数
main() {
    echo -e "${BLUE}开始系统状态检查...${NC}"
    
    check_cloud_run_services
    echo ""
    check_domain_mapping
    echo ""
    test_service_access
    echo ""
    show_system_summary
    
    echo -e "${GREEN}系统状态检查完成！${NC}"
}

# 执行主函数
main "$@"
