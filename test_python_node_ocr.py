#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
测试Python到Node OCR通信的脚本
"""

import sys
import os
import time
import base64
from pathlib import Path

# 添加Python服务路径
sys.path.append('python-service')

def test_ocr_communication():
    """测试OCR通信"""
    try:
        print("开始测试Python到Node OCR通信...")
        
        # 导入必要的模块
        from services.rabbitmq_ocr_service import RabbitMQOcrService
        
        # 创建OCR服务实例
        ocr_service = RabbitMQOcrService()
        
        # 模拟矩形数据
        test_rectangles = [
            {
                'id': 'rect_1',
                'class': 'text',
                'x': 100,
                'y': 100,
                'width': 200,
                'height': 50
            },
            {
                'id': 'rect_2', 
                'class': 'text',
                'x': 100,
                'y': 200,
                'width': 300,
                'height': 60
            }
        ]
        
        # 测试图片ID
        test_image_id = 'test_image_123'
        
        print(f"测试图片ID: {test_image_id}")
        print(f"测试矩形数量: {len(test_rectangles)}")
        
        # 执行OCR请求
        print("发送OCR请求到Node服务器...")
        result = ocr_service.process_ocr_via_node(test_image_id, test_rectangles)
        
        print("OCR结果:")
        print(f"成功: {result.get('success', False)}")
        
        if result.get('success'):
            print(f"处理时间: {result.get('processingTime', 0)}ms")
            print(f"总矩形数: {result.get('totalRectangles', 0)}")
            print(f"成功矩形数: {result.get('successfulRectangles', 0)}")
            
            results = result.get('results', [])
            for i, rect_result in enumerate(results):
                print(f"矩形 {i+1}:")
                print(f"  ID: {rect_result.get('rectangleId')}")
                print(f"  成功: {rect_result.get('success')}")
                print(f"  文本: {rect_result.get('text', '')[:100]}...")
                print(f"  语言: {rect_result.get('detectedLanguage')}")
        else:
            print(f"错误: {result.get('error')}")
            
        return result.get('success', False)
        
    except Exception as e:
        print(f"测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def create_test_crops():
    """创建测试用的裁剪图片"""
    try:
        from PIL import Image, ImageDraw, ImageFont
        
        # 创建测试目录
        test_image_id = 'test_image_123'
        crops_dir = Path('python-service/uploads/crops') / test_image_id
        crops_dir.mkdir(parents=True, exist_ok=True)
        
        # 创建测试图片
        for i, rect_id in enumerate(['rect_1', 'rect_2']):
            # 创建一个简单的文本图片
            img = Image.new('RGB', (200, 50), color='white')
            draw = ImageDraw.Draw(img)
            
            # 添加一些测试文本
            test_text = f"测试文本 {i+1} Test Text {i+1}"
            try:
                # 尝试使用系统字体
                font = ImageFont.load_default()
            except:
                font = None
                
            draw.text((10, 15), test_text, fill='black', font=font)
            
            # 保存图片
            img_path = crops_dir / f"{rect_id}.jpg"
            img.save(img_path, 'JPEG')
            print(f"创建测试图片: {img_path}")
            
        return True
        
    except Exception as e:
        print(f"创建测试图片失败: {e}")
        return False

def check_services():
    """检查服务状态"""
    print("检查服务状态...")
    
    # 检查RabbitMQ连接
    try:
        from services.rabbitmq_client import rabbitmq_client
        if rabbitmq_client.connect():
            print("✓ Python RabbitMQ连接正常")
        else:
            print("✗ Python RabbitMQ连接失败")
            return False
    except Exception as e:
        print(f"✗ Python RabbitMQ连接异常: {e}")
        return False
    
    # 检查Node服务器（通过HTTP请求）
    try:
        import requests
        response = requests.get('http://localhost:3000/api/health', timeout=5)
        if response.status_code == 200:
            health_data = response.json()
            rabbitmq_status = health_data.get('services', {}).get('rabbitmq', {})
            if rabbitmq_status.get('healthy'):
                print("✓ Node服务器RabbitMQ连接正常")
            else:
                print("✗ Node服务器RabbitMQ连接异常")
                return False
        else:
            print("✗ Node服务器健康检查失败")
            return False
    except Exception as e:
        print(f"✗ 无法连接到Node服务器: {e}")
        return False
    
    return True

def main():
    """主函数"""
    print("=" * 50)
    print("Python到Node OCR通信测试")
    print("=" * 50)
    
    # 1. 检查服务状态
    if not check_services():
        print("服务检查失败，请确保RabbitMQ和Node服务器正在运行")
        return False
    
    # 2. 创建测试数据
    print("\n创建测试数据...")
    if not create_test_crops():
        print("创建测试数据失败")
        return False
    
    # 3. 执行OCR测试
    print("\n执行OCR测试...")
    success = test_ocr_communication()
    
    if success:
        print("\n✓ 测试成功！Python到Node OCR通信正常工作")
    else:
        print("\n✗ 测试失败！请检查配置和服务状态")
    
    return success

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
