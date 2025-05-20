#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
图片代理服务模块 - 提供图片访问和处理功能
这个模块负责处理图片请求，支持通过ID查找图片，并提供基本的图片处理功能
"""

import os
import io
import glob
from pathlib import Path
from typing import Optional, Dict, Any, Tuple, List, Union

from PIL import Image
from flask import send_file, abort, jsonify, current_app

from utils.log_client import info, error, warn

class ImageProxy:
    """图片代理服务类，处理图片请求和转换"""

    def __init__(self, upload_folder: str, results_folder: str):
        """
        初始化图片代理服务

        Args:
            upload_folder: 上传文件夹路径
            results_folder: 结果文件夹路径
        """
        self.upload_folder = upload_folder
        self.results_folder = results_folder
        info(f"初始化图片代理服务，上传文件夹: {upload_folder}, 结果文件夹: {results_folder}")

    def get_image_by_id(self, image_id: str) -> Tuple[Optional[str], Optional[str]]:
        """
        通过图片ID查找图片

        Args:
            image_id: 图片ID

        Returns:
            Tuple[Optional[str], Optional[str]]: (文件路径, MIME类型)，如果找不到则返回(None, None)
        """
        info(f"通过ID查找图片: {image_id}")

        # 确保上传文件夹存在
        if not os.path.exists(self.upload_folder):
            error(f"上传文件夹不存在: {self.upload_folder}")
            return None, None

        # 查找以image_id开头的文件
        pattern = os.path.join(self.upload_folder, f"{image_id}_*")
        matching_files = glob.glob(pattern)

        if not matching_files:
            warn(f"找不到ID为{image_id}的图片")
            return None, None

        # 使用第一个匹配的文件
        filepath = matching_files[0]
        info(f"找到匹配的图片: {filepath}")

        # 确定MIME类型
        mime_type = self._get_mime_type(filepath)

        return filepath, mime_type

    def get_image_response(self, image_id: str, width: Optional[int] = None,
                          height: Optional[int] = None,
                          format: Optional[str] = None) -> Any:
        """
        获取图片响应，支持基本的图片处理

        Args:
            image_id: 图片ID
            width: 可选的宽度
            height: 可选的高度
            format: 可选的格式转换

        Returns:
            Flask响应对象
        """
        filepath, mime_type = self.get_image_by_id(image_id)

        if not filepath:
            error(f"找不到ID为{image_id}的图片")
            return jsonify({'success': False, 'error': f'找不到ID为{image_id}的图片'}), 404

        # 如果不需要处理，直接返回文件
        if not width and not height and not format:
            info(f"直接返回图片: {filepath}")
            return send_file(filepath, mimetype=mime_type)

        # 需要处理图片
        try:
            info(f"处理图片: {filepath}, 宽度: {width}, 高度: {height}, 格式: {format}")
            img = Image.open(filepath)

            # 调整大小
            if width or height:
                # 计算新的尺寸，保持宽高比
                orig_width, orig_height = img.size
                if width and not height:
                    # 按宽度等比例缩放
                    ratio = width / orig_width
                    height = int(orig_height * ratio)
                elif height and not width:
                    # 按高度等比例缩放
                    ratio = height / orig_height
                    width = int(orig_width * ratio)

                # 调整大小
                img = img.resize((width, height), Image.LANCZOS)

            # 转换格式
            if format:
                format = format.upper()
                # 确保格式有效
                if format not in ['JPEG', 'PNG', 'GIF', 'WEBP']:
                    format = 'JPEG'  # 默认使用JPEG
            else:
                # 使用原始格式
                format = img.format if img.format else 'JPEG'

            # 创建内存文件对象
            img_io = io.BytesIO()

            # 保存到内存文件对象
            if format == 'JPEG':
                img.save(img_io, format=format, quality=85)
            else:
                img.save(img_io, format=format)

            img_io.seek(0)

            # 确定MIME类型
            mime_type = f"image/{format.lower()}"

            # 返回处理后的图片
            return send_file(img_io, mimetype=mime_type)

        except Exception as e:
            error(f"处理图片时出错: {str(e)}")
            return jsonify({'success': False, 'error': f'处理图片时出错: {str(e)}'}), 500

    def _get_mime_type(self, filepath: str) -> str:
        """
        获取文件的MIME类型

        Args:
            filepath: 文件路径

        Returns:
            str: MIME类型
        """
        # 根据文件扩展名确定MIME类型
        ext = os.path.splitext(filepath)[1].lower()

        mime_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp',
            '.tiff': 'image/tiff',
            '.tif': 'image/tiff',
            '.heic': 'image/heic',
            '.heif': 'image/heif',
            '.pdf': 'application/pdf'
        }

        return mime_types.get(ext, 'application/octet-stream')

# 单例模式，全局图片代理实例
_image_proxy_instance = None

def get_image_proxy() -> ImageProxy:
    """
    获取图片代理实例

    Returns:
        ImageProxy: 图片代理实例
    """
    global _image_proxy_instance

    if _image_proxy_instance is None:
        # 从应用配置中获取上传文件夹和结果文件夹
        upload_folder = current_app.config['UPLOAD_FOLDER']
        results_folder = current_app.config['RESULTS_FOLDER']

        # 确保路径是绝对路径
        import os
        if not os.path.isabs(upload_folder):
            # 获取python-service目录的绝对路径
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            upload_folder = os.path.join(base_dir, upload_folder)
            results_folder = os.path.join(base_dir, results_folder)

        # 创建图片代理实例
        _image_proxy_instance = ImageProxy(upload_folder, results_folder)

    return _image_proxy_instance
