// src/services/tokenService.js

/**
 * 安全的令牌管理服务
 * 使用HttpOnly Cookie和内存存储管理认证令牌
 */

// 用户信息存储键名
const USER_INFO_KEY = 'user_info'
// 令牌刷新状态键名
const TOKEN_REFRESH_STATUS_KEY = 'token_refresh_status'

// 使用内存存储敏感令牌，防止XSS攻击
// 注意：这种方法在页面刷新后会丢失令牌，但可以通过后端API重新获取
const memoryStorage = {
  token: null,
  refreshToken: null,
  // 添加令牌刷新状态
  refreshing: false,
  // 添加令牌过期时间
  tokenExpiry: null,
}

/**
 * 获取当前存储方式（仅用于非敏感信息）
 * 优先使用sessionStorage，如果用户选择了"记住我"则使用localStorage
 * @returns {Storage} - 存储对象
 */
const getStorage = () => {
  const rememberMe = localStorage.getItem('rememberMe') === 'true'
  return rememberMe ? localStorage : sessionStorage
}

/**
 * 安全地保存令牌
 * @param {string} token - 访问令牌
 * @param {string} refreshToken - 刷新令牌
 * @param {boolean} rememberMe - 是否记住登录状态
 */
export const saveTokens = (token, refreshToken, rememberMe = false) => {
  try {
    // 将"记住我"选项保存到localStorage
    localStorage.setItem('rememberMe', rememberMe.toString())

    // 将访问令牌保存到内存中（作为备份，主要使用HttpOnly Cookie）
    memoryStorage.token = token
    memoryStorage.refreshToken = refreshToken

    // 注意：实际的令牌由后端设置为HttpOnly Cookie
    // 前端不需要直接操作这些Cookie，这里只是保存到内存中作为备份

    // 记录令牌已保存（不包含令牌内容）
    if (import.meta.env.DEV) {
      console.info('令牌已保存到内存中（主要使用HttpOnly Cookie）')
    }
  } catch (error) {
    // 使用安全的错误日志
    logSecureError('保存令牌时出错', error)
    throw new Error('无法保存认证信息')
  }
}

/**
 * 尝试恢复会话
 */
const tryRestoreSession = () => {
  console.log('尝试恢复会话...')

  // 检查用户是否已登出
  const userLoggedOut =
    localStorage.getItem('user_logged_out') === 'true' ||
    sessionStorage.getItem('user_logged_out') === 'true'

  console.log('会话恢复检查:', {
    userLoggedOut,
    hasToken: !!memoryStorage.token,
    hasRefreshToken: !!memoryStorage.refreshToken,
    isRefreshing: memoryStorage.refreshing,
  })

  // 如果用户已登出，不尝试恢复会话
  if (userLoggedOut) {
    console.log('用户已登出，不尝试恢复会话')
    return
  }

  // 如果已经在刷新，不重复操作
  if (memoryStorage.refreshing) {
    console.log('已经在刷新令牌，跳过')
    return
  }

  memoryStorage.refreshing = true
  console.log('设置刷新状态为true')

  // 直接发送刷新令牌请求，避免循环依赖
  console.log('发送刷新令牌请求...')
  fetch('/api/users/refresh-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // 确保发送和接收Cookie
  })
    .then((response) => {
      console.log('刷新令牌响应状态:', response.status, response.statusText)
      if (response.ok) {
        return response.json()
      }
      throw new Error('刷新令牌失败: ' + response.status)
    })
    .then((data) => {
      console.log('刷新令牌响应数据:', data)
      if (data.success && data.data) {
        // 再次检查用户是否在此期间登出
        const userLoggedOutNow =
          localStorage.getItem('user_logged_out') === 'true' ||
          sessionStorage.getItem('user_logged_out') === 'true'
        if (userLoggedOutNow) {
          console.log('用户在令牌刷新过程中登出，不保存新令牌')
          return false
        }

        const { token, refreshToken, id, email, username, isAdmin, ...rest } = data.data

        // 保存新令牌
        memoryStorage.token = token
        memoryStorage.refreshToken = refreshToken

        // 保存用户信息
        const userInfo = { id, email, username, isAdmin, ...rest }
        console.log('保存用户信息:', userInfo)
        saveUserInfo(userInfo)

        console.info('会话已成功恢复')
        return true
      }
      console.warn('刷新令牌响应不包含有效数据')
      return false
    })
    .catch((error) => {
      // 记录错误，但不显示给用户
      console.error('刷新令牌错误:', error)
    })
    .finally(() => {
      console.log('刷新操作完成，重置刷新状态')
      memoryStorage.refreshing = false
    })
}

/**
 * 获取访问令牌
 * @returns {string|null} - 访问令牌或null
 */
export const getToken = () => {
  try {
    // 检查用户是否已登出
    const userLoggedOut =
      localStorage.getItem('user_logged_out') === 'true' ||
      sessionStorage.getItem('user_logged_out') === 'true'

    // 如果用户已登出，直接返回null
    if (userLoggedOut) {
      console.log('用户已登出，不返回令牌')
      return null
    }

    // 如果令牌不存在，尝试从会话恢复（页面刷新后）
    if (!memoryStorage.token && !memoryStorage.refreshing) {
      // 尝试恢复会话
      tryRestoreSession()
    }

    return memoryStorage.token
  } catch (error) {
    logSecureError('获取令牌时出错', error)
    return null
  }
}

