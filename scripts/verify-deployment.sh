#!/bin/bash

# ==========================================
# 部署验证脚本
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
echo -e "${BLUE}  部署验证  ${NC}"
echo -e "${BLUE}===========================================${NC}"

# 函数：验证Cloud Run服务
verify_cloud_run_services() {
    echo -e "${BLUE}步骤 1: 验证 Cloud Run 服务${NC}"
    
    # 检查前端服务
    if gcloud run services describe textistext-frontend --region=$REGION &>/dev/null; then
        FRONTEND_URL=$(gcloud run services describe textistext-frontend --region=$REGION --format='value(status.url)')
        echo -e "${GREEN}✓ 前端服务运行正常: $FRONTEND_URL${NC}"
        
        # 测试前端健康检查
        if curl -s -f "$FRONTEND_URL/health" >/dev/null; then
            echo -e "${GREEN}✓ 前端健康检查通过${NC}"
        else
            echo -e "${YELLOW}⚠ 前端健康检查失败${NC}"
        fi
    else
        echo -e "${RED}✗ 前端服务未找到${NC}"
    fi
    
    # 检查后端服务
    if gcloud run services describe textistext-backend --region=$REGION &>/dev/null; then
        BACKEND_URL=$(gcloud run services describe textistext-backend --region=$REGION --format='value(status.url)')
        echo -e "${GREEN}✓ 后端服务运行正常: $BACKEND_URL${NC}"
        
        # 测试后端健康检查
        if curl -s -f "$BACKEND_URL/api/health" >/dev/null; then
            echo -e "${GREEN}✓ 后端健康检查通过${NC}"
        else
            echo -e "${YELLOW}⚠ 后端健康检查失败${NC}"
        fi
    else
        echo -e "${RED}✗ 后端服务未找到${NC}"
    fi
}

# 函数：验证负载均衡器
verify_load_balancer() {
    echo -e "${BLUE}步骤 2: 验证负载均衡器${NC}"
    
    # 检查静态IP
    if gcloud compute addresses describe textistext-ip --global &>/dev/null; then
        STATIC_IP=$(gcloud compute addresses describe textistext-ip --global --format="value(address)")
        echo -e "${GREEN}✓ 静态 IP: $STATIC_IP${NC}"
    else
        echo -e "${RED}✗ 静态 IP 未找到${NC}"
        return 1
    fi
    
    # 检查SSL证书
    SSL_STATUS=$(gcloud compute ssl-certificates describe textistext-ssl-cert --global --format="value(managed.status)" 2>/dev/null || echo "NOT_FOUND")
    if [ "$SSL_STATUS" = "ACTIVE" ]; then
        echo -e "${GREEN}✓ SSL 证书已激活${NC}"
    elif [ "$SSL_STATUS" = "PROVISIONING" ]; then
        echo -e "${YELLOW}⚠ SSL 证书正在配置中${NC}"
    else
        echo -e "${RED}✗ SSL 证书状态异常: $SSL_STATUS${NC}"
    fi
    
    # 测试负载均衡器路由
    echo -e "${YELLOW}测试负载均衡器路由...${NC}"
    
    # 测试前端路由
    if curl -s -I -H "Host: $DOMAIN" http://$STATIC_IP | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✓ 前端路由正常${NC}"
    else
        echo -e "${RED}✗ 前端路由失败${NC}"
    fi
    
    # 测试API路由
    if curl -s -I -H "Host: $DOMAIN" http://$STATIC_IP/api/health | grep -q "200"; then
        echo -e "${GREEN}✓ API 路由正常${NC}"
    else
        echo -e "${RED}✗ API 路由失败${NC}"
    fi
}

