// src/services/logService.js

/**
 * 安全的日志服务
 * 提供安全的日志记录功能，避免泄露敏感信息
 */

// 导入统一环境检测器
import { environment, getConfig } from '@/utils/environment'

// 日志级别
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
}

// 使用统一环境检测获取日志配置
const logConfig = getConfig('log')
const currentLogLevel = LOG_LEVELS[logConfig.level] || LOG_LEVELS.INFO

// 敏感字段列表，这些字段的值将被屏蔽
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'refreshToken',
  'apiKey',
  'secret',
  'authorization',
  'cookie',
  'sessionId',
  'key',
  'credential',
  'pin',
  'code',
  'cvv',
  'ssn',
  'creditCard',
  'cardNumber',
]

/**
 * 检查对象是否包含敏感信息
 * @param {string} key - 对象的键
 * @returns {boolean} - 是否是敏感信息
 */
const isSensitiveKey = (key) => {
  if (typeof key !== 'string') return false

  const lowerKey = key.toLowerCase()
  return SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))
}

/**
 * 屏蔽对象中的敏感信息
 * @param {any} data - 要屏蔽的数据
 * @returns {any} - 屏蔽后的数据
 */
const maskSensitiveData = (data) => {
  // 如果是null或undefined，直接返回
  if (data == null) return data

  // 如果是基本类型，直接返回
  if (typeof data !== 'object') return data

  // 如果是数组，递归处理每个元素
  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item))
  }

  // 如果是对象，递归处理每个属性
  const maskedData = {}
  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveKey(key)) {
      // 屏蔽敏感信息
      maskedData[key] =
        typeof value === 'string' ? '***MASKED***' : { type: typeof value, masked: true }
    } else if (typeof value === 'object' && value !== null) {
      // 递归处理嵌套对象
      maskedData[key] = maskSensitiveData(value)
    } else {
      // 非敏感信息直接保留
      maskedData[key] = value
    }
  }

  return maskedData
}

/**
 * 安全地记录调试信息
 * @param {string} message - 日志消息
 * @param {...any} args - 其他参数
 */
export const debug = (message, ...args) => {
  if (currentLogLevel <= LOG_LEVELS.DEBUG) {
    const safeArgs = args.map((arg) => maskSensitiveData(arg))
    console.debug(`[DEBUG] ${message}`, ...safeArgs)
  }
}

/**
 * 安全地记录信息
 * @param {string} message - 日志消息
 * @param {...any} args - 其他参数
 */
export const info = (message, ...args) => {
  if (currentLogLevel <= LOG_LEVELS.INFO) {
    const safeArgs = args.map((arg) => maskSensitiveData(arg))
    console.info(`[INFO] ${message}`, ...safeArgs)
  }
}

/**
 * 安全地记录警告
 * @param {string} message - 日志消息
 * @param {...any} args - 其他参数
 */
export const warn = (message, ...args) => {
  if (currentLogLevel <= LOG_LEVELS.WARN) {
    const safeArgs = args.map((arg) => maskSensitiveData(arg))
    console.warn(`[WARN] ${message}`, ...safeArgs)
  }
}

/**
 * 安全地记录错误
 * @param {string} message - 日志消息
 * @param {Error|any} error - 错误对象或其他参数
 * @param {...any} args - 其他参数
 */
export const error = (message, error, ...args) => {
  if (currentLogLevel <= LOG_LEVELS.ERROR) {
    // 特殊处理错误对象
    let safeError = error

    if (error instanceof Error) {
      // 只保留错误的名称和消息，不包含堆栈跟踪
      safeError = {
        name: error.name,
        message: error.message,
        // 在开发环境中可以包含更多信息
        ...(import.meta.env.DEV
          ? {
              code: error.code,
              cause: error.cause,
            }
          : {}),
      }
    } else {
      // 如果不是Error对象，按普通参数处理
      safeError = maskSensitiveData(error)
    }

    const safeArgs = args.map((arg) => maskSensitiveData(arg))
    console.error(`[ERROR] ${message}`, safeError, ...safeArgs)
  }
}

/**
 * 记录API请求（仅在开发环境）
 * @param {string} method - 请求方法
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 */
export const logApiRequest = (method, url, options) => {
  if (logConfig.enableApiLogging && currentLogLevel <= LOG_LEVELS.DEBUG) {
    // 创建URL对象以移除查询参数中的敏感信息
    let safeUrl = url
    try {
      const urlObj = new URL(url, window.location.origin)
      // 检查并屏蔽URL中的敏感查询参数
      for (const [key, value] of urlObj.searchParams.entries()) {
        if (isSensitiveKey(key)) {
          urlObj.searchParams.set(key, '***MASKED***')
        }
      }
      safeUrl = urlObj.toString()
    } catch (e) {
      // 如果URL解析失败，使用原始URL
    }

    // 屏蔽请求选项中的敏感信息
    const safeOptions = maskSensitiveData(options)

    console.debug(`[API] ${method} ${safeUrl}`, safeOptions)
  }
}

/**
 * 记录API响应（仅在开发环境）
 * @param {string} method - 请求方法
 * @param {string} url - 请求URL
 * @param {Response} response - 响应对象
 * @param {Object} responseData - 响应数据
 */
export const logApiResponse = (method, url, response, responseData) => {
  if (logConfig.enableApiLogging && currentLogLevel <= LOG_LEVELS.DEBUG) {
    // 创建URL对象以移除查询参数中的敏感信息
    let safeUrl = url
    try {
      const urlObj = new URL(url, window.location.origin)
      // 检查并屏蔽URL中的敏感查询参数
      for (const [key, value] of urlObj.searchParams.entries()) {
        if (isSensitiveKey(key)) {
          urlObj.searchParams.set(key, '***MASKED***')
        }
      }
      safeUrl = urlObj.toString()
    } catch (e) {
      // 如果URL解析失败，使用原始URL
    }

    // 屏蔽响应数据中的敏感信息
    const safeResponseData = maskSensitiveData(responseData)

    console.debug(`[API] ${method} ${safeUrl} - ${response.status}`, safeResponseData)
  }
}

// 默认导出所有日志函数
export default {
  debug,
  info,
  warn,
  error,
  logApiRequest,
  logApiResponse,
}
