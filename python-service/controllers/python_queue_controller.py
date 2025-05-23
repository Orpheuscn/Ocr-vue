"""
Python服务队列控制器
处理Python服务独立的文档检测和OCR任务
"""

import uuid
import json
import traceback
from datetime import datetime
from typing import Dict, Any, Optional
from flask import request, jsonify, current_app

from services.rabbitmq_client import RabbitMQClient
from utils.log_client import info, error
import logging

logger = logging.getLogger(__name__)

def submit_python_document_task():
    """
    提交Python文档检测任务到队列进行异步处理
    Python服务独立处理文档布局检测和图像预处理
    """
    try:
        logger.info("收到Python文档检测队列处理请求")

        # 检查是否有文件上传
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'message': '请上传图像文件'
            }), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': '请选择文件'
            }), 400

        # 获取用户ID（如果有的话）
        user_id = request.form.get('userId')
        if not user_id:
            # Python服务可以处理匿名用户的请求
            user_id = f"anonymous_{uuid.uuid4().hex[:8]}"

        # 生成任务ID和图像ID
        task_id = str(uuid.uuid4())
        image_id = str(uuid.uuid4())

        # 获取参数
        enable_layout_detection = request.form.get('enableLayoutDetection', 'true').lower() == 'true'
        enable_image_cropping = request.form.get('enableImageCropping', 'true').lower() == 'true'
        confidence_threshold = float(request.form.get('confidenceThreshold', 0.5))

        # 读取文件内容
        file_content = file.read()

        # 构建Python文档检测任务消息
        python_doc_task_message = {
            'messageId': f'python_doc_task_{task_id}',
            'timestamp': datetime.now().isoformat(),
            'version': '1.0',
            'taskId': task_id,
            'userId': user_id,
            'imageId': image_id,
            'originalFilename': file.filename or '未命名图片',
            'mimeType': file.content_type,
            'fileSize': len(file_content),
            'options': {
                'enableLayoutDetection': enable_layout_detection,
                'enableImageCropping': enable_image_cropping,
                'confidenceThreshold': confidence_threshold,
            },
            'priority': 1,
            'retryCount': 0,
            'maxRetries': 3,
            'createdAt': datetime.now().isoformat(),
        }

        logger.info(f"准备发送Python文档检测任务到队列: {task_id}")
        info(f"准备发送Python文档检测任务到队列: {task_id}",
             metadata={'task_id': task_id, 'image_id': image_id})

        # 获取RabbitMQ客户端
        rabbitmq_client = RabbitMQClient()

        # 发送任务到Python文档检测处理队列
        sent = rabbitmq_client.send_to_queue('python.document.detection', python_doc_task_message)

        if not sent:
            return jsonify({
                'success': False,
                'message': '任务提交失败，请稍后重试'
            }), 503

        logger.info(f"Python文档检测任务已提交到队列: {task_id}")
        info(f"Python文档检测任务已提交到队列: {task_id}",
             metadata={'task_id': task_id, 'user_id': user_id, 'image_id': image_id})

        # 返回任务ID给客户端
        return jsonify({
            'success': True,
            'data': {
                'taskId': task_id,
                'imageId': image_id,
                'status': 'queued',
                'message': '文档检测任务已提交，正在处理中...',
                'estimatedTime': '预计1-2分钟完成',
                'stages': ['文档布局检测', '图像预处理', '结果存储']
            }
        })

    except Exception as e:
        logger.error(f"提交Python文档检测任务失败: {e}")
        logger.error(traceback.format_exc())
        error(f"提交Python文档检测任务失败: {e}")
        return jsonify({
            'success': False,
            'message': '提交任务时出错',
            'error': str(e)
        }), 500

