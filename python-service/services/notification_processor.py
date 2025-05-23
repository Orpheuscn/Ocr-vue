"""
Python通知处理器
处理系统通知消息
"""

import json
import time
import traceback
from datetime import datetime
from typing import Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor
import threading

from services.rabbitmq_client import RabbitMQClient
from utils.log_client import info, error
import logging
from utils.database import get_database

logger = logging.getLogger(__name__)

class NotificationProcessor:
    """通知处理器"""

    def __init__(self):
        self.rabbitmq_client = RabbitMQClient()
        self.is_processing = False
        self.processing_count = 0
        self.max_concurrent_tasks = 5  # 最大并发任务数
        self.executor = ThreadPoolExecutor(max_workers=self.max_concurrent_tasks)
        self.lock = threading.Lock()

    async def start(self):
        """启动通知处理器"""
        try:
            logger.info("启动Python通知处理器")
            info("启动Python通知处理器")

            # 确保RabbitMQ连接
            if not self.rabbitmq_client.is_connected():
                connected = await self.rabbitmq_client.connect()
                if not connected:
                    raise Exception("无法连接到RabbitMQ")

            # 设置队列消费者
            await self.rabbitmq_client.consume_queue(
                'notifications',
                self.process_notification,
                prefetch_count=self.max_concurrent_tasks
            )

            self.is_processing = True
            logger.info("Python通知处理器已启动")
            info("Python通知处理器已启动")

        except Exception as e:
            logger.error(f"启动Python通知处理器失败: {e}")
            logger.error(traceback.format_exc())
            error(f"启动Python通知处理器失败: {e}")
            raise

    async def stop(self):
        """停止通知处理器"""
        try:
            logger.info("停止Python通知处理器")
            info("停止Python通知处理器")
            self.is_processing = False

            # 等待当前任务完成
            while self.processing_count > 0:
                time.sleep(0.1)

            # 关闭线程池
            self.executor.shutdown(wait=True)

            logger.info("Python通知处理器已停止")
            info("Python通知处理器已停止")

        except Exception as e:
            logger.error(f"停止Python通知处理器失败: {e}")
            error(f"停止Python通知处理器失败: {e}")

    async def process_notification(self, message: Dict[str, Any], ack_func, nack_func):
        """处理通知消息"""
        with self.lock:
            self.processing_count += 1

        try:
            notification_type = message.get('type')
            user_id = message.get('userId') or message.get('user_id')

            logger.info(f"开始处理通知: {notification_type}")
            info(f"开始处理通知: {notification_type}",
                 metadata={'type': notification_type, 'user_id': user_id})

            # 验证消息格式
            if not self.validate_notification_message(message):
                logger.error(f"无效的通知消息: {message}")
                nack_func(requeue=False)
                return

            # 根据通知类型处理
            await self.handle_notification_by_type(message)

            # 保存通知到数据库
            await self.save_notification(message)

            logger.info(f"通知处理完成: {notification_type}")
            info(f"通知处理完成: {notification_type}",
                 metadata={'type': notification_type, 'user_id': user_id})

            ack_func()  # 确认消息处理完成

        except Exception as e:
            logger.error(f"处理通知失败: {e}")
            logger.error(traceback.format_exc())
            error(f"处理通知失败: {e}",
                  metadata={'type': message.get('type')})

            # 检查是否需要重试
            retry_count = message.get('retryCount', 0)
            max_retries = message.get('maxRetries', 3)

            if retry_count < max_retries:
                logger.info(f"重新入队通知: {message.get('type')}")
                message['retryCount'] = retry_count + 1
                await self.rabbitmq_client.send_to_queue('notifications', message)
                ack_func()
            else:
                logger.error(f"通知重试次数已达上限: {message.get('type')}")
                nack_func(requeue=False)

        finally:
            with self.lock:
                self.processing_count -= 1

    def validate_notification_message(self, message: Dict[str, Any]) -> bool:
        """验证通知消息格式"""
        required_fields = ['type']
        return all(field in message for field in required_fields)

    async def handle_notification_by_type(self, message: Dict[str, Any]):
        """根据通知类型处理"""
        notification_type = message.get('type')

        if notification_type == 'ocr_completed':
            await self.handle_ocr_completed_notification(message)
        elif notification_type == 'document_detection_completed':
            await self.handle_document_detection_completed_notification(message)
        elif notification_type == 'task_failed':
            await self.handle_task_failed_notification(message)
        elif notification_type == 'user_message':
            await self.handle_user_message_notification(message)
        else:
            logger.warning(f"未知的通知类型: {notification_type}")
            await self.handle_generic_notification(message)

    async def handle_ocr_completed_notification(self, message: Dict[str, Any]):
        """处理OCR完成通知"""
        task_id = message.get('taskId') or message.get('task_id')
        user_id = message.get('userId') or message.get('user_id')

        logger.info(f"处理OCR完成通知: {task_id}")
        info(f"处理OCR完成通知: {task_id}",
             metadata={'task_id': task_id, 'user_id': user_id})

        # 这里可以添加具体的处理逻辑，比如：
        # - 发送邮件通知
        # - 推送到前端
        # - 更新用户状态等

    async def handle_document_detection_completed_notification(self, message: Dict[str, Any]):
        """处理文档检测完成通知"""
        task_id = message.get('taskId') or message.get('task_id')
        user_id = message.get('userId') or message.get('user_id')

        logger.info(f"处理文档检测完成通知: {task_id}")
        info(f"处理文档检测完成通知: {task_id}",
             metadata={'task_id': task_id, 'user_id': user_id})

        # 这里可以添加具体的处理逻辑

    async def handle_task_failed_notification(self, message: Dict[str, Any]):
        """处理任务失败通知"""
        task_id = message.get('taskId') or message.get('task_id')
        user_id = message.get('userId') or message.get('user_id')
        error_msg = message.get('error')

        logger.info(f"处理任务失败通知: {task_id}")
        info(f"处理任务失败通知: {task_id}",
             metadata={'task_id': task_id, 'user_id': user_id, 'error': error_msg})

        # 这里可以添加具体的处理逻辑

    async def handle_user_message_notification(self, message: Dict[str, Any]):
        """处理用户消息通知"""
        user_id = message.get('userId') or message.get('user_id')
        msg = message.get('message')

        logger.info(f"处理用户消息通知: {user_id}")
        info(f"处理用户消息通知: {user_id}",
             metadata={'user_id': user_id, 'message': msg})

        # 这里可以添加具体的处理逻辑

    async def handle_generic_notification(self, message: Dict[str, Any]):
        """处理通用通知"""
        logger.info(f"处理通用通知: {message}")
        info(f"处理通用通知: {message}")

        # 这里可以添加通用的处理逻辑

    async def save_notification(self, message: Dict[str, Any]):
        """保存通知到数据库"""
        try:
            db = get_database()
            collection = db['notifications']

            document = {
                'type': message.get('type'),
                'user_id': message.get('userId') or message.get('user_id'),
                'task_id': message.get('taskId') or message.get('task_id'),
                'message': message.get('message'),
                'data': message.get('data', {}),
                'processed': True,
                'created_at': datetime.fromisoformat(message.get('timestamp', datetime.now().isoformat())),
                'processed_at': datetime.now()
            }

            collection.insert_one(document)
            logger.debug(f"通知已保存到数据库: {message.get('type')}")

        except Exception as e:
            logger.error(f"保存通知失败: {e}")
            raise

    def get_status(self) -> Dict[str, Any]:
        """获取处理器状态"""
        return {
            'is_processing': self.is_processing,
            'processing_count': self.processing_count,
            'max_concurrent_tasks': self.max_concurrent_tasks,
            'is_healthy': self.rabbitmq_client.is_connected()
        }

# 创建全局实例
notification_processor = None

def get_notification_processor() -> NotificationProcessor:
    """获取通知处理器实例"""
    global notification_processor
    if notification_processor is None:
        notification_processor = NotificationProcessor()
    return notification_processor
