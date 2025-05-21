#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
日志客户端模块 - 将日志发送到中央日志收集服务
这个模块负责收集Python服务的日志并发送到Node.js服务的日志收集API
"""

import os
import json
import socket
import logging
import traceback
from datetime import datetime
from typing import Dict, Any, Optional, Union

import requests
from requests.exceptions import RequestException

# 默认配置
DEFAULT_LOG_API_ENDPOINT = "http://localhost:3000/api/logs/collect"

class LogClient:
    """日志客户端类，用于发送日志到中央日志收集服务"""

    def __init__(self, api_endpoint: Optional[str] = None):
        """
        初始化日志客户端

        Args:
            api_endpoint: 日志收集API端点，如果为None则使用环境变量或默认值
        """
        self.api_endpoint = api_endpoint or os.environ.get('LOG_API_ENDPOINT', DEFAULT_LOG_API_ENDPOINT)
        self.hostname = socket.gethostname()

        # 配置Python日志系统
        self.logger = logging.getLogger('python-service')

        # 添加自定义处理器
        handler = LogApiHandler(self)
        self.logger.addHandler(handler)

    def send_log(self, level: str, message: str, metadata: Optional[Dict[str, Any]] = None,
                **kwargs) -> bool:
        """
        发送日志到日志收集API

        Args:
            level: 日志级别 (info, warn, error, debug)
            message: 日志消息
            metadata: 额外的元数据
            **kwargs: 其他字段

        Returns:
            是否发送成功
        """
        # 如果API端点为空，则不发送日志
        if not self.api_endpoint:
            return True

        try:
            log_data = {
                'service': 'python',
                'level': level,
                'message': message,
                'metadata': metadata or {},
                'timestamp': datetime.now().isoformat(),
                'hostname': self.hostname
            }

            # 添加其他可选字段
            for key, value in kwargs.items():
                if value is not None:
                    log_data[key] = value

            # 发送到API
            response = requests.post(self.api_endpoint, json=log_data, timeout=5)
            return response.status_code == 201
        except RequestException as e:
            print(f"发送日志时出错: {e}")
            return False
        except Exception as e:
            print(f"发送日志时发生未知错误: {e}")
            return False


class LogApiHandler(logging.Handler):
    """自定义日志处理器，将日志发送到API"""

    def __init__(self, log_client: LogClient):
        """
        初始化处理器

        Args:
            log_client: 日志客户端实例
        """
        super().__init__()
        self.log_client = log_client

    def emit(self, record: logging.LogRecord) -> None:
        """
        发送日志记录

        Args:
            record: 日志记录
        """
        # 如果API端点为空，则不发送日志
        if not self.log_client.api_endpoint:
            return

        try:
            level = record.levelname.lower()
            message = self.format(record)
            metadata = {
                'filename': record.filename,
                'lineno': record.lineno,
                'funcName': record.funcName,
                'module': record.module,
                'pathname': record.pathname
            }

            # 如果有异常信息，添加到元数据
            if record.exc_info:
                metadata['exception'] = {
                    'type': record.exc_info[0].__name__,
                    'message': str(record.exc_info[1]),
                    'traceback': traceback.format_exception(*record.exc_info)
                }

            self.log_client.send_log(level, message, metadata)
        except Exception as e:
            # 避免无限递归
            print(f"发送日志记录时出错: {e}")


# 创建全局日志客户端实例
log_client = LogClient()

# 导出日志级别函数，方便使用
def info(message: str, metadata: Optional[Dict[str, Any]] = None, **kwargs) -> bool:
    """发送INFO级别日志"""
    return log_client.send_log('info', message, metadata, **kwargs)

def warn(message: str, metadata: Optional[Dict[str, Any]] = None, **kwargs) -> bool:
    """发送WARN级别日志"""
    return log_client.send_log('warn', message, metadata, **kwargs)

def error(message: str, metadata: Optional[Dict[str, Any]] = None, **kwargs) -> bool:
    """发送ERROR级别日志"""
    return log_client.send_log('error', message, metadata, **kwargs)

def debug(message: str, metadata: Optional[Dict[str, Any]] = None, **kwargs) -> bool:
    """发送DEBUG级别日志"""
    return log_client.send_log('debug', message, metadata, **kwargs)