# 函数：验证DNS配置
verify_dns() {
    echo -e "${BLUE}步骤 3: 验证 DNS 配置${NC}"
    
    # 检查DNS区域
    if gcloud dns managed-zones describe textistext-zone &>/dev/null; then
        echo -e "${GREEN}✓ DNS 区域存在${NC}"
        
        # 显示NS记录
        echo -e "${YELLOW}NS 记录:${NC}"
        gcloud dns managed-zones describe textistext-zone --format="value(nameServers[].join(' '))"
        
        # 检查A记录
        A_RECORDS=$(gcloud dns record-sets list --zone=textistext-zone --filter="type=A" --format="value(name,rrdatas[].join(' '))")
        if [ ! -z "$A_RECORDS" ]; then
            echo -e "${GREEN}✓ A 记录已配置${NC}"
            echo -e "${BLUE}$A_RECORDS${NC}"
        else
            echo -e "${RED}✗ A 记录未找到${NC}"
        fi
    else
        echo -e "${RED}✗ DNS 区域未找到${NC}"
    fi
}

# 函数：测试域名访问
test_domain_access() {
    echo -e "${BLUE}步骤 4: 测试域名访问${NC}"
    
    # 测试HTTP访问
    echo -e "${YELLOW}测试 HTTP 访问...${NC}"
    HTTP_RESPONSE=$(curl -s -I http://$DOMAIN 2>/dev/null | head -1 || echo "FAILED")
    if echo "$HTTP_RESPONSE" | grep -q "301\|302"; then
        echo -e "${GREEN}✓ HTTP 重定向到 HTTPS 正常${NC}"
    else
        echo -e "${YELLOW}⚠ HTTP 访问: $HTTP_RESPONSE${NC}"
    fi
    
    # 测试HTTPS访问
    echo -e "${YELLOW}测试 HTTPS 访问...${NC}"
    HTTPS_RESPONSE=$(curl -s -I https://$DOMAIN 2>/dev/null | head -1 || echo "FAILED")
    if echo "$HTTPS_RESPONSE" | grep -q "200"; then
        echo -e "${GREEN}✓ HTTPS 访问正常${NC}"
    else
        echo -e "${YELLOW}⚠ HTTPS 访问: $HTTPS_RESPONSE${NC}"
    fi
    
    # 测试API访问
    echo -e "${YELLOW}测试 API 访问...${NC}"
    API_RESPONSE=$(curl -s https://$DOMAIN/api/health 2>/dev/null || echo "FAILED")
    if echo "$API_RESPONSE" | grep -q "healthy\|ok"; then
        echo -e "${GREEN}✓ API 访问正常${NC}"
    else
        echo -e "${YELLOW}⚠ API 访问: $API_RESPONSE${NC}"
    fi
}

# 函数：显示部署状态总结
show_deployment_summary() {
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${GREEN}  部署状态总结  ${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo ""
    echo -e "${YELLOW}当前架构:${NC}"
    echo -e "- 前端: Cloud Run (textistext-frontend)"
    echo -e "- 后端: Cloud Run (textistext-backend)"
    echo -e "- 负载均衡: Google Cloud Load Balancing"
    echo -e "- 数据库: MongoDB Atlas"
    echo -e "- 域名: https://$DOMAIN"
    echo -e "- SSL: Google 管理的证书"
    echo ""
    echo -e "${YELLOW}访问地址:${NC}"
    echo -e "- 主域名: https://$DOMAIN"
    echo -e "- www域名: https://www.$DOMAIN"
    echo -e "- 静态IP: $(gcloud compute addresses describe textistext-ip --global --format="value(address)" 2>/dev/null || echo "未获取到")"
    echo ""
    echo -e "${YELLOW}监控命令:${NC}"
    echo -e "- 重新验证: ./scripts/verify-deployment.sh"
    echo -e "- 监控负载均衡器: ./scripts/monitor-load-balancer.sh"
    echo -e "- 查看日志: gcloud logging read 'resource.type=cloud_run_revision'"
}

# 主函数
main() {
    echo -e "${BLUE}开始部署验证...${NC}"
    
    verify_cloud_run_services
    echo ""
    verify_load_balancer
    echo ""
    verify_dns
    echo ""
    test_domain_access
    echo ""
    show_deployment_summary
    
    echo -e "${GREEN}部署验证完成！${NC}"
}

# 执行主函数
main "$@"
