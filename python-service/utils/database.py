"""
数据库工具模块
提供MongoDB连接和基本操作
"""

import os
import logging
from pymongo import MongoClient
from pymongo.database import Database

logger = logging.getLogger(__name__)

# 全局数据库连接
_db_client = None
_database = None

def get_database() -> Database:
    """获取数据库连接"""
    global _db_client, _database
    
    if _database is None:
        try:
            # 从环境变量获取MongoDB连接信息
            mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
            db_name = os.getenv('MONGODB_DB_NAME', 'ocr_app')
            
            # 创建MongoDB客户端
            _db_client = MongoClient(mongo_uri)
            _database = _db_client[db_name]
            
            # 测试连接
            _database.command('ping')
            logger.info(f"成功连接到MongoDB数据库: {db_name}")
            
        except Exception as e:
            logger.error(f"连接MongoDB失败: {e}")
            raise
    
    return _database

def close_database():
    """关闭数据库连接"""
    global _db_client, _database
    
    if _db_client:
        _db_client.close()
        _db_client = None
        _database = None
        logger.info("MongoDB连接已关闭")
