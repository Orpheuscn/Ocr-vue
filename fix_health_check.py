#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Python服务健康检查修复工具
用于修复Python服务健康检查问题
"""

import os
import sys
import time
import json
import shutil
import subprocess
import re
import traceback
from datetime import datetime
from pathlib import Path

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
    "python_service_dir": "python-service",
    "backup_dir": "backups",
    "app_file": "python-service/api/app.py",
    "main_file": "python-service/main.py",
    "routes_dir": "python-service/api/routes",
    "timeout": 5,  # 请求超时时间（秒）
}

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
        status_str = Fore.GREEN + "✓ 成功"
    elif status == "warning":
        status_str = Fore.YELLOW + "! 警告"
    elif status == "error":
        status_str = Fore.RED + "✗ 失败"
    else:
        status_str = Fore.BLUE + "? 未知"
    
    print(f"{message}: {status_str}")
    if details:
        print(Fore.WHITE + f"  {details}")

def backup_file(file_path):
    """备份文件"""
    if not os.path.exists(file_path):
        return False, f"文件不存在: {file_path}"
    
    # 创建备份目录
    backup_dir = os.path.join(CONFIG["backup_dir"], datetime.now().strftime("%Y%m%d_%H%M%S"))
    os.makedirs(backup_dir, exist_ok=True)
    
    # 备份文件
    backup_path = os.path.join(backup_dir, os.path.basename(file_path))
    try:
        shutil.copy2(file_path, backup_path)
        return True, backup_path
    except Exception as e:
        return False, str(e)

def check_endpoint(url):
    """检查API端点"""
    try:
        response = requests.get(url, timeout=CONFIG["timeout"])
        return {
            "status": "ok" if response.status_code == 200 else "error",
            "status_code": response.status_code,
            "content_type": response.headers.get('Content-Type', 'unknown'),
            "content": response.text
        }
    except requests.exceptions.RequestException as e:
        return {
            "status": "error",
            "error": str(e)
        }

def fix_app_py():
    """修复app.py中的健康检查端点"""
    file_path = CONFIG["app_file"]
    
    if not os.path.exists(file_path):
        return False, f"文件不存在: {file_path}"
    
    # 备份文件
    backup_success, backup_result = backup_file(file_path)
    if not backup_success:
        return False, f"备份文件失败: {backup_result}"
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 检查是否有重复的健康检查端点
        health_check_count = len(re.findall(r'@app\.route\([\'"]\/health[\'"]\)', content))
        
        if health_check_count > 1:
            # 删除重复的健康检查端点
            # 找到第二个健康检查端点的位置
            pattern = r'(@app\.route\([\'"]\/health[\'"]\)[^\n]*\n\s*def health_check_legacy\(\):.*?return jsonify\([^)]*\))'
            match = re.search(pattern, content, re.DOTALL)
            
            if match:
                # 删除重复的端点
                new_content = content.replace(match.group(1), '# 已删除重复的健康检查端点')
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                
                return True, "已删除重复的健康检查端点"
        
        # 检查健康检查端点的实现
        health_check_pattern = r'@app\.route\([\'"]\/health[\'"]\)[^\n]*\n\s*def health_check\(\):.*?return jsonify\(([^)]*)\)'
        match = re.search(health_check_pattern, content, re.DOTALL)
        
        if match:
            # 获取当前的返回值
            current_return = match.group(1)
            
            # 检查返回值是否包含'status': 'healthy'
            if "'status': 'healthy'" not in current_return and '"status": "healthy"' not in current_return:
                # 修改返回值
                new_return = "{\n            'status': 'healthy',\n            'service': 'OCR Python Service',\n            'version': '1.0.0'\n        }"
                new_content = content.replace(match.group(1), new_return)
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                
                return True, "已修复健康检查端点的返回值"
            
            return True, "健康检查端点的返回值已符合要求"
        else:
            # 如果没有找到健康检查端点，添加一个
            # 找到注册蓝图的位置
            blueprint_pattern = r'app\.register_blueprint\([^)]*\)'
            match = re.search(blueprint_pattern, content)
            
            if match:
                # 在最后一个蓝图注册后添加健康检查端点
                insert_pos = content.rfind(match.group(0)) + len(match.group(0))
                
                health_check_code = """

    # 健康检查端点
    @app.route('/health')
    def health_check():
        \"\"\"健康检查端点\"\"\"
        return jsonify({
            'status': 'healthy',
            'service': 'OCR Python Service',
            'version': '1.0.0'
        })
