#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
测试OCR完整流程的脚本
"""

import sys
import os
import json
import time
import requests
from pathlib import Path

# 添加项目路径
sys.path.append('.')

def test_ocr_flow():
    """测试完整的OCR流程"""

    print("=== 测试OCR完整流程 ===")

    # 1. 测试Python服务连接
    print("\n1. 测试Python服务连接...")
    try:
        response = requests.get('http://localhost:5001/health', timeout=5)
        if response.status_code == 200:
            print("✓ Python服务连接正常")
        else:
            print(f"✗ Python服务响应异常: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Python服务连接失败: {e}")
        return False

    # 2. 测试Node.js服务连接
    print("\n2. 测试Node.js服务连接...")
    try:
        response = requests.get('http://localhost:3000/api/health', timeout=5)
        if response.status_code == 200:
            print("✓ Node.js服务连接正常")
        else:
            print(f"✗ Node.js服务响应异常: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Node.js服务连接失败: {e}")
        return False

    # 3. 测试RabbitMQ连接
    print("\n3. 测试RabbitMQ连接...")
    try:
        from services.rabbitmq_client import RabbitMQClient
        client = RabbitMQClient()
        if client.connect():
            print("✓ RabbitMQ连接正常")
            client.disconnect()
        else:
            print("✗ RabbitMQ连接失败")
            return False
    except Exception as e:
        print(f"✗ RabbitMQ连接测试失败: {e}")
        return False

    # 4. 测试OCR端点
    print("\n4. 测试OCR端点...")
    test_data = {
        "image_id": "test-image-123",
        "rectangles": [
            {
                "id": "rect-1",
                "class": "text",
                "confidence": 0.9,
                "coords": {
                    "topLeft": {"x": 100, "y": 100},
                    "bottomRight": {"x": 200, "y": 150}
                }
            }
        ]
    }

    try:
        response = requests.post(
            'http://localhost:5001/extract',
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )

        print(f"OCR端点响应状态: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print(f"OCR端点响应: {json.dumps(result, indent=2, ensure_ascii=False)}")

            if result.get('success'):
                print("✓ OCR端点测试成功")
                return True
            else:
                print(f"✗ OCR处理失败: {result.get('error')}")
                return False
        else:
            print(f"✗ OCR端点响应异常: {response.status_code}")
            print(f"响应内容: {response.text}")
            return False

    except Exception as e:
        print(f"✗ OCR端点测试失败: {e}")
        return False

if __name__ == "__main__":
    success = test_ocr_flow()
    if success:
        print("\n🎉 所有测试通过！OCR流程正常")
    else:
        print("\n❌ 测试失败，请检查服务状态")

    sys.exit(0 if success else 1)
