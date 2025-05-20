#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
OCR服务模块 - 使用Tesseract进行文本识别
这个模块负责处理图像OCR识别功能，从切割后的图像中提取文本
"""

import os
import sys
import json
import logging
import traceback
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Union

# 图像处理
import cv2
import numpy as np
from PIL import Image

# OCR引擎
import pytesseract

# 导入裁剪模块
from services.cropper import get_cropper
from utils.log_client import info, error

# 日志配置
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('ocr_service')

# 配置Tesseract路径（如果不在系统PATH中）
# pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'  # Linux/Mac
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'  # Windows

# 配置
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
RESULTS_FOLDER = os.path.join(BASE_DIR, 'results')
CROPS_FOLDER = os.path.join(BASE_DIR, 'crops')
DOWNLOADS_FOLDER = os.path.join(BASE_DIR, 'downloads')
TEMP_FOLDER = os.path.join(BASE_DIR, 'temp')


def ensure_dirs() -> None:
    """确保所需目录存在"""
    Path(TEMP_FOLDER).mkdir(parents=True, exist_ok=True)
    Path(RESULTS_FOLDER).mkdir(parents=True, exist_ok=True)
    Path(CROPS_FOLDER).mkdir(parents=True, exist_ok=True)
    Path(DOWNLOADS_FOLDER).mkdir(parents=True, exist_ok=True)


class OCRService:
    """OCR服务类，处理文本识别任务"""

    def __init__(self, lang: str = 'chi_sim+eng'):
        """
        初始化OCR服务

        Args:
            lang: Tesseract语言配置，默认为简体中文+英文
        """
        self.lang = lang
        ensure_dirs()

        # 验证Tesseract安装
        try:
            pytesseract.get_tesseract_version()
            logger.info(f"Tesseract已安装，版本: {pytesseract.get_tesseract_version()}")
            info(f"Tesseract已安装，版本: {pytesseract.get_tesseract_version()}")
        except Exception as e:
            logger.error(f"Tesseract安装验证失败: {e}")
            error(f"Tesseract安装验证失败: {e}")
            raise RuntimeError("Tesseract未安装或配置错误，请检查安装并设置正确的路径")

    def recognize_text(self, image_path: Union[str, Path],
                       config: str = '--psm 3') -> str:
        """
        识别图片中的文本

        Args:
            image_path: 图片路径
            config: Tesseract配置参数
                     --psm 3: 自动页面分割，但不进行OSD (默认)
                     --psm 6: 假设为单个文本块
                     --psm 11: 稀疏文本，找到尽可能多的文本

        Returns:
            识别到的文本
        """
        try:
            # 读取图像
            image = Image.open(image_path)

            # 图像预处理 (可根据需要扩展)
            # 1. 转为灰度图
            if image.mode != 'L':
                image = image.convert('L')

            # 2. 可选的处理步骤 (取消注释以启用)
            # 使用OpenCV进行更高级的预处理
            img_array = np.array(image)
            # 二值化
            # _, img_array = cv2.threshold(img_array, 150, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            # 降噪
            # img_array = cv2.fastNlMeansDenoising(img_array, None, 10, 7, 21)

            # 基于图像内容选择合适的PSM模式
            # 这里可以根据图像的宽高比等特征动态调整PSM模式

            # 执行OCR
            text = pytesseract.image_to_string(img_array, lang=self.lang, config=config)

            # 后处理文本
            text = text.strip()

            return text

        except Exception as e:
            logger.error(f"OCR处理失败: {e}")
            logger.error(traceback.format_exc())
            error(f"OCR处理失败: {e}", metadata={'image_path': str(image_path)})
            return ""

    def process_crop(self, image_id: str, crop_path: Union[str, Path],
                    rectangle_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        处理单个裁剪的图片

        Args:
            image_id: 原图ID
            crop_path: 裁剪图片路径
            rectangle_info: 矩形信息

        Returns:
            OCR结果
        """
        rect_id = rectangle_info.get('id')
        rect_class = rectangle_info.get('class', 'unknown')

        result = {
            'id': rect_id,
            'text': None
        }

        # 如果是图片类型，跳过OCR
        if rect_class.lower() == 'figure':
            logger.info(f"跳过图片类型矩形 {rect_id}")
            info(f"跳过图片类型矩形 {rect_id}", metadata={'image_id': image_id, 'rect_id': rect_id})
            return result

        # 执行OCR
        text = self.recognize_text(crop_path)
        result['text'] = text

        logger.info(f"矩形 {rect_id} OCR完成，文本长度: {len(text)}")
        info(f"矩形 {rect_id} OCR完成，文本长度: {len(text)}",
             metadata={'image_id': image_id, 'rect_id': rect_id, 'text_length': len(text)})
        return result

    def batch_process(self, image_id: str, crops_dir: Union[str, Path],
                     rectangles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        批量处理裁剪后的图片

        Args:
            image_id: 原图ID
            crops_dir: 裁剪图片目录
            rectangles: 矩形列表

        Returns:
            OCR结果列表
        """
        crops_dir = Path(crops_dir)
        results = []

        for rect in rectangles:
            rect_id = rect.get('id')

            # 查找对应的裁剪图片
            crop_path = crops_dir / f"{rect_id}.jpg"
            if not crop_path.exists():
                crop_path = crops_dir / f"{rect_id}.png"

            if not crop_path.exists():
                logger.warning(f"找不到矩形 {rect_id} 的裁剪图片")
                error(f"找不到矩形 {rect_id} 的裁剪图片",
                      metadata={'image_id': image_id, 'rect_id': rect_id})
                results.append({
                    'id': rect_id,
                    'text': None
                })
                continue

            # 处理单个裁剪图片
            result = self.process_crop(image_id, crop_path, rect)
            results.append(result)

        return results


def process_ocr_request(image_id: str, rectangles: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    处理OCR请求的入口函数

    Args:
        image_id: 图片ID
        rectangles: 矩形信息列表

    Returns:
        处理结果
    """
    try:
        logger.info(f"开始处理图片 {image_id} 的OCR请求，共 {len(rectangles)} 个矩形")
        info(f"开始处理图片 {image_id} 的OCR请求，共 {len(rectangles)} 个矩形",
             metadata={'rectangles_count': len(rectangles)})

        # 初始化OCR服务
        ocr = OCRService()

        # 获取裁剪图片目录
        crops_dir = Path(CROPS_FOLDER) / image_id

        # 如果裁剪目录不存在，自动执行裁剪操作
        if not crops_dir.exists():
            logger.info(f"裁剪图片目录不存在，自动执行裁剪操作")
            info(f"裁剪图片目录不存在，自动执行裁剪操作", metadata={'image_id': image_id})

            # 获取裁剪器实例
            cropper = get_cropper(UPLOAD_FOLDER, RESULTS_FOLDER, CROPS_FOLDER, DOWNLOADS_FOLDER, TEMP_FOLDER)

            # 执行裁剪
            crop_result = cropper.crop_image(image_id, rectangles)

            if not crop_result['success']:
                error(f"自动裁剪失败: {crop_result['error']}", metadata={'image_id': image_id})
                return {
                    'success': False,
                    'error': f'自动裁剪失败: {crop_result["error"]}'
                }

            logger.info(f"自动裁剪成功，继续OCR处理")
            info(f"自动裁剪成功，继续OCR处理", metadata={'image_id': image_id})

            # 再次检查裁剪目录是否存在
            if not crops_dir.exists():
                error(f"自动裁剪后仍找不到裁剪图片目录", metadata={'image_id': image_id})
                return {
                    'success': False,
                    'error': '自动裁剪后仍找不到裁剪图片目录'
                }

        # 批量处理
        results = ocr.batch_process(image_id, crops_dir, rectangles)

        info(f"OCR处理完成，image_id: {image_id}, 结果数量: {len(results)}",
             metadata={'results_count': len(results)})

        return {
            'success': True,
            'results': results
        }

    except Exception as e:
        logger.error(f"OCR处理失败: {e}")
        logger.error(traceback.format_exc())
        error(f"OCR处理失败: {e}", metadata={'image_id': image_id})
        return {
            'success': False,
            'error': str(e)
        }


# 测试代码
if __name__ == "__main__":
    # 简单的命令行测试
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        ocr = OCRService()
        result = ocr.recognize_text(image_path)
        print(f"OCR结果:\n{result}")
    else:
        print("用法: python ocr_service.py <图片路径>")