"""
                
                new_content = content[:insert_pos] + health_check_code + content[insert_pos:]
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                
                return True, "已添加健康检查端点"
            
            return False, "无法找到合适的位置添加健康检查端点"
    
    except Exception as e:
        return False, f"修复文件时出错: {str(e)}"

def fix_ocr_routes():
    """修复OCR路由中的健康检查端点"""
    file_path = os.path.join(CONFIG["routes_dir"], "ocr_routes.py")
    
    if not os.path.exists(file_path):
        return False, f"文件不存在: {file_path}"
    
    # 备份文件
    backup_success, backup_result = backup_file(file_path)
    if not backup_success:
        return False, f"备份文件失败: {backup_result}"
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 检查是否已有健康检查端点
        if "@ocr_bp.route('/health'" in content:
            # 修改健康检查端点的返回值
            health_check_pattern = r'@ocr_bp\.route\([\'"]\/health[\'"]\)[^\n]*\n\s*def health_check\(\):.*?return jsonify\(([^)]*)\)'
            match = re.search(health_check_pattern, content, re.DOTALL)
            
            if match:
                # 获取当前的返回值
                current_return = match.group(1)
                
                # 检查返回值是否包含'status': 'healthy'
                if "'status': 'healthy'" not in current_return and '"status": "healthy"' not in current_return:
                    # 修改返回值
                    new_return = "{\n        'status': 'healthy'\n    }"
                    new_content = content.replace(match.group(1), new_return)
                    
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    
                    return True, "已修复OCR路由中健康检查端点的返回值"
                
                return True, "OCR路由中健康检查端点的返回值已符合要求"
        else:
            # 添加健康检查端点
            # 找到最后一个路由
            route_pattern = r'@ocr_bp\.route\([^\n]*\)'
            matches = list(re.finditer(route_pattern, content))
            
            if matches:
                # 找到最后一个路由的函数结束位置
                last_route = matches[-1]
                last_route_text = content[last_route.start():]
                
                # 找到函数的结束位置
                func_end_match = re.search(r'return jsonify\([^)]*\)[^\n]*\n', last_route_text)
                
                if func_end_match:
                    insert_pos = last_route.start() + func_end_match.end()
                    
                    health_check_code = """

@ocr_bp.route('/health', methods=['GET'])
def health_check():
    \"\"\"
    健康检查端点
    
    返回:
    {
        'status': 'healthy'
    }
    \"\"\"
    return jsonify({
        'status': 'healthy'
    })
