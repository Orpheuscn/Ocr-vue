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

# 导入统一环境检测器
from utils.environment import environment, is_development, is_production, get_config

# 导入路由
from api.routes.ocr_routes import ocr_bp
# from api.routes.upload_routes import upload_bp  # 暂时禁用上传路由
# from api.routes.image_proxy_routes import image_proxy_bp  # 暂时禁用图像代理路由
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

    # 配置CORS - 使用统一环境检测
    cors_config = get_config('cors')
    CORS(app,
         resources={r"/*": {
             "origins": cors_config['origins'],
             "methods": cors_config['methods'],
             "allow_headers": cors_config['allow_headers']
         }},
         supports_credentials=cors_config['supports_credentials'])

    # 使用统一环境检测加载配置
    flask_config = get_config('flask')
    upload_config = get_config('upload')

    # 基础目录
    base_dir = os.path.dirname(os.path.dirname(__file__))

    # 加载Flask配置
    app.config.update({
        'DEBUG': flask_config['DEBUG'],
        'TESTING': flask_config['TESTING'],
        'MAX_CONTENT_LENGTH': flask_config['MAX_CONTENT_LENGTH'],
        'JSON_AS_ASCII': False,
        'JSON_SORT_KEYS': False
    })

    # 加载文件上传配置
    app.config.update({
        'UPLOAD_FOLDER': upload_config['upload_folder'],
        'RESULTS_FOLDER': upload_config['results_folder'],
        'CROPS_FOLDER': os.path.join(base_dir, 'crops'),
        'DOWNLOADS_FOLDER': os.path.join(base_dir, 'downloads'),
        'TEMP_FOLDER': upload_config['results_folder'],  # 使用results_folder作为temp
        'ALLOWED_EXTENSIONS': upload_config['allowed_extensions']
    })

    # 加载自定义配置
    if config:
        app.config.update(config)

    # 确保必要的目录存在（uploads目录在实际使用时按需创建）
    # Path(app.config['UPLOAD_FOLDER']).mkdir(parents=True, exist_ok=True)  # 按需创建
    # 不再创建results文件夹，使用temp文件夹代替
    # Path(app.config['RESULTS_FOLDER']).mkdir(parents=True, exist_ok=True)
    Path(app.config['CROPS_FOLDER']).mkdir(parents=True, exist_ok=True)
    Path(app.config['DOWNLOADS_FOLDER']).mkdir(parents=True, exist_ok=True)
    Path(app.config['TEMP_FOLDER']).mkdir(parents=True, exist_ok=True)

    # 如果results文件夹存在，尝试删除它
    results_path = Path(app.config['RESULTS_FOLDER'])
    if results_path.exists():
        try:
            # 如果是空目录，直接删除
            if results_path.is_dir() and not any(results_path.iterdir()):
                results_path.rmdir()
                info(f"已删除空的results目录: {results_path}")
            else:
                info(f"results目录存在且不为空，无法自动删除: {results_path}")
        except Exception as e:
            error(f"尝试删除results目录时出错: {e}")

    # 注册蓝图
    app.register_blueprint(ocr_bp)
    # app.register_blueprint(upload_bp)  # 暂时禁用上传路由
    # app.register_blueprint(image_proxy_bp)  # 暂时禁用图像代理路由

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

    # 旧的健康检查端点已删除，避免路由冲突

    # 配置日志 - 使用统一环境检测
    log_config = get_config('log')

    try:
        # 在开发环境中创建日志文件，生产环境使用控制台日志
        if is_development():
            # 尝试在应用目录下创建logs文件夹
            log_dir = os.path.join(base_dir, 'logs')
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
            file_handler.setFormatter(logging.Formatter(log_config['format']))
            file_handler.setLevel(getattr(logging, log_config['level']))
            app.logger.addHandler(file_handler)
            info(f"日志文件配置成功: {log_file}")

        # 设置应用日志级别
        app.logger.setLevel(getattr(logging, log_config['level']))

    except Exception as e:
        # 如果无法创建日志文件，只使用控制台日志
        app.logger.setLevel(logging.INFO)
        error(f"无法配置日志文件，将只使用控制台日志: {e}")

    # 记录应用启动信息
    app.logger.info(f"Flask应用已创建并配置 - 环境: {environment.get_environment()}, 平台: {environment.get_platform()}")
    info(f"Flask应用已创建并配置 - 环境: {environment.get_environment()}, 平台: {environment.get_platform()}")

    if is_development():
        app.logger.info("开发模式: 启用调试功能和详细日志")
    elif is_production():
        app.logger.info("生产模式: 优化性能和安全设置")

    return app
