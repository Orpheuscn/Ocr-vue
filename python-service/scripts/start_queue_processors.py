#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
启动Python队列处理器脚本
启动Python文档检测和OCR队列处理器
"""

import os
import sys
import signal
import asyncio
import logging
import traceback
from pathlib import Path

# 确保能够导入自定义模块
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.python_queue_processor import get_python_queue_processor
from services.notification_processor import get_notification_processor
from utils.logger import get_logger
from utils.log_client import info, error

logger = get_logger(__name__)

class QueueProcessorManager:
    """队列处理器管理器"""
    
    def __init__(self):
        self.python_processor = None
        self.notification_processor = None
        self.is_running = False
        self.shutdown_event = asyncio.Event()
    
    async def start(self):
        """启动所有队列处理器"""
        try:
            logger.info("开始启动Python队列处理器...")
            info("开始启动Python队列处理器...")
            
            # 启动Python队列处理器
            self.python_processor = get_python_queue_processor()
            await self.python_processor.start()
            logger.info("Python队列处理器已启动")
            info("Python队列处理器已启动")
            
            # 启动通知处理器
            self.notification_processor = get_notification_processor()
            await self.notification_processor.start()
            logger.info("通知处理器已启动")
            info("通知处理器已启动")
            
            self.is_running = True
            logger.info("所有Python队列处理器已成功启动")
            info("所有Python队列处理器已成功启动")
            
            # 设置信号处理器
            signal.signal(signal.SIGINT, self._signal_handler)
            signal.signal(signal.SIGTERM, self._signal_handler)
            
            # 等待关闭信号
            await self.shutdown_event.wait()
            
        except Exception as e:
            logger.error(f"启动Python队列处理器失败: {e}")
            logger.error(traceback.format_exc())
            error(f"启动Python队列处理器失败: {e}")
            raise
    
    async def stop(self):
        """停止所有队列处理器"""
        try:
            logger.info("正在关闭Python队列处理器...")
            info("正在关闭Python队列处理器...")
            
            self.is_running = False
            
            # 关闭Python队列处理器
            if self.python_processor:
                await self.python_processor.stop()
                logger.info("Python队列处理器已关闭")
                info("Python队列处理器已关闭")
            
            # 关闭通知处理器
            if self.notification_processor:
                await self.notification_processor.stop()
                logger.info("通知处理器已关闭")
                info("通知处理器已关闭")
            
            logger.info("所有Python队列处理器已关闭")
            info("所有Python队列处理器已关闭")
            
        except Exception as e:
            logger.error(f"关闭Python队列处理器时出错: {e}")
            error(f"关闭Python队列处理器时出错: {e}")
    
    def _signal_handler(self, signum, frame):
        """信号处理器"""
        logger.info(f"收到信号 {signum}，正在关闭队列处理器...")
        info(f"收到信号 {signum}，正在关闭队列处理器...")
        self.shutdown_event.set()
    
    def get_status(self):
        """获取处理器状态"""
        try:
            status = {
                'is_running': self.is_running,
                'processors': {}
            }
            
            if self.python_processor:
                status['processors']['python'] = self.python_processor.get_status()
            
            if self.notification_processor:
                status['processors']['notification'] = self.notification_processor.get_status()
            
            return status
            
        except Exception as e:
            logger.error(f"获取处理器状态失败: {e}")
            return {
                'error': str(e),
                'is_running': self.is_running
            }

async def main():
    """主函数"""
    manager = QueueProcessorManager()
    
    try:
        # 启动队列处理器
        await manager.start()
        
    except KeyboardInterrupt:
        logger.info("收到键盘中断信号")
        info("收到键盘中断信号")
        
    except Exception as e:
        logger.error(f"运行队列处理器时出错: {e}")
        logger.error(traceback.format_exc())
        error(f"运行队列处理器时出错: {e}")
        
    finally:
        # 确保清理资源
        await manager.stop()

def run_processors():
    """运行队列处理器"""
    try:
        # 配置日志
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        logger.info("启动Python队列处理器管理器")
        info("启动Python队列处理器管理器")
        
        # 运行异步主函数
        asyncio.run(main())
        
    except Exception as e:
        logger.error(f"运行队列处理器管理器失败: {e}")
        logger.error(traceback.format_exc())
        error(f"运行队列处理器管理器失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_processors()
