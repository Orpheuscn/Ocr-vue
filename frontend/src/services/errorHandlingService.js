// src/services/errorHandlingService.js

// 导入安全日志服务
let logger = console
// 异步加载日志服务，避免循环依赖
import('./logService').then(module => {
  logger = module.default
}).catch(() => {
  // 如果加载失败，继续使用console
})

// 导入OCR存储（用于显示通知）
let ocrStore = null
// 异步加载OCR存储，避免循环依赖
import('@/stores/ocrStore').then(module => {
  ocrStore = module.useOcrStore ? module.useOcrStore() : null
}).catch(() => {
  // 如果加载失败，继续使用null
})

// 错误类型
const ERROR_TYPES = {
  // 网络错误
  NETWORK: 'network',
  // 认证错误
  AUTH: 'auth',
  // 权限错误
  PERMISSION: 'permission',
  // 验证错误
  VALIDATION: 'validation',
  // 服务器错误
  SERVER: 'server',
  // 客户端错误
  CLIENT: 'client',
  // 未知错误
  UNKNOWN: 'unknown'
}

// 错误消息映射
const ERROR_MESSAGES = {
  // 网络错误
  [ERROR_TYPES.NETWORK]: {
    default: '网络连接错误，请检查您的网络连接',
    timeout: '请求超时，请稍后再试',
    offline: '您当前处于离线状态，请检查网络连接'
  },
  // 认证错误
  [ERROR_TYPES.AUTH]: {
    default: '认证失败，请重新登录',
    expired: '会话已过期，请重新登录',
    invalid: '无效的认证信息',
    required: '此操作需要登录'
  },
  // 权限错误
  [ERROR_TYPES.PERMISSION]: {
    default: '您没有权限执行此操作',
    admin: '此操作需要管理员权限',
    owner: '您只能操作自己的资源'
  },
  // 验证错误
  [ERROR_TYPES.VALIDATION]: {
    default: '输入数据无效，请检查您的输入',
    required: '请填写所有必填字段',
    format: '输入格式不正确',
    exists: '数据已存在'
  },
  // 服务器错误
  [ERROR_TYPES.SERVER]: {
    default: '服务器错误，请稍后再试',
    unavailable: '服务暂时不可用，请稍后再试',
    overload: '服务器繁忙，请稍后再试'
  },
  // 客户端错误
  [ERROR_TYPES.CLIENT]: {
    default: '客户端错误，请刷新页面后重试',
    browser: '您的浏览器不支持此功能',
    version: '请更新您的应用版本'
  },
  // 未知错误
  [ERROR_TYPES.UNKNOWN]: {
    default: '发生未知错误，请稍后再试'
  }
}

/**
 * 根据HTTP状态码获取错误类型
 * @param {number} status - HTTP状态码
 * @returns {string} - 错误类型
 */
const getErrorTypeFromStatus = (status) => {
  if (!status) return ERROR_TYPES.UNKNOWN
  
  if (status === 0 || status === 408 || status === 504) {
    return ERROR_TYPES.NETWORK
  } else if (status === 401 || status === 403) {
    return status === 401 ? ERROR_TYPES.AUTH : ERROR_TYPES.PERMISSION
  } else if (status === 400 || status === 422) {
    return ERROR_TYPES.VALIDATION
  } else if (status >= 500) {
    return ERROR_TYPES.SERVER
  } else if (status >= 400) {
    return ERROR_TYPES.CLIENT
  }
  
  return ERROR_TYPES.UNKNOWN
}

/**
 * 获取用户友好的错误消息
 * @param {Error} error - 错误对象
 * @returns {string} - 用户友好的错误消息
 */
export const getUserFriendlyMessage = (error) => {
  // 如果没有错误对象，返回默认消息
  if (!error) {
    return ERROR_MESSAGES[ERROR_TYPES.UNKNOWN].default
  }
  
  // 获取错误类型
  const errorType = getErrorTypeFromStatus(error.status)
  
  // 获取错误代码
  const errorCode = error.code || 'default'
  
  // 获取错误消息
  const errorMessage = ERROR_MESSAGES[errorType][errorCode] || ERROR_MESSAGES[errorType].default
  
  // 在开发环境中，添加原始错误消息
  if (import.meta.env.DEV && error.message) {
    return `${errorMessage} (${error.message})`
  }
  
  return errorMessage
}

/**
 * 处理错误
 * @param {Error} error - 错误对象
 * @param {string} context - 错误上下文
 * @param {boolean} showNotification - 是否显示通知
 * @returns {string} - 用户友好的错误消息
 */
export const handleError = (error, context = '', showNotification = true) => {
  // 记录错误
  logger.error(`错误处理 [${context}]`, error)
  
  // 获取用户友好的错误消息
  const friendlyMessage = getUserFriendlyMessage(error)
  
  // 显示通知
  if (showNotification && ocrStore) {
    ocrStore._showNotification(friendlyMessage, 'error')
  }
  
  // 处理特殊错误类型
  const errorType = getErrorTypeFromStatus(error.status)
  
  // 如果是认证错误，可能需要重定向到登录页面
  if (errorType === ERROR_TYPES.AUTH) {
    // 导入认证服务
    import('./authService').then(authService => {
      // 清除认证信息
      authService.logout()
      
      // 重定向到登录页面
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }).catch(() => {
      // 如果导入失败，尝试直接重定向
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    })
  }
  
  return friendlyMessage
}

/**
 * 创建错误对象
 * @param {string} message - 错误消息
 * @param {string} type - 错误类型
 * @param {string} code - 错误代码
 * @param {number} status - HTTP状态码
 * @returns {Error} - 错误对象
 */
export const createError = (message, type = ERROR_TYPES.UNKNOWN, code = 'default', status = 500) => {
  const error = new Error(message)
  error.type = type
  error.code = code
  error.status = status
  return error
}

// 导出错误类型
export const ErrorTypes = ERROR_TYPES

// 默认导出
export default {
  handleError,
  getUserFriendlyMessage,
  createError,
  ErrorTypes
}
