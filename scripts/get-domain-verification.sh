#!/bin/bash

# ==========================================
# 获取域名验证记录脚本
# ==========================================

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

DOMAIN="textistext.com"
PROJECT_ID="textistext-ocr"

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  获取域名验证记录 - $DOMAIN           ${NC}"
echo -e "${BLUE}===========================================${NC}"

echo -e "${YELLOW}方法1: 通过Google Search Console获取验证记录${NC}"
echo -e "${BLUE}1. 访问: https://search.google.com/search-console${NC}"
echo -e "${BLUE}2. 点击 '添加资源' 或 'Add Property'${NC}"
echo -e "${BLUE}3. 选择 '域名' (Domain) 选项${NC}"
echo -e "${BLUE}4. 输入域名: $DOMAIN${NC}"
echo -e "${BLUE}5. 点击 '继续'${NC}"
echo -e "${BLUE}6. 复制显示的TXT记录值${NC}"
echo

echo -e "${YELLOW}方法2: 通过gcloud命令获取${NC}"
echo -e "${BLUE}正在尝试通过API获取验证记录...${NC}"

# 尝试通过API获取验证记录
if command -v curl &> /dev/null; then
    echo -e "${YELLOW}使用curl获取验证记录...${NC}"
    
    # 获取访问令牌
    ACCESS_TOKEN=$(gcloud auth print-access-token 2>/dev/null || echo "")
    
    if [[ -n "$ACCESS_TOKEN" ]]; then
        echo -e "${BLUE}正在请求域名验证记录...${NC}"
        
        # 调用Google Site Verification API
        RESPONSE=$(curl -s -X POST \
            "https://www.googleapis.com/siteVerification/v1/token" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"site\": {
                    \"type\": \"SITE\",
                    \"identifier\": \"$DOMAIN\"
                },
                \"verificationMethod\": \"DNS_TXT\"
            }" 2>/dev/null || echo "")
        
        if [[ -n "$RESPONSE" ]] && echo "$RESPONSE" | grep -q "token"; then
            TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
            if [[ -n "$TOKEN" ]]; then
                echo -e "${GREEN}✓ 成功获取验证记录!${NC}"
                echo -e "${BLUE}TXT记录值: $TOKEN${NC}"
                echo
                echo -e "${YELLOW}请在您的域名注册商处添加以下DNS记录:${NC}"
                echo -e "${GREEN}类型: TXT${NC}"
                echo -e "${GREEN}名称: @ (或留空)${NC}"
                echo -e "${GREEN}值: $TOKEN${NC}"
                echo -e "${GREEN}TTL: 300${NC}"
                echo
            else
                echo -e "${RED}无法解析验证记录${NC}"
            fi
        else
            echo -e "${RED}API请求失败，请使用Search Console方法${NC}"
        fi
    else
        echo -e "${RED}无法获取访问令牌${NC}"
    fi
else
    echo -e "${RED}curl命令不可用${NC}"
fi

echo -e "${YELLOW}方法3: 手动获取验证记录${NC}"
echo -e "${BLUE}如果上述方法都不可用，请按以下步骤操作:${NC}"
echo -e "1. 访问 Google Search Console"
echo -e "2. 添加域名属性"
echo -e "3. 选择DNS验证方法"
echo -e "4. 复制提供的TXT记录"
echo

echo -e "${YELLOW}验证记录添加完成后，运行以下命令检查:${NC}"
echo -e "${BLUE}nslookup -type=TXT $DOMAIN${NC}"
echo -e "${BLUE}dig TXT $DOMAIN${NC}"
echo

echo -e "${YELLOW}DNS记录生效后，运行域名映射脚本:${NC}"
echo -e "${BLUE}./scripts/complete-deployment-setup.sh${NC}"

echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}  获取验证记录脚本执行完成             ${NC}"
echo -e "${GREEN}===========================================${NC}"
