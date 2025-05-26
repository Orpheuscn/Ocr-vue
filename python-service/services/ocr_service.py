#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
OCR服务模块 - 直接调用Node.js后端API使用Google Cloud Vision API
这个模块负责处理图像OCR识别功能，通过HTTP API与Node.js后端通信
"""

import logging
import traceback
import requests
import os
from typing import Dict, List, Any

# 导入工具模块
from utils.log_client import info, error

# 日志配置
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('ocr_service')

# Node.js后端API配置
NODE_API_BASE_URL = os.getenv('NODE_API_BASE_URL', 'http://localhost:3000')
NODE_OCR_ENDPOINT = f"{NODE_API_BASE_URL}/api/ocr/process"


def call_node_ocr_api(image_id: str, rectangles: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    直接调用Node.js后端API进行OCR处理

    Args:
        image_id: 图片ID
        rectangles: 矩形信息列表

    Returns:
        OCR处理结果
    """
    try:
        # 准备请求数据
        request_data = {
            'image_id': image_id,
            'rectangles': rectangles
        }

        info(f"调用Node.js OCR API: {NODE_OCR_ENDPOINT}")

        # 发送HTTP请求到Node.js后端
        response = requests.post(
            NODE_OCR_ENDPOINT,
            json=request_data,
            timeout=30,  # 30秒超时
            headers={'Content-Type': 'application/json'}
        )

        # 检查响应状态
        if response.status_code == 200:
            result = response.json()
            info(f"Node.js OCR API调用成功")
            return result
        else:
            error_msg = f"Node.js OCR API调用失败，状态码: {response.status_code}"
            error(error_msg)
            return {
                'success': False,
                'error': error_msg,
                'image_id': image_id
            }

    except requests.exceptions.Timeout:
        error_msg = "Node.js OCR API调用超时"
        error(error_msg)
        return {
            'success': False,
            'error': error_msg,
            'image_id': image_id
        }
    except requests.exceptions.ConnectionError:
        error_msg = "无法连接到Node.js后端服务"
        error(error_msg)
        return {
            'success': False,
            'error': error_msg,
            'image_id': image_id
        }
    except Exception as e:
        error_msg = f"调用Node.js OCR API时发生错误: {str(e)}"
        error(error_msg)
        return {
            'success': False,
            'error': error_msg,
            'image_id': image_id
        }


def process_ocr_request(image_id: str, rectangles: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    处理OCR请求的入口函数 - 重构版本，确保稳定性

    Args:
        image_id: 图片ID
        rectangles: 矩形信息列表

    Returns:
        处理结果
    """
    try:
        logger.info(f"开始处理图片 {image_id} 的OCR请求，共 {len(rectangles)} 个矩形")
        info(f"开始处理图片 {image_id} 的OCR请求，共 {len(rectangles)} 个矩形",
             metadata={'rectangles_count': len(rectangles)})

        # 验证输入参数
        if not image_id:
            error("图片ID为空")
            return {
                'success': False,
                'error': '图片ID为空',
                'image_id': image_id
            }

        if not rectangles:
            error("矩形列表为空")
            return {
                'success': False,
                'error': '矩形列表为空',
                'image_id': image_id
            }

        # 过滤出需要OCR的矩形（排除figure类型）
        text_rectangles = [r for r in rectangles if r.get('class', '').lower() != 'figure']

        if not text_rectangles:
            info("没有需要OCR的文本矩形")
            return {
                'success': True,
                'results': [],
                'message': '没有需要OCR的文本矩形',
                'image_id': image_id
            }

        info(f"过滤后需要OCR的矩形数量: {len(text_rectangles)}")

        # 直接调用Node.js后端API进行OCR处理
        result = call_node_ocr_api(image_id, text_rectangles)

        # 确保返回结果包含所有必要字段
        if result.get('success', False):
            info(f"OCR处理成功，返回 {len(result.get('results', []))} 个结果")
        else:
            error(f"OCR处理失败: {result.get('error', '未知错误')}")

        return result

    except Exception as e:
        logger.error(f"OCR请求处理失败: {e}")
        logger.error(traceback.format_exc())
        error(f"OCR请求处理失败: {e}", metadata={'image_id': image_id})
        return {
            'success': False,
            'error': f'OCR请求处理失败: {str(e)}',
            'image_id': image_id,
            'rectangles_count': len(rectangles)
        }
