#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
主入口模块 - 启动Flask应用
这个模块是Python服务的主入口点，负责创建和启动Flask应用
"""

import os
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv

# 加载环境变量文件
load_dotenv()

# 确保能够导入自定义模块
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 导入Flask应用
from api.app import create_app as create_flask_app
from utils.log_client import info, error

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app():
    """创建Flask应用，供Gunicorn调用"""
    try:
        # 获取环境变量
        host = os.environ.get('FLASK_HOST', '0.0.0.0')
        port = int(os.environ.get('FLASK_PORT', 5000))
        debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'

        # 创建Flask应用
        app = create_flask_app()

        # 记录启动信息
        logger.info(f"创建Flask应用，配置为监听 {host}:{port}，调试模式: {debug}")
        info(f"创建Flask应用，配置为监听 {host}:{port}，调试模式: {debug}")

        return app

    except Exception as e:
        logger.error(f"创建Flask应用时出错: {e}")
        error(f"创建Flask应用时出错: {e}")
        sys.exit(1)

def main():
    """主函数，直接启动Flask应用（开发环境）"""
    try:
        # 获取环境变量
        host = os.environ.get('FLASK_HOST', '0.0.0.0')
        port = int(os.environ.get('FLASK_PORT', 5000))
        debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'

        # 创建Flask应用
        app = create_app()

        # 记录启动信息
        logger.info(f"直接启动Flask应用，监听 {host}:{port}，调试模式: {debug}")
        info(f"直接启动Flask应用，监听 {host}:{port}，调试模式: {debug}")

        # 启动应用（仅开发环境使用）
        app.run(host=host, port=port, debug=debug)

    except Exception as e:
        logger.error(f"启动Flask应用时出错: {e}")
        error(f"启动Flask应用时出错: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
