#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
队列工作进程 - 启动OCR队列处理器
"""

import os
import sys
import signal
import logging
import time
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from services.ocr_queue_processor import ocr_queue_processor
from utils.log_client import info, error

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/queue_worker.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class QueueWorker:
    """队列工作进程"""
    
    def __init__(self):
        """初始化队列工作进程"""
        self.is_running = False
        self.shutdown_requested = False
        
        # 注册信号处理器
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """信号处理器"""
        info(f"收到信号 {signum}，准备关闭队列工作进程...")
        self.shutdown_requested = True
        self.stop()
    
    def start(self):
        """启动队列工作进程"""
        try:
            info("启动队列工作进程...")
            self.is_running = True
            
            # 启动OCR队列处理器
            success = ocr_queue_processor.start()
            
            if not success:
                error("OCR队列处理器启动失败")
                return False
            
            info("队列工作进程启动成功")
            
            # 保持进程运行
            while self.is_running and not self.shutdown_requested:
                time.sleep(1)
                
                # 检查处理器状态
                status = ocr_queue_processor.get_status()
                if not status['isRunning']:
                    error("OCR队列处理器意外停止")
                    break
            
            return True
            
        except Exception as e:
            error(f"启动队列工作进程失败: {str(e)}")
            return False
        finally:
            self.stop()
    
    def stop(self):
        """停止队列工作进程"""
        try:
            info("停止队列工作进程...")
            self.is_running = False
            
            # 停止OCR队列处理器
            ocr_queue_processor.stop()
            
            info("队列工作进程已停止")
            
        except Exception as e:
            error(f"停止队列工作进程时出错: {str(e)}")
    
    def get_status(self):
        """获取工作进程状态"""
        processor_status = ocr_queue_processor.get_status()
        
        return {
            'worker': {
                'isRunning': self.is_running,
                'shutdownRequested': self.shutdown_requested,
                'pid': os.getpid()
            },
            'processor': processor_status
        }

def main():
    """主函数"""
    info("队列工作进程启动中...")
    
    # 创建日志目录
    log_dir = Path('logs')
    log_dir.mkdir(exist_ok=True)
    
    # 创建队列工作进程
    worker = QueueWorker()
    
    try:
        # 启动工作进程
        success = worker.start()
        
        if success:
            info("队列工作进程正常退出")
            sys.exit(0)
        else:
            error("队列工作进程启动失败")
            sys.exit(1)
            
    except KeyboardInterrupt:
        info("收到键盘中断，正在关闭...")
        worker.stop()
        sys.exit(0)
    except Exception as e:
        error(f"队列工作进程异常: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
