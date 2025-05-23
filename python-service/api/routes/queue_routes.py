#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
队列管理路由模块 - 处理队列相关的API路由
"""

import time
from flask import Blueprint, request, jsonify
from services.ocr_queue_processor import get_processor_status
from services.rabbitmq_client import rabbitmq_client
from utils.log_client import info, error
from controllers.python_queue_controller import (
    submit_python_document_task,
    submit_python_ocr_task,
    get_python_task_status,
    get_python_queue_status
)

# 创建蓝图
queue_bp = Blueprint('queue', __name__)

# 新增的队列任务提交路由
@queue_bp.route('/document/submit', methods=['POST'])
def submit_document_task():
    """提交Python文档检测任务"""
    return submit_python_document_task()

@queue_bp.route('/ocr/submit', methods=['POST'])
def submit_ocr_task():
    """提交Python OCR任务"""
    return submit_python_ocr_task()

@queue_bp.route('/task/<task_id>/status', methods=['GET'])
def get_task_status(task_id):
    """获取任务状态"""
    return get_python_task_status(task_id)

@queue_bp.route('/status', methods=['GET'])
def get_queue_status():
    """
    获取队列状态

    返回:
    {
        "success": true,
        "data": {
            "processor": {
                "isRunning": true,
                "processedCount": 10,
                "failedCount": 1,
                "uptime": 3600,
                "rabbitmqConnected": true
            },
            "rabbitmq": {
                "connected": true,
                "healthy": true
            }
        }
    }
    """
    try:
        # 获取处理器状态
        processor_status = get_processor_status()

        # 获取RabbitMQ状态
        rabbitmq_status = {
            'connected': rabbitmq_client.is_connected,
            'healthy': rabbitmq_client.is_healthy()
        }

        return jsonify({
            'success': True,
            'data': {
                'processor': processor_status,
                'rabbitmq': rabbitmq_status
            }
        })

    except Exception as e:
        error(f"获取队列状态失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'获取队列状态时发生错误: {str(e)}'
        }), 500

@queue_bp.route('/health', methods=['GET'])
def queue_health_check():
    """
    队列健康检查

    返回:
    {
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z",
        "services": {
            "processor": "running",
            "rabbitmq": "connected"
        }
    }
    """
    try:
        # 获取处理器状态
        processor_status = get_processor_status()

        # 检查各个服务的健康状态
        processor_health = "running" if processor_status.get('isRunning') else "stopped"
        rabbitmq_health = "connected" if rabbitmq_client.is_healthy() else "disconnected"

        # 确定整体健康状态
        overall_status = "healthy" if (
            processor_health == "running" and
            rabbitmq_health == "connected"
        ) else "unhealthy"

        return jsonify({
            'status': overall_status,
            'timestamp': processor_status.get('startTime'),
            'services': {
                'processor': processor_health,
                'rabbitmq': rabbitmq_health
            }
        })

    except Exception as e:
        error(f"队列健康检查失败: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@queue_bp.route('/stats', methods=['GET'])
def get_queue_stats():
    """
    获取队列统计信息

    返回:
    {
        "success": true,
        "data": {
            "processed": 100,
            "failed": 5,
            "uptime": 7200,
            "averageProcessingTime": 2.5,
            "throughput": 0.5
        }
    }
    """
    try:
        # 获取处理器状态
        processor_status = get_processor_status()

        processed_count = processor_status.get('processedCount', 0)
        failed_count = processor_status.get('failedCount', 0)
        uptime = processor_status.get('uptime', 0)

        # 计算吞吐量（每秒处理的任务数）
        throughput = processed_count / uptime if uptime > 0 else 0

        # 计算平均处理时间（这里是估算值，实际应该从详细统计中获取）
        average_processing_time = 2.0  # 默认2秒，实际应该从统计数据计算

        return jsonify({
            'success': True,
            'data': {
                'processed': processed_count,
                'failed': failed_count,
                'uptime': uptime,
                'averageProcessingTime': average_processing_time,
                'throughput': round(throughput, 3)
            }
        })

    except Exception as e:
        error(f"获取队列统计失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'获取队列统计时发生错误: {str(e)}'
        }), 500

@queue_bp.route('/test-connection', methods=['POST'])
def test_rabbitmq_connection():
    """
    测试RabbitMQ连接

    返回:
    {
        "success": true,
        "message": "RabbitMQ连接测试成功"
    }
    """
    try:
        # 尝试连接RabbitMQ
        connected = rabbitmq_client.connect()

        if connected:
            info("RabbitMQ连接测试成功")
            return jsonify({
                'success': True,
                'message': 'RabbitMQ连接测试成功'
            })
        else:
            error("RabbitMQ连接测试失败")
            return jsonify({
                'success': False,
                'message': 'RabbitMQ连接测试失败'
            }), 503

    except Exception as e:
        error(f"RabbitMQ连接测试异常: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'连接测试时发生错误: {str(e)}'
        }), 500

@queue_bp.route('/send-test-message', methods=['POST'])
def send_test_message():
    """
    发送测试消息到队列

    请求体:
    {
        "message": "测试消息内容"
    }

    返回:
    {
        "success": true,
        "message": "测试消息发送成功"
    }
    """
    try:
        data = request.get_json()
        test_message = data.get('message', '这是一条测试消息')

        # 构建测试消息
        message = {
            'messageId': f'test_{int(time.time())}',
            'timestamp': time.time(),
            'content': test_message,
            'type': 'test'
        }

        # 发送消息到测试队列
        success = rabbitmq_client.publish_message(
            exchange=rabbitmq_client.exchanges['ocr_direct'],
            routing_key='test.message',
            message=message
        )

        if success:
            info(f"测试消息发送成功: {test_message}")
            return jsonify({
                'success': True,
                'message': '测试消息发送成功'
            })
        else:
            error("测试消息发送失败")
            return jsonify({
                'success': False,
                'message': '测试消息发送失败'
            }), 500

    except Exception as e:
        error(f"发送测试消息异常: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'发送测试消息时发生错误: {str(e)}'
        }), 500
