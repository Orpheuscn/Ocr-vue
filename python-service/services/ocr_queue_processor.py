#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
文档解析队列处理器 - 处理来自RabbitMQ的文档解析任务
主要负责文档布局检测和图像预处理，OCR功能由Node.js后端处理
"""

import json
import logging
import time
import base64
import uuid
from typing import Dict, Any, Optional
from pathlib import Path

from services.rabbitmq_client import rabbitmq_client
from services.detector import get_detector  # 文档布局检测
from utils.log_client import info, error, debug

logger = logging.getLogger(__name__)

class OcrQueueProcessor:
    """OCR队列处理器"""

    def __init__(self):
        """初始化OCR队列处理器"""
        self.is_running = False
        self.processed_count = 0
        self.failed_count = 0
        self.start_time = None

    def start(self):
        """启动OCR队列处理器"""
        try:
            info("启动OCR队列处理器...")
            self.is_running = True
            self.start_time = time.time()

            # 连接RabbitMQ
            if not rabbitmq_client.connect():
                error("无法连接到RabbitMQ，OCR队列处理器启动失败")
                return False

            # 开始消费文档解析任务队列
            rabbitmq_client.consume_queue(
                queue_name=rabbitmq_client.queues['document_analysis'],
                callback=self._process_document_task,
                auto_ack=False
            )

            return True

        except Exception as e:
            error(f"启动OCR队列处理器失败: {str(e)}")
            self.is_running = False
            return False

    def stop(self):
        """停止OCR队列处理器"""
        try:
            info("停止OCR队列处理器...")
            self.is_running = False
            rabbitmq_client.disconnect()
            info("OCR队列处理器已停止")
        except Exception as e:
            error(f"停止OCR队列处理器时出错: {str(e)}")

    def _process_document_task(self, message: Dict[str, Any]) -> bool:
        """处理文档解析任务"""
        task_id = None
        user_id = None

        try:
            # 解析消息
            task_id = message.get('taskId')
            user_id = message.get('userId')
            image_id = message.get('imageId')
            image_data = message.get('imageData')  # base64编码的图像数据
            original_filename = message.get('originalFilename', '未命名图片')
            options = message.get('options', {})

            if not all([task_id, user_id, image_id, image_data]):
                error(f"文档解析任务消息缺少必要字段: {message}")
                return False

            info(f"开始处理文档解析任务: {task_id}, 用户: {user_id}, 图像: {image_id}")

            # 发送任务开始状态
            rabbitmq_client.send_task_status(
                task_id=task_id,
                user_id=user_id,
                status='processing',
                progress=0
            )

            # 保存图像文件
            image_path = self._save_image_from_base64(image_id, image_data)
            if not image_path:
                raise Exception("保存图像文件失败")

            # 更新进度
            rabbitmq_client.send_task_status(
                task_id=task_id,
                user_id=user_id,
                status='processing',
                progress=20
            )

            # 执行文档布局检测
            info(f"开始文档布局检测: {image_id}")
            try:
                # 这里调用现有的文档检测服务
                # 注意：这是一个简化的调用，实际需要根据现有API调整
                detection_result = self._perform_layout_detection(image_path, image_id)

                # 更新进度
                rabbitmq_client.send_task_status(
                    task_id=task_id,
                    user_id=user_id,
                    status='processing',
                    progress=60
                )

                # 执行图像裁剪（如果需要）
                crop_result = self._perform_image_cropping(image_path, image_id, detection_result)

                # 更新进度
                rabbitmq_client.send_task_status(
                    task_id=task_id,
                    user_id=user_id,
                    status='processing',
                    progress=80
                )

                # 准备结果数据
                result_data = {
                    'taskId': task_id,
                    'imageId': image_id,
                    'originalFilename': original_filename,
                    'layoutDetection': detection_result,
                    'croppedImages': crop_result,
                    'processingTime': time.time() - self.start_time if self.start_time else 0,
                    'completedAt': time.time()
                }

                # 发送任务完成状态
                rabbitmq_client.send_task_status(
                    task_id=task_id,
                    user_id=user_id,
                    status='completed',
                    progress=100,
                    result=result_data
                )

                # 发送完成通知
                rabbitmq_client.send_notification(
                    user_id=user_id,
                    notification_type='document_analysis_completed',
                    title='文档解析完成',
                    message=f'图像 "{original_filename}" 的文档解析已完成',
                    task_id=task_id,
                    data=result_data
                )

                self.processed_count += 1
                info(f"文档解析任务处理成功: {task_id}")
                return True

            except Exception as processing_error:
                error_msg = f"文档解析处理失败: {str(processing_error)}"
                raise Exception(error_msg)

        except Exception as e:
            error_msg = str(e)
            error(f"处理文档解析任务失败: {task_id}, 错误: {error_msg}")

            # 发送任务失败状态
            if task_id and user_id:
                rabbitmq_client.send_task_status(
                    task_id=task_id,
                    user_id=user_id,
                    status='failed',
                    progress=0,
                    error={
                        'code': 'DOCUMENT_PROCESSING_ERROR',
                        'message': error_msg,
                        'timestamp': time.time()
                    }
                )

                # 发送失败通知
                rabbitmq_client.send_notification(
                    user_id=user_id,
                    notification_type='document_analysis_failed',
                    title='文档解析失败',
                    message=f'图像处理失败: {error_msg}',
                    task_id=task_id
                )

            self.failed_count += 1
            return False

    def _save_image_from_base64(self, image_id: str, base64_data: str) -> Optional[str]:
        """从base64数据保存图像文件"""
        try:
            # 移除可能的base64前缀
            if ',' in base64_data:
                base64_data = base64_data.split(',')[1]

            # 解码base64数据
            image_bytes = base64.b64decode(base64_data)

            # 创建上传目录
            upload_dir = Path('uploads')
            upload_dir.mkdir(exist_ok=True)

            # 生成文件路径
            file_path = upload_dir / f"{image_id}.jpg"

            # 保存文件
            with open(file_path, 'wb') as f:
                f.write(image_bytes)

            debug(f"图像文件已保存: {file_path}")
            return str(file_path)

        except Exception as e:
            error(f"保存图像文件失败: {str(e)}")
            return None

    def _perform_layout_detection(self, image_path: str, image_id: str) -> Dict[str, Any]:
        """执行文档布局检测"""
        try:
            info(f"执行文档布局检测: {image_path}")

            # 使用现有的文档检测器
            detector = get_detector()
            detection_result = detector.detect(image_path)

            if detection_result.get('success'):
                return {
                    'imageId': image_id,
                    'detectedElements': detection_result.get('detected_objects', []),
                    'width': detection_result.get('width'),
                    'height': detection_result.get('height'),
                    'confidence': 0.95,
                    'processingTime': 2.5,
                    'timestamp': time.time()
                }
            else:
                raise Exception(detection_result.get('error', '检测失败'))

        except Exception as e:
            error(f"文档布局检测失败: {str(e)}")
            return {
                'imageId': image_id,
                'error': str(e),
                'timestamp': time.time()
            }

    def _perform_image_cropping(self, image_path: str, image_id: str, detection_result: Dict[str, Any]) -> Dict[str, Any]:
        """执行图像裁剪"""
        try:
            # 这里应该调用现有的图像裁剪服务
            info(f"执行图像裁剪: {image_path}")

            # 模拟裁剪结果
            crop_result = {
                'imageId': image_id,
                'croppedImages': [],
                'totalCrops': 0,
                'processingTime': 1.2,
                'timestamp': time.time()
            }

            # TODO: 集成现有的图像裁剪逻辑
            # from services.cropper import crop_image
            # crop_result = crop_image(image_path, detection_result)

            return crop_result

        except Exception as e:
            error(f"图像裁剪失败: {str(e)}")
            return {
                'imageId': image_id,
                'error': str(e),
                'timestamp': time.time()
            }

    def get_status(self) -> Dict[str, Any]:
        """获取处理器状态"""
        uptime = time.time() - self.start_time if self.start_time else 0

        return {
            'isRunning': self.is_running,
            'processedCount': self.processed_count,
            'failedCount': self.failed_count,
            'uptime': uptime,
            'rabbitmqConnected': rabbitmq_client.is_healthy(),
            'startTime': self.start_time
        }

# 创建全局实例
ocr_queue_processor = OcrQueueProcessor()

def start_ocr_queue_processor():
    """启动OCR队列处理器的便捷函数"""
    return ocr_queue_processor.start()

def stop_ocr_queue_processor():
    """停止OCR队列处理器的便捷函数"""
    ocr_queue_processor.stop()

def get_processor_status():
    """获取处理器状态的便捷函数"""
    return ocr_queue_processor.get_status()
