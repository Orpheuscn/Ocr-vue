#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
统一环境检测工具
提供统一的环境检测、配置加载和特性开关功能
"""

import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv


class EnvironmentDetector:
    """统一环境检测器"""

    def __init__(self):
        self._environment = None
        self._platform = None
        self._config_loaded = False
        self._base_dir = Path(__file__).parent.parent
        self._detect_and_load()

    def _detect_and_load(self):
        """检测环境并加载相应配置"""
        # 1. 检测环境
        self._environment = self._detect_environment()
        self._platform = self._detect_platform()

        # 2. 加载配置文件
        self._load_environment_config()

        # 3. 标记配置已加载
        self._config_loaded = True

        # 4. 输出环境信息
        self._log_environment_info()

    def _detect_environment(self) -> str:
        """检测当前运行环境"""
        # 优先级1: 显式设置的NODE_ENV
        node_env = os.getenv('NODE_ENV', '').lower()
        if node_env in ['production', 'development', 'test']:
            return node_env

        # 优先级2: 检测Cloud Run环境
        if self._is_cloud_run():
            return 'production'

        # 优先级3: 检测其他生产环境标识
        if self._is_production_environment():
            return 'production'

        # 默认: 开发环境
        return 'development'

    def _detect_platform(self) -> str:
        """检测运行平台"""
        if self._is_cloud_run():
            return 'cloud_run'
        elif self._is_google_cloud():
            return 'google_cloud'
        elif self._is_docker():
            return 'docker'
        else:
            return 'local'

    def _is_cloud_run(self) -> bool:
        """检测是否在Google Cloud Run中运行"""
        cloud_run_indicators = [
            'K_SERVICE',
            'K_REVISION',
            'K_CONFIGURATION',
            'CLOUD_RUN_JOB'
        ]
        return any(os.getenv(var) for var in cloud_run_indicators)

    def _is_google_cloud(self) -> bool:
        """检测是否在Google Cloud环境中运行"""
        gcp_indicators = [
            'GOOGLE_CLOUD_PROJECT',
            'GCLOUD_PROJECT',
            'GCP_PROJECT',
            'GOOGLE_COMPUTE_REGION',
            'GAE_APPLICATION',
            'GAE_ENV'
        ]
        return any(os.getenv(var) for var in gcp_indicators)

    def _is_docker(self) -> bool:
        """检测是否在Docker容器中运行"""
        return (
            os.path.exists('/.dockerenv') or
            os.getenv('DOCKER_CONTAINER') == 'true' or
            'docker' in os.getenv('HOSTNAME', '').lower()
        )

    def _is_production_environment(self) -> bool:
        """检测其他生产环境标识"""
        production_indicators = [
            ('FLASK_ENV', 'production'),
            ('ENVIRONMENT', 'production'),
            ('DEPLOY_ENV', 'production'),
            ('APP_ENV', 'production')
        ]

        for var, value in production_indicators:
            if os.getenv(var, '').lower() == value:
                return True

        return False

    def _get_config_file_path(self) -> Path:
        """获取配置文件路径"""
        if self.is_production():
            config_file = '.env.production'
        elif self.is_test():
            config_file = '.env.test'
        else:
            config_file = '.env.local'

        return self._base_dir / config_file

    def _load_environment_config(self):
        """加载环境配置文件"""
        config_file_path = self._get_config_file_path()

        if config_file_path.exists():
            load_dotenv(config_file_path)
            print(f"✅ 已加载环境配置文件: {config_file_path.name}")
        else:
            # 回退到默认配置
            default_env_path = self._base_dir / '.env'
            if default_env_path.exists():
                load_dotenv(default_env_path)
                print(f"⚠️  配置文件 {config_file_path.name} 不存在，已加载默认配置: .env")
            else:
                print(f"⚠️  未找到配置文件，使用系统环境变量")

    def _log_environment_info(self):
        """输出环境信息"""
        print(f"🌍 环境检测结果:")
        print(f"   - 运行环境: {self._environment}")
        print(f"   - 运行平台: {self._platform}")
        print(f"   - 配置文件: {self._get_config_file_path().name}")

        if self.is_development():
            print(f"   - 开发模式: 启用详细日志和调试功能")
        elif self.is_production():
            print(f"   - 生产模式: 优化性能和安全设置")

    # 基础环境检测方法
    def get_environment(self) -> str:
        """获取当前环境"""
        return self._environment

    def get_platform(self) -> str:
        """获取运行平台"""
        return self._platform

    def is_development(self) -> bool:
        """是否为开发环境"""
        return self._environment == 'development'

    def is_production(self) -> bool:
        """是否为生产环境"""
        return self._environment == 'production'

    def is_test(self) -> bool:
        """是否为测试环境"""
        return self._environment == 'test'

    def is_local(self) -> bool:
        """是否在本地运行"""
        return self._platform == 'local'

    def is_cloud(self) -> bool:
        """是否在云端运行"""
        return self._platform in ['cloud_run', 'google_cloud']

    # 功能开关方法
    def should_enable_debug_logs(self) -> bool:
        """是否启用调试日志"""
        return self.is_development() or os.getenv('ENABLE_DEBUG_LOGS', 'false').lower() == 'true'

    def should_enable_cors_debug(self) -> bool:
        """是否启用CORS调试"""
        return self.is_development()

    def should_use_detailed_error_messages(self) -> bool:
        """是否使用详细错误信息"""
        return self.is_development()

    def should_enable_file_cleanup(self) -> bool:
        """是否启用文件清理"""
        return self.is_production() or os.getenv('ENABLE_FILE_CLEANUP', 'true').lower() == 'true'

    def should_validate_uploads_strictly(self) -> bool:
        """是否严格验证上传文件"""
        return self.is_production()

    # 配置获取方法
    def get_flask_config(self) -> Dict[str, Any]:
        """获取Flask配置"""
        return {
            'DEBUG': self.is_development(),
            'TESTING': self.is_test(),
            'HOST': os.getenv('FLASK_HOST', '0.0.0.0'),
            'PORT': int(os.getenv('FLASK_PORT', 5001)),
            'MAX_CONTENT_LENGTH': int(os.getenv('MAX_CONTENT_LENGTH', 25000000))
        }

    def get_cors_config(self) -> Dict[str, Any]:
        """获取CORS配置"""
        if self.is_development():
            # 开发环境允许所有来源
            origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:8082,http://localhost:3000').split(',')
        else:
            # 生产环境严格限制
            origins = os.getenv('ALLOWED_ORIGINS', 'https://textistext.com').split(',')

        return {
            'origins': [origin.strip() for origin in origins],
            'supports_credentials': True,
            'allow_headers': ['Content-Type', 'Authorization', 'X-Requested-With'],
            'methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
        }

    def get_log_config(self) -> Dict[str, Any]:
        """获取日志配置"""
        if self.is_development():
            level = 'DEBUG'
        elif self.is_test():
            level = 'WARNING'
        else:
            level = 'INFO'

        return {
            'level': os.getenv('LOG_LEVEL', level),
            'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            'api_endpoint': os.getenv('LOG_API_ENDPOINT', ''),
            'enable_api_logging': bool(os.getenv('LOG_API_ENDPOINT'))
        }

    def get_api_config(self) -> Dict[str, Any]:
        """获取API配置"""
        return {
            'node_api_base_url': os.getenv('NODE_API_BASE_URL', 'http://localhost:3000'),
            'frontend_url': os.getenv('FRONTEND_URL', 'http://localhost:8082'),
            'rate_limit_per_minute': int(os.getenv('RATE_LIMIT_PER_MINUTE', 60)),
            'workers': int(os.getenv('WORKERS', 2))
        }

    def get_upload_config(self) -> Dict[str, Any]:
        """获取文件上传配置"""
        return {
            'upload_folder': os.getenv('UPLOAD_FOLDER', './uploads'),
            'results_folder': os.getenv('RESULTS_FOLDER', './temp'),
            'allowed_extensions': os.getenv('ALLOWED_EXTENSIONS', 'jpg,jpeg,png,gif,webp,heic,pdf').split(','),
            'max_file_size': int(os.getenv('MAX_CONTENT_LENGTH', 25000000))
        }


# 创建全局环境检测器实例
environment = EnvironmentDetector()


# 便捷函数，供其他模块直接使用
def is_development() -> bool:
    """是否为开发环境"""
    return environment.is_development()


def is_production() -> bool:
    """是否为生产环境"""
    return environment.is_production()


def is_test() -> bool:
    """是否为测试环境"""
    return environment.is_test()


def is_local() -> bool:
    """是否在本地运行"""
    return environment.is_local()


def is_cloud() -> bool:
    """是否在云端运行"""
    return environment.is_cloud()


def get_environment() -> str:
    """获取当前环境"""
    return environment.get_environment()


def get_platform() -> str:
    """获取运行平台"""
    return environment.get_platform()


def get_config(config_type: str) -> Dict[str, Any]:
    """获取指定类型的配置

    Args:
        config_type: 配置类型 ('flask', 'cors', 'log', 'api', 'upload')

    Returns:
        配置字典
    """
    config_methods = {
        'flask': environment.get_flask_config,
        'cors': environment.get_cors_config,
        'log': environment.get_log_config,
        'api': environment.get_api_config,
        'upload': environment.get_upload_config
    }

    if config_type not in config_methods:
        raise ValueError(f"不支持的配置类型: {config_type}")

    return config_methods[config_type]()


# 导出主要接口
__all__ = [
    'environment',
    'is_development',
    'is_production',
    'is_test',
    'is_local',
    'is_cloud',
    'get_environment',
    'get_platform',
    'get_config',
    'EnvironmentDetector'
]
