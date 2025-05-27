// src/utils/environment.js

/**
 * 前端统一环境检测工具
 * 提供统一的环境检测、配置管理和功能开关
 */

/**
 * 环境检测器类
 */
class EnvironmentDetector {
  constructor() {
    this._environment = null
    this._platform = null
    this._initialized = false
    this._init()
  }

  /**
   * 初始化环境检测
   */
  _init() {
    if (this._initialized) return

    // 检测环境和平台
    this._environment = this._detectEnvironment()
    this._platform = this._detectPlatform()
    this._initialized = true

    // 输出环境信息
    this._logEnvironmentInfo()
  }

  /**
   * 检测当前运行环境
   */
  _detectEnvironment() {
    // 优先级1: Vite内置环境检测
    if (import.meta.env.PROD) {
      return 'production'
    }
    if (import.meta.env.DEV) {
      return 'development'
    }

    // 优先级2: 显式设置的NODE_ENV
    const nodeEnv = import.meta.env.VITE_NODE_ENV || import.meta.env.NODE_ENV
    if (nodeEnv) {
      const env = nodeEnv.toLowerCase()
      if (['production', 'development', 'test'].includes(env)) {
        return env
      }
    }

    // 优先级3: 根据URL判断
    if (this._isProductionUrl()) {
      return 'production'
    }

    // 优先级4: 根据API URL判断
    if (this._isProductionApi()) {
      return 'production'
    }

    // 默认: 开发环境
    return 'development'
  }

  /**
   * 检测运行平台
   */
  _detectPlatform() {
    // 检测是否在PWA中运行
    if (this._isPWA()) {
      return 'pwa'
    }

    // 检测是否在移动设备中
    if (this._isMobile()) {
      return 'mobile'
    }

    // 检测是否在生产域名
    if (this._isProductionUrl()) {
      return 'cloud'
    }

    // 检测是否在本地开发
    if (this._isLocalDevelopment()) {
      return 'local'
    }

    // 默认: 浏览器
    return 'browser'
  }

  /**
   * 检测是否为生产URL
   */
  _isProductionUrl() {
    const hostname = window.location.hostname
    return hostname === 'textistext.com' ||
           hostname.includes('textistext-frontend') ||
           hostname.includes('.run.app')
  }

  /**
   * 检测是否为生产API
   */
  _isProductionApi() {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || ''
    return apiUrl.includes('textistext.com') ||
           apiUrl.includes('.run.app') ||
           apiUrl.startsWith('https://')
  }

  /**
   * 检测是否在PWA中运行
   */
  _isPWA() {
    return window.matchMedia &&
           window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true
  }

