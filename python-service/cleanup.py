#!/usr/bin/env python3
"""
清理脚本 - 用于定期清理临时文件和缓存
功能：
1. 清理uploads文件夹中超过指定天数的文件
2. 清理__pycache__文件夹中的所有文件
"""

import os
import sys
import time
import shutil
import logging
import argparse
from datetime import datetime, timedelta
from pathlib import Path

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(os.path.join(os.path.dirname(__file__), '..', 'logs', 'cleanup.log'))
    ]
)
logger = logging.getLogger('cleanup')

def get_file_age_days(file_path):
    """获取文件的年龄（天数）"""
    try:
        mtime = os.path.getmtime(file_path)
        file_datetime = datetime.fromtimestamp(mtime)
        age = datetime.now() - file_datetime
        return age.days
    except Exception as e:
        logger.error(f"获取文件年龄时出错: {e}")
        return 0

def cleanup_uploads(uploads_dir, max_age_days=7, dry_run=False):
    """
    清理uploads文件夹中超过指定天数的文件
    
    Args:
        uploads_dir: uploads文件夹路径
        max_age_days: 文件保留的最大天数
        dry_run: 如果为True，只显示要删除的文件但不实际删除
    """
    logger.info(f"开始清理uploads文件夹: {uploads_dir}")
    logger.info(f"将删除超过 {max_age_days} 天的文件")
    
    if not os.path.exists(uploads_dir):
        logger.warning(f"uploads文件夹不存在: {uploads_dir}")
        return
    
    deleted_count = 0
    deleted_size = 0
    
    # 遍历uploads文件夹
    for root, dirs, files in os.walk(uploads_dir):
        for file in files:
            file_path = os.path.join(root, file)
            
            # 跳过.gitkeep文件
            if file == '.gitkeep':
                continue
                
            # 获取文件年龄
            age_days = get_file_age_days(file_path)
            
            # 如果文件超过最大年龄，删除它
            if age_days >= max_age_days:
                try:
                    file_size = os.path.getsize(file_path)
                    if dry_run:
                        logger.info(f"[DRY RUN] 将删除: {file_path} (年龄: {age_days}天, 大小: {file_size/1024:.2f}KB)")
                    else:
                        os.remove(file_path)
                        logger.info(f"已删除: {file_path} (年龄: {age_days}天, 大小: {file_size/1024:.2f}KB)")
                    deleted_count += 1
                    deleted_size += file_size
                except Exception as e:
                    logger.error(f"删除文件时出错: {file_path}, 错误: {e}")
    
    # 清理空文件夹（保留uploads根目录）
    if not dry_run:
        for root, dirs, files in os.walk(uploads_dir, topdown=False):
            if root != uploads_dir:  # 不删除uploads根目录
                try:
                    if not os.listdir(root):  # 如果目录为空
                        os.rmdir(root)
                        logger.info(f"已删除空文件夹: {root}")
                except Exception as e:
                    logger.error(f"删除空文件夹时出错: {root}, 错误: {e}")
    
    logger.info(f"uploads清理完成: 删除了 {deleted_count} 个文件, 总大小: {deleted_size/1024/1024:.2f}MB")

def cleanup_pycache(app_dir, dry_run=False):
    """
    清理__pycache__文件夹
    
    Args:
        app_dir: 应用根目录
        dry_run: 如果为True，只显示要删除的文件但不实际删除
    """
    logger.info(f"开始清理__pycache__文件夹")
    
    deleted_count = 0
    deleted_size = 0
    
    # 查找所有__pycache__文件夹
    for root, dirs, files in os.walk(app_dir):
        for dir_name in dirs:
            if dir_name == '__pycache__':
                pycache_dir = os.path.join(root, dir_name)
                dir_size = sum(os.path.getsize(os.path.join(pycache_dir, f)) for f in os.listdir(pycache_dir) if os.path.isfile(os.path.join(pycache_dir, f)))
                
                if dry_run:
                    logger.info(f"[DRY RUN] 将删除: {pycache_dir} (大小: {dir_size/1024:.2f}KB)")
                else:
                    try:
                        shutil.rmtree(pycache_dir)
                        logger.info(f"已删除: {pycache_dir} (大小: {dir_size/1024:.2f}KB)")
                        deleted_count += 1
                        deleted_size += dir_size
                    except Exception as e:
                        logger.error(f"删除__pycache__文件夹时出错: {pycache_dir}, 错误: {e}")
    
    logger.info(f"__pycache__清理完成: 删除了 {deleted_count} 个文件夹, 总大小: {deleted_size/1024/1024:.2f}MB")

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='清理临时文件和缓存')
    parser.add_argument('--uploads-dir', type=str, help='uploads文件夹路径')
    parser.add_argument('--app-dir', type=str, help='应用根目录')
    parser.add_argument('--max-age', type=int, default=7, help='文件保留的最大天数（默认7天）')
    parser.add_argument('--dry-run', action='store_true', help='只显示要删除的文件但不实际删除')
    args = parser.parse_args()
    
    # 获取应用根目录
    app_dir = args.app_dir or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # 获取uploads文件夹路径
    uploads_dir = args.uploads_dir or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    
    logger.info(f"应用根目录: {app_dir}")
    logger.info(f"uploads文件夹: {uploads_dir}")
    logger.info(f"最大文件年龄: {args.max_age}天")
    logger.info(f"模拟运行: {args.dry_run}")
    
    # 清理uploads文件夹
    cleanup_uploads(uploads_dir, args.max_age, args.dry_run)
    
    # 清理__pycache__文件夹
    cleanup_pycache(app_dir, args.dry_run)

if __name__ == '__main__':
    main()
