#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Python服务健康检查诊断工具
用于诊断Python服务健康检查失败的原因
"""

import os
import sys
import time
import json
import subprocess
import socket
import re
import traceback
from datetime import datetime
from pathlib import Path

try:
    import requests
    import psutil
    from colorama import Fore, Back, Style, init
except ImportError:
    print("正在安装所需依赖...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "psutil", "colorama"])
    import requests
    import psutil
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
    "log_dir": "logs",
    "python_service_dir": "python-service",
    "timeout": 5,  # 请求超时时间（秒）
    "retry_count": 3,  # 重试次数
    "retry_interval": 2  # 重试间隔（秒）
}

def print_header(title):
    """打印标题"""
    print(Fore.CYAN + "=" * 80)
    print(Fore.CYAN + f" {title} ".center(80, "="))
    print(Fore.CYAN + "=" * 80)

def print_section(title):
    """打印小节标题"""
    print(Fore.YELLOW + f"\n=== {title} ===")

def print_result(message, status, details=None):
    """打印结果"""
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

def check_endpoint(url, retry=True):
    """检查API端点"""
    results = []
    
    retry_count = CONFIG["retry_count"] if retry else 1
    
    for i in range(retry_count):
        try:
            start_time = time.time()
            response = requests.get(url, timeout=CONFIG["timeout"])
            response_time = time.time() - start_time
            
            result = {
                "attempt": i + 1,
                "status": "ok" if response.status_code == 200 else "error",
                "status_code": response.status_code,
                "response_time": round(response_time * 1000, 2),  # 毫秒
                "content_type": response.headers.get('Content-Type', 'unknown'),
                "content_length": len(response.content),
                "content": response.text[:200] + "..." if len(response.text) > 200 else response.text
            }
            
            # 尝试解析JSON响应
            if 'application/json' in result["content_type"]:
                try:
                    result["json"] = response.json()
                except:
                    result["json"] = None
            
            results.append(result)
            
            # 如果成功，不需要继续重试
            if result["status"] == "ok":
                break
                
        except requests.exceptions.RequestException as e:
            results.append({
                "attempt": i + 1,
                "status": "error",
                "error_type": type(e).__name__,
                "error": str(e)
            })
            
        # 如果需要重试且不是最后一次尝试
        if retry and i < retry_count - 1:
            time.sleep(CONFIG["retry_interval"])
    
    return results

def find_processes():
    """查找Python服务相关进程"""
    processes = []
    
    # 查找Gunicorn进程
    for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'cpu_percent', 'memory_percent', 'create_time']):
        try:
            cmdline = " ".join(proc.info['cmdline']) if proc.info['cmdline'] else ""
            if "gunicorn" in cmdline and "main:create_app" in cmdline:
                # 获取进程详细信息
                proc_info = {
                    'pid': proc.info['pid'],
                    'name': proc.info['name'],
                    'cmdline': cmdline,
                    'cpu_percent': proc.info['cpu_percent'],
                    'memory_percent': proc.info['memory_percent'],
                    'create_time': datetime.fromtimestamp(proc.info['create_time']).strftime('%Y-%m-%d %H:%M:%S'),
                    'running_time': time.time() - proc.info['create_time']
                }
                processes.append(proc_info)
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    
    return processes

def check_log_errors():
    """检查日志文件中的错误"""
    log_files = [
        "gunicorn_error.log",
        "gunicorn_access.log",
        "python-service.log"
    ]
    
    errors = []
    
    for log_file in log_files:
        log_path = os.path.join(CONFIG["log_dir"], log_file)
        
        if not os.path.exists(log_path):
            continue
        
        try:
            with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
                lines = f.readlines()
                
            # 只检查最后100行
            for line in lines[-100:]:
                if re.search(r'error|exception|traceback|失败|错误|异常', line, re.IGNORECASE):
                    errors.append({
                        "file": log_file,
                        "line": line.strip()
                    })
        except Exception as e:
            errors.append({
                "file": log_file,
                "error": f"无法读取日志文件: {str(e)}"
            })
    
    return errors

def check_file_permissions():
    """检查文件权限"""
    files_to_check = [
        os.path.join(CONFIG["python_service_dir"], "main.py"),
        os.path.join(CONFIG["python_service_dir"], "api", "app.py"),
        os.path.join(CONFIG["python_service_dir"], "api", "routes", "ocr_routes.py")
    ]
    
    results = []
    
    for file_path in files_to_check:
        if os.path.exists(file_path):
            try:
                # 获取文件权限
                stat_info = os.stat(file_path)
                mode = stat_info.st_mode
                
                results.append({
                    "file": file_path,
                    "exists": True,
                    "readable": os.access(file_path, os.R_OK),
                    "writable": os.access(file_path, os.W_OK),
                    "executable": os.access(file_path, os.X_OK),
                    "mode": oct(mode)[-3:]  # 获取权限的八进制表示
                })
            except Exception as e:
                results.append({
                    "file": file_path,
                    "exists": True,
                    "error": str(e)
                })
        else:
            results.append({
                "file": file_path,
                "exists": False
            })
    
    return results

def check_network_connections():
    """检查网络连接"""
    connections = []
    
    for proc in find_processes():
        try:
            process = psutil.Process(proc['pid'])
            proc_connections = process.connections()
            
            for conn in proc_connections:
                if conn.status == 'LISTEN':
                    connections.append({
                        'pid': proc['pid'],
                        'local_address': f"{conn.laddr.ip}:{conn.laddr.port}",
                        'status': conn.status
                    })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    
    return connections

def run_diagnostics():
    """运行诊断"""
    print_header("Python服务健康检查诊断")
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"主机: {CONFIG['host']}")
    print(f"端口: {CONFIG['port']}")
    
    # 检查端口
    print_section("端口检查")
    port_open = check_port(CONFIG['host'], CONFIG['port'])
    print_result(f"端口 {CONFIG['port']}", "ok" if port_open else "error", 
                f"{'已开放' if port_open else '未开放'}")
    
    # 检查进程
    print_section("进程检查")
    processes = find_processes()
    if processes:
        print_result("服务进程", "ok", f"找到 {len(processes)} 个相关进程")
        for proc in processes:
            print(f"  PID: {proc['pid']}, 命令: {proc['cmdline'][:80]}..." if len(proc['cmdline']) > 80 else f"  PID: {proc['pid']}, 命令: {proc['cmdline']}")
    else:
        print_result("服务进程", "error", "未找到服务进程")
    
    # 检查网络连接
    print_section("网络连接")
    connections = check_network_connections()
    if connections:
        print_result("监听连接", "ok", f"找到 {len(connections)} 个监听连接")
        for conn in connections:
            print(f"  PID: {conn['pid']}, 地址: {conn['local_address']}, 状态: {conn['status']}")
    else:
        print_result("监听连接", "error", "未找到监听连接")
    
    # 检查API端点
    print_section("API端点检查")
    for endpoint in CONFIG["endpoints"]:
        url = f"http://{CONFIG['host']}:{CONFIG['port']}{endpoint}"
        print(f"\n检查端点: {url}")
        
        results = check_endpoint(url)
        
        for i, result in enumerate(results):
            if result.get("status") == "ok":
                print_result(f"尝试 {result['attempt']}/{CONFIG['retry_count']}", "ok", 
                            f"状态码: {result['status_code']}, 响应时间: {result['response_time']}ms, 内容类型: {result['content_type']}")
                if result.get("json"):
                    print(f"  响应JSON: {json.dumps(result['json'], ensure_ascii=False, indent=2)}")
                else:
                    print(f"  响应内容: {result['content']}")
            else:
                print_result(f"尝试 {result['attempt']}/{CONFIG['retry_count']}", "error", 
                            f"错误: {result.get('error_type', '')}: {result.get('error', '未知错误')}")
    
    # 检查日志错误
    print_section("日志错误检查")
    log_errors = check_log_errors()
    if log_errors:
        print_result("日志错误", "warning", f"找到 {len(log_errors)} 个错误")
        for error in log_errors[:10]:  # 只显示前10个错误
            print(f"  文件: {error['file']}")
            print(f"  内容: {error.get('line', error.get('error', '未知错误'))}")
    else:
        print_result("日志错误", "ok", "未发现明显错误")
    
    # 检查文件权限
    print_section("文件权限检查")
    file_permissions = check_file_permissions()
    for file_info in file_permissions:
        if not file_info["exists"]:
            print_result(file_info["file"], "error", "文件不存在")
        elif file_info.get("error"):
            print_result(file_info["file"], "error", file_info["error"])
        else:
            print_result(file_info["file"], "ok", 
                        f"权限: {file_info['mode']}, 可读: {file_info['readable']}, 可写: {file_info['writable']}, 可执行: {file_info['executable']}")
    
    # 诊断结论
    print_section("诊断结论")
    
    # 根据检查结果给出诊断结论
    if not port_open:
        print(Fore.RED + "问题: 服务端口未开放，服务可能未正常启动或被防火墙阻止")
        print(Fore.YELLOW + "建议: 检查服务启动日志，确保服务正常启动；检查防火墙设置")
    elif not processes:
        print(Fore.RED + "问题: 未找到服务进程，服务可能已崩溃或未启动")
        print(Fore.YELLOW + "建议: 尝试手动启动服务，检查启动脚本和日志")
    elif not connections:
        print(Fore.RED + "问题: 服务进程存在但未监听端口")
        print(Fore.YELLOW + "建议: 检查服务配置，确保服务正确绑定到端口")
    elif all(result[0].get("status") == "error" for result in [check_endpoint(f"http://{CONFIG['host']}:{CONFIG['port']}{endpoint}") for endpoint in CONFIG["endpoints"]]):
        print(Fore.RED + "问题: 所有API端点均无法访问，服务可能存在内部错误")
        print(Fore.YELLOW + "建议: 检查服务错误日志，可能存在代码错误或依赖问题")
    else:
        # 检查健康检查端点
        health_results = check_endpoint(f"http://{CONFIG['host']}:{CONFIG['port']}/health")
        if any(result.get("status") == "ok" for result in health_results):
            print(Fore.GREEN + "健康检查端点可以访问，但watchdog脚本可能存在问题")
            print(Fore.YELLOW + "建议: 检查watchdog脚本的健康检查逻辑，可能期望的响应格式与实际不符")
        else:
            print(Fore.RED + "问题: 健康检查端点无法访问，但其他端点可能正常")
            print(Fore.YELLOW + "建议: 检查健康检查端点的实现代码，可能存在路由注册问题或内部错误")
    
    print(f"\n诊断完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    try:
        run_diagnostics()
    except KeyboardInterrupt:
        print(Fore.YELLOW + "\n诊断被用户中断")
    except Exception as e:
        print(Fore.RED + f"\n诊断过程中发生错误: {str(e)}")
        traceback.print_exc()
