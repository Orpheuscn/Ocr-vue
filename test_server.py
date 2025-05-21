#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
测试服务器
用于测试watchdog脚本的健康检查逻辑
"""

from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def index():
    """根路由"""
    return jsonify({
        'service': 'Test Python Service',
        'version': '1.0.0',
        'status': 'running'
    })

@app.route('/health')
def health_check():
    """健康检查端点"""
    return jsonify({
        'status': 'healthy'
    })

if __name__ == '__main__':
    print("启动测试服务器，监听 0.0.0.0:5000...")
    app.run(host='0.0.0.0', port=5000)
