#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
主入口模块 - 启动Flask应用
这个模块是Python服务的主入口点，负责创建和启动Flask应用
"""

import os
import sys
import signal
import atexit
import logging

# 确保能够导入自定义模块
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 导入统一环境检测器（这会自动加载环境配置）
from utils.environment import environment, is_development, is_production, get_config

# 导入Flask应用
from api.app import create_app as create_flask_app
from utils.log_client import error

# 配置日志 - 使用统一环境检测
log_config = get_config('log')
logging.basicConfig(
    level=getattr(logging, log_config['level']),
    format=log_config['format']
)
logger = logging.getLogger(__name__)

def cleanup_resources():
    """清理应用资源"""
    try:
        logger.info("应用资源清理完成")
    except Exception as e:
        logger.error(f"清理应用资源时出错: {e}")

def signal_handler(signum, _):
    """信号处理器"""
    logger.info(f"接收到信号 {signum}，开始清理资源...")
    cleanup_resources()
    sys.exit(0)

# 注册信号处理器和退出清理
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)
atexit.register(cleanup_resources)

def create_app():
    """创建Flask应用，供Gunicorn调用"""
    try:
        # 使用统一环境检测获取配置
        flask_config = get_config('flask')

        # 获取环境变量 - 优先使用Cloud Run的PORT环境变量
        host = flask_config['HOST']
        port = int(os.environ.get('PORT', flask_config['PORT']))
        debug = flask_config['DEBUG']

        # 创建Flask应用
        app = create_flask_app()

        # 记录启动信息
        logger.info(f"创建Flask应用成功")
        logger.info(f"环境: {environment.get_environment()}, 平台: {environment.get_platform()}")
        logger.info(f"配置: {host}:{port}, 调试模式: {debug}")

        if is_development():
            logger.info("开发模式: 启用调试功能和详细日志")
        elif is_production():
            logger.info("生产模式: 优化性能和安全设置")

        return app

    except Exception as e:
        logger.error(f"创建Flask应用时出错: {e}")
        error(f"创建Flask应用时出错: {e}")
        sys.exit(1)

def main():
    """主函数，直接启动Flask应用（开发环境）"""
    try:
        # 使用统一环境检测获取配置
        flask_config = get_config('flask')

        # 获取配置
        host = flask_config['HOST']
        port = flask_config['PORT']
        debug = flask_config['DEBUG']

        # 创建Flask应用
        app = create_app()

        # 记录启动信息
        logger.info(f"直接启动Flask应用，监听 {host}:{port}，调试模式: {debug}")

        if is_development():
            logger.info("开发环境: 使用Flask内置服务器")
        else:
            logger.warning("非开发环境不建议使用Flask内置服务器，请使用Gunicorn")

        # 启动应用（仅开发环境使用）
        app.run(host=host, port=port, debug=debug)

    except Exception as e:
        logger.error(f"启动Flask应用时出错: {e}")
        error(f"启动Flask应用时出错: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
