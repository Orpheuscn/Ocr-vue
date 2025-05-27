// src/services/secureBackendService.js
import { generateCsrfToken } from './routeSecurityService'

// 导入安全日志服务
let logger = console
// 异步加载日志服务，避免循环依赖
import('./logService')
  .then((module) => {
    logger = module.default
  })
  .catch(() => {
    // 如果加载失败，继续使用console
  })

// API基础URL
const API_BASE_URL = '/api'

// 请求速率限制
const rateLimiter = {
  // 请求计数器
  requestCount: 0,
  // 上次重置时间
  lastResetTime: Date.now(),
  // 最大请求数（每分钟）
  maxRequests: 30,
  // 重置间隔（毫秒）
  resetInterval: 60000, // 1分钟

  /**
   * 检查是否可以发送请求
   * @returns {boolean} - 是否可以发送请求
   */
  canMakeRequest() {
    const now = Date.now()

    // 如果已经过了重置间隔，重置计数器
    if (now - this.lastResetTime > this.resetInterval) {
      this.requestCount = 0
      this.lastResetTime = now
    }

    // 如果请求数小于最大请求数，允许请求
    return this.requestCount < this.maxRequests
  },

  /**
   * 增加请求计数
   */
  incrementRequestCount() {
    this.requestCount++
  },
}

/**
 * 创建安全的API请求
 * @param {string} endpoint - API端点
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>} - 请求结果
 */
export const secureRequest = async (endpoint, options = {}) => {
  try {
    // 检查速率限制
    if (!rateLimiter.canMakeRequest()) {
      throw new Error('请求过于频繁，请稍后再试')
    }

    // 增加请求计数
    rateLimiter.incrementRequestCount()

    // 构建完整URL
    const url = `${API_BASE_URL}${endpoint}`

    // 生成CSRF令牌
    const csrfToken = generateCsrfToken()

    // 创建请求头
    const headers = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      ...(options.headers || {}),
    }

    // 合并请求选项
    const requestOptions = {
      ...options,
      headers,
      credentials: 'same-origin', // 包含cookies
    }

    // 记录API请求（仅在开发环境）
    logger.logApiRequest(options.method || 'GET', url, requestOptions)

    // 发送请求
    const response = await fetch(url, requestOptions)

    // 解析响应
    let data
    const contentType = response.headers.get('content-type')

    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      // 如果响应不是JSON，创建一个简单的数据对象
      const text = await response.text()
      data = {
        success: response.ok,
        message: text,
        data: null,
      }
    }

    // 记录API响应（仅在开发环境）
    logger.logApiResponse(options.method || 'GET', url, response, data)

    // 检查响应状态
    if (!response.ok) {
      // 创建错误对象
      const error = new Error(data.message || '请求失败')
      error.status = response.status
      error.data = data
      throw error
    }

    return data
  } catch (error) {
    // 记录错误
    logger.error('API请求失败', error)

    // 重新抛出错误，但不包含敏感信息
    const publicError = new Error(error.message || '请求失败')
    publicError.status = error.status || 500

    // 导入统一环境检测器
    const { environment } = await import('@/utils/environment')

    // 在生产环境中，不返回详细错误信息
    if (!environment.shouldShowDetailedErrors()) {
      publicError.message = '请求处理过程中出现错误，请稍后再试'
    }

    throw publicError
  }
}

/**
 * 获取服务器状态信息
 * @returns {Promise<Object>} - 服务器状态信息
 */
export const getServerStatus = async () => {
  return secureRequest('/status', {
    method: 'GET',
  })
}

/**
 * 获取数据库状态信息
 * @returns {Promise<Object>} - 数据库状态信息
 */
export const getDatabaseStatus = async () => {
  return secureRequest('/database/status', {
    method: 'GET',
  })
}

/**
 * 获取系统统计信息
 * @returns {Promise<Object>} - 系统统计信息
 */
export const getSystemStats = async () => {
  return secureRequest('/stats', {
    method: 'GET',
  })
}

/**
 * 获取用户列表（仅限管理员）
 * @param {number} page - 页码
 * @param {number} limit - 每页数量
 * @returns {Promise<Object>} - 用户列表
 */
export const getUsers = async (page = 1, limit = 10) => {
  // 验证管理员权限
  const { verifyAdminStatus } = await import('./authService')
  const isAdmin = await verifyAdminStatus()

  if (!isAdmin) {
    throw new Error('没有权限执行此操作')
  }

  return secureRequest(`/users?page=${page}&limit=${limit}`, {
    method: 'GET',
  })
}

/**
 * 获取OCR使用统计信息（仅限管理员）
 * @returns {Promise<Object>} - OCR使用统计信息
 */
export const getOcrStats = async () => {
  // 验证管理员权限
  const { verifyAdminStatus } = await import('./authService')
  const isAdmin = await verifyAdminStatus()

  if (!isAdmin) {
    throw new Error('没有权限执行此操作')
  }

  return secureRequest('/ocr/stats', {
    method: 'GET',
  })
}

/**
 * 执行数据库备份（仅限管理员）
 * @returns {Promise<Object>} - 备份结果
 */
export const backupDatabase = async () => {
  // 验证管理员权限
  const { verifyAdminStatus } = await import('./authService')
  const isAdmin = await verifyAdminStatus()

  if (!isAdmin) {
    throw new Error('没有权限执行此操作')
  }

  return secureRequest('/database/backup', {
    method: 'POST',
  })
}

// 默认导出所有函数
export default {
  secureRequest,
  getServerStatus,
  getDatabaseStatus,
  getSystemStats,
  getUsers,
  getOcrStats,
  backupDatabase,
}
