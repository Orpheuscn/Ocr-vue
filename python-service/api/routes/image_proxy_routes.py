#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
图片代理路由模块 - 处理图片代理请求
这个模块定义了图片代理相关的API端点
"""

from flask import Blueprint, request, jsonify, current_app
from api.app import limiter

from services.image_proxy import get_image_proxy
from utils.log_client import info, error

# 创建蓝图
image_proxy_bp = Blueprint('image_proxy', __name__)

@image_proxy_bp.route('/images/<image_id>', methods=['GET'])
@limiter.limit("60 per minute")
def get_image(image_id):
    """
    获取图片
    
    URL参数:
    - width: 可选，指定宽度
    - height: 可选，指定高度
    - format: 可选，指定格式 (jpeg, png, gif, webp)
    
    返回:
    - 图片文件
    """
    info(f"收到图片请求，图片ID: {image_id}")
    
    # 获取查询参数
    width = request.args.get('width')
    height = request.args.get('height')
    format = request.args.get('format')
    
    # 转换参数类型
    if width:
        try:
            width = int(width)
        except ValueError:
            width = None
    
    if height:
        try:
            height = int(height)
        except ValueError:
            height = None
    
    # 获取图片代理实例
    image_proxy = get_image_proxy()
    
    # 获取图片响应
    return image_proxy.get_image_response(image_id, width, height, format)

@image_proxy_bp.route('/images/info/<image_id>', methods=['GET'])
@limiter.limit("60 per minute")
def get_image_info(image_id):
    """
    获取图片信息
    
    返回:
    {
        "success": true/false,
        "image_id": "图片ID",
        "mime_type": "MIME类型",
        "file_path": "文件路径",
        "exists": true/false
    }
    """
    info(f"收到图片信息请求，图片ID: {image_id}")
    
    # 获取图片代理实例
    image_proxy = get_image_proxy()
    
    # 获取图片信息
    filepath, mime_type = image_proxy.get_image_by_id(image_id)
    
    if filepath:
        return jsonify({
            'success': True,
            'image_id': image_id,
            'mime_type': mime_type,
            'file_path': filepath,
            'exists': True
        })
    else:
        return jsonify({
            'success': False,
            'image_id': image_id,
            'exists': False,
            'error': f'找不到ID为{image_id}的图片'
        }), 404
