#!/bin/bash

# ==========================================
# Google Cloud Load Balancer 设置脚本
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

# 检查现有域名映射状态
check_existing_domain_mapping() {
    echo -e "${BLUE}检查现有域名映射...${NC}"

    if gcloud beta run domain-mappings describe --domain=$DOMAIN --region=$REGION &>/dev/null; then
        echo -e "${YELLOW}发现现有域名映射，将保持不变${NC}"
        echo -e "${YELLOW}注意：负载均衡器将与现有域名映射冲突${NC}"
        echo -e "${YELLOW}建议：使用现有域名映射或手动删除后再运行此脚本${NC}"
        return 1
    else
        echo -e "${GREEN}✓ 没有现有域名映射，可以创建负载均衡器${NC}"
        return 0
    fi
}

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  Google Cloud Load Balancer 设置  ${NC}"
echo -e "${BLUE}===========================================${NC}"

# 函数：获取 Cloud Run 服务 URL
get_service_urls() {
    echo -e "${BLUE}步骤 1: 获取 Cloud Run 服务 URL${NC}"

    FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE --region $REGION --format 'value(status.url)')
    BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region $REGION --format 'value(status.url)')

    echo -e "${GREEN}Frontend URL: $FRONTEND_URL${NC}"
    echo -e "${GREEN}Backend URL: $BACKEND_URL${NC}"
}

# 函数：创建网络端点组
create_neg() {
    echo -e "${BLUE}步骤 2: 创建网络端点组${NC}"

    # 前端 NEG
    if ! gcloud compute network-endpoint-groups describe frontend-neg --region=$REGION &>/dev/null; then
        gcloud compute network-endpoint-groups create frontend-neg \
            --region=$REGION \
            --network-endpoint-type=serverless \
            --cloud-run-service=$FRONTEND_SERVICE
    fi

    # 后端 NEG
    if ! gcloud compute network-endpoint-groups describe backend-neg --region=$REGION &>/dev/null; then
        gcloud compute network-endpoint-groups create backend-neg \
            --region=$REGION \
            --network-endpoint-type=serverless \
            --cloud-run-service=$BACKEND_SERVICE
    fi

    echo -e "${GREEN}✓ 网络端点组创建完成${NC}"
}

# 函数：创建后端服务
create_backend_services() {
    echo -e "${BLUE}步骤 3: 创建后端服务${NC}"

    # 前端后端服务
    if ! gcloud compute backend-services describe frontend-backend-service --global &>/dev/null; then
        gcloud compute backend-services create frontend-backend-service \
            --global \
            --load-balancing-scheme=EXTERNAL \
            --protocol=HTTP

        gcloud compute backend-services add-backend frontend-backend-service \
            --global \
            --network-endpoint-group=frontend-neg \
            --network-endpoint-group-region=$REGION
    fi

    # 后端后端服务
    if ! gcloud compute backend-services describe backend-backend-service --global &>/dev/null; then
        gcloud compute backend-services create backend-backend-service \
            --global \
            --load-balancing-scheme=EXTERNAL \
            --protocol=HTTP

        gcloud compute backend-services add-backend backend-backend-service \
            --global \
            --network-endpoint-group=backend-neg \
            --network-endpoint-group-region=$REGION
    fi

    echo -e "${GREEN}✓ 后端服务创建完成${NC}"
}

# 函数：创建 URL 映射
create_url_map() {
    echo -e "${BLUE}步骤 4: 创建 URL 映射${NC}"

    if ! gcloud compute url-maps describe textistext-url-map &>/dev/null; then
        # 创建 URL 映射
        gcloud compute url-maps create textistext-url-map \
            --default-service=frontend-backend-service

        # 添加路径匹配器
        gcloud compute url-maps add-path-matcher textistext-url-map \
            --path-matcher-name=api-matcher \
            --default-service=frontend-backend-service \
            --path-rules="/api/*=backend-backend-service"
    fi

    echo -e "${GREEN}✓ URL 映射创建完成${NC}"
}

# 函数：创建 SSL 证书
create_ssl_certificate() {
    echo -e "${BLUE}步骤 5: 创建 SSL 证书${NC}"

    if ! gcloud compute ssl-certificates describe textistext-ssl-cert &>/dev/null; then
        gcloud compute ssl-certificates create textistext-ssl-cert \
            --domains=$DOMAIN,www.$DOMAIN \
            --global
    fi

    echo -e "${GREEN}✓ SSL 证书创建完成${NC}"
}

# 函数：创建 HTTP(S) 代理
create_proxies() {
    echo -e "${BLUE}步骤 6: 创建 HTTP(S) 代理${NC}"

    # HTTPS 代理
    if ! gcloud compute target-https-proxies describe textistext-https-proxy &>/dev/null; then
        gcloud compute target-https-proxies create textistext-https-proxy \
            --url-map=textistext-url-map \
            --ssl-certificates=textistext-ssl-cert
    fi

    # HTTP 代理 (用于重定向到 HTTPS)
    if ! gcloud compute target-http-proxies describe textistext-http-proxy &>/dev/null; then
        gcloud compute target-http-proxies create textistext-http-proxy \
            --url-map=textistext-url-map
    fi

    echo -e "${GREEN}✓ HTTP(S) 代理创建完成${NC}"
}

