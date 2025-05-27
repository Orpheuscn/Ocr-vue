#!/bin/bash

# 启动Python服务的脚本
# 这个脚本会激活虚拟环境并启动Flask应用

# 设置工作目录
cd "$(dirname "$0")"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

# 创建必要的目录
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="./logs"
TEMP_DIR="./temp"
SECURITY_LOG="./logs/python_security.log"

mkdir -p $LOG_DIR
mkdir -p $TEMP_DIR

# 设置安全的目录权限
chmod 755 $LOG_DIR
chmod 755 $TEMP_DIR

# 注意：uploads目录将在实际使用时按需创建

# 检查虚拟环境是否存在
if [ ! -d "venv" ]; then
    echo -e "${BLUE}虚拟环境不存在，正在创建...${NC}"

    # 优先使用python3.9创建虚拟环境
    if command -v python3.9 >/dev/null 2>&1; then
        echo -e "${BLUE}使用Python 3.9创建虚拟环境...${NC}"
        python3.9 -m venv venv
    else
        echo -e "${BLUE}使用系统Python3创建虚拟环境...${NC}"
        python3 -m venv venv
    fi

    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ 创建Python虚拟环境失败${NC}"
        exit 1
    fi

    echo -e "${GREEN}虚拟环境已创建${NC}"

    # 激活虚拟环境并安装依赖
    source venv/bin/activate
    echo -e "${BLUE}安装Python依赖...${NC}"
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ 安装Python依赖失败${NC}"
        exit 1
    fi
else
    # 激活虚拟环境
    echo -e "${BLUE}激活虚拟环境...${NC}"
    source venv/bin/activate

    # 验证虚拟环境是否正常工作
    if ! python --version >/dev/null 2>&1; then
        echo -e "${RED}✗ Python虚拟环境损坏，正在重新创建...${NC}"
        rm -rf venv

        # 重新创建虚拟环境
        if command -v python3.9 >/dev/null 2>&1; then
            python3.9 -m venv venv
        else
            python3 -m venv venv
        fi

        source venv/bin/activate
        pip install -r requirements.txt
        if [ $? -ne 0 ]; then
            echo -e "${RED}✗ 重新安装Python依赖失败${NC}"
            exit 1
        fi
    fi
fi

# 创建日志目录
echo -e "${GREEN}正在启动服务器...${NC}"
# 跳过文件清理步骤
echo -e "${GREEN}跳过文件清理步骤${NC}"

# 加载开发环境配置文件
ENV_FILE=".env.local"

if [ -f "$ENV_FILE" ]; then
    echo -e "${BLUE}加载环境变量文件: $ENV_FILE...${NC}"
    set -a
    source $ENV_FILE
    set +a

    # 设置安全的文件权限
    chmod 600 $ENV_FILE
else
    echo -e "${YELLOW}环境变量文件不存在: $ENV_FILE，使用默认值${NC}"
fi

# 设置默认环境变量（如果.env文件中没有设置）
export FLASK_APP=${FLASK_APP:-main.py}
export FLASK_HOST=${FLASK_HOST:-0.0.0.0}
export FLASK_PORT=${FLASK_PORT:-5001}
export FLASK_DEBUG=${FLASK_DEBUG:-false}
export LOG_API_ENDPOINT=${LOG_API_ENDPOINT:-""}
export ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-http://localhost:8080,http://127.0.0.1:8080,https://localhost:8443}
export WORKERS=${WORKERS:-4}

# 设置安全相关环境变量
export MAX_CONTENT_LENGTH=${MAX_CONTENT_LENGTH:-25000000}  # 25MB
export UPLOAD_FOLDER=${UPLOAD_FOLDER:-$UPLOADS_DIR}
export RESULTS_FOLDER=${RESULTS_FOLDER:-$TEMP_DIR}
export ALLOWED_EXTENSIONS=${ALLOWED_EXTENSIONS:-"jpg,jpeg,png,gif,webp,heic,pdf"}
export RATE_LIMIT_PER_MINUTE=${RATE_LIMIT_PER_MINUTE:-30}
export LOG_LEVEL=${LOG_LEVEL:-"INFO"}

# 检查环境并选择启动方式
if [ "${NODE_ENV}" = "development" ] || [ "${FLASK_ENV}" = "development" ] || [ "${ENVIRONMENT}" = "development" ]; then
    # 开发环境使用Flask开发服务器
    echo -e "${BLUE}启动Python服务（开发模式）...${NC}"
    echo -e "${GREEN}Flask开发服务器将在 http://${FLASK_HOST}:${FLASK_PORT} 启动${NC}"
    python main.py
else
    # 生产环境使用Gunicorn
    echo -e "${BLUE}启动Python服务（生产模式，使用Gunicorn）...${NC}"

    # 检查Gunicorn是否安装
    if ! command -v gunicorn >/dev/null 2>&1; then
        echo -e "${RED}✗ Gunicorn未安装，正在安装...${NC}"
        pip install gunicorn
        if [ $? -ne 0 ]; then
            echo -e "${RED}✗ 安装Gunicorn失败${NC}"
            exit 1
        fi
    fi

    # 使用完整路径调用gunicorn
    GUNICORN_PATH=$(which gunicorn)
    echo -e "${BLUE}使用Gunicorn路径: ${GUNICORN_PATH}${NC}"

    # 添加安全相关的Gunicorn选项
    ${GUNICORN_PATH} \
        -w ${WORKERS} \
        -b ${FLASK_HOST}:${FLASK_PORT} \
        --log-level ${LOG_LEVEL} \
        --access-logfile "$LOG_DIR/gunicorn_access.log" \
        --error-logfile "$LOG_DIR/gunicorn_error.log" \
        --capture-output \
        --timeout 120 \
        --keep-alive 5 \
        --max-requests 1000 \
        --max-requests-jitter 50 \
        "main:create_app()"
fi
