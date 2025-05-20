#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
文件哈希工具模块 - 提供文件哈希计算和检查功能
这个模块负责计算文件哈希值，检查文件是否重复，以及管理文件引用
"""

import os
import hashlib
import json
import shutil
from pathlib import Path
from typing import Dict, Optional, Tuple, List, Union

from utils.log_client import info, error, warn

# 哈希数据库文件路径
HASH_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'file_hashes.json')

# 确保数据目录存在
try:
    os.makedirs(os.path.dirname(HASH_DB_PATH), exist_ok=True)
except Exception as e:
    error(f"创建数据目录失败: {e}")
    # 使用备用路径
    HASH_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'temp', 'file_hashes.json')
    os.makedirs(os.path.dirname(HASH_DB_PATH), exist_ok=True)

class FileHashManager:
    """文件哈希管理器，处理文件哈希计算、检查和引用"""

    def __init__(self):
        """初始化文件哈希管理器"""
        self.hash_db = self._load_hash_db()

    def _load_hash_db(self) -> Dict:
        """加载哈希数据库"""
        if os.path.exists(HASH_DB_PATH):
            try:
                with open(HASH_DB_PATH, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                error(f"加载哈希数据库失败: {e}")
                return {"files": {}}
        else:
            return {"files": {}}

    def _save_hash_db(self):
        """保存哈希数据库"""
        try:
            with open(HASH_DB_PATH, 'w', encoding='utf-8') as f:
                json.dump(self.hash_db, f, ensure_ascii=False, indent=2)
        except Exception as e:
            error(f"保存哈希数据库失败: {e}")

    def calculate_file_hash(self, file_path: Union[str, Path]) -> str:
        """
        计算文件的MD5哈希值

        Args:
            file_path: 文件路径

        Returns:
            str: 文件的MD5哈希值
        """
        file_path = Path(file_path)
        if not file_path.exists():
            error(f"文件不存在，无法计算哈希值: {file_path}")
            return ""

        try:
            md5_hash = hashlib.md5()
            with open(file_path, "rb") as f:
                # 读取文件块并更新哈希
                for chunk in iter(lambda: f.read(4096), b""):
                    md5_hash.update(chunk)
            return md5_hash.hexdigest()
        except Exception as e:
            error(f"计算文件哈希值失败: {e}")
            return ""

    def add_file(self, file_path: Union[str, Path], category: str) -> Tuple[str, bool]:
        """
        添加文件到哈希数据库

        Args:
            file_path: 文件路径
            category: 文件类别 (original, detect, crop, zip)

        Returns:
            Tuple[str, bool]: (文件哈希值, 是否为新文件)
        """
        file_path = Path(file_path)
        if not file_path.exists():
            error(f"文件不存在，无法添加: {file_path}")
            return "", False

        # 计算文件哈希值
        file_hash = self.calculate_file_hash(file_path)
        if not file_hash:
            return "", False

        # 检查是否已存在相同哈希的文件
        is_new = True
        if file_hash in self.hash_db["files"]:
            # 文件已存在，添加新的引用路径
            if str(file_path) not in self.hash_db["files"][file_hash]["paths"]:
                self.hash_db["files"][file_hash]["paths"].append(str(file_path))
            is_new = False
        else:
            # 添加新文件
            self.hash_db["files"][file_hash] = {
                "category": category,
                "paths": [str(file_path)],
                "created_at": os.path.getmtime(file_path)
            }

        # 保存哈希数据库
        self._save_hash_db()
        return file_hash, is_new

    def get_file_by_hash(self, file_hash: str) -> Optional[str]:
        """
        通过哈希值获取文件路径

        Args:
            file_hash: 文件哈希值

        Returns:
            Optional[str]: 文件路径，如果不存在则返回None
        """
        if file_hash in self.hash_db["files"] and self.hash_db["files"][file_hash]["paths"]:
            # 返回第一个存在的文件路径
            for path in self.hash_db["files"][file_hash]["paths"]:
                if os.path.exists(path):
                    return path
        return None

    def check_file_exists(self, file_path: Union[str, Path]) -> Tuple[bool, Optional[str]]:
        """
        检查文件是否已存在（基于内容哈希）

        Args:
            file_path: 要检查的文件路径

        Returns:
            Tuple[bool, Optional[str]]: (是否存在, 如果存在则返回哈希值)
        """
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                return False, None

            # 计算文件哈希值
            file_hash = self.calculate_file_hash(file_path)
            if not file_hash:
                return False, None

            # 检查哈希值是否存在
            if file_hash in self.hash_db["files"]:
                # 检查是否有存在的文件
                for path in self.hash_db["files"][file_hash]["paths"]:
                    if os.path.exists(path) and path != str(file_path):
                        return True, file_hash

            return False, file_hash
        except Exception as e:
            error(f"检查文件是否存在时出错: {e}")
            return False, None

    def create_file_reference(self, source_path: Union[str, Path], target_path: Union[str, Path],
                             category: str) -> bool:
        """
        创建文件引用（如果内容相同则创建硬链接或复制）

        Args:
            source_path: 源文件路径
            target_path: 目标文件路径
            category: 文件类别

        Returns:
            bool: 是否成功创建引用
        """
        source_path = Path(source_path)
        target_path = Path(target_path)

        if not source_path.exists():
            error(f"源文件不存在: {source_path}")
            return False

        # 确保目标目录存在
        target_path.parent.mkdir(parents=True, exist_ok=True)

        # 检查源文件是否已在哈希数据库中
        file_hash = self.calculate_file_hash(source_path)
        if not file_hash:
            return False

        try:
            # 如果目标文件已存在且哈希值相同，不需要操作
            if target_path.exists():
                target_hash = self.calculate_file_hash(target_path)
                if target_hash == file_hash:
                    # 确保在哈希数据库中
                    self.add_file(target_path, category)
                    return True
                else:
                    # 哈希值不同，删除目标文件
                    target_path.unlink()

            # 创建硬链接（如果可能）或复制文件
            try:
                # 尝试创建硬链接
                os.link(source_path, target_path)
                info(f"创建硬链接: {source_path} -> {target_path}")
            except OSError:
                # 如果硬链接失败，复制文件
                shutil.copy2(source_path, target_path)
                info(f"复制文件: {source_path} -> {target_path}")

            # 添加到哈希数据库
            self.add_file(target_path, category)
            return True

        except Exception as e:
            error(f"创建文件引用失败: {e}")
            return False

    def get_existing_file_path(self, file_path: Union[str, Path]) -> Optional[str]:
        """
        获取与给定文件内容相同的已存在文件的路径

        Args:
            file_path: 文件路径

        Returns:
            Optional[str]: 已存在的文件路径，如果不存在则返回None
        """
        exists, file_hash = self.check_file_exists(file_path)
        if exists and file_hash:
            return self.get_file_by_hash(file_hash)
        return None

# 单例模式
_file_hash_manager = None

def get_file_hash_manager() -> FileHashManager:
    """
    获取文件哈希管理器实例

    Returns:
        FileHashManager: 文件哈希管理器实例
    """
    global _file_hash_manager
    try:
        if _file_hash_manager is None:
            _file_hash_manager = FileHashManager()
        return _file_hash_manager
    except Exception as e:
        error(f"获取文件哈希管理器实例时出错: {e}")
        # 创建一个空的哈希管理器，避免程序崩溃
        class DummyFileHashManager:
            def __init__(self):
                pass

            def calculate_file_hash(self, file_path):
                return ""

            def add_file(self, file_path, category):
                return "", False

            def get_file_by_hash(self, file_hash):
                return None

            def check_file_exists(self, file_path):
                return False, None

            def create_file_reference(self, source_path, target_path, category):
                try:
                    # 简单复制文件
                    shutil.copy2(source_path, target_path)
                    return True
                except:
                    return False

            def get_existing_file_path(self, file_path):
                return None

        return DummyFileHashManager()
