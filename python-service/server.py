#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
主服务器模块 - 整合所有功能模块并提供API接口
这个模块是应用的主入口点，负责处理所有HTTP请求
"""

import os
import sys
import json
import uuid
import logging
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image

# 导入自定义模块
from detector import get_detector
from cropper import get_cropper
from ocr_service import process_ocr_request

# 配置日志记录
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('server.log')
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='uploads')
CORS(app)  # 启用跨域请求

# 配置上传文件夹
UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = os.path.join(UPLOAD_FOLDER, 'results')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

@app.route('/upload', methods=['POST'])
def upload_file():
    """处理图片上传请求并进行区块检测"""
    logger.info("收到上传请求，请求路径: /upload")
    logger.info("请求头: %s", request.headers)
    
    if 'file' not in request.files:
        logger.error("未找到文件")
        return jsonify({'error': '未找到文件'}), 400
    
    file = request.files['file']
    if file.filename == '':
        logger.error("未选择文件")
        return jsonify({'error': '未选择文件'}), 400
        
    logger.info("收到文件: %s", file.filename)
    
    # 生成唯一文件名防止覆盖
    file_id = str(uuid.uuid4())
    filename = file_id + '_' + file.filename
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    
    # 设置预测参数
    imgsz = int(request.form.get('imgsz', 1024))
    conf = float(request.form.get('conf', 0.2))
    
    try:
        # 获取检测器实例并进行预测
        detector = get_detector()
        result = detector.detect(filepath, imgsz=imgsz, conf=conf)
        
        if not result['success']:
            return jsonify({'error': result['error']}), 500
        
        # 获取图像尺寸
        width = result['width']
        height = result['height']
        detected_objects = result['detected_objects']
        
        # 保存检测结果图像
        annotated_frame = result['annotated_frame']
        detect_filename = f"{file_id}_detect.jpg"
        detect_filepath = os.path.join(RESULTS_FOLDER, detect_filename)
        annotated_frame.save(detect_filepath)
        
        # 保存JSON结果
        json_data = {
            "image_id": file_id,
            "image_filename": file.filename,
            "image_path": filepath,
            "width": width,
            "height": height,
            "detected_objects": detected_objects
        }
        
        json_filename = f"{file_id}_result.json"
        json_filepath = os.path.join(RESULTS_FOLDER, json_filename)
        with open(json_filepath, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, indent=2)
        
        # 转换为前端需要的格式
        frontend_rectangles = []
        for obj in detected_objects:
            bbox = obj['bbox']
            # 转换为前端坐标格式
            frontend_rectangles.append({
                "id": obj['id'],
                "class": obj['class'],
                "confidence": obj['confidence'],
                "coords": {
                    "topLeft": {"x": bbox['x_min'], "y": bbox['y_min']},
                    "topRight": {"x": bbox['x_max'], "y": bbox['y_min']},
                    "bottomLeft": {"x": bbox['x_min'], "y": bbox['y_max']},
                    "bottomRight": {"x": bbox['x_max'], "y": bbox['y_max']}
                }
            })
        
        response_data = {
            'success': True,
            'message': '检测成功',
            'image_id': file_id,
            'filename': file.filename,
            'detect_image_url': f'/results/{detect_filename}',
            'original_image_url': f'/uploads/{filename}',
            'width': width,
            'height': height,
            'rectangles': frontend_rectangles,
            'rectangles_count': len(frontend_rectangles)
        }
        
        logger.info("检测成功，返回结果: %s", {
            'success': True,
            'message': '检测成功',
            'image_id': file_id,
            'filename': file.filename,
            'detect_image_url': f'/results/{detect_filename}',
            'original_image_url': f'/uploads/{filename}',
            'width': width,
            'height': height,
            'rectangles_count': len(frontend_rectangles)
        })
        
        return jsonify(response_data)
    
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        logger.error("处理图片时发生错误: %s\n%s", str(e), error_traceback)
        return jsonify({'error': f'处理图片时发生错误: {str(e)}'}), 500

@app.route('/crop', methods=['POST'])
def crop_image():
    """根据提交的坐标切割图片"""
    logger.info("收到裁剪请求，请求路径: /crop")
    logger.info("请求头: %s", request.headers)
    
    data = request.json
    if not data:
        logger.error("未提供数据")
        return jsonify({'error': '未提供数据'}), 400
    
    image_id = data.get('image_id')
    if not image_id:
        return jsonify({'error': '未提供图片ID'}), 400
    
    rectangles = data.get('rectangles', [])
    
    # 获取裁剪器实例并执行裁剪
    cropper = get_cropper(UPLOAD_FOLDER, RESULTS_FOLDER)
    result = cropper.crop_image(image_id, rectangles)
    
    if result['success']:
        return jsonify(result)
    else:
        return jsonify({'error': result['error']}), 500

@app.route('/extract', methods=['POST'])
def extract_text():
    """处理OCR文本提取请求"""
    logger.info("收到OCR文本提取请求，请求路径: /extract")
    logger.info("请求头: %s", request.headers)
    
    try:
        data = request.json
        if not data:
            logger.error("未提供数据")
            return jsonify({'error': '未提供数据'}), 400
        
        image_id = data.get('image_id')
        rectangles = data.get('rectangles', [])
        
        if not image_id:
            return jsonify({'error': '未提供图片ID'}), 400
        
        if not rectangles:
            return jsonify({'error': '未提供矩形区域信息'}), 400
        
        # 调用OCR处理函数
        result = process_ocr_request(image_id, rectangles)
        
        return jsonify(result)
    
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        logger.error("OCR处理时发生错误: %s\n%s", str(e), error_traceback)
        return jsonify({'success': False, 'error': f'OCR处理时发生错误: {str(e)}'}), 500

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    """提供上传的文件"""
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/results/<path:filename>')
def result_file(filename):
    """提供结果文件"""
    return send_from_directory(RESULTS_FOLDER, filename)

@app.route('/')
def index():
    """首页，重定向到前端页面"""
    return send_from_directory('.', 'index.html')

@app.route('/test', methods=['GET'])
def test():
    """测试路由，用于检查服务器是否正常运行"""
    logger.info("收到测试请求，请求路径: /test")
    return jsonify({
        'status': 'ok',
        'message': 'Python服务器正常运行'
    })

if __name__ == '__main__':
    logger.info("启动服务器...")
    # 使用0.0.0.0作为主机，允许从任何IP访问
    app.run(host='0.0.0.0', debug=True, port=5000)