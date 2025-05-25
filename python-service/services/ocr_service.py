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
    """获取RabbitMQ OCR服务实例（单例模式）- 改进版本"""
    global _rabbitmq_ocr_service
    if _rabbitmq_ocr_service is None:
        try:
            from services.rabbitmq_ocr_service import RabbitMQOcrService
            _rabbitmq_ocr_service = RabbitMQOcrService()
            info("RabbitMQ OCR服务实例已创建")
        except Exception as e:
            error(f"创建RabbitMQ OCR服务实例失败: {e}")
            # 如果创建失败，确保不会留下部分初始化的实例
            _rabbitmq_ocr_service = None
            raise
    return _rabbitmq_ocr_service


def cleanup_rabbitmq_ocr_service():
    """清理RabbitMQ OCR服务实例"""
    global _rabbitmq_ocr_service
    if _rabbitmq_ocr_service is not None:
        try:
            _rabbitmq_ocr_service.shutdown()
        except Exception as e:
            error(f"清理RabbitMQ OCR服务时出错: {e}")
        finally:
            _rabbitmq_ocr_service = None
            info("RabbitMQ OCR服务实例已清理")


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

        # 使用单例RabbitMQ OCR服务（Cloud Vision API）
        rabbitmq_ocr = get_rabbitmq_ocr_service()

        # 通过RabbitMQ发送OCR请求到Node服务器
        result = rabbitmq_ocr.process_ocr_via_node(image_id, text_rectangles)

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
