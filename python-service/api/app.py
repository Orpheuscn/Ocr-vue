#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Flask应用模块 - 创建和配置Flask应用
这个模块负责创建和配置Flask应用实例
"""

import os
import time
import logging
from pathlib import Path
from typing import Optional

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# 创建全局limiter实例
limiter = Limiter(
    get_remote_address,
    default_limits=["200 per day", "30 per minute"],
    storage_uri="memory://",
    strategy="fixed-window"
)

# 导入路由
from api.routes.ocr_routes import ocr_bp
from api.routes.upload_routes import upload_bp
from api.routes.image_proxy_routes import image_proxy_bp
from utils.log_client import info, error

def create_app(config: Optional[dict] = None) -> Flask:
    """
    创建并配置Flask应用

    Args:
        config: 可选的配置字典

    Returns:
        配置好的Flask应用实例
    """
    # 创建Flask应用
    app = Flask(__name__)

    # 配置CORS - 限制跨域请求
    # 从环境变量获取允许的域名，默认只允许本地域名
    allowed_origins = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:8080,http://127.0.0.1:8080,https://localhost:8443').split(',')
    CORS(app, resources={r"/*": {"origins": allowed_origins}}, supports_credentials=True)

    # 配置速率限制器
    limiter.init_app(app)

    # 加载默认配置
    app.config.update({
        'UPLOAD_FOLDER': os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads'),
        'RESULTS_FOLDER': os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'results'),
        'MAX_CONTENT_LENGTH': 25 * 1024 * 1024,  # 25MB
        'DEBUG': os.environ.get('FLASK_DEBUG', 'False').lower() == 'true',
        'TESTING': False,
        'JSON_AS_ASCII': False,
        'JSON_SORT_KEYS': False
    })

    # 加载环境变量配置
    app.config.update({
        'UPLOAD_FOLDER': os.environ.get('UPLOAD_FOLDER', app.config['UPLOAD_FOLDER']),
        'RESULTS_FOLDER': os.environ.get('RESULTS_FOLDER', app.config['RESULTS_FOLDER']),
        'MAX_CONTENT_LENGTH': int(os.environ.get('MAX_CONTENT_LENGTH', app.config['MAX_CONTENT_LENGTH'])),
    })

    # 加载自定义配置
    if config:
        app.config.update(config)

    # 确保上传目录存在
    Path(app.config['UPLOAD_FOLDER']).mkdir(parents=True, exist_ok=True)
    Path(app.config['RESULTS_FOLDER']).mkdir(parents=True, exist_ok=True)

    # 注册蓝图 - 不使用前缀
    app.register_blueprint(ocr_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(image_proxy_bp)

    # 健康检查端点
    @app.route('/health')
    def health_check():
        """健康检查端点"""
        return jsonify({
            'status': 'healthy',
            'service': 'OCR Python Service',
            'version': '1.0.0'
        })

    # 注册请求前处理器
    @app.before_request
    def log_request_info():
        """记录请求信息"""
        if request.path != '/health':  # 跳过健康检查请求的日志
            info(f"收到请求: {request.method} {request.path}",
                 metadata={
                     'method': request.method,
                     'path': request.path,
                     'remote_addr': request.remote_addr,
                     'user_agent': request.headers.get('User-Agent')
                 })

    # 注册错误处理器
    @app.errorhandler(404)
    def not_found(e):
        """处理404错误"""
        error(f"404错误: {request.path}")
        return jsonify({
            'success': False,
            'error': f'找不到路径: {request.path}'
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        """处理405错误"""
        error(f"405错误: {request.method} {request.path}")
        return jsonify({
            'success': False,
            'error': f'不允许的方法: {request.method} {request.path}'
        }), 405

    @app.errorhandler(500)
    def server_error(e):
        """处理500错误"""
        error(f"500错误: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'服务器错误: {str(e)}'
        }), 500

    # 根路由
    @app.route('/')
    def index():
        """根路由"""
        return jsonify({
            'service': 'OCR Python Service',
            'version': '1.0.0',
            'status': 'running'
        })

    # 旧的健康检查端点（保留向后兼容性）
    @app.route('/health')
    def health_check_legacy():
        """旧的健康检查端点（保留向后兼容性）"""
        return jsonify({
            'status': 'healthy',
            'timestamp': time.time()
        })

    # 配置日志轮转
    log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, 'app.log')

    # 配置日志处理器
    from logging.handlers import RotatingFileHandler
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,  # 保留5个备份文件
        encoding='utf-8'
    )
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)

    # 记录应用启动信息
    app.logger.info("Flask应用已创建并配置")
    info("Flask应用已创建并配置")

    return app
