#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
RabbitMQ OCR服务 - 通过RabbitMQ与Node服务器通信进行OCR处理
"""

import json
import time
import uuid
import base64
import threading
from typing import Dict, Any, List, Optional
from pathlib import Path
import logging

from services.rabbitmq_client import RabbitMQClient
from utils.log_client import info, error, debug
from config.settings import CROPS_FOLDER

logger = logging.getLogger(__name__)


class RabbitMQOcrService:
    """通过RabbitMQ与Node服务器通信的OCR服务"""

    def __init__(self):
        """初始化RabbitMQ OCR服务"""
        self.rabbitmq_client = RabbitMQClient()
        self.pending_requests = {}  # 存储待处理的OCR请求
        self.request_timeout = 300  # 5分钟超时
        self.result_lock = threading.Lock()
        self.listener_thread = None  # 监听线程引用
        self.is_shutting_down = False  # 关闭标志

        # 确保RabbitMQ连接
        if not self.rabbitmq_client.connect():
            raise Exception("无法连接到RabbitMQ")

        # 启动结果监听器
        self._start_result_listener()

    def shutdown(self):
        """关闭OCR服务，清理资源"""
        try:
            info("开始关闭RabbitMQ OCR服务...")
            self.is_shutting_down = True

            # 清理待处理的请求
            with self.result_lock:
                self.pending_requests.clear()

            # 关闭RabbitMQ客户端
            if self.rabbitmq_client:
                self.rabbitmq_client.close()

            info("RabbitMQ OCR服务已关闭")
        except Exception as e:
            error(f"关闭RabbitMQ OCR服务时出错: {e}")

    def process_ocr_via_node(self, image_id: str, rectangles: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        通过Node服务器处理OCR请求

        Args:
            image_id: 图片ID
            rectangles: 矩形信息列表

        Returns:
            OCR处理结果
        """
        try:
            info(f"开始通过Node服务器处理OCR: {image_id}, 矩形数量: {len(rectangles)}")

            # 准备裁剪图片数据
            crops_data = self._prepare_crops_data(image_id, rectangles)
            if not crops_data:
                return {
                    'success': False,
                    'error': '无法准备裁剪图片数据',
                    'image_id': image_id
                }

            # 生成请求ID
            request_id = str(uuid.uuid4())

            # 构建OCR请求消息
            ocr_request = {
                'requestId': request_id,
                'imageId': image_id,
                'timestamp': time.time(),
                'cropsData': crops_data,
            }

            # 注册待处理请求
            with self.result_lock:
                self.pending_requests[request_id] = {
                    'status': 'pending',
                    'result': None,
                    'timestamp': time.time()
                }

            # 发送OCR请求到Node服务器
            success = self.rabbitmq_client.publish_message(
                exchange='',
                routing_key='python.to.node.ocr',
                message=ocr_request
            )

            if not success:
                with self.result_lock:
                    del self.pending_requests[request_id]
                return {
                    'success': False,
                    'error': '发送OCR请求失败',
                    'image_id': image_id
                }

            info(f"OCR请求已发送到Node服务器: {request_id}")

            # 等待结果
            result = self._wait_for_result(request_id)
            return result

        except Exception as e:
            logger.error(f"通过Node服务器处理OCR失败: {e}")
            error(f"通过Node服务器处理OCR失败: {e}", metadata={'image_id': image_id})
            return {
                'success': False,
                'error': str(e),
                'image_id': image_id
            }

    def _prepare_crops_data(self, image_id: str, rectangles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        准备裁剪图片数据 - 重构版本，确保稳定性

        Args:
            image_id: 图片ID
            rectangles: 矩形信息列表

        Returns:
            裁剪图片数据列表
        """
        try:
            info(f"准备裁剪图片数据 - 图片ID: {image_id}, 矩形数量: {len(rectangles)}")
            info(f"矩形数据详情: {rectangles}")

            # 确保裁剪图片存在，如果不存在则强制重新裁剪
            if not self._ensure_crops_exist(image_id, rectangles):
                error(f"无法确保裁剪图片存在: {image_id}")
                return []

            crops_dir = Path(CROPS_FOLDER) / image_id
            crops_data = []

            for rect in rectangles:
                rect_id = rect.get('id')
                rect_class = rect.get('class', 'unknown')

                info(f"处理矩形: ID={rect_id}, class={rect_class}")

                # 跳过图片类型的矩形
                if rect_class.lower() == 'figure':
                    debug(f"跳过图片类型矩形: {rect_id}")
                    continue

                # 查找裁剪图片文件
                crop_path = self._find_crop_file(crops_dir, rect_id)

                if not crop_path:
                    error(f"找不到矩形 {rect_id} 的裁剪图片，尝试实时裁剪")
                    # 尝试实时裁剪单个矩形
                    crop_path = self._crop_single_rectangle(image_id, rect)

                if not crop_path:
                    error(f"无法为矩形 {rect_id} 生成裁剪图片")
                    continue

                # 读取图片并转换为base64
                try:
                    with open(crop_path, 'rb') as f:
                        image_data = base64.b64encode(f.read()).decode('utf-8')

                    crops_data.append({
                        'rectangleId': rect_id,
                        'rectangleClass': rect_class,
                        'imageData': image_data,
                        'rectangleInfo': rect
                    })

                    debug(f"成功准备矩形 {rect_id} 的图片数据")

                except Exception as e:
                    error(f"读取裁剪图片失败 {rect_id}: {e}")
                    continue

            info(f"成功准备 {len(crops_data)} 个裁剪图片数据")
            return crops_data

        except Exception as e:
            logger.error(f"准备裁剪图片数据失败: {e}")
            error(f"准备裁剪图片数据失败: {e}", metadata={'image_id': image_id})
            return []

    def _ensure_crops_exist(self, image_id: str, rectangles: List[Dict[str, Any]]) -> bool:
        """
        确保裁剪图片存在，如果不存在则重新裁剪

        Args:
            image_id: 图片ID
            rectangles: 矩形信息列表

        Returns:
            是否成功确保裁剪图片存在
        """
        try:
            crops_dir = Path(CROPS_FOLDER) / image_id

            # 检查裁剪目录是否存在
            if not crops_dir.exists():
                info(f"裁剪目录不存在，创建并执行裁剪: {crops_dir}")
                return self._auto_crop_image(image_id, rectangles)

            # 检查是否有足够的裁剪图片
            existing_crops = list(crops_dir.glob('*.jpg')) + list(crops_dir.glob('*.png')) + list(crops_dir.glob('*.jpeg'))
            text_rectangles = [r for r in rectangles if r.get('class', '').lower() != 'figure']

            if len(existing_crops) < len(text_rectangles):
                info(f"裁剪图片数量不足 (现有: {len(existing_crops)}, 需要: {len(text_rectangles)})，重新裁剪")
                return self._auto_crop_image(image_id, rectangles)

            info(f"裁剪图片已存在，数量: {len(existing_crops)}")
            return True

        except Exception as e:
            error(f"检查裁剪图片存在性时出错: {e}")
            return False

    def _find_crop_file(self, crops_dir: Path, rect_id: str) -> Path:
        """
        查找裁剪图片文件

        Args:
            crops_dir: 裁剪目录路径
            rect_id: 矩形ID

        Returns:
            裁剪图片文件路径，如果找不到返回None
        """
        try:
            # 尝试直接匹配
            for ext in ['.jpg', '.png', '.jpeg']:
                potential_path = crops_dir / f"{rect_id}{ext}"
                if potential_path.exists():
                    info(f"直接匹配找到裁剪图片: {potential_path}")
                    return potential_path

            # 尝试模糊匹配
            if crops_dir.exists():
                for file_path in crops_dir.iterdir():
                    if file_path.is_file() and file_path.suffix.lower() in ['.jpg', '.png', '.jpeg']:
                        filename = file_path.stem
                        # 多种匹配规则
                        if (filename == rect_id or
                            filename == str(rect_id) or
                            (str(rect_id).isdigit() and filename == str(rect_id)) or
                            (filename.isdigit() and filename == str(rect_id))):
                            info(f"模糊匹配找到裁剪图片: {file_path}")
                            return file_path

            return None

        except Exception as e:
            error(f"查找裁剪图片文件时出错: {e}")
            return None

    def _crop_single_rectangle(self, image_id: str, rect: Dict[str, Any]) -> Path:
        """
        实时裁剪单个矩形

        Args:
            image_id: 图片ID
            rect: 矩形信息

        Returns:
            裁剪图片文件路径，如果失败返回None
        """
        try:
            from services.cropper import get_cropper
            import cv2
            import os

            # 获取原始图片路径
            cropper = get_cropper()
            original_image_path = cropper.find_original_image(image_id)

            if not original_image_path:
                error(f"找不到原始图片: {image_id}")
                return None

            # 读取原始图片
            image = cv2.imread(original_image_path)
            if image is None:
                error(f"无法读取原始图片: {original_image_path}")
                return None

            # 获取矩形坐标 - 支持多种格式
            coords = rect.get('coords', {})

            # 处理不同的坐标格式
            if isinstance(coords, dict):
                # 前端格式: {"topLeft": {"x": 100, "y": 100}, "bottomRight": {"x": 200, "y": 150}}
                if 'topLeft' in coords and 'bottomRight' in coords:
                    top_left = coords['topLeft']
                    bottom_right = coords['bottomRight']
                    x_min = int(top_left['x'])
                    y_min = int(top_left['y'])
                    x_max = int(bottom_right['x'])
                    y_max = int(bottom_right['y'])
                else:
                    error(f"矩形坐标格式错误 (对象格式): {coords}")
                    return None
            elif isinstance(coords, list) and len(coords) == 4:
                # 数组格式: [x_min, y_min, x_max, y_max]
                x_min, y_min, x_max, y_max = coords
            else:
                error(f"矩形坐标格式错误: {coords}")
                return None

            # 确保坐标在图片范围内
            height, width = image.shape[:2]
            x_min = max(0, min(x_min, width))
            y_min = max(0, min(y_min, height))
            x_max = max(0, min(x_max, width))
            y_max = max(0, min(y_max, height))

            # 裁剪图片
            cropped = image[y_min:y_max, x_min:x_max]

            # 确保裁剪目录存在
            crops_dir = Path(CROPS_FOLDER) / image_id
            crops_dir.mkdir(parents=True, exist_ok=True)

            # 保存裁剪图片
            rect_id = rect.get('id')
            crop_path = crops_dir / f"{rect_id}.jpg"

            success = cv2.imwrite(str(crop_path), cropped)
            if success:
                info(f"成功实时裁剪矩形 {rect_id}: {crop_path}")
                return crop_path
            else:
                error(f"保存裁剪图片失败: {crop_path}")
                return None

        except Exception as e:
            error(f"实时裁剪矩形失败: {e}")
            return None

    def _auto_crop_image(self, image_id: str, rectangles: List[Dict[str, Any]]) -> bool:
        """
        自动裁剪图片

        Args:
            image_id: 图片ID
            rectangles: 矩形列表

        Returns:
            是否裁剪成功
        """
        try:
            # 导入裁剪服务
            from services.cropper import get_cropper

            # 创建裁剪服务实例
            cropper = get_cropper()

            info(f"开始自动裁剪图片: {image_id}, 矩形数量: {len(rectangles)}")

            # 执行裁剪 - 直接传递矩形数据
            result = cropper.crop_image(image_id, rectangles)

            if result.get('success', False):
                info(f"自动裁剪成功: {image_id}")
                return True
            else:
                error(f"自动裁剪失败: {result.get('error', '未知错误')}")
                return False

        except Exception as e:
            error(f"自动裁剪异常: {e}")
            return False

    def _wait_for_result(self, request_id: str) -> Dict[str, Any]:
        """
        等待OCR结果

        Args:
            request_id: 请求ID

        Returns:
            OCR结果
        """
        start_time = time.time()

        while time.time() - start_time < self.request_timeout:
            with self.result_lock:
                if request_id in self.pending_requests:
                    request_info = self.pending_requests[request_id]

                    if request_info['status'] == 'completed':
                        result = request_info['result']
                        del self.pending_requests[request_id]
                        return result
                    elif request_info['status'] == 'failed':
                        error_msg = request_info.get('error', '未知错误')
                        del self.pending_requests[request_id]
                        return {
                            'success': False,
                            'error': error_msg,
                            'request_id': request_id
                        }
                else:
                    # 请求已被删除，可能是超时或其他原因
                    break

            # 等待一小段时间再检查
            time.sleep(0.5)

        # 超时处理
        with self.result_lock:
            if request_id in self.pending_requests:
                del self.pending_requests[request_id]

        error(f"OCR请求超时: {request_id}")
        return {
            'success': False,
            'error': 'OCR请求超时',
            'request_id': request_id
        }

    def _start_result_listener(self):
        """启动结果监听器"""
        try:
            # 在后台线程中启动结果监听
            self.listener_thread = threading.Thread(
                target=self._listen_for_results,
                daemon=True,
                name="OCR-Result-Listener"
            )
            self.listener_thread.start()
            info("OCR结果监听器已启动")
        except Exception as e:
            error(f"启动OCR结果监听器失败: {e}")

    def _listen_for_results(self):
        """监听OCR结果 - 带自动重连机制"""
        import pika
        import json

        retry_count = 0
        max_retries = 5
        retry_delay = 5  # 秒

        while not self.is_shutting_down and retry_count < max_retries:
            connection = None
            channel = None

            try:
                info(f"尝试建立OCR结果监听连接 (第{retry_count + 1}次)")

                # 创建连接参数
                credentials = pika.PlainCredentials(
                    self.rabbitmq_client.config['username'],
                    self.rabbitmq_client.config['password']
                )

                parameters = pika.ConnectionParameters(
                    host=self.rabbitmq_client.config['host'],
                    port=self.rabbitmq_client.config['port'],
                    virtual_host=self.rabbitmq_client.config['vhost'],
                    credentials=credentials,
                    heartbeat=600,
                    blocked_connection_timeout=300
                )

                # 建立连接
                connection = pika.BlockingConnection(parameters)
                channel = connection.channel()

                # 声明队列
                channel.queue_declare(queue='node.to.python.ocr.result', durable=True)

                def callback(ch, method, properties, body):
                    try:
                        message = json.loads(body.decode('utf-8'))
                        self._handle_ocr_result(message)
                        ch.basic_ack(delivery_tag=method.delivery_tag)
                    except Exception as e:
                        error(f"处理OCR结果消息失败: {e}")
                        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

                # 开始消费
                channel.basic_consume(
                    queue='node.to.python.ocr.result',
                    on_message_callback=callback
                )

                info("OCR结果监听器已启动，开始监听...")
                retry_count = 0  # 重置重试计数
                channel.start_consuming()

            except Exception as e:
                error(f"OCR结果监听失败 (第{retry_count + 1}次): {e}")
                retry_count += 1

                # 确保连接正确关闭
                try:
                    if channel and not channel.is_closed:
                        channel.stop_consuming()
                        channel.close()
                except Exception as close_e:
                    error(f"关闭OCR监听通道时出错: {close_e}")

                try:
                    if connection and not connection.is_closed:
                        connection.close()
                except Exception as close_e:
                    error(f"关闭OCR监听连接时出错: {close_e}")

                # 如果不是最后一次重试，等待后重试
                if retry_count < max_retries and not self.is_shutting_down:
                    info(f"等待 {retry_delay} 秒后重试...")
                    time.sleep(retry_delay)
                    retry_delay = min(retry_delay * 2, 60)  # 指数退避，最大60秒

        if retry_count >= max_retries:
            error("OCR结果监听器达到最大重试次数，停止重试")
        else:
            info("OCR结果监听器正常退出")

    def _handle_ocr_result(self, message: Dict[str, Any]) -> bool:
        """
        处理OCR结果

        Args:
            message: 结果消息

        Returns:
            处理是否成功
        """
        try:
            request_id = message.get('requestId')
            if not request_id:
                error("OCR结果消息缺少requestId")
                return False

            with self.result_lock:
                if request_id not in self.pending_requests:
                    debug(f"收到未知请求的OCR结果: {request_id}")
                    return True

                # 更新请求状态
                if message.get('success', False):
                    # 转换Node.js返回的结果格式为前端期望的格式
                    converted_result = self._convert_node_result_to_frontend_format(message)
                    self.pending_requests[request_id]['status'] = 'completed'
                    self.pending_requests[request_id]['result'] = converted_result
                    info(f"收到OCR成功结果: {request_id}")
                else:
                    self.pending_requests[request_id]['status'] = 'failed'
                    self.pending_requests[request_id]['error'] = message.get('error', '未知错误')
                    error(f"收到OCR失败结果: {request_id}, 错误: {message.get('error')}")

            return True

        except Exception as e:
            error(f"处理OCR结果失败: {e}")
            return False

    def _convert_node_result_to_frontend_format(self, node_message: Dict[str, Any]) -> Dict[str, Any]:
        """
        将Node.js返回的结果格式转换为前端期望的格式

        Args:
            node_message: Node.js返回的消息

        Returns:
            转换后的结果格式
        """
        try:
            # 转换results数组中的字段名
            converted_results = []
            if 'results' in node_message and isinstance(node_message['results'], list):
                for result in node_message['results']:
                    converted_result = {
                        'id': result.get('rectangleId'),  # 将rectangleId转换为id
                        'text': result.get('text', ''),
                        'success': result.get('success', False),
                        'confidence': result.get('confidence', 0.0),
                        'error': result.get('error')
                    }
                    converted_results.append(converted_result)

            # 构建前端期望的响应格式
            frontend_result = {
                'success': node_message.get('success', False),
                'results': converted_results,
                'image_id': node_message.get('imageId'),
                'processing_time': node_message.get('processingTime', 0),
                'total_rectangles': node_message.get('totalRectangles', 0),
                'successful_rectangles': node_message.get('successfulRectangles', 0)
            }

            info(f"转换OCR结果格式: {len(converted_results)} 个矩形结果")
            return frontend_result

        except Exception as e:
            error(f"转换OCR结果格式失败: {e}")
            return {
                'success': False,
                'error': f'结果格式转换失败: {str(e)}',
                'results': []
            }

    def cleanup_expired_requests(self):
        """清理过期的请求"""
        current_time = time.time()
        expired_requests = []

        with self.result_lock:
            for request_id, request_info in self.pending_requests.items():
                if current_time - request_info['timestamp'] > self.request_timeout:
                    expired_requests.append(request_id)

            for request_id in expired_requests:
                del self.pending_requests[request_id]
                error(f"清理过期的OCR请求: {request_id}")
