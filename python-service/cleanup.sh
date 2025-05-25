#!/bin/bash

# 清理脚本 - 用于定期清理临时文件和缓存
# 这个脚本是cleanup.py的Shell包装器

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$(dirname "$SCRIPT_DIR")"
UPLOADS_DIR="$SCRIPT_DIR/uploads"
TEMP_DIR="$SCRIPT_DIR/temp"
LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/system/cleanup.log"
SECURITY_LOG="$LOG_DIR/system/python_security.log"
PYCACHE_DIRS="$SCRIPT_DIR/__pycache__ $SCRIPT_DIR/*/__pycache__"

# 确保日志目录存在
mkdir -p "$LOG_DIR"
mkdir -p "$UPLOADS_DIR"
mkdir -p "$TEMP_DIR"

# 设置安全的目录权限
chmod 755 "$UPLOADS_DIR"
chmod 755 "$LOG_DIR"
chmod 755 "$TEMP_DIR"

# 设置默认参数
MAX_AGE=7  # 默认保留7天
DRY_RUN=false

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --max-age=*)
            MAX_AGE="${1#*=}"
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo -e "${RED}未知选项: $1${NC}"
            echo -e "用法: $0 [--max-age=天数] [--dry-run]"
            exit 1
            ;;
    esac
done

# 记录开始时间
echo -e "${BLUE}开始清理任务 ($(date))${NC}" | tee -a "$LOG_FILE"
echo "===== 清理任务开始: $(date) =====" >> "$LOG_FILE"

# 激活虚拟环境
if [ -d "$SCRIPT_DIR/venv" ]; then
    echo -e "${BLUE}激活虚拟环境...${NC}" | tee -a "$LOG_FILE"
    source "$SCRIPT_DIR/venv/bin/activate"
fi

# 构建命令
CMD="python $SCRIPT_DIR/cleanup.py --uploads-dir=$UPLOADS_DIR --app-dir=$APP_DIR --max-age=$MAX_AGE"

if [ "$DRY_RUN" = true ]; then
    CMD="$CMD --dry-run"
fi

# 执行清理
echo -e "${BLUE}执行清理命令: $CMD${NC}" | tee -a "$LOG_FILE"
echo -e "${BLUE}清理日志将写入: $LOG_FILE${NC}" | tee -a "$LOG_FILE"
echo "-----------------------------------" | tee -a "$LOG_FILE"

# 执行清理命令并记录日志
$CMD | tee -a "$LOG_FILE"
CLEANUP_STATUS=$?

# 手动清理Python缓存目录
echo -e "${BLUE}清理Python缓存目录...${NC}" | tee -a "$LOG_FILE"
for pycache_dir in $PYCACHE_DIRS; do
    if [ -d "$pycache_dir" ]; then
        echo "清理缓存目录: $pycache_dir" >> "$LOG_FILE"
        rm -rf "$pycache_dir" 2>/dev/null || true
    fi
done

# 查找并删除所有.pyc文件
echo -e "${BLUE}清理.pyc文件...${NC}" | tee -a "$LOG_FILE"
find "$SCRIPT_DIR" -name "*.pyc" -delete 2>/dev/null || true

# 清理临时目录中的文件
echo -e "${BLUE}清理临时目录...${NC}" | tee -a "$LOG_FILE"
if [ -d "$TEMP_DIR" ]; then
    if [ "$DRY_RUN" = true ]; then
        echo "将删除的临时文件:" >> "$LOG_FILE"
        find "$TEMP_DIR" -type f -mtime +1 -ls 2>/dev/null >> "$LOG_FILE" || true
    else
        echo "删除临时文件:" >> "$LOG_FILE"
        find "$TEMP_DIR" -type f -mtime +1 -delete 2>/dev/null || true
    fi
fi

# 记录安全信息
echo "===== 清理任务执行: $(date) =====" >> "$SECURITY_LOG"
echo "清理了上传目录中超过 $MAX_AGE 天的文件" >> "$SECURITY_LOG"
echo "清理了Python缓存目录" >> "$SECURITY_LOG"
echo "清理了临时目录中超过1天的文件" >> "$SECURITY_LOG"

# 如果虚拟环境已激活，则退出
if [ -n "$VIRTUAL_ENV" ]; then
    deactivate
fi

# 检查命令执行状态
if [ $CLEANUP_STATUS -eq 0 ]; then
    echo -e "${GREEN}清理任务完成${NC}" | tee -a "$LOG_FILE"
    echo "===== 清理任务完成: $(date) =====" >> "$LOG_FILE"
    exit 0
else
    echo -e "${RED}清理任务失败${NC}" | tee -a "$LOG_FILE"
    echo "===== 清理任务失败: $(date) =====" >> "$LOG_FILE"
    exit 1
fi
