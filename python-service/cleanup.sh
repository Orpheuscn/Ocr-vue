#!/bin/bash

# 清理脚本 - 用于定期清理临时文件和缓存
# 这个脚本是cleanup.py的Shell包装器

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$(dirname "$SCRIPT_DIR")"
UPLOADS_DIR="$SCRIPT_DIR/uploads"
LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/cleanup.log"

# 确保日志目录存在
mkdir -p "$LOG_DIR"

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
            echo "未知选项: $1"
            echo "用法: $0 [--max-age=天数] [--dry-run]"
            exit 1
            ;;
    esac
done

# 激活虚拟环境
if [ -d "$SCRIPT_DIR/venv" ]; then
    echo "激活虚拟环境..."
    source "$SCRIPT_DIR/venv/bin/activate"
fi

# 构建命令
CMD="python $SCRIPT_DIR/cleanup.py --uploads-dir=$UPLOADS_DIR --app-dir=$APP_DIR --max-age=$MAX_AGE"

if [ "$DRY_RUN" = true ]; then
    CMD="$CMD --dry-run"
fi

# 执行清理
echo "开始清理..."
echo "清理命令: $CMD"
echo "详细日志将写入: $LOG_FILE"

# 执行清理命令
$CMD

# 如果虚拟环境已激活，则退出
if [ -n "$VIRTUAL_ENV" ]; then
    deactivate
fi

echo "清理完成！"
