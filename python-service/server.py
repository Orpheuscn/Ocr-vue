#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import json
import uuid
import shutil
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import torch
import numpy as np
from PIL import Image

# 确保能够导入DocLayout-YOLO模块
sys.path.append(os.path.abspath('./DocLayout-YOLO'))
from doclayout_yolo import YOLOv10
from huggingface_hub import hf_hub_download

app = Flask(__name__, static_folder='uploads')
CORS(app)  # 启用跨域请求

# 配置上传文件夹
UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = os.path.join(UPLOAD_FOLDER, 'results')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

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

# 加载YOLO模型
def load_model():
    print("正在加载DocLayout-YOLO模型...")
    device = 'cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu'
    print(f"使用设备: {device}")
    
    # 下载预训练模型
    model_path = hf_hub_download(
        repo_id="juliozhao/DocLayout-YOLO-DocStructBench", 
        filename="doclayout_yolo_docstructbench_imgsz1024.pt"
    )
    print(f"模型已下载到: {model_path}")
    
    # 加载模型
    model = YOLOv10(model_path)
    return model, device

# 全局模型实例
model, device = load_model()

@app.route('/upload', methods=['POST'])
def upload_file():
    """处理图片上传请求并进行区块检测"""
    if 'file' not in request.files:
        return jsonify({'error': '未找到文件'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '未选择文件'}), 400
    
    # 生成唯一文件名防止覆盖
    file_id = str(uuid.uuid4())
    filename = file_id + '_' + file.filename
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    
    # 设置预测参数
    imgsz = int(request.form.get('imgsz', 1024))
    conf = float(request.form.get('conf', 0.2))
    
    try:
        # 进行预测
        print(f"开始检测图片: {filepath}")
        results = model.predict(
            filepath,
            imgsz=imgsz,
            conf=conf,
            device=device,
        )
        
        # 获取第一个结果
        result = results[0]
        
        # 获取图像尺寸
        image = Image.open(filepath)
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
        detect_filename = f"{file_id}_detect.jpg"
        detect_filepath = os.path.join(RESULTS_FOLDER, detect_filename)
        annotated_frame = Image.fromarray(annotated_frame)
        annotated_frame.save(detect_filepath)
        
        # 保存JSON结果
        json_data = {
            "image_id": file_id,
            "image_filename": file.filename,
            "image_path": filepath,
            "width": image_width,
            "height": image_height,
            "detected_objects": formatted_results
        }
        
        json_filename = f"{file_id}_result.json"
        json_filepath = os.path.join(RESULTS_FOLDER, json_filename)
        with open(json_filepath, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, indent=2, cls=NumpyEncoder)
        
        # 转换为前端需要的格式
        frontend_rectangles = []
        for obj in formatted_results:
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
        
        return jsonify({
            'success': True,
            'message': '检测成功',
            'image_id': file_id,
            'filename': file.filename,
            'detect_image_url': f'/results/{detect_filename}',
            'original_image_url': f'/uploads/{filename}',
            'width': image_width,
            'height': image_height,
            'rectangles': frontend_rectangles
        })
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'处理图片时发生错误: {str(e)}'}), 500

@app.route('/crop', methods=['POST'])
def crop_image():
    """根据提交的坐标切割图片"""
    data = request.json
    if not data:
        return jsonify({'error': '未提供数据'}), 400
    
    image_id = data.get('image_id')
    if not image_id:
        return jsonify({'error': '未提供图片ID'}), 400
    
    # 查找原始图片
    original_filename = None
    for filename in os.listdir(UPLOAD_FOLDER):
        if filename.startswith(image_id + '_') and not filename.endswith('_detect.jpg'):
            original_filename = filename
            break
    
    if not original_filename:
        return jsonify({'error': '找不到原始图片'}), 404
    
    image_path = os.path.join(UPLOAD_FOLDER, original_filename)
    
    # 准备切割目录
    crop_id = str(uuid.uuid4())
    crop_dir = os.path.join(RESULTS_FOLDER, f"crop_{crop_id}")
    os.makedirs(crop_dir, exist_ok=True)
    
    try:
        # 准备切割所需的JSON数据格式
        rectangles = data.get('rectangles', [])
        
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
                "id": i,
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
        
        # 构建完整的JSON数据
        json_data = {
            "image": image_path,
            "width": width,
            "height": height,
            "detected_objects": detected_objects
        }
        
        # 执行切割
        import cv2
        image_cv = cv2.imread(image_path)
        if image_cv is None:
            return jsonify({'error': f'无法读取图像: {image_path}'}), 500
        
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
            
            # 保存裁剪的元素
            element_id = element['id']
            output_filename = f"{os.path.splitext(os.path.basename(image_path))[0]}_{class_name.replace(' ', '_')}_{element_id}.jpg"
            output_path = os.path.join(class_dirs[class_name], output_filename)
            
            cv2.imwrite(output_path, cropped_element)
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
        import zipfile
        zip_filename = f"crop_{crop_id}.zip"
        zip_filepath = os.path.join(RESULTS_FOLDER, zip_filename)
        
        with zipfile.ZipFile(zip_filepath, 'w') as zipf:
            for root, dirs, files in os.walk(crop_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, RESULTS_FOLDER)
                    zipf.write(file_path, arcname)
        
        return jsonify({
            'success': True,
            'message': f'成功切割 {elements_count} 个元素',
            'crop_id': crop_id,
            'annotated_image_url': f'/results/crop_{crop_id}/{os.path.basename(output_annotated)}',
            'cropped_images': cropped_images,
            'zip_url': f'/results/{zip_filename}'
        })
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'切割图片时发生错误: {str(e)}'}), 500

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

if __name__ == '__main__':
    print("启动服务器...")
    app.run(debug=True, port=5000) 