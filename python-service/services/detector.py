#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
图像检测模块 - 使用YOLO模型检测文档中的区域
这个模块负责加载和使用YOLO模型来检测文档中的各种元素
"""

import os
import sys
import json
import logging
import torch
import numpy as np
from PIL import Image
from pathlib import Path
import time

# 导入日志客户端
from utils.log_client import info, error

# 配置日志
logger = logging.getLogger(__name__)

# 确保能够导入DocLayout-YOLO模块
sys.path.append(os.path.abspath('./DocLayout-YOLO'))
from doclayout_yolo import YOLOv10
from huggingface_hub import hf_hub_download

# 自定义JSON编码器处理NumPy数据类型
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NumpyEncoder, self).default(obj)

# 全局变量，用于存储预加载的模型和设备
_global_model = None
_global_device = None

# 预加载模型函数
def preload_model():
    """预加载YOLO模型，只在模块导入时执行一次"""
    global _global_model, _global_device

    if _global_model is not None:
        return _global_model, _global_device

    start_time = time.time()
    logger.info("正在预加载DocLayout-YOLO模型...")
    info("正在预加载DocLayout-YOLO模型...")

    # 确定设备
    _global_device = 'cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu'
    logger.info(f"使用设备: {_global_device}")
    info(f"使用设备: {_global_device}")

    try:
        # 下载预训练模型
        model_path = hf_hub_download(
            repo_id="juliozhao/DocLayout-YOLO-DocStructBench",
            filename="doclayout_yolo_docstructbench_imgsz1024.pt"
        )
        logger.info(f"模型已下载到: {model_path}")
        info(f"模型已下载到: {model_path}")

        # 加载模型
        _global_model = YOLOv10(model_path)

        elapsed_time = time.time() - start_time
        logger.info(f"模型预加载完成，耗时: {elapsed_time:.2f}秒")
        info(f"DocLayout-YOLO模型预加载完成，耗时: {elapsed_time:.2f}秒")

        return _global_model, _global_device
    except Exception as e:
        logger.error(f"预加载模型时出错: {e}")
        error(f"预加载DocLayout-YOLO模型时出错: {e}")
        raise

# 在模块导入时预加载模型
try:
    preload_model()
except Exception as e:
    logger.error(f"模块导入时预加载模型失败: {e}")
    error(f"模块导入时预加载模型失败: {e}")

class DocumentDetector:
    """文档区域检测器类"""

    def __init__(self):
        """初始化检测器，使用预加载的YOLO模型"""
        global _global_model, _global_device

        # 如果模型尚未加载，尝试加载
        if _global_model is None:
            _global_model, _global_device = preload_model()

        self.model = _global_model
        self.device = _global_device

    def detect(self, image_path, imgsz=1024, conf=0.2):
        """
        检测图像中的文档区域

        Args:
            image_path: 图像路径
            imgsz: 图像大小
            conf: 置信度阈值

        Returns:
            检测结果字典
        """
        logger.info(f"开始检测图片: {image_path}")
        info(f"开始检测图片: {image_path}", metadata={'imgsz': imgsz, 'conf': conf})

        try:
            # 进行预测
            results = self.model.predict(
                image_path,
                imgsz=imgsz,
                conf=conf,
                device=self.device,
            )

            # 获取第一个结果
            result = results[0]

            # 获取图像尺寸
            image = Image.open(image_path)
            image_width, image_height = image.size

            # 处理检测结果
            formatted_results = []
            for i, box in enumerate(result.boxes):
                class_id = int(box.cls.item())
                class_name = result.names[class_id]
                confidence = float(box.conf.item())
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

                # 确保坐标在图像范围内
                x1 = max(0, x1)
                y1 = max(0, y1)
                x2 = min(image_width, x2)
                y2 = min(image_height, y2)

                formatted_results.append({
                    "id": i,
                    "class": class_name,
                    "class_id": class_id,
                    "confidence": confidence,
                    "bbox": {
                        "x_min": x1,
                        "y_min": y1,
                        "x_max": x2,
                        "y_max": y2
                    }
                })

            # 保存检测结果图像
            annotated_frame = result.plot(pil=True, line_width=5, font_size=20)
            annotated_frame = Image.fromarray(annotated_frame)

            info(f"检测完成，找到 {len(formatted_results)} 个对象",
                 metadata={'image_path': str(image_path), 'objects_count': len(formatted_results)})

            return {
                "success": True,
                "width": image_width,
                "height": image_height,
                "detected_objects": formatted_results,
                "annotated_frame": annotated_frame
            }

        except Exception as e:
            logger.error(f"检测图片时发生错误: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            error(f"检测图片时发生错误: {str(e)}",
                  metadata={'image_path': str(image_path), 'traceback': traceback.format_exc()})
            return {
                "success": False,
                "error": str(e)
            }

# 单例模式，全局检测器实例
detector = None

def get_detector():
    """获取检测器实例（单例模式）"""
    global detector
    if detector is None:
        detector = DocumentDetector()
    return detector

# 测试代码
if __name__ == "__main__":
    # 设置日志
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # 测试检测
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        detector = get_detector()
        result = detector.detect(image_path)

        if result["success"]:
            print(f"检测到 {len(result['detected_objects'])} 个对象")
            for obj in result["detected_objects"]:
                print(f"类别: {obj['class']}, 置信度: {obj['confidence']:.2f}")
        else:
            print(f"检测失败: {result['error']}")
    else:
        print("用法: python detector.py <图片路径>")