/**
 * 获取刷新令牌
 * @returns {string|null} - 刷新令牌或null
 */
export const getRefreshToken = () => {
  try {
    // 检查用户是否已登出
    const userLoggedOut =
      localStorage.getItem('user_logged_out') === 'true' ||
      sessionStorage.getItem('user_logged_out') === 'true'

    // 如果用户已登出，直接返回null
    if (userLoggedOut) {
      console.log('用户已登出，不返回刷新令牌')
      return null
    }

    // 从内存中获取刷新令牌
    // 注意：在实际应用中，刷新令牌应该存储在HttpOnly Cookie中
    // 前端不应该直接访问刷新令牌，而是通过后端API进行刷新
    return memoryStorage.refreshToken
  } catch (error) {
    // 使用安全的错误日志
    logSecureError('获取刷新令牌时出错', error)
    return null
  }
}

/**
 * 保存用户信息（不包含敏感令牌）
 * @param {Object} userInfo - 用户信息对象
 */
export const saveUserInfo = (userInfo) => {
  try {
    // 移除敏感信息
    const safeUserInfo = { ...userInfo }
    delete safeUserInfo.token
    delete safeUserInfo.refreshToken
    delete safeUserInfo.password

    // 保存非敏感用户信息
    const storage = getStorage()
    storage.setItem(USER_INFO_KEY, JSON.stringify(safeUserInfo))
  } catch (error) {
    // 使用安全的错误日志
    logSecureError('保存用户信息时出错', error)
  }
}

/**
 * 获取用户信息
 * @returns {Object|null} - 用户信息对象或null
 */
export const getUserInfo = () => {
  try {
    const storage = getStorage()
    const userInfoStr = storage.getItem(USER_INFO_KEY)

    if (!userInfoStr) {
      return null
    }

    return JSON.parse(userInfoStr)
  } catch (error) {
    // 使用安全的错误日志
    logSecureError('获取用户信息时出错', error)
    return null
  }
}

/**
 * 清除所有认证信息
 */
export const clearAuth = () => {
  try {
    console.log('开始清除所有认证信息')

    // 清除内存存储
    memoryStorage.token = null
    memoryStorage.refreshToken = null
    memoryStorage.refreshing = false
    memoryStorage.tokenExpiry = null

    // 清除sessionStorage中的用户信息
    sessionStorage.removeItem(USER_INFO_KEY)
    sessionStorage.removeItem(TOKEN_REFRESH_STATUS_KEY)
    sessionStorage.removeItem('token_refreshing')

    // 清除localStorage中的用户信息
    localStorage.removeItem(USER_INFO_KEY)

    // 保留"记住我"设置

    // 发送注销请求到后端（确保清除HttpOnly Cookie）
    console.log('发送注销请求到后端，清除HttpOnly Cookie')
    fetch('/api/users/logout', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-cache', // 禁用缓存
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
      .then((response) => {
        console.log('注销请求响应状态:', response.status, response.statusText)
        if (!response.ok) {
          throw new Error('注销请求失败: ' + response.status)
        }
        console.log('注销请求成功，HttpOnly Cookie已清除')
        return response.json()
      })
      .then((data) => {
        console.log('注销响应数据:', data)
      })
      .catch((error) => {
        console.error('发送注销请求时出错:', error)
        logSecureError('发送注销请求时出错', error)
      })
  } catch (error) {
    // 使用安全的错误日志
    console.error('清除认证信息时出错:', error)
    logSecureError('清除认证信息时出错', error)
  }
}

/**
 * 安全地记录错误，不泄露敏感信息
 * @param {string} message - 错误消息
 * @param {Error} error - 错误对象
 */
const logSecureError = async (message, error) => {
  // 导入统一环境检测器
  const { environment } = await import('@/utils/environment')

  // 在生产环境中，不记录详细错误信息
  if (!environment.shouldShowDetailedErrors()) {
    console.error(`${message}：出现错误`)
    return
  }

  // 在开发环境中，记录更多信息但仍然保护敏感数据
  console.error(`${message}：`, {
    name: error.name,
    message: error.message,
    // 不记录堆栈跟踪，可能包含敏感信息
  })
}

/**
 * 检查令牌是否过期
 * @param {string} token - JWT令牌
 * @returns {boolean} - 令牌是否过期
 */
export const isTokenExpired = (token) => {
  if (!token) {
    return true
  }

  try {
    // 解析JWT令牌
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )

    const payload = JSON.parse(jsonPayload)

    // 检查过期时间
    const now = Date.now() / 1000

    // 存储令牌过期时间（用于自动刷新）
    if (payload.exp) {
      memoryStorage.tokenExpiry = payload.exp * 1000 // 转换为毫秒
    }

    // 如果令牌将在5分钟内过期，提前刷新
    if (payload.exp && payload.exp - now < 300 && !memoryStorage.refreshing) {
      // 调用会话恢复函数，它会处理令牌刷新
      tryRestoreSession()
    }

    return payload.exp < now
  } catch (error) {
    // 使用安全的错误日志
    logSecureError('检查令牌过期时出错', error)
    return true
  }
}

// 移除clearAllStorages函数，不再需要
