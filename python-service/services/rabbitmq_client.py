#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
RabbitMQ客户端模块 - 处理与RabbitMQ的连接和消息处理
"""

import json
import logging
import os
import time
from typing import Dict, Any, Optional, Callable
import pika
from pika.adapters.blocking_connection import BlockingChannel
from pika.exceptions import AMQPConnectionError, AMQPChannelError

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RabbitMQClient:
    """RabbitMQ客户端类"""

    def __init__(self):
        """初始化RabbitMQ客户端"""
        self.connection = None
        self.channel = None
        self.is_connected = False
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = int(os.getenv('RABBITMQ_MAX_RECONNECT_ATTEMPTS', '5'))
        self.reconnect_delay = int(os.getenv('RABBITMQ_RECONNECT_DELAY', '5'))

        # RabbitMQ配置
        self.config = {
            'host': os.getenv('RABBITMQ_HOST', 'localhost'),
            'port': int(os.getenv('RABBITMQ_PORT', '5672')),
            'username': os.getenv('RABBITMQ_USERNAME', 'guest'),
            'password': os.getenv('RABBITMQ_PASSWORD', 'guest'),
            'vhost': os.getenv('RABBITMQ_VHOST', '/'),
            'prefetch_count': int(os.getenv('RABBITMQ_PREFETCH_COUNT', '10'))
        }

        # 队列配置
        self.queues = {
            'document_analysis': 'document.analysis',
            'ocr_process': 'ocr.process',
            'task_status': 'task.status.update',
            'notification': 'user.notification'
        }

        # 交换机配置
        self.exchanges = {
            'ocr_direct': 'ocr.direct',
            'dead_letter': 'dead.letter'
        }

    def connect(self) -> bool:
        """连接到RabbitMQ"""
        try:
            if self.is_connected:
                return True

            logger.info("正在连接RabbitMQ...")

            # 创建连接参数
            credentials = pika.PlainCredentials(
                self.config['username'],
                self.config['password']
            )

            parameters = pika.ConnectionParameters(
                host=self.config['host'],
                port=self.config['port'],
                virtual_host=self.config['vhost'],
                credentials=credentials,
                heartbeat=600,
                blocked_connection_timeout=300
            )

            # 建立连接
            self.connection = pika.BlockingConnection(parameters)
            self.channel = self.connection.channel()

            # 设置QoS
            self.channel.basic_qos(prefetch_count=self.config['prefetch_count'])

            # 声明交换机和队列
            self._setup_infrastructure()

            self.is_connected = True
            self.reconnect_attempts = 0

            logger.info("RabbitMQ连接成功")
            return True

        except Exception as e:
            logger.error(f"RabbitMQ连接失败: {str(e)}")
            self.is_connected = False
            self._schedule_reconnect()
            return False

    def _setup_infrastructure(self):
        """设置RabbitMQ基础设施（交换机、队列等）"""
        try:
            # 声明交换机
            self.channel.exchange_declare(
                exchange=self.exchanges['ocr_direct'],
                exchange_type='direct',
                durable=True
            )

            self.channel.exchange_declare(
                exchange=self.exchanges['dead_letter'],
                exchange_type='direct',
                durable=True
            )

            # 声明队列
            for queue_key, queue_name in self.queues.items():
                # user.notification队列不使用死信交换机，以保持与Node服务器的兼容性
                if queue_key == 'notification':
                    self.channel.queue_declare(
                        queue=queue_name,
                        durable=True
                    )
                else:
                    self.channel.queue_declare(
                        queue=queue_name,
                        durable=True,
                        arguments={
                            'x-dead-letter-exchange': self.exchanges['dead_letter'],
                            'x-dead-letter-routing-key': 'dead.letter'
                        }
                    )

            # 声明Python到Node的OCR队列
            self.channel.queue_declare(
                queue='python.to.node.ocr',
                durable=True
            )

            # 声明Node到Python的OCR结果队列
            self.channel.queue_declare(
                queue='node.to.python.ocr.result',
                durable=True
            )

            # 绑定队列到交换机
            self.channel.queue_bind(
                exchange=self.exchanges['ocr_direct'],
                queue=self.queues['ocr_process'],
                routing_key='ocr.process'
            )

            self.channel.queue_bind(
                exchange=self.exchanges['ocr_direct'],
                queue=self.queues['task_status'],
                routing_key='task.status.update'
            )

            self.channel.queue_bind(
                exchange=self.exchanges['ocr_direct'],
                queue=self.queues['notification'],
                routing_key='user.notification'
            )

            logger.info("RabbitMQ基础设施设置完成")

        except Exception as e:
            logger.error(f"设置RabbitMQ基础设施失败: {str(e)}")
            raise

    def _schedule_reconnect(self):
        """安排重连"""
        if self.reconnect_attempts >= self.max_reconnect_attempts:
            logger.error("RabbitMQ重连次数已达上限，停止重连")
            return

        self.reconnect_attempts += 1
        logger.info(f"{self.reconnect_delay}秒后尝试第{self.reconnect_attempts}次重连RabbitMQ")

        time.sleep(self.reconnect_delay)
        self.connect()

    def disconnect(self):
        """断开RabbitMQ连接"""
        try:
            if self.connection and not self.connection.is_closed:
                self.connection.close()
            self.is_connected = False
            logger.info("RabbitMQ连接已断开")
        except Exception as e:
            logger.error(f"断开RabbitMQ连接时出错: {str(e)}")

    def publish_message(self, exchange: str, routing_key: str, message: Dict[str, Any]) -> bool:
        """发布消息 - 带重连机制"""
        max_retries = 3
        retry_count = 0

        while retry_count < max_retries:
            try:
                # 检查连接状态，如果未连接则尝试连接
                if not self.is_connected or not self.is_healthy():
                    logger.info(f"连接状态异常，尝试重新连接 (第{retry_count + 1}次)")
                    self.is_connected = False
                    if not self.connect():
                        retry_count += 1
                        if retry_count < max_retries:
                            time.sleep(2)  # 等待2秒后重试
                        continue

                message_body = json.dumps(message, ensure_ascii=False, default=str)

                self.channel.basic_publish(
                    exchange=exchange,
                    routing_key=routing_key,
                    body=message_body,
                    properties=pika.BasicProperties(
                        delivery_mode=2,  # 持久化消息
                        timestamp=int(time.time())
                    )
                )

                logger.debug(f"消息发布成功: {exchange}/{routing_key}")
                return True

            except Exception as e:
                logger.error(f"发布消息失败 (第{retry_count + 1}次): {str(e)}")
                self.is_connected = False
                retry_count += 1

                if retry_count < max_retries:
                    logger.info(f"等待2秒后重试...")
                    time.sleep(2)
                else:
                    logger.error(f"发布消息失败，已达到最大重试次数 ({max_retries})")

        return False

    def consume_queue(self, queue_name: str, callback: Callable, auto_ack: bool = False):
        """消费队列消息"""
        try:
            if not self.is_connected:
                if not self.connect():
                    return False

            def wrapper(ch, method, properties, body):
                try:
                    message = json.loads(body.decode('utf-8'))
                    result = callback(message)

                    if not auto_ack:
                        if result:
                            ch.basic_ack(delivery_tag=method.delivery_tag)
                        else:
                            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

                except Exception as e:
                    logger.error(f"处理消息时出错: {str(e)}")
                    if not auto_ack:
                        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

            self.channel.basic_consume(
                queue=queue_name,
                on_message_callback=wrapper,
                auto_ack=auto_ack
            )

            logger.info(f"开始消费队列: {queue_name}")
            self.channel.start_consuming()

        except Exception as e:
            logger.error(f"消费队列失败: {str(e)}")
            self.is_connected = False

    def send_task_status(self, task_id: str, user_id: str, status: str,
                        progress: int = 0, result: Optional[Dict] = None,
                        error: Optional[Dict] = None):
        """发送任务状态更新"""
        message = {
            'messageId': f'task_status_{task_id}_{int(time.time())}',
            'timestamp': time.time(),
            'version': '1.0',
            'taskId': task_id,
            'userId': user_id,
            'status': status,
            'progress': progress,
            'result': result,
            'error': error
        }

        return self.publish_message(
            exchange=self.exchanges['ocr_direct'],
            routing_key='task.status.update',
            message=message
        )

    def send_notification(self, user_id: str, notification_type: str,
                         title: str, message: str, task_id: Optional[str] = None,
                         data: Optional[Dict] = None):
        """发送用户通知"""
        notification = {
            'messageId': f'notification_{user_id}_{int(time.time())}',
            'timestamp': time.time(),
            'version': '1.0',
            'userId': user_id,
            'taskId': task_id,
            'type': notification_type,
            'title': title,
            'message': message,
            'data': data,
            'priority': 'normal',
            'channels': ['websocket']
        }

        return self.publish_message(
            exchange=self.exchanges['ocr_direct'],
            routing_key='user.notification',
            message=notification
        )

    def is_healthy(self) -> bool:
        """检查连接健康状态"""
        return self.is_connected and self.connection and not self.connection.is_closed

# 创建全局实例
rabbitmq_client = RabbitMQClient()
