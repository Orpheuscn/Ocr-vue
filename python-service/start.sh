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
LOG_DIR="../logs"
UPLOADS_DIR="./uploads"
TEMP_DIR="./temp"
SECURITY_LOG="$LOG_DIR/python_security.log"

mkdir -p $LOG_DIR
mkdir -p $UPLOADS_DIR
mkdir -p $TEMP_DIR

# 设置安全的目录权限
chmod 755 $UPLOADS_DIR
chmod 755 $LOG_DIR
chmod 755 $TEMP_DIR

# 检查虚拟环境是否存在
if [ ! -d "venv" ]; then
    echo -e "${BLUE}虚拟环境不存在，正在创建...${NC}"
    python3 -m venv venv
    echo -e "${GREEN}虚拟环境已创建${NC}"
fi

# 激活虚拟环境
echo -e "${BLUE}激活虚拟环境...${NC}"
source venv/bin/activate

# 创建日志目录
DEPS_LOG="$LOG_DIR/python_dependencies.log"

# 安装依赖（输出到日志文件）
echo -e "${BLUE}检查依赖中，详细信息记录到 $DEPS_LOG ...${NC}"
echo "===== 依赖安装开始: $(date) =====" > $DEPS_LOG

# 先安装最小依赖集
if [ -f "requirements-minimal.txt" ]; then
    echo "安装最小依赖集..." >> $DEPS_LOG
    pip install -r requirements-minimal.txt >> $DEPS_LOG 2>&1
fi

# 尝试安装完整依赖，但忽略错误
echo "尝试安装完整依赖..." >> $DEPS_LOG
pip install -r requirements.txt >> $DEPS_LOG 2>&1 || echo "部分依赖安装失败，但这不会影响核心功能" >> $DEPS_LOG

# 确保gunicorn已安装
if ! command -v gunicorn &> /dev/null; then
    echo "安装gunicorn..." >> $DEPS_LOG
    pip install gunicorn >> $DEPS_LOG 2>&1
fi

echo "===== 依赖安装完成: $(date) =====" >> $DEPS_LOG
echo -e "${GREEN}依赖安装完成，详细日志请查看: $DEPS_LOG${NC}"

# 执行安全检查
echo -e "${BLUE}执行安全检查...${NC}"
echo "===== 安全检查开始: $(date) =====" > $SECURITY_LOG

# 检查Python缓存目录并清理
echo -e "${BLUE}检查Python缓存目录...${NC}"
find . -type d -name "__pycache__" -exec rm -rf {} +  2>/dev/null || true
echo "已清理Python缓存目录" >> $SECURITY_LOG

# 检查上传目录中的临时文件
echo -e "${BLUE}检查上传目录中的临时文件...${NC}"
find $UPLOADS_DIR -type f -mtime +7 -delete 2>/dev/null || true
echo "已清理过期的上传文件" >> $SECURITY_LOG

# 检查临时目录中的文件
echo -e "${BLUE}检查临时目录中的文件...${NC}"
find $TEMP_DIR -type f -mtime +1 -delete 2>/dev/null || true
echo "已清理临时目录中的文件" >> $SECURITY_LOG

echo "===== 安全检查完成: $(date) =====" >> $SECURITY_LOG
echo -e "${GREEN}安全检查完成${NC}"

# 加载环境变量文件（如果存在）
ENV_FILE=".env"
if [ ! -z "$NODE_ENV" ]; then
    if [ "$NODE_ENV" = "production" ]; then
        ENV_FILE=".env.production"
    elif [ "$NODE_ENV" = "test" ]; then
        ENV_FILE=".env.test"
    fi
fi

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
export FLASK_PORT=${FLASK_PORT:-5000}
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

# 启动应用（生产环境使用Gunicorn）
echo -e "${BLUE}启动Python服务（使用Gunicorn）...${NC}"
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

# 开发环境可以使用以下命令直接启动Flask
# python main.py
