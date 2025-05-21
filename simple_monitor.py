#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
简单的Python服务监控脚本
用于监控Python服务的状态，并提供实时诊断信息
"""

import os
import sys
import time
import json
import subprocess
import socket
import re
from datetime import datetime
import threading
import queue
import signal

try:
    import requests
    from colorama import Fore, Back, Style, init
except ImportError:
    print("正在安装所需依赖...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "colorama"])
    import requests
    from colorama import Fore, Back, Style, init

# 初始化colorama
init(autoreset=True)

# 配置
CONFIG = {
    "host": "localhost",
    "port": 5000,
    "endpoints": [
        "/",
        "/health",
        "/ocr/status"
    ],
    "check_interval": 2,  # 检查间隔（秒）
    "timeout": 5,  # 请求超时时间（秒）
}

# 全局状态
running = True

def print_header(title):
    """打印标题"""
    print(Fore.CYAN + "=" * 80)
    print(Fore.CYAN + f" {title} ".center(80, "="))
    print(Fore.CYAN + "=" * 80)

def print_section(title):
    """打印小节标题"""
    print(Fore.YELLOW + f"\n=== {title} ===")

def print_status(message, status, details=None):
    """打印状态信息"""
    if status == "ok":
        status_str = Fore.GREEN + "✓ 正常"
    elif status == "warning":
        status_str = Fore.YELLOW + "! 警告"
    elif status == "error":
        status_str = Fore.RED + "✗ 错误"
    else:
        status_str = Fore.BLUE + "? 未知"
    
    print(f"{message}: {status_str}")
    if details:
        print(Fore.WHITE + f"  {details}")

def check_port(host, port):
    """检查端口是否开放"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(CONFIG["timeout"])
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception as e:
        return False

def check_endpoint(url):
    """检查API端点"""
    try:
        start_time = time.time()
        response = requests.get(url, timeout=CONFIG["timeout"])
        response_time = time.time() - start_time
        
        return {
            "status": "ok" if response.status_code == 200 else "error",
            "status_code": response.status_code,
            "response_time": round(response_time * 1000, 2),  # 毫秒
            "content_type": response.headers.get('Content-Type', 'unknown'),
            "content": response.text
        }
    except requests.exceptions.RequestException as e:
        return {
            "status": "error",
            "error": str(e)
        }

def check_processes():
    """检查Python服务进程"""
    try:
        # 使用ps命令查找Python服务进程
        cmd = "ps aux | grep -E 'python.*main.py|gunicorn.*main:create_app' | grep -v grep"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if result.returncode == 0 and result.stdout.strip():
            processes = result.stdout.strip().split('\n')
            return {
                "status": "ok",
                "count": len(processes),
                "processes": processes
            }
        else:
            return {
                "status": "error",
                "count": 0,
                "processes": []
            }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

def get_latest_logs(log_file, max_lines=10):
    """获取最新日志"""
    try:
        if os.path.exists(log_file):
            cmd = f"tail -n {max_lines} {log_file}"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            
            if result.returncode == 0:
                return result.stdout.strip().split('\n')
            else:
                return [f"读取日志失败: {result.stderr}"]
        else:
            return [f"日志文件不存在: {log_file}"]
    except Exception as e:
        return [f"获取日志时出错: {str(e)}"]

