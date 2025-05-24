#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
上传路由模块 - 处理文件上传和图像处理相关的API路由
这个模块定义了文件上传、图像裁剪和静态文件服务的API端点
"""

import os
import uuid
import json
import shutil
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

from flask import Blueprint, request, jsonify, current_app, send_from_directory
from api.app import limiter

# 导入服务
from services.detector import get_detector
from services.cropper import get_cropper
from services.ocr_service import process_ocr_request
from utils.log_client import info, error, warn
from utils.file_hash import get_file_hash_manager

# 创建蓝图
upload_bp = Blueprint('upload', __name__)

@upload_bp.route('/upload', methods=['POST'])
@limiter.limit("30 per minute")
def upload_file():
    """
    处理图片上传请求并进行区块检测

    请求体:
    - 表单数据，包含'file'字段

    返回:
    {
        "success": true/false,
        "message": "检测成功",
        "image_id": "图片ID",
        "filename": "原始文件名",
        "detect_image_url": "检测结果图片URL",
        "original_image_url": "原始图片URL",
        "width": 图片宽度,
        "height": 图片高度,
        "rectangles": [
            {
                "id": "矩形ID",
                "class": "矩形类型",
                "confidence": 置信度,
                "coords": {
                    "topLeft": {"x": 左上角x坐标, "y": 左上角y坐标},
                    "bottomRight": {"x": 右下角x坐标, "y": 右下角y坐标}
                }
            },
            ...
        ],
        "rectangles_count": 矩形数量
    }
    """
    info("收到上传请求，请求路径: /upload")

    # 获取文件夹路径
    UPLOAD_FOLDER = current_app.config['UPLOAD_FOLDER']
    RESULTS_FOLDER = current_app.config['RESULTS_FOLDER']
    TEMP_FOLDER = current_app.config['TEMP_FOLDER']

    # 确保目录存在
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(RESULTS_FOLDER, exist_ok=True)
    os.makedirs(TEMP_FOLDER, exist_ok=True)

    if 'file' not in request.files:
        error("未找到文件")
        return jsonify({'success': False, 'error': '未找到文件'}), 400

    file = request.files['file']
    if file.filename == '':
        error("未选择文件")
        return jsonify({'success': False, 'error': '未选择文件'}), 400

    # 验证文件类型
    def allowed_file(filename):
        """检查文件是否为允许的类型"""
        # 允许的图片类型和PDF
        allowed_extensions = {
            # 常见图片格式
            'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'tif', 'webp',
            # 苹果格式
            'heic', 'heif',
            # RAW格式
            'raw', 'cr2', 'nef', 'arw', 'dng', 'orf', 'rw2',
            # 其他图片格式
            'svg', 'psd', 'ai', 'eps', 'ico', 'jp2', 'j2k',
            # 文档格式
            'pdf'
        }
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

    if not allowed_file(file.filename):
        error(f"不支持的文件类型: {file.filename}")
        return jsonify({
            'success': False,
            'error': '不支持的文件类型，仅支持常见图片格式(PNG, JPG, JPEG, GIF, BMP, TIFF, WEBP, HEIC, HEIF等)和PDF文件'
        }), 400

    info(f"收到文件: {file.filename}")

    # 生成唯一文件名防止覆盖
    file_id = str(uuid.uuid4())

    # 直接保存到上传文件夹
    try:
        filename = f"{file_id}_{file.filename}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        info(f"文件已保存到: {filepath}")
    except Exception as e:
        error(f"保存文件时出错: {e}")
        return jsonify({'success': False, 'error': f'保存文件时出错: {e}'}), 500

    # 设置预测参数
    imgsz = int(request.form.get('imgsz', 1024))
    conf = float(request.form.get('conf', 0.2))

    try:
        # 获取检测器实例并进行预测
        detector = get_detector()
        result = detector.detect(filepath, imgsz=imgsz, conf=conf)

        if not result['success']:
            error(f"检测失败: {result.get('error')}")
            return jsonify({'success': False, 'error': result.get('error')}), 500

        # 获取图像尺寸
        width = result['width']
        height = result['height']
        detected_objects = result['detected_objects']

        # 直接保存检测结果图像到结果文件夹
        try:
            annotated_frame = result['annotated_frame']
            detect_filename = f"{file_id}_detect.jpg"
            detect_filepath = os.path.join(TEMP_FOLDER, detect_filename)
            annotated_frame.save(detect_filepath)
            info(f"检测结果图像已保存到: {detect_filepath}")
        except Exception as e:
            error(f"保存检测结果图像时出错: {e}")
            return jsonify({'success': False, 'error': f'保存检测结果图像时出错: {e}'}), 500

        # 直接保存JSON结果到结果文件夹
        json_data = {
            "image_id": file_id,
            "image_filename": file.filename,
            "image_path": filepath,
            "width": width,
            "height": height,
            "detected_objects": detected_objects
        }

        try:
            json_filename = f"{file_id}_result.json"
            json_filepath = os.path.join(TEMP_FOLDER, json_filename)

            with open(json_filepath, 'w', encoding='utf-8') as f:
                json.dump(json_data, f, ensure_ascii=False, indent=2)

            info(f"JSON结果已保存到: {json_filepath}")
        except Exception as e:
            error(f"保存JSON结果时出错: {e}")
            return jsonify({'success': False, 'error': f'保存JSON结果时出错: {e}'}), 500

        # 转换为前端需要的矩形格式
        frontend_rectangles = []
        for obj in detected_objects:
            bbox = obj['bbox']
            rect_id = str(obj['id'])

            # 计算坐标
            x_min = bbox['x_min']
            y_min = bbox['y_min']
            x_max = bbox['x_max']
            y_max = bbox['y_max']

            frontend_rectangles.append({
                "id": rect_id,
                "class": obj['class'],
                "confidence": obj['confidence'],
                "coords": {
                    "topLeft": {"x": x_min, "y": y_min},
                    "bottomRight": {"x": x_max, "y": y_max}
                }
            })

        response_data = {
            'success': True,
            'message': '检测成功',
            'image_id': file_id,
            'filename': file.filename,
            'detect_image_url': f'/temp/{detect_filename}',
            'original_image_url': f'/uploads/{filename}',
            'width': width,
            'height': height,
            'rectangles': frontend_rectangles,
            'rectangles_count': len(frontend_rectangles)
        }

        info(f"检测成功，返回结果: image_id={file_id}, filename={file.filename}, rectangles_count={len(frontend_rectangles)}")

        return jsonify(response_data)

    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        error(f"处理上传文件时发生错误: {str(e)}", metadata={'traceback': error_traceback})
        return jsonify({'success': False, 'error': f'处理上传文件时发生错误: {str(e)}'}), 500

@upload_bp.route('/crop', methods=['POST'])
@limiter.limit("30 per minute")
def crop_image():
    """
    根据提交的坐标切割图片

    请求体:
    {
        "image_id": "图片ID",
        "rectangles": [
            {
                "id": "矩形ID",
                "class": "矩形类型",
                "confidence": 置信度,
                "coords": {
                    "topLeft": {"x": 左上角x坐标, "y": 左上角y坐标},
                    "bottomRight": {"x": 右下角x坐标, "y": 右下角y坐标}
                }
            },
            ...
        ]
    }

    返回:
    {
        "success": true/false,
        "message": "成功切割 N 个元素",
        "crop_id": "裁剪ID",
        "annotated_image_url": "标注图片URL",
        "cropped_images": [
            {
                "id": "矩形ID",
                "class": "矩形类型",
                "filename": "文件名",
                "path": "文件路径",
                "relative_path": "相对路径"
            },
            ...
        ],
        "zip_url": "ZIP文件URL"
    }
    """
    info("收到裁剪请求，请求路径: /crop")

    # 获取文件夹路径
    UPLOAD_FOLDER = current_app.config['UPLOAD_FOLDER']
    RESULTS_FOLDER = current_app.config['RESULTS_FOLDER']
    CROPS_FOLDER = current_app.config['CROPS_FOLDER']
    DOWNLOADS_FOLDER = current_app.config['DOWNLOADS_FOLDER']
    TEMP_FOLDER = current_app.config['TEMP_FOLDER']

    data = request.json
    if not data:
        error("未提供数据")
        return jsonify({'success': False, 'error': '未提供数据'}), 400

    image_id = data.get('image_id')
    if not image_id:
        error("未提供图片ID")
        return jsonify({'success': False, 'error': '未提供图片ID'}), 400

    rectangles = data.get('rectangles', [])
    if not rectangles:
        error(f"未提供矩形信息，image_id: {image_id}")
        return jsonify({'success': False, 'error': '未提供矩形信息'}), 400

    # 获取裁剪器实例并执行裁剪
    cropper = get_cropper(UPLOAD_FOLDER, RESULTS_FOLDER, CROPS_FOLDER, DOWNLOADS_FOLDER, TEMP_FOLDER)
    result = cropper.crop_image(image_id, rectangles)

    if result['success']:
        info(f"裁剪成功，image_id: {image_id}, crop_id: {result.get('crop_id')}")
        return jsonify(result)
    else:
        error(f"裁剪失败，image_id: {image_id}, 错误: {result.get('error')}")
        return jsonify({'success': False, 'error': result.get('error')}), 500

@upload_bp.route('/extract', methods=['POST'])
@limiter.limit("60 per minute")
def extract_text():
    """
    处理OCR文本提取请求

    请求体:
    {
        "image_id": "图片ID",
        "rectangles": [
            {
                "id": "矩形ID",
                "class": "矩形类型",
                ...
            },
            ...
        ]
    }

    返回:
    {
        "success": true/false,
        "results": [
            {
                "id": "矩形ID",
                "text": "识别的文本"
            },
            ...
        ]
    }
    """
    info("收到OCR文本提取请求，请求路径: /extract")

    try:
        data = request.json
        if not data:
            error("未提供数据")
            return jsonify({'success': False, 'error': '未提供数据'}), 400

        image_id = data.get('image_id')
        rectangles = data.get('rectangles', [])

        if not image_id:
            error("未提供图片ID")
            return jsonify({'success': False, 'error': '未提供图片ID'}), 400

        if not rectangles:
            error(f"未提供矩形区域信息，image_id: {image_id}")
            return jsonify({'success': False, 'error': '未提供矩形区域信息'}), 400

        # 调用OCR处理函数
        result = process_ocr_request(image_id, rectangles)

        if result['success']:
            info(f"OCR文本提取成功，image_id: {image_id}")
        else:
            error(f"OCR文本提取失败，image_id: {image_id}, 错误: {result.get('error')}")

        return jsonify(result)

    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        error(f"OCR处理时发生错误: {str(e)}", metadata={'traceback': error_traceback})
        return jsonify({'success': False, 'error': f'OCR处理时发生错误: {str(e)}'}), 500

# 静态文件服务路由
@upload_bp.route('/uploads/<path:filename>')
def uploaded_file(filename):
    """提供上传的文件"""
    UPLOAD_FOLDER = current_app.config['UPLOAD_FOLDER']
    return send_from_directory(UPLOAD_FOLDER, filename)

@upload_bp.route('/uploads/by-id/<image_id>')
def uploaded_file_by_id(image_id):
    """通过图片ID提供上传的文件，避免文件名编码问题"""
    UPLOAD_FOLDER = current_app.config['UPLOAD_FOLDER']
    import os

    info(f"通过ID请求图片: {image_id}, 上传文件夹: {UPLOAD_FOLDER}")

    # 确保目录存在
    if not os.path.exists(UPLOAD_FOLDER):
        error(f"上传文件夹不存在: {UPLOAD_FOLDER}")
        return jsonify({'success': False, 'error': f'上传文件夹不存在'}), 500

    # 列出目录内容
    try:
        files = os.listdir(UPLOAD_FOLDER)
        info(f"上传文件夹中的文件数量: {len(files)}")
    except Exception as e:
        error(f"列出上传文件夹内容时出错: {str(e)}")
        return jsonify({'success': False, 'error': f'列出上传文件夹内容时出错: {str(e)}'}), 500

    # 查找以image_id开头的文件
    matching_files = []
    for filename in files:
        if filename.startswith(f"{image_id}_"):
            matching_files.append(filename)

    if matching_files:
        selected_file = matching_files[0]
        info(f"找到匹配的文件: {selected_file}")
        return send_from_directory(UPLOAD_FOLDER, selected_file)
    else:
        error(f"找不到ID为{image_id}的图片")
        return jsonify({'success': False, 'error': f'找不到ID为{image_id}的图片'}), 404

@upload_bp.route('/temp/<path:filename>')
def temp_file(filename):
    """提供临时文件"""
    TEMP_FOLDER = current_app.config['TEMP_FOLDER']

    # 记录请求信息
    info(f"请求临时文件: {filename}, 临时文件夹: {TEMP_FOLDER}")

    # 检查文件是否存在
    file_path = os.path.join(TEMP_FOLDER, filename)
    if not os.path.exists(file_path):
        error(f"临时文件不存在: {file_path}")
        return jsonify({'success': False, 'error': f'临时文件不存在: {filename}'}), 404

    # 根据文件扩展名设置正确的MIME类型
    mimetype = None
    if filename.endswith('.zip'):
        mimetype = 'application/zip'
    elif filename.endswith('.jpg') or filename.endswith('.jpeg'):
        mimetype = 'image/jpeg'
    elif filename.endswith('.png'):
        mimetype = 'image/png'
    elif filename.endswith('.json'):
        mimetype = 'application/json'

    # 记录MIME类型信息
    info(f"提供临时文件: {filename}, MIME类型: {mimetype}")

    # 使用明确的MIME类型
    return send_from_directory(TEMP_FOLDER, filename, mimetype=mimetype)

@upload_bp.route('/results/<path:filename>')
def result_file(filename):
    """提供结果文件 (重定向到临时文件)"""
    # 重定向到临时文件路由
    return temp_file(filename)

@upload_bp.route('/crops/<path:filename>')
def crop_file(filename):
    """提供裁剪文件"""
    CROPS_FOLDER = current_app.config['CROPS_FOLDER']

    # 记录请求信息
    info(f"请求裁剪文件: {filename}, 裁剪文件夹: {CROPS_FOLDER}")

    # 检查文件是否存在
    file_path = os.path.join(CROPS_FOLDER, filename)
    if not os.path.exists(file_path):
        error(f"裁剪文件不存在: {file_path}")
        return jsonify({'success': False, 'error': f'裁剪文件不存在: {filename}'}), 404

    # 根据文件扩展名设置正确的MIME类型
    mimetype = None
    if filename.endswith('.jpg') or filename.endswith('.jpeg'):
        mimetype = 'image/jpeg'
    elif filename.endswith('.png'):
        mimetype = 'image/png'

    # 记录MIME类型信息
    info(f"提供裁剪文件: {filename}, MIME类型: {mimetype}")

    # 使用明确的MIME类型
    return send_from_directory(CROPS_FOLDER, filename, mimetype=mimetype)

@upload_bp.route('/downloads/<path:filename>')
def download_file(filename):
    """提供下载文件"""
    DOWNLOADS_FOLDER = current_app.config['DOWNLOADS_FOLDER']

    # 记录请求信息
    info(f"请求下载文件: {filename}, 下载文件夹: {DOWNLOADS_FOLDER}")

    # 检查文件是否存在
    file_path = os.path.join(DOWNLOADS_FOLDER, filename)
    if not os.path.exists(file_path):
        error(f"下载文件不存在: {file_path}")
        return jsonify({'success': False, 'error': f'下载文件不存在: {filename}'}), 404

    # 根据文件扩展名设置正确的MIME类型
    mimetype = None
    if filename.endswith('.zip'):
        mimetype = 'application/zip'
    elif filename.endswith('.jpg') or filename.endswith('.jpeg'):
        mimetype = 'image/jpeg'
    elif filename.endswith('.png'):
        mimetype = 'image/png'

    # 记录MIME类型信息
    info(f"提供下载文件: {filename}, MIME类型: {mimetype}")

    # 使用明确的MIME类型
    return send_from_directory(DOWNLOADS_FOLDER, filename, mimetype=mimetype)
