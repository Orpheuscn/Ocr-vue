#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
配置文件
"""

import os
from pathlib import Path

# 基础路径
BASE_DIR = Path(__file__).parent.parent

# 文件夹路径
UPLOADS_FOLDER = BASE_DIR / 'uploads'
CROPS_FOLDER = BASE_DIR / 'crops'
TEMP_FOLDER = BASE_DIR / 'temp'
DOWNLOADS_FOLDER = BASE_DIR / 'downloads'

# 确保目录存在
for folder in [UPLOADS_FOLDER, CROPS_FOLDER, TEMP_FOLDER, DOWNLOADS_FOLDER]:
    folder.mkdir(exist_ok=True)

# RabbitMQ配置
RABBITMQ_CONFIG = {
    'host': os.getenv('RABBITMQ_HOST', 'localhost'),
    'port': int(os.getenv('RABBITMQ_PORT', '5672')),
    'username': os.getenv('RABBITMQ_USERNAME', 'guest'),
    'password': os.getenv('RABBITMQ_PASSWORD', 'guest'),
    'vhost': os.getenv('RABBITMQ_VHOST', '/'),
}

# 日志配置
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FILE = BASE_DIR / 'logs' / 'app.log'

# 确保日志目录存在
LOG_FILE.parent.mkdir(exist_ok=True)
