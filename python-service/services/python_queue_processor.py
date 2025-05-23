"""
Python服务队列处理器
独立处理Python服务的文档检测和OCR任务
"""

import json
import time
import traceback
from datetime import datetime
from typing import Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor
import threading

from services.rabbitmq_client import RabbitMQClient
from services.detector import get_detector
from services.ocr_service import process_ocr_request
from utils.log_client import info, error
from utils.database import get_database
import logging

logger = logging.getLogger(__name__)

class PythonQueueProcessor:
    """Python队列处理器"""

    def __init__(self):
        self.rabbitmq_client = RabbitMQClient()
        self.is_processing = False
        self.processing_count = 0
        self.max_concurrent_tasks = 2  # 最大并发任务数
        self.executor = ThreadPoolExecutor(max_workers=self.max_concurrent_tasks)
        self.lock = threading.Lock()

    async def start(self):
        """启动队列处理器"""
        try:
            logger.info("启动Python队列处理器")

            # 确保RabbitMQ连接
            if not self.rabbitmq_client.is_connected():
                connected = await self.rabbitmq_client.connect()
                if not connected:
                    raise Exception("无法连接到RabbitMQ")

            # 设置队列消费者
            await self.rabbitmq_client.consume_queue(
                'python.document.detection',
                self.process_document_detection_task,
                prefetch_count=self.max_concurrent_tasks
            )

            await self.rabbitmq_client.consume_queue(
                'python.ocr',
                self.process_ocr_task,
                prefetch_count=self.max_concurrent_tasks
            )

            self.is_processing = True
            logger.info("Python队列处理器已启动")
            info("Python队列处理器已启动")

        except Exception as e:
            logger.error(f"启动Python队列处理器失败: {e}")
            logger.error(traceback.format_exc())
            error(f"启动Python队列处理器失败: {e}")
            raise

    async def stop(self):
        """停止队列处理器"""
        try:
            logger.info("停止Python队列处理器")
            self.is_processing = False

            # 等待当前任务完成
            while self.processing_count > 0:
                time.sleep(0.1)

            # 关闭线程池
            self.executor.shutdown(wait=True)

            logger.info("Python队列处理器已停止")
            info("Python队列处理器已停止")

        except Exception as e:
            logger.error(f"停止Python队列处理器失败: {e}")
            error(f"停止Python队列处理器失败: {e}")

    async def process_document_detection_task(self, message: Dict[str, Any], ack_func, nack_func):
        """处理文档检测任务"""
        start_time = time.time()

        with self.lock:
            self.processing_count += 1

        try:
            task_id = message.get('taskId')
            user_id = message.get('userId')
            image_id = message.get('imageId')

            logger.info(f"开始处理Python文档检测任务: {task_id}")
            info(f"开始处理Python文档检测任务: {task_id}",
                 metadata={'task_id': task_id, 'user_id': user_id, 'image_id': image_id})

            # 验证消息格式
            if not self.validate_document_detection_message(message):
                logger.error(f"无效的文档检测任务消息: {message}")
                nack_func(requeue=False)
                return

            # 更新任务状态为处理中
            await self.update_task_status(task_id, user_id, {
                'status': 'processing',
                'progress': 10,
                'message': '开始文档布局检测...',
                'started_at': datetime.now().isoformat()
            })

            # 执行文档检测
            detection_result = await self.perform_document_detection(message)

            # 保存结果到数据库
            await self.save_document_detection_result(message, detection_result)

            # 更新任务状态为完成
            await self.update_task_status(task_id, user_id, {
                'status': 'completed',
                'progress': 100,
                'message': '文档检测完成',
                'completed_at': datetime.now().isoformat(),
                'result': detection_result,
                'processing_time': time.time() - start_time
            })

            # 发送通知
            await self.send_notification(user_id, {
                'type': 'document_detection_completed',
                'task_id': task_id,
                'message': '文档检测已完成'
            })

            logger.info(f"Python文档检测任务处理完成: {task_id}")
            info(f"Python文档检测任务处理完成: {task_id}",
                 metadata={'task_id': task_id, 'processing_time': time.time() - start_time})

            ack_func()  # 确认消息处理完成

        except Exception as e:
            logger.error(f"处理Python文档检测任务失败: {e}")
            logger.error(traceback.format_exc())
            error(f"处理Python文档检测任务失败: {e}",
                  metadata={'task_id': message.get('taskId')})

            # 更新任务状态为失败
            await self.update_task_status(
                message.get('taskId'),
                message.get('userId'),
                {
                    'status': 'failed',
                    'message': f'文档检测失败: {str(e)}',
                    'failed_at': datetime.now().isoformat(),
                    'error': str(e)
                }
            )

            # 检查是否需要重试
            retry_count = message.get('retryCount', 0)
            max_retries = message.get('maxRetries', 3)

            if retry_count < max_retries:
                logger.info(f"重新入队文档检测任务: {message.get('taskId')}")
                message['retryCount'] = retry_count + 1
                await self.rabbitmq_client.send_to_queue('python.document.detection', message)
                ack_func()
            else:
                logger.error(f"文档检测任务重试次数已达上限: {message.get('taskId')}")
                nack_func(requeue=False)

        finally:
            with self.lock:
                self.processing_count -= 1

    async def process_ocr_task(self, message: Dict[str, Any], ack_func, nack_func):
        """处理OCR任务"""
        start_time = time.time()

        with self.lock:
            self.processing_count += 1

        try:
            task_id = message.get('taskId')
            user_id = message.get('userId')
            image_id = message.get('imageId')

            logger.info(f"开始处理Python OCR任务: {task_id}")
            info(f"开始处理Python OCR任务: {task_id}",
                 metadata={'task_id': task_id, 'user_id': user_id, 'image_id': image_id})

            # 验证消息格式
            if not self.validate_ocr_message(message):
                logger.error(f"无效的OCR任务消息: {message}")
                nack_func(requeue=False)
                return

            # 更新任务状态为处理中
            await self.update_task_status(task_id, user_id, {
                'status': 'processing',
                'progress': 10,
                'message': '开始OCR识别...',
                'started_at': datetime.now().isoformat()
            })

            # 执行OCR处理
            ocr_result = await self.perform_ocr(message)

            # 保存结果到数据库
            await self.save_ocr_result(message, ocr_result)

            # 更新任务状态为完成
            await self.update_task_status(task_id, user_id, {
                'status': 'completed',
                'progress': 100,
                'message': 'OCR识别完成',
                'completed_at': datetime.now().isoformat(),
                'result': ocr_result,
                'processing_time': time.time() - start_time
            })

            # 发送通知
            await self.send_notification(user_id, {
                'type': 'ocr_completed',
                'task_id': task_id,
                'message': 'OCR识别已完成'
            })

            logger.info(f"Python OCR任务处理完成: {task_id}")
            info(f"Python OCR任务处理完成: {task_id}",
                 metadata={'task_id': task_id, 'processing_time': time.time() - start_time})

            ack_func()  # 确认消息处理完成

        except Exception as e:
            logger.error(f"处理Python OCR任务失败: {e}")
            logger.error(traceback.format_exc())
            error(f"处理Python OCR任务失败: {e}",
                  metadata={'task_id': message.get('taskId')})

            # 更新任务状态为失败
            await self.update_task_status(
                message.get('taskId'),
                message.get('userId'),
                {
                    'status': 'failed',
                    'message': f'OCR处理失败: {str(e)}',
                    'failed_at': datetime.now().isoformat(),
                    'error': str(e)
                }
            )

            # 检查是否需要重试
            retry_count = message.get('retryCount', 0)
            max_retries = message.get('maxRetries', 3)

            if retry_count < max_retries:
                logger.info(f"重新入队OCR任务: {message.get('taskId')}")
                message['retryCount'] = retry_count + 1
                await self.rabbitmq_client.send_to_queue('python.ocr', message)
                ack_func()
            else:
                logger.error(f"OCR任务重试次数已达上限: {message.get('taskId')}")
                nack_func(requeue=False)

        finally:
            with self.lock:
                self.processing_count -= 1

    def validate_document_detection_message(self, message: Dict[str, Any]) -> bool:
        """验证文档检测消息格式"""
        required_fields = ['taskId', 'userId', 'imageId', 'originalFilename']
        return all(field in message for field in required_fields)

    def validate_ocr_message(self, message: Dict[str, Any]) -> bool:
        """验证OCR消息格式"""
        required_fields = ['taskId', 'userId', 'imageId', 'rectangles']
        return all(field in message for field in required_fields)

    async def perform_document_detection(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """执行文档检测"""
        try:
            # 这里应该调用实际的文档检测服务
            # 暂时返回模拟结果
            return {
                'success': True,
                'image_id': message['imageId'],
                'rectangles': [],
                'detection_time': time.time(),
                'message': '文档检测完成（模拟结果）'
            }
        except Exception as e:
            logger.error(f"文档检测失败: {e}")
            raise

    async def perform_ocr(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """执行OCR处理"""
        try:
            image_id = message['imageId']
            rectangles = message['rectangles']

            # 调用现有的OCR服务
            result = process_ocr_request(image_id, rectangles)
            return result
        except Exception as e:
            logger.error(f"OCR处理失败: {e}")
            raise

    async def save_document_detection_result(self, message: Dict[str, Any], result: Dict[str, Any]):
        """保存文档检测结果到数据库"""
        try:
            db = get_database()
            collection = db['python_document_detection_results']

            document = {
                'task_id': message['taskId'],
                'user_id': message['userId'],
                'image_id': message['imageId'],
                'original_filename': message['originalFilename'],
                'result': result,
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }

            collection.insert_one(document)
            logger.info(f"文档检测结果已保存到数据库: {message['taskId']}")

        except Exception as e:
            logger.error(f"保存文档检测结果失败: {e}")
            raise

    async def save_ocr_result(self, message: Dict[str, Any], result: Dict[str, Any]):
        """保存OCR结果到数据库"""
        try:
            db = get_database()
            collection = db['python_ocr_results']

            document = {
                'task_id': message['taskId'],
                'user_id': message['userId'],
                'image_id': message['imageId'],
                'result': result,
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }

            collection.insert_one(document)
            logger.info(f"OCR结果已保存到数据库: {message['taskId']}")

        except Exception as e:
            logger.error(f"保存OCR结果失败: {e}")
            raise

    async def update_task_status(self, task_id: str, user_id: str, status: Dict[str, Any]):
        """更新任务状态"""
        try:
            db = get_database()
            collection = db['python_task_status']

            collection.update_one(
                {'task_id': task_id, 'user_id': user_id},
                {
                    '$set': {
                        **status,
                        'updated_at': datetime.now()
                    }
                },
                upsert=True
            )

            logger.debug(f"任务状态已更新: {task_id}")

        except Exception as e:
            logger.error(f"更新任务状态失败: {e}")

    async def send_notification(self, user_id: str, notification: Dict[str, Any]):
        """发送通知"""
        try:
            await self.rabbitmq_client.send_to_queue('notifications', {
                'user_id': user_id,
                **notification,
                'timestamp': datetime.now().isoformat()
            })

            logger.debug(f"通知已发送: {user_id}")

        except Exception as e:
            logger.error(f"发送通知失败: {e}")

    def get_status(self) -> Dict[str, Any]:
        """获取处理器状态"""
        return {
            'is_processing': self.is_processing,
            'processing_count': self.processing_count,
            'max_concurrent_tasks': self.max_concurrent_tasks,
            'is_healthy': self.rabbitmq_client.is_connected()
        }

# 创建全局实例
python_queue_processor = None

def get_python_queue_processor() -> PythonQueueProcessor:
    """获取Python队列处理器实例"""
    global python_queue_processor
    if python_queue_processor is None:
        python_queue_processor = PythonQueueProcessor()
    return python_queue_processor
