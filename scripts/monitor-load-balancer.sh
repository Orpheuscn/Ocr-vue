#!/bin/bash

# ==========================================
# Google Cloud Load Balancer 监控脚本
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
echo -e "${BLUE}  Google Cloud Load Balancer 监控  ${NC}"
echo -e "${BLUE}===========================================${NC}"

# 函数：检查SSL证书状态
check_ssl_status() {
    echo -e "${BLUE}步骤 1: 检查 SSL 证书状态${NC}"
    
    SSL_STATUS=$(gcloud compute ssl-certificates describe textistext-ssl-cert --global --format="value(managed.status)")
    
    echo -e "${YELLOW}SSL 证书状态: $SSL_STATUS${NC}"
    
    if [ "$SSL_STATUS" = "ACTIVE" ]; then
        echo -e "${GREEN}✓ SSL 证书已激活${NC}"
    else
        echo -e "${YELLOW}⚠ SSL 证书仍在配置中，请等待...${NC}"
        echo -e "${BLUE}域名状态:${NC}"
        gcloud compute ssl-certificates describe textistext-ssl-cert --global --format="value(managed.domainStatus)"
    fi
}

# 函数：检查静态IP
check_static_ip() {
    echo -e "${BLUE}步骤 2: 检查静态 IP${NC}"
    
    STATIC_IP=$(gcloud compute addresses describe textistext-ip --global --format="value(address)")
    echo -e "${GREEN}静态 IP: $STATIC_IP${NC}"
}

# 函数：检查DNS记录
check_dns_records() {
    echo -e "${BLUE}步骤 3: 检查 DNS 记录${NC}"
    
    echo -e "${YELLOW}当前 DNS 记录:${NC}"
    gcloud dns record-sets list --zone=textistext-zone --filter="type=A"
}

# 函数：测试负载均衡器
test_load_balancer() {
    echo -e "${BLUE}步骤 4: 测试负载均衡器${NC}"
    
    STATIC_IP=$(gcloud compute addresses describe textistext-ip --global --format="value(address)")
    
    echo -e "${YELLOW}测试前端访问 (通过 IP):${NC}"
    if curl -s -I -H "Host: textistext.com" http://$STATIC_IP | head -1; then
        echo -e "${GREEN}✓ 前端可通过负载均衡器访问${NC}"
    else
        echo -e "${RED}✗ 前端访问失败${NC}"
    fi
    
    echo -e "${YELLOW}测试后端 API (通过 IP):${NC}"
    if curl -s -I -H "Host: textistext.com" http://$STATIC_IP/api/health | head -1; then
        echo -e "${GREEN}✓ 后端 API 可通过负载均衡器访问${NC}"
    else
        echo -e "${RED}✗ 后端 API 访问失败${NC}"
    fi
}

# 函数：测试域名访问
test_domain_access() {
    echo -e "${BLUE}步骤 5: 测试域名访问${NC}"
    
    echo -e "${YELLOW}测试 HTTP 重定向:${NC}"
    if curl -s -I http://textistext.com | grep -q "301\|302"; then
        echo -e "${GREEN}✓ HTTP 到 HTTPS 重定向正常${NC}"
    else
        echo -e "${YELLOW}⚠ HTTP 重定向可能还未生效${NC}"
    fi
    
    echo -e "${YELLOW}测试 HTTPS 访问:${NC}"
    if curl -s -I https://textistext.com | head -1; then
        echo -e "${GREEN}✓ HTTPS 访问正常${NC}"
    else
        echo -e "${YELLOW}⚠ HTTPS 访问可能还未生效${NC}"
    fi
}

# 函数：显示后续步骤
show_next_steps() {
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${GREEN}  监控完成  ${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo ""
    echo -e "${YELLOW}后续步骤:${NC}"
    echo -e "1. 在域名注册商处设置以下 NS 记录:"
    gcloud dns managed-zones describe textistext-zone --format="value(nameServers[].join(' '))"
    echo ""
    echo -e "2. 等待 DNS 传播 (通常需要几分钟到几小时)"
    echo -e "3. 等待 SSL 证书激活 (通常需要几分钟到几小时)"
    echo -e "4. 访问 https://textistext.com 验证部署"
    echo ""
    echo -e "${YELLOW}有用的命令:${NC}"
    echo -e "- 检查 SSL 证书: gcloud compute ssl-certificates describe textistext-ssl-cert --global"
    echo -e "- 查看负载均衡器日志: gcloud logging read 'resource.type=http_load_balancer'"
    echo -e "- 重新运行此监控脚本: ./scripts/monitor-load-balancer.sh"
}

# 主函数
main() {
    echo -e "${BLUE}开始负载均衡器监控...${NC}"
    
    check_ssl_status
    echo ""
    check_static_ip
    echo ""
    check_dns_records
    echo ""
    test_load_balancer
    echo ""
    test_domain_access
    echo ""
    show_next_steps
    
    echo -e "${GREEN}监控完成！${NC}"
}

# 执行主函数
main "$@"