# 函数：创建全局转发规则
create_forwarding_rules() {
    echo -e "${BLUE}步骤 7: 创建全局转发规则${NC}"

    # 保留静态 IP
    if ! gcloud compute addresses describe textistext-ip --global &>/dev/null; then
        gcloud compute addresses create textistext-ip --global
    fi

    # 获取静态 IP
    STATIC_IP=$(gcloud compute addresses describe textistext-ip --global --format="value(address)")

    # HTTPS 转发规则
    if ! gcloud compute forwarding-rules describe textistext-https-forwarding-rule --global &>/dev/null; then
        gcloud compute forwarding-rules create textistext-https-forwarding-rule \
            --global \
            --target-https-proxy=textistext-https-proxy \
            --address=textistext-ip \
            --ports=443
    fi

    # HTTP 转发规则
    if ! gcloud compute forwarding-rules describe textistext-http-forwarding-rule --global &>/dev/null; then
        gcloud compute forwarding-rules create textistext-http-forwarding-rule \
            --global \
            --target-http-proxy=textistext-http-proxy \
            --address=textistext-ip \
            --ports=80
    fi

    echo -e "${GREEN}✓ 全局转发规则创建完成${NC}"
    echo -e "${YELLOW}静态 IP 地址: $STATIC_IP${NC}"
}

# 函数：创建 DNS 区域
create_dns_zone() {
    echo -e "${BLUE}步骤 8: 创建 DNS 区域${NC}"

    ZONE_NAME="textistext-zone"

    # 检查 DNS 区域是否已存在
    if ! gcloud dns managed-zones describe $ZONE_NAME &>/dev/null; then
        echo -e "${YELLOW}创建 DNS 区域...${NC}"
        gcloud dns managed-zones create $ZONE_NAME \
            --description="DNS zone for textistext.com" \
            --dns-name=$DOMAIN \
            --visibility=public

        echo -e "${GREEN}✓ DNS 区域创建完成${NC}"
        echo -e "${YELLOW}请在您的域名注册商处设置以下 NS 记录:${NC}"
        gcloud dns managed-zones describe $ZONE_NAME --format="value(nameServers[].join(' '))"
    else
        echo -e "${GREEN}✓ DNS 区域已存在${NC}"
    fi
}

# 函数：更新 DNS 记录
update_dns() {
    echo -e "${BLUE}步骤 9: 更新 DNS 记录${NC}"

    ZONE_NAME="textistext-zone"
    STATIC_IP=$(gcloud compute addresses describe textistext-ip --global --format="value(address)")

    # 删除现有记录（如果存在）
    gcloud dns record-sets delete $DOMAIN. --zone=$ZONE_NAME --type=A &>/dev/null || true
    gcloud dns record-sets delete www.$DOMAIN. --zone=$ZONE_NAME --type=A &>/dev/null || true

    # 创建新的 A 记录
    gcloud dns record-sets create $DOMAIN. --zone=$ZONE_NAME --type=A --ttl=300 --rrdatas=$STATIC_IP
    gcloud dns record-sets create www.$DOMAIN. --zone=$ZONE_NAME --type=A --ttl=300 --rrdatas=$STATIC_IP

    echo -e "${GREEN}✓ DNS 记录更新完成${NC}"
}

# 函数：显示完成信息
show_completion() {
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${GREEN}  负载均衡器设置完成！${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo ""
    echo -e "${YELLOW}配置信息:${NC}"
    echo -e "静态 IP: $(gcloud compute addresses describe textistext-ip --global --format="value(address)")"
    echo -e "域名: https://$DOMAIN"
    echo -e "域名: https://www.$DOMAIN"
    echo ""
    echo -e "${YELLOW}注意:${NC}"
    echo -e "- SSL 证书可能需要几分钟到几小时才能生效"
    echo -e "- DNS 传播可能需要几分钟到几小时"
    echo -e "- 您可以通过以下命令检查 SSL 证书状态:"
    echo -e "  gcloud compute ssl-certificates describe textistext-ssl-cert --global"
}

# 主函数
main() {
    echo -e "${BLUE}开始负载均衡器设置...${NC}"

    # 检查现有域名映射，如果存在则退出
    if ! check_existing_domain_mapping; then
        echo -e "${RED}发现现有域名映射，停止负载均衡器设置${NC}"
        echo -e "${YELLOW}如果要使用负载均衡器，请先手动删除域名映射：${NC}"
        echo -e "${BLUE}gcloud beta run domain-mappings delete --domain=$DOMAIN --region=$REGION${NC}"
        exit 1
    fi

    get_service_urls
    create_neg
    create_backend_services
    create_url_map
    create_ssl_certificate
    create_proxies
    create_forwarding_rules
    create_dns_zone
    update_dns
    show_completion

    echo -e "${GREEN}负载均衡器设置完成！${NC}"
}

# 执行主函数
main "$@"
