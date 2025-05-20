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
import shutil
from pathlib import Path
import traceback

# 导入日志客户端
from utils.log_client import info, error, warn
from utils.file_hash import get_file_hash_manager

# 配置日志
logger = logging.getLogger(__name__)

class ImageCropper:
    """图像裁剪器类"""

    def __init__(self, upload_folder='uploads', results_folder='results',
                crops_folder='crops', downloads_folder='downloads', temp_folder='temp'):
        """
        初始化裁剪器

        Args:
            upload_folder: 上传文件夹路径
            results_folder: 结果文件夹路径
            crops_folder: 裁剪图片文件夹路径
            downloads_folder: 下载文件夹路径
            temp_folder: 临时文件夹路径
        """
        self.upload_folder = upload_folder
        self.results_folder = results_folder
        self.crops_folder = crops_folder
        self.downloads_folder = downloads_folder
        self.temp_folder = temp_folder

        # 确保目录存在
        os.makedirs(self.upload_folder, exist_ok=True)
        os.makedirs(self.results_folder, exist_ok=True)
        os.makedirs(self.crops_folder, exist_ok=True)
        os.makedirs(self.downloads_folder, exist_ok=True)
        os.makedirs(self.temp_folder, exist_ok=True)

        # 获取文件哈希管理器
        self.file_hash_manager = get_file_hash_manager()

    def find_original_image(self, image_id):
        """
        根据图像ID查找原始图像

        Args:
            image_id: 图像ID

        Returns:
            原始图像路径，如果找不到则返回None
        """
        # 首先在上传文件夹中查找
        for filename in os.listdir(self.upload_folder):
            if filename.startswith(image_id + '_') and not filename.endswith('_detect.jpg'):
                return os.path.join(self.upload_folder, filename)

        # 如果在上传文件夹中找不到，尝试在其他文件夹中查找
        for folder in [self.results_folder, self.crops_folder, self.downloads_folder]:
            if os.path.exists(folder):
                for filename in os.listdir(folder):
                    if filename.startswith(image_id + '_') and not filename.endswith('_detect.jpg'):
                        return os.path.join(folder, filename)

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
            crop_dir = os.path.join(self.temp_folder, f"temp_crop_{crop_id}")
            os.makedirs(crop_dir, exist_ok=True)

            # 为OCR服务准备特殊目录
            # 注意：这里的路径必须与OCR服务中的OUTPUT_DIR / image_id / 'crops'一致
            ocr_crops_dir = os.path.join(self.crops_folder, image_id)
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

                # 保存裁剪的元素到临时目录
                temp_output_filename = f"{os.path.splitext(os.path.basename(image_path))[0]}_{class_name.replace(' ', '_')}_{element_id}.jpg"
                temp_output_path = os.path.join(class_dirs[class_name], temp_output_filename)

                # 保存到临时文件
                cv2.imwrite(temp_output_path, cropped_element)

                # 检查是否已存在相同内容的裁剪图片
                exists, crop_hash = self.file_hash_manager.check_file_exists(temp_output_path)

                if exists:
                    # 如果存在相同内容的裁剪图片，使用已存在的文件
                    existing_crop_file = self.file_hash_manager.get_file_by_hash(crop_hash)
                    info(f"发现重复的裁剪图片，使用已存在的文件: {existing_crop_file}")

                    # 删除临时文件
                    os.remove(temp_output_path)

                    # 使用已存在的文件路径
                    output_path = existing_crop_file
                    output_filename = os.path.basename(output_path)
                else:
                    # 如果是新文件，移动到裁剪文件夹并添加到哈希数据库
                    final_class_dir = os.path.join(self.crops_folder, class_name.replace(" ", "_"))
                    os.makedirs(final_class_dir, exist_ok=True)

                    output_filename = f"{image_id}_{class_name.replace(' ', '_')}_{element_id}.jpg"
                    output_path = os.path.join(final_class_dir, output_filename)

                    # 移动文件
                    shutil.copy2(temp_output_path, output_path)

                    # 添加到哈希数据库
                    self.file_hash_manager.add_file(output_path, "crop")

                # 同时保存到OCR专用目录（使用硬链接或复制）
                ocr_output_path = os.path.join(ocr_crops_dir, f"{element_id}.jpg")
                self.file_hash_manager.create_file_reference(output_path, ocr_output_path, "crop")

                elements_count += 1

                # 记录裁剪图像信息
                cropped_images.append({
                    'id': element_id,
                    'class': class_name,
                    'filename': output_filename,
                    'path': output_path.replace('\\', '/'),  # 确保路径格式一致
                    'relative_path': os.path.join(class_name.replace(" ", "_"), output_filename).replace('\\', '/')
                })

            # 保存带有边界框的图像到临时文件
            temp_annotated = os.path.join(crop_dir, f"{os.path.splitext(os.path.basename(image_path))[0]}_annotated.jpg")
            cv2.imwrite(temp_annotated, image_with_boxes)

            # 检查是否已存在相同内容的标注图片
            exists, annotated_hash = self.file_hash_manager.check_file_exists(temp_annotated)

            if exists:
                # 如果存在相同内容的标注图片，获取已存在的文件
                existing_annotated_file = self.file_hash_manager.get_file_by_hash(annotated_hash)
                info(f"发现重复的标注图片，使用已存在的文件: {existing_annotated_file}")

                # 无论现有文件在哪里，都确保在results文件夹中有一份
                output_annotated = os.path.join(self.results_folder, f"{image_id}_annotated.jpg")

                # 如果results文件夹中已经有这个文件，直接使用
                if os.path.exists(output_annotated):
                    info(f"标注图片已存在于results文件夹: {output_annotated}")
                else:
                    # 否则，复制到results文件夹
                    info(f"复制标注图片到results文件夹: {output_annotated}")

                    # 确保results文件夹存在
                    os.makedirs(self.results_folder, exist_ok=True)

                    # 复制文件
                    shutil.copy2(existing_annotated_file, output_annotated)

                    # 添加到哈希数据库
                    self.file_hash_manager.add_file(output_annotated, "annotated")
            else:
                # 如果是新文件，直接保存到results文件夹
                output_annotated = os.path.join(self.results_folder, f"{image_id}_annotated.jpg")
                info(f"保存新的标注图片到results文件夹: {output_annotated}")

                # 确保results文件夹存在
                os.makedirs(self.results_folder, exist_ok=True)

                # 复制文件
                shutil.copy2(temp_annotated, output_annotated)

                # 添加到哈希数据库
                self.file_hash_manager.add_file(output_annotated, "annotated")

            # 创建临时ZIP文件
            temp_zip_filename = f"temp_crop_{crop_id}.zip"
            temp_zip_filepath = os.path.join(self.temp_folder, temp_zip_filename)

            # 收集所有裁剪图片的路径
            crop_files = []
            for crop_image in cropped_images:
                crop_files.append(crop_image['path'])

            # 添加标注图片
            crop_files.append(output_annotated)

            # 创建ZIP文件
            with zipfile.ZipFile(temp_zip_filepath, 'w') as zipf:
                for file_path in crop_files:
                    # 使用相对路径作为ZIP中的路径
                    arcname = os.path.basename(file_path)
                    zipf.write(file_path, arcname)

            # 检查是否已存在相同内容的ZIP文件
            exists, zip_hash = self.file_hash_manager.check_file_exists(temp_zip_filepath)

            if exists:
                # 如果存在相同内容的ZIP文件，使用已存在的文件
                existing_zip_file = self.file_hash_manager.get_file_by_hash(zip_hash)
                info(f"发现重复的ZIP文件，使用已存在的文件: {existing_zip_file}")

                # 删除临时文件
                os.remove(temp_zip_filepath)

                # 使用已存在的文件路径
                zip_filepath = existing_zip_file
                zip_filename = os.path.basename(zip_filepath)
            else:
                # 如果是新文件，移动到下载文件夹并添加到哈希数据库
                zip_filename = f"crop_{image_id}_{crop_id}.zip"
                zip_filepath = os.path.join(self.downloads_folder, zip_filename)

                # 移动文件
                shutil.move(temp_zip_filepath, zip_filepath)

                # 添加到哈希数据库
                self.file_hash_manager.add_file(zip_filepath, "zip")

            info(f"裁剪成功，image_id: {image_id}, 共裁剪 {elements_count} 个元素",
                 metadata={'elements_count': elements_count, 'crop_id': crop_id})

            # 清理临时目录
            try:
                shutil.rmtree(crop_dir)
            except Exception as e:
                warn(f"清理临时目录失败: {e}")

            # 构建相对URL路径 - 确保与前端处理方式一致
            # 前端会在这些路径前添加 /api/python 前缀
            annotated_filename = os.path.basename(output_annotated)
            # 注意：前端会自动添加 /api/python 前缀，所以这里不需要添加
            annotated_url = f'/results/{annotated_filename}'
            zip_url = f'/downloads/{zip_filename}'

            # 添加调试日志
            info(f"标注图像URL: {annotated_url}")
            info(f"ZIP文件URL: {zip_url}")

            # 构建OCR服务可以访问的路径
            ocr_crops_path = os.path.join(self.crops_folder, image_id)

            return {
                'success': True,
                'message': f'成功切割 {elements_count} 个元素',
                'crop_id': crop_id,
                'annotated_image_url': annotated_url,
                'cropped_images': cropped_images,
                'zip_url': zip_url,
                'ocr_crops_dir': ocr_crops_path
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

# 检查并清理uploads/results目录（如果存在）
def check_and_clean_uploads_results(upload_folder='uploads'):
    """
    检查并清理uploads/results目录（如果存在）

    Args:
        upload_folder: 上传文件夹路径
    """
    # 构建uploads/results路径
    uploads_results_folder = os.path.join(upload_folder, 'results')

    # 如果目录不存在，直接返回
    if not os.path.exists(uploads_results_folder):
        return

    # 如果目录存在但为空，尝试删除它
    try:
        if os.path.isdir(uploads_results_folder) and len(os.listdir(uploads_results_folder)) == 0:
            os.rmdir(uploads_results_folder)
            info(f"已删除空的uploads/results目录")
        else:
            warn(f"uploads/results目录存在且不为空，请手动检查并清理")
    except Exception as e:
        warn(f"无法删除uploads/results目录: {e}")

# 单例模式，全局裁剪器实例
cropper = None

def get_cropper(upload_folder='uploads', results_folder='results',
               crops_folder='crops', downloads_folder='downloads', temp_folder='temp'):
    """获取裁剪器实例（单例模式）"""
    global cropper

    # 检查并清理uploads/results目录（如果存在）
    check_and_clean_uploads_results(upload_folder)

    if cropper is None:
        # 创建裁剪器实例
        cropper = ImageCropper(upload_folder, results_folder,
                              crops_folder, downloads_folder, temp_folder)
    else:
        # 更新现有实例的路径
        cropper.upload_folder = upload_folder
        cropper.results_folder = results_folder
        cropper.crops_folder = crops_folder
        cropper.downloads_folder = downloads_folder
        cropper.temp_folder = temp_folder

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