def check_service():
    """检查服务状态"""
    # 清屏
    os.system('clear' if os.name == 'posix' else 'cls')
    
    # 打印标题
    print_header(f"Python服务监控 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 检查端口
    print_section("端口检查")
    port_open = check_port(CONFIG["host"], CONFIG["port"])
    print_status(f"端口 {CONFIG['port']}", "ok" if port_open else "error", 
                f"{'已开放' if port_open else '未开放'}")
    
    # 检查进程
    print_section("进程检查")
    processes = check_processes()
    
    if processes["status"] == "ok" and processes["count"] > 0:
        print_status("服务进程", "ok", f"找到 {processes['count']} 个进程")
        for proc in processes["processes"]:
            print(f"  {proc}")
    else:
        print_status("服务进程", "error", "未找到服务进程")
    
    # 检查API端点
    if port_open:
        print_section("API端点检查")
        
        for endpoint in CONFIG["endpoints"]:
            url = f"http://{CONFIG['host']}:{CONFIG['port']}{endpoint}"
            result = check_endpoint(url)
            
            if result["status"] == "ok":
                print_status(endpoint, "ok", 
                            f"状态码: {result['status_code']}, 响应时间: {result['response_time']}ms")
                
                # 尝试解析JSON响应
                try:
                    content = json.loads(result["content"])
                    print(f"  响应: {json.dumps(content, ensure_ascii=False, indent=2)}")
                    
                    # 检查健康检查端点的返回值
                    if endpoint == "/health" and content.get("status") != "healthy":
                        print_status("健康检查返回值", "warning", 
                                    f"返回的状态为 '{content.get('status')}', 应为 'healthy'")
                except:
                    print(f"  响应: {result['content']}")
            else:
                print_status(endpoint, "error", f"错误: {result.get('error', '未知错误')}")
    
    # 显示最新日志
    print_section("最新日志")
    
    # 显示gunicorn错误日志
    print(Fore.YELLOW + "gunicorn错误日志:")
    for line in get_latest_logs("logs/gunicorn_error.log", 5):
        print(f"  {line}")
    
    # 显示最新的Python服务日志
    try:
        latest_log = subprocess.run("ls -t logs/python-service-*.log | head -n 1", 
                                  shell=True, capture_output=True, text=True).stdout.strip()
        
        if latest_log:
            print(Fore.YELLOW + f"\n最新Python服务日志 ({os.path.basename(latest_log)}):")
            for line in get_latest_logs(latest_log, 5):
                print(f"  {line}")
    except:
        pass
    
    # 显示watchdog日志
    print(Fore.YELLOW + "\nwatchdog日志:")
    for line in get_latest_logs("logs/watchdog.log", 5):
        print(f"  {line}")
    
    # 诊断结论
    print_section("诊断结论")
    
    if not port_open:
        print(Fore.RED + "问题: 服务端口未开放，服务可能未正常启动")
        print(Fore.YELLOW + "建议: 尝试手动启动服务，检查启动日志")
    elif processes["status"] == "error" or processes["count"] == 0:
        print(Fore.RED + "问题: 未找到服务进程，服务可能已崩溃")
        print(Fore.YELLOW + "建议: 检查日志文件，查找崩溃原因")
    else:
        # 检查健康检查端点
        health_url = f"http://{CONFIG['host']}:{CONFIG['port']}/health"
        health_result = check_endpoint(health_url)
        
        if health_result["status"] == "ok":
            try:
                health_content = json.loads(health_result["content"])
                if health_content.get("status") == "healthy":
                    print(Fore.GREEN + "服务正常运行，健康检查返回值符合要求")
                else:
                    print(Fore.YELLOW + f"问题: 健康检查端点返回的状态为 '{health_content.get('status')}', 应为 'healthy'")
                    print(Fore.YELLOW + "建议: 修改健康检查端点的实现，返回 {'status': 'healthy'}")
            except:
                print(Fore.YELLOW + "问题: 健康检查端点返回的不是有效的JSON")
                print(Fore.YELLOW + "建议: 检查健康检查端点的实现")
        else:
            print(Fore.RED + "问题: 健康检查端点不可访问")
            print(Fore.YELLOW + "建议: 检查健康检查端点的实现，确保路由正确注册")
    
    print(Fore.BLUE + f"\n下次检查将在 {CONFIG['check_interval']} 秒后进行...")

def signal_handler(sig, frame):
    """处理信号"""
    global running
    print(Fore.YELLOW + "\n正在停止监控...")
    running = False
    sys.exit(0)

def main():
    """主函数"""
    # 注册信号处理器
    signal.signal(signal.SIGINT, signal_handler)
    
    print(Fore.CYAN + "启动Python服务监控...")
    print(Fore.CYAN + "按 Ctrl+C 停止监控")
    
    try:
        while running:
            check_service()
            time.sleep(CONFIG["check_interval"])
    except KeyboardInterrupt:
        print(Fore.YELLOW + "\n监控已停止")
    except Exception as e:
        print(Fore.RED + f"\n监控出错: {str(e)}")

if __name__ == "__main__":
    main()
