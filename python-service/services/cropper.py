#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
图像裁剪模块 - 根据检测结果裁剪图像
这个模块负责根据检测到的矩形区域裁剪图像，并保存裁剪结果
"""

import os
import sys
import uuid
import json
import logging
import cv2
import numpy as np
from PIL import Image
import zipfile
from pathlib import Path
import traceback

# 导入日志客户端
from utils.log_client import info, error

# 配置日志
logger = logging.getLogger(__name__)

class ImageCropper:
    """图像裁剪器类"""
    
    def __init__(self, upload_folder='uploads', results_folder='uploads/results'):
        """
        初始化裁剪器
        
        Args:
            upload_folder: 上传文件夹路径
            results_folder: 结果文件夹路径
        """
        self.upload_folder = upload_folder
        self.results_folder = results_folder
        
        # 确保目录存在
        os.makedirs(self.upload_folder, exist_ok=True)
        os.makedirs(self.results_folder, exist_ok=True)
    
    def find_original_image(self, image_id):
        """
        根据图像ID查找原始图像
        
        Args:
            image_id: 图像ID
            
        Returns:
            原始图像路径，如果找不到则返回None
        """
        for filename in os.listdir(self.upload_folder):
            if filename.startswith(image_id + '_') and not filename.endswith('_detect.jpg'):
                return os.path.join(self.upload_folder, filename)
        return None
    
    def crop_image(self, image_id, rectangles):
        """
        根据矩形信息裁剪图像
        
        Args:
            image_id: 图像ID
            rectangles: 矩形信息列表
            
        Returns:
            裁剪结果字典
        """
        logger.info(f"开始裁剪图片 {image_id}，共 {len(rectangles)} 个矩形")
        info(f"开始裁剪图片 {image_id}，共 {len(rectangles)} 个矩形", 
             metadata={'rectangles_count': len(rectangles)})
        
        try:
            # 查找原始图片
            image_path = self.find_original_image(image_id)
            if not image_path:
                error(f"找不到原始图片，image_id: {image_id}")
                return {
                    'success': False,
                    'error': '找不到原始图片'
                }
            
            # 准备裁剪目录
            crop_id = str(uuid.uuid4())
            crop_dir = os.path.join(self.results_folder, f"crop_{crop_id}")
            os.makedirs(crop_dir, exist_ok=True)
            
            # 为OCR服务准备特殊目录
            # 注意：这里的路径必须与OCR服务中的OUTPUT_DIR / image_id / 'crops'一致
            ocr_crops_dir = os.path.join(self.upload_folder, image_id, 'crops')
            os.makedirs(ocr_crops_dir, exist_ok=True)
            logger.info(f"创建OCR专用目录: {ocr_crops_dir}")
            info(f"创建OCR专用目录: {ocr_crops_dir}")
            
            # 转换前端坐标格式为后端格式
            detected_objects = []
            for i, rect in enumerate(rectangles):
                coords = rect.get('coords', {})
                top_left = coords.get('topLeft', {})
                bottom_right = coords.get('bottomRight', {})
                
                # 提取坐标
                x_min = top_left.get('x', 0)
                y_min = top_left.get('y', 0)
                x_max = bottom_right.get('x', 0)
                y_max = bottom_right.get('y', 0)
                
                detected_objects.append({
                    "id": rect.get('id', i),
                    "class": rect.get('class', 'unknown'),
                    "class_id": 0,  # 默认类别ID
                    "confidence": rect.get('confidence', 1.0),
                    "bbox": {
                        "x_min": x_min,
                        "y_min": y_min,
                        "x_max": x_max,
                        "y_max": y_max
                    }
                })
            
            # 获取图像尺寸
            image = Image.open(image_path)
            width, height = image.size
            
            # 执行切割
            image_cv = cv2.imread(image_path)
            if image_cv is None:
                error(f"无法读取图像: {image_path}")
                return {
                    'success': False,
                    'error': f'无法读取图像: {image_path}'
                }
            
            # 在原图上绘制所有边界框
            image_with_boxes = image_cv.copy()
            
            # 为每个类别创建子目录
            class_dirs = {}
            
            # 切割并保存每个元素
            elements_count = 0
            cropped_images = []
            
            for element in detected_objects:
                class_name = element['class']
                confidence = element['confidence']
                bbox = element['bbox']
                element_id = element['id']
                
                x_min = bbox['x_min']
                y_min = bbox['y_min']
                x_max = bbox['x_max']
                y_max = bbox['y_max']
                
                # 确保坐标在图像范围内
                x_min = max(0, x_min)
                y_min = max(0, y_min)
                x_max = min(width, x_max)
                y_max = min(height, y_max)
                
                # 在原图上绘制边界框
                color = (0, 255, 0)  # 绿色边界框
                cv2.rectangle(image_with_boxes, (x_min, y_min), (x_max, y_max), color, 2)
                cv2.putText(image_with_boxes, f"{class_name} {confidence:.2f}", 
                           (x_min, y_min - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                
                # 确保类别目录存在
                if class_name not in class_dirs:
                    class_dir = os.path.join(crop_dir, class_name.replace(" ", "_"))
                    os.makedirs(class_dir, exist_ok=True)
                    class_dirs[class_name] = class_dir
                
                # 裁剪元素
                cropped_element = image_cv[y_min:y_max, x_min:x_max]
                
                # 保存裁剪的元素到展示目录
                output_filename = f"{os.path.splitext(os.path.basename(image_path))[0]}_{class_name.replace(' ', '_')}_{element_id}.jpg"
                output_path = os.path.join(class_dirs[class_name], output_filename)
                
                cv2.imwrite(output_path, cropped_element)
                
                # 同时保存到OCR专用目录
                ocr_output_path = os.path.join(ocr_crops_dir, f"{element_id}.jpg")
                cv2.imwrite(ocr_output_path, cropped_element)
                
                elements_count += 1
                
                # 记录裁剪图像信息
                cropped_images.append({
                    'id': element_id,
                    'class': class_name,
                    'filename': output_filename,
                    'path': output_path.replace('\\', '/'),  # 确保路径格式一致
                    'relative_path': os.path.join(os.path.basename(crop_dir), class_name.replace(" ", "_"), output_filename).replace('\\', '/')
                })
            
            # 保存带有边界框的图像
            output_annotated = os.path.join(crop_dir, f"{os.path.splitext(os.path.basename(image_path))[0]}_annotated.jpg")
            cv2.imwrite(output_annotated, image_with_boxes)
            
            # 创建ZIP文件
            zip_filename = f"crop_{crop_id}.zip"
            zip_filepath = os.path.join(self.results_folder, zip_filename)
            
            with zipfile.ZipFile(zip_filepath, 'w') as zipf:
                for root, dirs, files in os.walk(crop_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, self.results_folder)
                        zipf.write(file_path, arcname)
            
            info(f"裁剪成功，image_id: {image_id}, 共裁剪 {elements_count} 个元素", 
                 metadata={'elements_count': elements_count, 'crop_id': crop_id})
            
            return {
                'success': True,
                'message': f'成功切割 {elements_count} 个元素',
                'crop_id': crop_id,
                'annotated_image_url': f'/results/crop_{crop_id}/{os.path.basename(output_annotated)}',
                'cropped_images': cropped_images,
                'zip_url': f'/api/python/results/{zip_filename}',
                'ocr_crops_dir': ocr_crops_dir
            }
        
        except Exception as e:
            logger.error(f"裁剪图片时发生错误: {str(e)}")
            logger.error(traceback.format_exc())
            error(f"裁剪图片时发生错误: {str(e)}", 
                  metadata={'image_id': image_id, 'traceback': traceback.format_exc()})
            return {
                'success': False,
                'error': f'裁剪图片时发生错误: {str(e)}'
            }

# 单例模式，全局裁剪器实例
cropper = None

def get_cropper(upload_folder='uploads', results_folder='uploads/results'):
    """获取裁剪器实例（单例模式）"""
    global cropper
    if cropper is None:
        cropper = ImageCropper(upload_folder, results_folder)
    return cropper

# 测试代码
if __name__ == "__main__":
    # 设置日志
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # 测试裁剪
    if len(sys.argv) > 2:
        image_id = sys.argv[1]
        json_path = sys.argv[2]
        
        # 读取JSON文件中的矩形信息
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        rectangles = data.get('rectangles', [])
        
        cropper = get_cropper()
        result = cropper.crop_image(image_id, rectangles)
        
        if result["success"]:
            print(f"裁剪成功: {result['message']}")
        else:
            print(f"裁剪失败: {result['error']}")
    else:
        print("用法: python cropper.py <图片ID> <矩形JSON文件路径>")
