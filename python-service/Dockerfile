# 使用Python 3.9官方镜像
FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV FLASK_APP=main.py
ENV FLASK_HOST=0.0.0.0
ENV FLASK_PORT=5001

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制requirements文件
COPY requirements.txt .

# 创建虚拟环境并安装Python依赖
RUN python -m venv venv
RUN . venv/bin/activate && pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建必要的目录
RUN mkdir -p logs temp crops downloads

# 设置权限
RUN chmod +x venv/bin/activate

# 启动命令 - 在虚拟环境中运行
# 使用Cloud Run的PORT环境变量，如果没有则使用8080（Cloud Run默认端口）
CMD ["/bin/bash", "-c", "source venv/bin/activate && python -m gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 2 --timeout 300 'main:create_app()'"]
