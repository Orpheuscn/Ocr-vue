#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
OCR路由模块 - 处理OCR相关的API路由
这个模块定义了OCR服务的API端点
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Any, Optional

from flask import Blueprint, request, jsonify, current_app

# 导入服务
from services.ocr_service import process_ocr_request
from utils.log_client import info, error

# 创建蓝图
ocr_bp = Blueprint('ocr', __name__)

@ocr_bp.route('/ocr/process', methods=['POST'])
def process_ocr():
    """
    处理OCR请求
    
    请求体:
    {
        "image_id": "图片ID",
        "rectangles": [
            {
                "id": "矩形ID",
                "class": "矩形类型",
                "x": 左上角x坐标,
                "y": 左上角y坐标,
                "width": 宽度,
                "height": 高度
            },
            ...
        ]
    }
    
    返回:
    {
        "success": true/false,
        "results": [
            {
                "id": "矩形ID",
                "text": "识别的文本"
            },
            ...
        ]
    }
    """
    try:
        # 获取请求数据
        data = request.json
        
        if not data:
            error("OCR处理请求缺少数据")
            return jsonify({
                'success': False,
                'error': '请求缺少数据'
            }), 400
            
        # 提取参数
        image_id = data.get('image_id')
        rectangles = data.get('rectangles', [])
        
        if not image_id:
            error("OCR处理请求缺少image_id")
            return jsonify({
                'success': False,
                'error': '缺少image_id参数'
            }), 400
            
        if not rectangles:
            error(f"OCR处理请求缺少矩形信息，image_id: {image_id}")
            return jsonify({
                'success': False,
                'error': '缺少矩形信息'
            }), 400
            
        # 记录请求信息
        info(f"收到OCR处理请求，image_id: {image_id}, 矩形数量: {len(rectangles)}", 
             metadata={'rectangles_count': len(rectangles)},
             userId=request.headers.get('X-User-ID'),
             requestPath=request.path,
             ip=request.remote_addr)
            
        # 处理OCR请求
        result = process_ocr_request(image_id, rectangles)
        
        # 记录处理结果
        if result['success']:
            info(f"OCR处理成功，image_id: {image_id}, 结果数量: {len(result.get('results', []))}")
        else:
            error(f"OCR处理失败，image_id: {image_id}, 错误: {result.get('error')}")
            
        return jsonify(result)
        
    except Exception as e:
        error(f"OCR处理请求异常: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'处理请求时发生错误: {str(e)}'
        }), 500


@ocr_bp.route('/ocr/status', methods=['GET'])
def ocr_status():
    """
    获取OCR服务状态
    
    返回:
    {
        "status": "running",
        "version": "1.0.0",
        "tesseract_version": "4.1.1"
    }
    """
    try:
        import pytesseract
        
        # 获取Tesseract版本
        tesseract_version = pytesseract.get_tesseract_version()
        
        return jsonify({
            'status': 'running',
            'version': '1.0.0',
            'tesseract_version': str(tesseract_version)
        })
    except Exception as e:
        error(f"获取OCR服务状态失败: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@ocr_bp.route('/health', methods=['GET'])
def health_check():
    """
    健康检查端点
    
    返回:
    {
        "status": "ok"
    }
    """
    return jsonify({
        'status': 'ok'
    })
