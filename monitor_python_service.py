#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Python服务监控脚本
用于实时监控Python服务的状态，并提供详细的诊断信息
"""

import os
import sys
import time
import json
import signal
import subprocess
import platform
import re
from datetime import datetime
from pathlib import Path
import threading
import queue
import socket

try:
    import psutil
    import requests
    from colorama import Fore, Back, Style, init
except ImportError:
    print("正在安装所需依赖...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psutil", "requests", "colorama"])
    import psutil
    import requests
    from colorama import Fore, Back, Style, init

# 初始化colorama
init(autoreset=True)

# 全局配置
CONFIG = {
    "service_name": "Python OCR服务",
    "host": "localhost",
    "port": 5000,
    "endpoints": [
        "/",
        "/health",
        "/ocr/status"
    ],
    "process_patterns": [
        "gunicorn.*main:create_app",
        "python.*main.py"
    ],
    "log_dir": "logs",
    "log_files": [
        "gunicorn_error.log",
        "gunicorn_access.log",
        "python-service-*.log",
        "watchdog.log"
    ],
    "refresh_interval": 2,  # 刷新间隔（秒）
    "max_log_lines": 20,    # 显示的最大日志行数
    "watchdog_pid_file": "logs/watchdog.pid",
    "python_service_pid_file": "logs/python-service.pid"
}

# 全局状态
STATE = {
    "running": True,
    "mode": "dashboard",  # dashboard, logs, endpoints, processes
    "selected_log": 0,
    "log_offset": 0,
    "last_error": None,
    "messages": queue.Queue(),
    "endpoints_status": {},
    "processes": [],
    "resources": {
        "cpu": 0,
        "memory": 0,
        "connections": 0
    }
}

def get_timestamp():
    """获取当前时间戳"""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def print_header(title):
    """打印带颜色的标题"""
    width = os.get_terminal_size().columns
    print(Fore.CYAN + "=" * width)
    print(Fore.CYAN + f" {title} ".center(width, "="))
    print(Fore.CYAN + "=" * width)

def print_section(title):
    """打印带颜色的小节标题"""
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

def find_processes():
    """查找Python服务相关进程"""
    processes = []
    
    for pattern in CONFIG["process_patterns"]:
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'cpu_percent', 'memory_percent', 'create_time']):
            try:
                cmdline = " ".join(proc.info['cmdline']) if proc.info['cmdline'] else ""
                if re.search(pattern, cmdline):
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

def check_endpoint(endpoint):
    """检查API端点状态"""
    url = f"http://{CONFIG['host']}:{CONFIG['port']}{endpoint}"
    try:
        start_time = time.time()
        response = requests.get(url, timeout=2)
        response_time = time.time() - start_time
        
        return {
            "status": "ok" if response.status_code == 200 else "error",
            "status_code": response.status_code,
            "response_time": round(response_time * 1000, 2),  # 毫秒
            "content": response.text[:100] + "..." if len(response.text) > 100 else response.text
        }
    except requests.exceptions.RequestException as e:
        return {
            "status": "error",
            "error": str(e),
            "status_code": None,
            "response_time": None,
            "content": None
        }

def check_port(port):
    """检查端口是否被占用"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex(('localhost', port))
        sock.close()
        return result == 0
    except:
        return False

def get_log_content(log_file, max_lines=None):
    """获取日志文件内容"""
    log_path = os.path.join(CONFIG["log_dir"], log_file)
    
    if not os.path.exists(log_path):
        return [f"日志文件不存在: {log_path}"]
    
    try:
        with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()
            
        if max_lines and len(lines) > max_lines:
            return lines[-max_lines:]
        return lines
    except Exception as e:
        return [f"读取日志文件出错: {str(e)}"]

def get_system_resources():
    """获取系统资源使用情况"""
    resources = {
        "cpu": psutil.cpu_percent(interval=0.1),
        "memory": psutil.virtual_memory().percent,
        "disk": psutil.disk_usage('/').percent,
        "connections": len(psutil.net_connections())
    }
    return resources

def update_state():
    """更新全局状态"""
    # 更新进程信息
    STATE["processes"] = find_processes()
    
    # 更新端点状态
    for endpoint in CONFIG["endpoints"]:
        STATE["endpoints_status"][endpoint] = check_endpoint(endpoint)
    
    # 更新资源使用情况
    STATE["resources"] = get_system_resources()

def render_dashboard():
    """渲染主仪表盘"""
    os.system('clear' if os.name == 'posix' else 'cls')
    print_header(f"{CONFIG['service_name']}监控仪表盘 - {get_timestamp()}")
    
    # 服务状态概览
    print_section("服务状态概览")
    
    # 检查进程状态
    if STATE["processes"]:
        master_process = next((p for p in STATE["processes"] if "master" in p["cmdline"]), STATE["processes"][0])
        worker_count = sum(1 for p in STATE["processes"] if "worker" in p["cmdline"])
        
        print_status("服务进程", "ok", 
                    f"主进程PID: {master_process['pid']}, 工作进程数: {worker_count}, "
                    f"运行时间: {int(master_process['running_time'] // 3600)}小时{int((master_process['running_time'] % 3600) // 60)}分钟")
    else:
        print_status("服务进程", "error", "未找到服务进程")
    
    # 检查端口状态
    port_status = check_port(CONFIG["port"])
    print_status(f"端口 {CONFIG['port']}", "ok" if port_status else "error", 
                f"{'已绑定' if port_status else '未绑定'}")
    
    # 检查健康检查端点
    health_status = STATE["endpoints_status"].get("/health", {})
    if health_status.get("status") == "ok":
        print_status("健康检查", "ok", f"响应时间: {health_status.get('response_time')}ms")
    else:
        print_status("健康检查", "error", f"错误: {health_status.get('error', '无法连接')}")
    
    # 资源使用情况
    print_section("资源使用情况")
    print(f"CPU使用率: {Fore.YELLOW if STATE['resources']['cpu'] > 70 else Fore.GREEN}{STATE['resources']['cpu']}%")
    print(f"内存使用率: {Fore.YELLOW if STATE['resources']['memory'] > 70 else Fore.GREEN}{STATE['resources']['memory']}%")
    print(f"磁盘使用率: {Fore.YELLOW if STATE['resources']['disk'] > 70 else Fore.GREEN}{STATE['resources']['disk']}%")
    print(f"网络连接数: {STATE['resources']['connections']}")
    
    # 最近日志
    print_section("最近错误日志")
    error_logs = get_log_content("gunicorn_error.log", 5)
    for line in error_logs:
        print(Fore.RED + line.strip())
    
    # 操作提示
    print_section("操作选项")
    print(Fore.CYAN + "l: 查看日志  e: 检查端点  p: 查看进程  r: 刷新  q: 退出")