def submit_python_ocr_task():
    """
    提交Python OCR任务到队列进行异步处理
    Python服务独立处理OCR任务
    """
    try:
        logger.info("收到Python OCR队列处理请求")

        # 获取请求数据
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': '请求数据不能为空'
            }), 400

        # 获取必要参数
        image_id = data.get('imageId')
        rectangles = data.get('rectangles', [])
        user_id = data.get('userId')

        if not image_id:
            return jsonify({
                'success': False,
                'message': '图像ID不能为空'
            }), 400

        if not rectangles:
            return jsonify({
                'success': False,
                'message': '请至少选择一个区域进行OCR'
            }), 400

        if not user_id:
            user_id = f"anonymous_{uuid.uuid4().hex[:8]}"

        # 生成任务ID
        task_id = str(uuid.uuid4())

        # 获取OCR参数
        language = data.get('language', 'chi_sim+eng')
        psm_mode = data.get('psmMode', 6)

        # 构建Python OCR任务消息
        python_ocr_task_message = {
            'messageId': f'python_ocr_task_{task_id}',
            'timestamp': datetime.now().isoformat(),
            'version': '1.0',
            'taskId': task_id,
            'userId': user_id,
            'imageId': image_id,
            'rectangles': rectangles,
            'options': {
                'language': language,
                'psmMode': psm_mode,
            },
            'priority': 1,
            'retryCount': 0,
            'maxRetries': 3,
            'createdAt': datetime.now().isoformat(),
        }

        logger.info(f"准备发送Python OCR任务到队列: {task_id}")
        info(f"准备发送Python OCR任务到队列: {task_id}",
             metadata={'task_id': task_id, 'image_id': image_id, 'rectangles_count': len(rectangles)})

        # 获取RabbitMQ客户端
        rabbitmq_client = RabbitMQClient()

        # 发送任务到Python OCR处理队列
        sent = rabbitmq_client.send_to_queue('python.ocr', python_ocr_task_message)

        if not sent:
            return jsonify({
                'success': False,
                'message': '任务提交失败，请稍后重试'
            }), 503

        logger.info(f"Python OCR任务已提交到队列: {task_id}")
        info(f"Python OCR任务已提交到队列: {task_id}",
             metadata={'task_id': task_id, 'user_id': user_id, 'image_id': image_id})

        # 返回任务ID给客户端
        return jsonify({
            'success': True,
            'data': {
                'taskId': task_id,
                'imageId': image_id,
                'status': 'queued',
                'message': 'OCR任务已提交，正在处理中...',
                'estimatedTime': '预计30秒-2分钟完成',
                'stages': ['图像裁剪', 'OCR文字识别', '结果存储']
            }
        })

    except Exception as e:
        logger.error(f"提交Python OCR任务失败: {e}")
        logger.error(traceback.format_exc())
        error(f"提交Python OCR任务失败: {e}")
        return jsonify({
            'success': False,
            'message': '提交任务时出错',
            'error': str(e)
        }), 500

def get_python_task_status(task_id: str):
    """
    获取Python任务状态
    """
    try:
        if not task_id:
            return jsonify({
                'success': False,
                'message': '任务ID不能为空'
            }), 400

        logger.info(f"查询Python任务状态: {task_id}")

        # 这里应该从数据库或缓存中查询任务状态
        # 暂时返回模拟状态
        task_status = {
            'taskId': task_id,
            'status': 'processing',  # queued, processing, completed, failed
            'progress': 50,
            'message': '正在处理中...',
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat(),
        }

        return jsonify({
            'success': True,
            'data': task_status
        })

    except Exception as e:
        logger.error(f"查询Python任务状态失败: {e}")
        error(f"查询Python任务状态失败: {e}")
        return jsonify({
            'success': False,
            'message': '查询任务状态时出错',
            'error': str(e)
        }), 500

def get_python_queue_status():
    """
    获取Python队列状态（管理员功能）
    """
    try:
        logger.info("查询Python队列状态")

        # 这里应该查询队列的实际状态
        queue_status = {
            'queues': {
                'python.document.detection': {
                    'messageCount': 0,
                    'consumerCount': 1,
                    'isHealthy': True,
                },
                'python.ocr': {
                    'messageCount': 0,
                    'consumerCount': 1,
                    'isHealthy': True,
                }
            },
            'lastUpdated': datetime.now().isoformat(),
        }

        return jsonify({
            'success': True,
            'data': queue_status
        })

    except Exception as e:
        logger.error(f"查询Python队列状态失败: {e}")
        error(f"查询Python队列状态失败: {e}")
        return jsonify({
            'success': False,
            'message': '查询队列状态时出错',
            'error': str(e)
        }), 500
