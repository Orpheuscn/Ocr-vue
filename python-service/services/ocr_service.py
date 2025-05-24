#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
OCR服务模块 - 通过RabbitMQ与Node服务器通信使用Google Cloud Vision API
这个模块负责处理图像OCR识别功能，完全使用Cloud Vision API
"""

import logging
import traceback
from typing import Dict, List, Any

# 导入工具模块
from utils.log_client import info, error

# 日志配置
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('ocr_service')

# 全局RabbitMQ OCR服务实例（单例模式）
_rabbitmq_ocr_service = None

def get_rabbitmq_ocr_service():
    """获取RabbitMQ OCR服务实例（单例模式）"""
    global _rabbitmq_ocr_service
    if _rabbitmq_ocr_service is None:
        from services.rabbitmq_ocr_service import RabbitMQOcrService
        _rabbitmq_ocr_service = RabbitMQOcrService()
        info("RabbitMQ OCR服务实例已创建")
    return _rabbitmq_ocr_service


def process_ocr_request(image_id: str, rectangles: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    处理OCR请求的入口函数 - 只使用Cloud Vision API通过RabbitMQ与Node服务器通信

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

        # 使用单例RabbitMQ OCR服务（Cloud Vision API）
        rabbitmq_ocr = get_rabbitmq_ocr_service()

        # 通过RabbitMQ发送OCR请求到Node服务器
        result = rabbitmq_ocr.process_ocr_via_node(image_id, rectangles)
        return result

    except Exception as e:
        logger.error(f"OCR请求处理失败: {e}")
        logger.error(traceback.format_exc())
        error(f"OCR请求处理失败: {e}", metadata={'image_id': image_id})
        return {
            'success': False,
            'error': str(e),
            'image_id': image_id,
            'rectangles_count': len(rectangles)
        }