def render_logs():
    """渲染日志视图"""
    os.system('clear' if os.name == 'posix' else 'cls')
    
    log_files = CONFIG["log_files"]
    selected_log = log_files[STATE["selected_log"] % len(log_files)]
    
    print_header(f"日志查看 - {selected_log}")
    
    log_content = get_log_content(selected_log, CONFIG["max_log_lines"])
    for line in log_content:
        # 根据日志级别着色
        if "error" in line.lower() or "错误" in line:
            print(Fore.RED + line.strip())
        elif "warn" in line.lower() or "警告" in line:
            print(Fore.YELLOW + line.strip())
        elif "info" in line.lower() or "信息" in line:
            print(Fore.GREEN + line.strip())
        else:
            print(line.strip())
    
    print_section("操作选项")
    print(Fore.CYAN + "n: 下一个日志  p: 上一个日志  d: 返回仪表盘  r: 刷新  q: 退出")

def render_endpoints():
    """渲染端点检查视图"""
    os.system('clear' if os.name == 'posix' else 'cls')
    print_header("API端点检查")
    
    for endpoint in CONFIG["endpoints"]:
        status = STATE["endpoints_status"].get(endpoint, {})
        
        if status.get("status") == "ok":
            print(f"{Fore.GREEN}✓ {endpoint}")
            print(f"  状态码: {status.get('status_code')}")
            print(f"  响应时间: {status.get('response_time')}ms")
            print(f"  响应内容: {status.get('content')}")
        else:
            print(f"{Fore.RED}✗ {endpoint}")
            print(f"  错误: {status.get('error', '无法连接')}")
        
        print()
    
    print_section("操作选项")
    print(Fore.CYAN + "d: 返回仪表盘  r: 刷新  q: 退出")

def render_processes():
    """渲染进程视图"""
    os.system('clear' if os.name == 'posix' else 'cls')
    print_header("服务进程")
    
    if not STATE["processes"]:
        print(Fore.RED + "未找到服务进程")
    else:
        for i, proc in enumerate(STATE["processes"]):
            if "master" in proc["cmdline"]:
                print(f"{Fore.CYAN}● 主进程 (PID: {proc['pid']})")
            else:
                print(f"{Fore.GREEN}○ 工作进程 (PID: {proc['pid']})")
            
            print(f"  命令: {proc['cmdline'][:80]}..." if len(proc['cmdline']) > 80 else f"  命令: {proc['cmdline']}")
            print(f"  CPU: {proc['cpu_percent']}%  内存: {proc['memory_percent']:.2f}%")
            print(f"  启动时间: {proc['create_time']}")
            print(f"  运行时间: {int(proc['running_time'] // 3600)}小时{int((proc['running_time'] % 3600) // 60)}分钟{int(proc['running_time'] % 60)}秒")
            print()
    
    print_section("操作选项")
    print(Fore.CYAN + "d: 返回仪表盘  r: 刷新  q: 退出")

def handle_input():
    """处理用户输入"""
    while STATE["running"]:
        try:
            key = input().lower()
            
            if key == 'q':
                STATE["running"] = False
            elif key == 'r':
                update_state()
            elif key == 'd':
                STATE["mode"] = "dashboard"
            elif key == 'l':
                STATE["mode"] = "logs"
            elif key == 'e':
                STATE["mode"] = "endpoints"
            elif key == 'p':
                STATE["mode"] = "processes"
            elif key == 'n' and STATE["mode"] == "logs":
                STATE["selected_log"] += 1
            elif key == 'p' and STATE["mode"] == "logs":
                STATE["selected_log"] -= 1
        except Exception as e:
            STATE["last_error"] = str(e)

def main():
    """主函数"""
    print(Fore.CYAN + "正在启动Python服务监控...")
    
    # 创建输入处理线程
    input_thread = threading.Thread(target=handle_input, daemon=True)
    input_thread.start()
    
    try:
        while STATE["running"]:
            update_state()
            
            if STATE["mode"] == "dashboard":
                render_dashboard()
            elif STATE["mode"] == "logs":
                render_logs()
            elif STATE["mode"] == "endpoints":
                render_endpoints()
            elif STATE["mode"] == "processes":
                render_processes()
            
            time.sleep(CONFIG["refresh_interval"])
    except KeyboardInterrupt:
        print(Fore.YELLOW + "\n正在退出监控...")
    except Exception as e:
        print(Fore.RED + f"\n发生错误: {str(e)}")
    finally:
        STATE["running"] = False
        print(Fore.CYAN + "监控已停止")

if __name__ == "__main__":
    main()