  /**
   * 检测是否在移动设备中
   */
  _isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  }

  /**
   * 检测是否在本地开发环境
   */
  _isLocalDevelopment() {
    const hostname = window.location.hostname
    return hostname === 'localhost' ||
           hostname === '127.0.0.1' ||
           hostname.startsWith('192.168.') ||
           hostname.startsWith('10.') ||
           hostname.includes('.local')
  }

  /**
   * 输出环境信息
   */
  _logEnvironmentInfo() {
    if (this.shouldEnableDebugLogs()) {
      console.log('🌍 前端环境检测结果:')
      console.log(`   - 运行环境: ${this._environment}`)
      console.log(`   - 运行平台: ${this._platform}`)
      console.log(`   - 当前URL: ${window.location.href}`)
      console.log(`   - API基础URL: ${this.getApiConfig().baseUrl}`)

      if (this.isDevelopment()) {
        console.log('   - 开发模式: 启用调试功能和详细日志')
      } else if (this.isProduction()) {
        console.log('   - 生产模式: 优化性能和安全设置')
      }
    }
  }

  // 基础环境检测方法
  getEnvironment() {
    return this._environment
  }

  getPlatform() {
    return this._platform
  }

  isDevelopment() {
    return this._environment === 'development'
  }

  isProduction() {
    return this._environment === 'production'
  }

  isTest() {
    return this._environment === 'test'
  }

  isLocal() {
    return this._platform === 'local'
  }

  isCloud() {
    return this._platform === 'cloud'
  }

  isPWA() {
    return this._platform === 'pwa'
  }

  isMobile() {
    return this._platform === 'mobile'
  }

  // 功能开关方法
  shouldEnableDebugLogs() {
    return this.isDevelopment() ||
           import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true'
  }

  shouldShowDetailedErrors() {
    return this.isDevelopment()
  }

  shouldEnableDevTools() {
    return this.isDevelopment()
  }

  shouldEnableApiLogging() {
    return this.isDevelopment() && this.shouldEnableDebugLogs()
  }

  shouldShowSecurityWarnings() {
    return this.isDevelopment()
  }

  shouldEnableOAuth() {
    // OAuth在生产环境默认启用，开发环境可通过环境变量控制
    return this.isProduction() ||
           import.meta.env.VITE_ENABLE_OAUTH === 'true'
  }

  shouldUseStrictValidation() {
    return this.isProduction()
  }

  shouldEnableAnalytics() {
    return this.isProduction() &&
           import.meta.env.VITE_ENABLE_ANALYTICS !== 'false'
  }

  shouldEnableServiceWorker() {
    return this.isProduction() ||
           import.meta.env.VITE_ENABLE_SW === 'true'
  }

  // 配置获取方法
  getApiConfig() {
    const baseUrl = import.meta.env.VITE_API_BASE_URL ||
                   (this.isProduction() ? 'https://textistext.com' : window.location.origin)

    return {
      baseUrl,
      timeout: this.isProduction() ? 30000 : 60000,
      retries: this.isProduction() ? 3 : 1,
      enableCaching: this.isProduction(),
      enableCompression: this.isProduction()
    }
  }

  getLogConfig() {
    if (this.isDevelopment()) {
      return {
        level: 'DEBUG',
        enableConsole: true,
        enableApiLogging: true,
        enablePerformanceLogging: true,
        showSensitiveData: false // 即使在开发环境也不显示敏感数据
      }
    } else if (this.isProduction()) {
      return {
        level: 'WARN',
        enableConsole: false,
        enableApiLogging: false,
        enablePerformanceLogging: false,
        showSensitiveData: false
      }
    } else {
      return {
        level: 'INFO',
        enableConsole: true,
        enableApiLogging: false,
        enablePerformanceLogging: false,
        showSensitiveData: false
      }
    }
  }

  getAppConfig() {
    return {
      title: import.meta.env.VITE_APP_TITLE || 'TextIsText OCR',
      description: import.meta.env.VITE_APP_DESCRIPTION || '专业的OCR文本识别工具',
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      buildTime: import.meta.env.VITE_BUILD_TIME || new Date().toISOString(),
      enablePWA: this.shouldEnableServiceWorker(),
      enableOffline: this.isProduction()
    }
  }

  getSecurityConfig() {
    return {
      enableCSRF: this.isProduction(),
      enableXSS: true,
      enableContentSecurityPolicy: this.isProduction(),
      sessionTimeout: this.isProduction() ? 30 * 60 * 1000 : 60 * 60 * 1000, // 30分钟 vs 1小时
      maxLoginAttempts: this.isProduction() ? 5 : 10,
      enableRateLimit: this.isProduction()
    }
  }

  getPerformanceConfig() {
    return {
      enableLazyLoading: this.isProduction(),
      enableImageOptimization: this.isProduction(),
      enableCodeSplitting: this.isProduction(),
      enableCaching: this.isProduction(),
      enableCompression: this.isProduction(),
      enablePreloading: this.isProduction(),
      chunkSize: this.isProduction() ? 'small' : 'large'
    }
  }
}

// 创建全局环境检测器实例
const environment = new EnvironmentDetector()

// 便捷函数，供其他模块直接使用
export const isDevelopment = () => environment.isDevelopment()
export const isProduction = () => environment.isProduction()
export const isTest = () => environment.isTest()
export const isLocal = () => environment.isLocal()
export const isCloud = () => environment.isCloud()
export const isPWA = () => environment.isPWA()
export const isMobile = () => environment.isMobile()

export const getEnvironment = () => environment.getEnvironment()
export const getPlatform = () => environment.getPlatform()

export const getConfig = (configType) => {
  const configMethods = {
    'api': () => environment.getApiConfig(),
    'log': () => environment.getLogConfig(),
    'app': () => environment.getAppConfig(),
    'security': () => environment.getSecurityConfig(),
    'performance': () => environment.getPerformanceConfig()
  }

  if (!configMethods[configType]) {
    throw new Error(`不支持的配置类型: ${configType}`)
  }

  return configMethods[configType]()
}

// 导出主要接口
export {
  environment,
  EnvironmentDetector
}

export default environment