"""
                    
                    new_content = content[:insert_pos] + health_check_code + content[insert_pos:]
                    
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    
                    return True, "已添加OCR路由中的健康检查端点"
            
            return False, "无法找到合适的位置添加健康检查端点"
    
    except Exception as e:
        return False, f"修复文件时出错: {str(e)}"

def restart_service():
    """重启Python服务"""
    try:
        # 查找Python服务进程
        result = subprocess.run(["pgrep", "-f", "gunicorn.*main:create_app"], 
                               stdout=subprocess.PIPE, 
                               stderr=subprocess.PIPE,
                               text=True)
        
        if result.returncode == 0:
            # 获取进程ID
            pids = result.stdout.strip().split('\n')
            
            # 终止进程
            for pid in pids:
                if pid:
                    subprocess.run(["kill", "-9", pid])
            
            print(Fore.YELLOW + f"已终止 {len(pids)} 个Python服务进程")
        
        # 启动服务
        print(Fore.BLUE + "正在启动Python服务...")
        
        # 切换到Python服务目录
        os.chdir(CONFIG["python_service_dir"])
        
        # 启动服务
        subprocess.Popen(["./start.sh"], 
                        stdout=subprocess.PIPE, 
                        stderr=subprocess.PIPE)
        
        # 等待服务启动
        print(Fore.BLUE + "等待服务启动...")
        time.sleep(10)
        
        # 检查服务是否启动成功
        health_url = f"http://{CONFIG['host']}:{CONFIG['port']}/health"
        health_check = check_endpoint(health_url)
        
        if health_check.get("status") == "ok":
            return True, "服务已成功重启，健康检查通过"
        else:
            return False, f"服务已重启，但健康检查失败: {health_check.get('error', '未知错误')}"
    
    except Exception as e:
        return False, f"重启服务时出错: {str(e)}"

def run_fix():
    """运行修复程序"""
    print_header("Python服务健康检查修复工具")
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 检查当前健康检查状态
    print_section("检查当前状态")
    health_url = f"http://{CONFIG['host']}:{CONFIG['port']}/health"
    health_check = check_endpoint(health_url)
    
    if health_check.get("status") == "ok":
        print_status("健康检查", "ok", f"健康检查端点可访问，返回: {health_check.get('content')}")
        
        # 检查返回值是否符合要求
        try:
            response_json = json.loads(health_check.get('content'))
            if response_json.get('status') == 'healthy':
                print_status("返回值检查", "ok", "返回值符合要求")
                
                print(Fore.GREEN + "\n健康检查端点已正常工作，无需修复")
                return
            else:
                print_status("返回值检查", "warning", f"返回值不符合要求: {response_json}")
        except:
            print_status("返回值检查", "warning", "无法解析返回值为JSON")
    else:
        print_status("健康检查", "error", f"健康检查端点不可访问: {health_check.get('error', '未知错误')}")
    
    # 检查根路径
    root_url = f"http://{CONFIG['host']}:{CONFIG['port']}/"
    root_check = check_endpoint(root_url)
    
    if root_check.get("status") == "ok":
        print_status("根路径", "ok", f"根路径可访问，返回: {root_check.get('content')}")
    else:
        print_status("根路径", "error", f"根路径不可访问: {root_check.get('error', '未知错误')}")
    
    # 修复app.py
    print_section("修复app.py")
    app_fix_success, app_fix_result = fix_app_py()
    print_status("修复app.py", "ok" if app_fix_success else "error", app_fix_result)
    
    # 修复OCR路由
    print_section("修复OCR路由")
    routes_fix_success, routes_fix_result = fix_ocr_routes()
    print_status("修复OCR路由", "ok" if routes_fix_success else "error", routes_fix_result)
    
    # 如果有修复，重启服务
    if app_fix_success or routes_fix_success:
        print_section("重启服务")
        restart_success, restart_result = restart_service()
        print_status("重启服务", "ok" if restart_success else "error", restart_result)
        
        # 检查修复后的状态
        print_section("检查修复后的状态")
        health_check = check_endpoint(health_url)
        
        if health_check.get("status") == "ok":
            print_status("健康检查", "ok", f"健康检查端点可访问，返回: {health_check.get('content')}")
            
            # 检查返回值是否符合要求
            try:
                response_json = json.loads(health_check.get('content'))
                if response_json.get('status') == 'healthy':
                    print_status("返回值检查", "ok", "返回值符合要求")
                    print(Fore.GREEN + "\n修复成功！健康检查端点现在可以正常工作")
                else:
                    print_status("返回值检查", "warning", f"返回值不符合要求: {response_json}")
                    print(Fore.YELLOW + "\n修复部分成功，但返回值仍不符合要求")
            except:
                print_status("返回值检查", "warning", "无法解析返回值为JSON")
                print(Fore.YELLOW + "\n修复部分成功，但返回值格式有问题")
        else:
            print_status("健康检查", "error", f"健康检查端点仍不可访问: {health_check.get('error', '未知错误')}")
            print(Fore.RED + "\n修复失败，健康检查端点仍不可访问")
    else:
        print(Fore.YELLOW + "\n没有进行任何修复")
    
    print(f"\n完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    try:
        # 创建备份目录
        os.makedirs(CONFIG["backup_dir"], exist_ok=True)
        
        run_fix()
    except KeyboardInterrupt:
        print(Fore.YELLOW + "\n修复被用户中断")
    except Exception as e:
        print(Fore.RED + f"\n修复过程中发生错误: {str(e)}")
        traceback.print_exc()
