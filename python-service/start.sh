#!/bin/bash

# 启动Python服务的脚本
# 这个脚本会激活虚拟环境并启动Flask应用

# 设置工作目录
cd "$(dirname "$0")"

# 检查虚拟环境是否存在
if [ ! -d "venv" ]; then
    echo "虚拟环境不存在，正在创建..."
    python3 -m venv venv
    echo "虚拟环境已创建"
fi

# 激活虚拟环境
echo "激活虚拟环境..."
source venv/bin/activate

# 创建日志目录
LOG_DIR="../logs"
mkdir -p $LOG_DIR
DEPS_LOG="$LOG_DIR/python_dependencies.log"

# 安装依赖（输出到日志文件）
echo "检查依赖中，详细信息记录到 $DEPS_LOG ..."
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
echo "依赖安装完成，详细日志请查看: $DEPS_LOG"

# 加载环境变量文件（如果存在）
if [ -f ".env" ]; then
    echo "加载.env文件..."
    set -a
    source .env
    set +a
fi

# 设置默认环境变量（如果.env文件中没有设置）
export FLASK_APP=${FLASK_APP:-main.py}
export FLASK_HOST=${FLASK_HOST:-0.0.0.0}
export FLASK_PORT=${FLASK_PORT:-5000}
export FLASK_DEBUG=${FLASK_DEBUG:-false}
export LOG_API_ENDPOINT=${LOG_API_ENDPOINT:-http://localhost:3000/api/logs/collect}
export ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-http://localhost:8080,http://127.0.0.1:8080}
export WORKERS=${WORKERS:-4}

# 启动应用（生产环境使用Gunicorn）
echo "启动Python服务（使用Gunicorn）..."
# 使用完整路径调用gunicorn
GUNICORN_PATH=$(which gunicorn)
echo "使用Gunicorn路径: ${GUNICORN_PATH}"
${GUNICORN_PATH} -w ${WORKERS} -b ${FLASK_HOST}:${FLASK_PORT} "main:create_app()"

# 开发环境可以使用以下命令直接启动Flask
# python main.py
