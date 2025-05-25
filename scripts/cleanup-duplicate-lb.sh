#!/bin/bash

# ==========================================
# 清理重复的负载均衡器配置脚本
# ==========================================

set -e  # 遇到错误立即退出

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  清理重复的负载均衡器配置  ${NC}"
echo -e "${BLUE}===========================================${NC}"

echo -e "${YELLOW}注意：您已经有一个工作正常的Cloud Run域名映射配置${NC}"
echo -e "${YELLOW}现在将删除刚才错误创建的负载均衡器资源${NC}"
echo ""

# 函数：删除转发规则
delete_forwarding_rules() {
    echo -e "${BLUE}步骤 1: 删除转发规则${NC}"
    
    if gcloud compute forwarding-rules describe textistext-https-forwarding-rule --global &>/dev/null; then
        gcloud compute forwarding-rules delete textistext-https-forwarding-rule --global --quiet
        echo -e "${GREEN}✓ 删除 HTTPS 转发规则${NC}"
    fi
    
    if gcloud compute forwarding-rules describe textistext-http-forwarding-rule --global &>/dev/null; then
        gcloud compute forwarding-rules delete textistext-http-forwarding-rule --global --quiet
        echo -e "${GREEN}✓ 删除 HTTP 转发规则${NC}"
    fi
}

# 函数：删除代理
delete_proxies() {
    echo -e "${BLUE}步骤 2: 删除代理${NC}"
    
    if gcloud compute target-https-proxies describe textistext-https-proxy &>/dev/null; then
        gcloud compute target-https-proxies delete textistext-https-proxy --quiet
        echo -e "${GREEN}✓ 删除 HTTPS 代理${NC}"
    fi
    
    if gcloud compute target-http-proxies describe textistext-http-proxy &>/dev/null; then
        gcloud compute target-http-proxies delete textistext-http-proxy --quiet
        echo -e "${GREEN}✓ 删除 HTTP 代理${NC}"
    fi
}

# 函数：删除SSL证书
delete_ssl_certificate() {
    echo -e "${BLUE}步骤 3: 删除重复的SSL证书${NC}"
    
    if gcloud compute ssl-certificates describe textistext-ssl-cert --global &>/dev/null; then
        gcloud compute ssl-certificates delete textistext-ssl-cert --global --quiet
        echo -e "${GREEN}✓ 删除重复的SSL证书${NC}"
    fi
}

# 函数：删除URL映射
delete_url_map() {
    echo -e "${BLUE}步骤 4: 删除URL映射${NC}"
    
    if gcloud compute url-maps describe textistext-url-map &>/dev/null; then
        gcloud compute url-maps delete textistext-url-map --quiet
        echo -e "${GREEN}✓ 删除URL映射${NC}"
    fi
}

# 函数：删除后端服务
delete_backend_services() {
    echo -e "${BLUE}步骤 5: 删除后端服务${NC}"
    
    if gcloud compute backend-services describe frontend-backend-service --global &>/dev/null; then
        gcloud compute backend-services delete frontend-backend-service --global --quiet
        echo -e "${GREEN}✓ 删除前端后端服务${NC}"
    fi
    
    if gcloud compute backend-services describe backend-backend-service --global &>/dev/null; then
        gcloud compute backend-services delete backend-backend-service --global --quiet
        echo -e "${GREEN}✓ 删除后端后端服务${NC}"
    fi
}

# 函数：删除网络端点组
delete_negs() {
    echo -e "${BLUE}步骤 6: 删除网络端点组${NC}"
    
    if gcloud compute network-endpoint-groups describe frontend-neg --region=us-central1 &>/dev/null; then
        gcloud compute network-endpoint-groups delete frontend-neg --region=us-central1 --quiet
        echo -e "${GREEN}✓ 删除前端网络端点组${NC}"
    fi
    
    if gcloud compute network-endpoint-groups describe backend-neg --region=us-central1 &>/dev/null; then
        gcloud compute network-endpoint-groups delete backend-neg --region=us-central1 --quiet
        echo -e "${GREEN}✓ 删除后端网络端点组${NC}"
    fi
}

# 函数：删除静态IP（可选）
delete_static_ip() {
    echo -e "${BLUE}步骤 7: 删除静态IP${NC}"
    
    if gcloud compute addresses describe textistext-ip --global &>/dev/null; then
        echo -e "${YELLOW}是否删除静态IP? (y/N)${NC}"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            gcloud compute addresses delete textistext-ip --global --quiet
            echo -e "${GREEN}✓ 删除静态IP${NC}"
        else
            echo -e "${YELLOW}保留静态IP${NC}"
        fi
    fi
}

# 函数：删除DNS区域（可选）
delete_dns_zone() {
    echo -e "${BLUE}步骤 8: 删除DNS区域${NC}"
    
    if gcloud dns managed-zones describe textistext-zone &>/dev/null; then
        echo -e "${YELLOW}是否删除DNS区域? (y/N)${NC}"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            # 先删除所有记录（除了NS和SOA）
            gcloud dns record-sets list --zone=textistext-zone --filter="type!=NS AND type!=SOA" --format="value(name,type)" | while read name type; do
                if [ ! -z "$name" ] && [ ! -z "$type" ]; then
                    gcloud dns record-sets delete "$name" --zone=textistext-zone --type="$type" --quiet || true
                fi
            done
            
            gcloud dns managed-zones delete textistext-zone --quiet
            echo -e "${GREEN}✓ 删除DNS区域${NC}"
        else
            echo -e "${YELLOW}保留DNS区域${NC}"
        fi
    fi
}

# 函数：显示当前正确的配置
show_current_config() {
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${GREEN}  当前正确的配置  ${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo ""
    echo -e "${YELLOW}您的正确架构:${NC}"
    echo -e "- 前端: Cloud Run (textistext-frontend) 直接映射到域名"
    echo -e "- 后端: Cloud Run (textistext-backend)"
    echo -e "- 域名: textistext.com (通过Cloud Run域名映射)"
    echo -e "- SSL: Cloud Run自动管理的证书 (已生效)"
    echo ""
    echo -e "${YELLOW}域名映射状态:${NC}"
    gcloud beta run domain-mappings describe --domain=textistext.com --region=us-central1 --format="value(status.conditions[].type,status.conditions[].status)"
    echo ""
    echo -e "${YELLOW}访问地址:${NC}"
    echo -e "- https://textistext.com (直接访问前端)"
    echo -e "- 后端API需要通过前端的nginx代理访问"
}

# 主函数
main() {
    echo -e "${BLUE}开始清理重复配置...${NC}"
    
    delete_forwarding_rules
    echo ""
    delete_proxies
    echo ""
    delete_ssl_certificate
    echo ""
    delete_url_map
    echo ""
    delete_backend_services
    echo ""
    delete_negs
    echo ""
    delete_static_ip
    echo ""
    delete_dns_zone
    echo ""
    show_current_config
    
    echo -e "${GREEN}清理完成！${NC}"
}

# 执行主函数
main "$@"
