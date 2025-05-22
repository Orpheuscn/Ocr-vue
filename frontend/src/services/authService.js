// src/services/authService.js
import {
  saveTokens,
  getToken,
  getRefreshToken,
  saveUserInfo,
  getUserInfo,
  clearAuth,
  isTokenExpired,
} from './tokenService'
import { generateCsrfToken } from './routeSecurityService'
import { useOcrStore } from '@/stores/ocrStore'

// 使用相对路径，这样请求会通过Vite的代理转发
const API_URL = '/api/users'

/**
 * 统一处理认证错误
 * @param {Error} error - 错误对象
 * @param {string} operation - 操作名称
 * @param {Function} notify - 通知函数
 */
export const handleAuthError = (error, operation, notify) => {
  console.error(`${operation}错误:`, error)

  // 根据错误类型提供友好的用户反馈
  let message = '认证过程中发生错误，请重试'

  if (error.message.includes('网络')) {
    message = '网络连接问题，请检查您的网络连接'
  } else if (error.message.includes('超时')) {
    message = '服务器响应超时，请稍后重试'
  } else if (error.message.includes('令牌') || error.message.includes('token')) {
    message = '您的会话已过期，请重新登录'
    // 清除无效的认证信息
    clearAuth()
  }

  // 显示通知
  if (notify) {
    notify(message, 'error')
  }

  return message
}

/**
 * 用户注册
 * @param {Object} userData - 用户注册数据
 * @param {boolean} rememberMe - 是否记住登录状态
 * @returns {Promise<Object>} - 注册结果
 */
export const register = async (userData, rememberMe = false) => {
  try {
    // 生成CSRF令牌
    const csrfToken = generateCsrfToken()

    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify(userData),
      credentials: 'same-origin', // 包含cookies
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || '注册失败')
    }

    // 安全地保存用户信息和令牌
    if (data.data) {
      const { token, refreshToken, ...userInfo } = data.data

      // 清除用户登出标志
      localStorage.removeItem('user_logged_out')
      sessionStorage.removeItem('user_logged_out')
      console.log('登录成功，清除用户登出标志')
      // 保存令牌到安全存储
      saveTokens(token, refreshToken, rememberMe)

      // 保存用户信息（不包含令牌）
      saveUserInfo(userInfo)
    }

    return data
  } catch (error) {
    console.error('注册服务错误:', error)
    throw error
  }
}

/**
 * 用户登录
 * @param {Object} credentials - 登录凭据
 * @param {boolean} rememberMe - 是否记住登录状态
 * @returns {Promise<Object>} - 登录结果
 */
export const login = async (credentials, rememberMe = false) => {
  try {
    // 生成CSRF令牌
    const csrfToken = generateCsrfToken()

    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify(credentials),
      credentials: 'include', // 使用include而不是same-origin，确保跨域请求也能发送cookie
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || '登录失败')
    }

    // 安全地保存用户信息和令牌
    if (data.data) {
      const { token, refreshToken, ...userInfo } = data.data

      // 清除用户登出标志
      localStorage.removeItem('user_logged_out')
      sessionStorage.removeItem('user_logged_out')
      console.log('登录成功，清除用户登出标志')
      // 保存令牌到安全存储
      saveTokens(token, refreshToken, rememberMe)

      // 保存用户信息（不包含令牌）
      saveUserInfo(userInfo)
    }

    return data
  } catch (error) {
    // 使用统一错误处理
    const message = handleAuthError(error, '登录', (msg, type) => {
      const ocrStore = useOcrStore()
      if (ocrStore) {
        ocrStore._showNotification(msg, type)
      }
    })
    throw new Error(message)
  }
}

/**
 * 用户注销
 */
export const logout = () => {
  // 设置登出标记，防止自动重新登录
  localStorage.setItem('user_logged_out', 'true')
  sessionStorage.setItem('user_logged_out', 'true')
  console.log('设置用户登出标志，防止自动重新登录')

  // 使用安全的方式清除认证信息
  clearAuth()
}

/**
 * 获取当前用户信息
 * @returns {Object|null} - 用户信息或null
 */
export const getCurrentUser = () => {
  // 获取用户信息
  const userInfo = getUserInfo()

  // 如果没有用户信息，返回null
  if (!userInfo) {
    return null
  }

  // 获取令牌
  const token = getToken()
  const refreshToken = getRefreshToken()

  // 如果没有令牌，返回null
  if (!token) {
    return null
  }

  // 返回完整的用户信息（包括令牌）
  return {
    ...userInfo,
    token,
    refreshToken,
  }
}

/**
 * 检查用户是否已登录
 * @returns {boolean} - 用户是否已登录
 */
export const isAuthenticated = () => {
  // 首先检查用户是否已登出
  const userLoggedOut =
    localStorage.getItem('user_logged_out') === 'true' ||
    sessionStorage.getItem('user_logged_out') === 'true'

  // 如果用户已登出，直接返回false
  if (userLoggedOut) {
    console.log('isAuthenticated: 用户已登出，返回false')
    return false
  }

  const token = getToken()

  // 如果没有令牌，用户未登录
  if (!token) {
    console.log('isAuthenticated: 没有令牌，返回false')
    return false
  }

  // 检查令牌是否过期
  if (isTokenExpired(token)) {
    console.log('isAuthenticated: 令牌已过期，尝试使用刷新令牌')
    // 如果令牌已过期，尝试使用刷新令牌
    const refreshToken = getRefreshToken()

    // 如果没有刷新令牌，用户未登录
    if (!refreshToken) {
      console.log('isAuthenticated: 没有刷新令牌，返回false')
      return false
    }

    // 异步刷新令牌（不等待结果）
    refreshTokenAsync()

    // 暂时认为用户已登录，刷新令牌的结果会在后续请求中反映
    console.log('isAuthenticated: 正在刷新令牌，暂时返回true')
    return true
  }

  // 令牌有效，用户已登录
  console.log('isAuthenticated: 令牌有效，返回true')
  return true
}

/**
 * 检查当前用户是否为管理员（仅用于UI显示，不用于权限控制）
 * @returns {boolean} - 用户是否为管理员
 */
export const isAdmin = () => {
  const user = getCurrentUser()
  return user !== null && user.isAdmin === true
}

/**
 * 向服务器验证用户是否为管理员（用于权限敏感操作）
 * @returns {Promise<boolean>} - 用户是否为管理员
 */
export const verifyAdminStatus = async () => {
  try {
    // 导入安全日志服务
    const logger = await import('./logService')

    // 检查是否已登录
    if (!isAuthenticated()) {
      logger.info('验证管理员权限：用户未登录')
      return false
    }

    // 向服务器发送验证请求
    const response = await fetch('/api/users/verify-admin', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': generateCsrfToken(),
      },
      credentials: 'same-origin', // 包含cookies
    })

    // 检查响应状态
    if (!response.ok) {
      logger.warn('验证管理员权限：服务器返回非成功状态码', { status: response.status })
      return false
    }

    // 解析响应
    const data = await response.json()

    // 返回验证结果
    return data.isAdmin === true
  } catch (error) {
    // 导入安全日志服务
    const { error: logError } = await import('./logService')

    // 记录错误
    logError('验证管理员权限时出错', error)

    // 出错时返回false
    return false
  }
}

/**
 * 异步刷新令牌
 * @returns {Promise<boolean>} - 刷新是否成功
 */
export const refreshTokenAsync = async () => {
  try {
    // 检查用户是否已登出
    const userLoggedOut =
      localStorage.getItem('user_logged_out') === 'true' ||
      sessionStorage.getItem('user_logged_out') === 'true'

    // 如果用户已登出，不刷新令牌
    if (userLoggedOut) {
      console.log('refreshTokenAsync: 用户已登出，不刷新令牌')
      return false
    }

    // 避免重复刷新
    const isRefreshing = sessionStorage.getItem('token_refreshing') === 'true'
    if (isRefreshing) {
      console.log('refreshTokenAsync: 已经在刷新令牌，跳过')
      return false
    }

    // 标记为正在刷新
    sessionStorage.setItem('token_refreshing', 'true')
    console.log('refreshTokenAsync: 设置刷新标记')

    // 获取当前刷新令牌
    const currentRefreshToken = getRefreshToken()
    if (!currentRefreshToken) {
      console.log('refreshTokenAsync: 没有刷新令牌，取消刷新')
      sessionStorage.removeItem('token_refreshing')
      return false
    }

    console.log('refreshTokenAsync: 发送刷新请求')
    // 发送刷新请求
    const response = await fetch(`${API_URL}/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': generateCsrfToken(),
      },
      credentials: 'include',
      cache: 'no-cache', // 禁用缓存
    })

    // 清除刷新标记
    sessionStorage.removeItem('token_refreshing')
    console.log('refreshTokenAsync: 清除刷新标记')

    if (!response.ok) {
      console.log('refreshTokenAsync: 刷新请求失败', response.status)
      return false
    }

    const data = await response.json()
    console.log('refreshTokenAsync: 收到响应数据', data.success)

    // 再次检查用户是否在此期间登出
    const userLoggedOutNow =
      localStorage.getItem('user_logged_out') === 'true' ||
      sessionStorage.getItem('user_logged_out') === 'true'
    if (userLoggedOutNow) {
      console.log('refreshTokenAsync: 用户在刷新过程中登出，不保存新令牌')
      return false
    }

    if (data.success && data.data) {
      const { token, refreshToken, ...userInfo } = data.data

      // 保存新令牌
      const rememberMe = localStorage.getItem('rememberMe') === 'true'
      saveTokens(token, refreshToken, rememberMe)
      console.log('refreshTokenAsync: 保存新令牌成功')

      // 更新用户信息
      saveUserInfo(userInfo)
      console.log('refreshTokenAsync: 更新用户信息成功')

      return true
    }

    return false
  } catch (error) {
    console.error('刷新令牌时出错:', error)
    sessionStorage.removeItem('token_refreshing')
    return false
  }
}

/**
 * 刷新令牌
 * @returns {Promise<Object>} - 刷新结果
 */
export const refreshToken = async () => {
  try {
    // 检查用户是否已登出
    const userLoggedOut =
      localStorage.getItem('user_logged_out') === 'true' ||
      sessionStorage.getItem('user_logged_out') === 'true'

    // 如果用户已登出，不刷新令牌
    if (userLoggedOut) {
      console.log('refreshToken: 用户已登出，不刷新令牌')
      throw new Error('用户已登出，不刷新令牌')
    }

    // 获取内存中的刷新令牌（作为备份）
    const memoryRefreshToken = getRefreshToken()

    // 如果没有刷新令牌，抛出错误
    if (!memoryRefreshToken) {
      console.log('refreshToken: 没有刷新令牌')
      throw new Error('没有刷新令牌')
    }

    // 生成CSRF令牌
    const csrfToken = generateCsrfToken()

    // 准备请求选项
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include', // 使用include而不是same-origin，确保跨域请求也能发送cookie
      cache: 'no-cache', // 禁用缓存
    }

    // 如果内存中有刷新令牌，也添加到请求体中（双重保险）
    if (memoryRefreshToken) {
      requestOptions.body = JSON.stringify({ refreshToken: memoryRefreshToken })
    }

    console.log('refreshToken: 发送刷新令牌请求')
    // 发送刷新令牌请求
    const response = await fetch(`${API_URL}/refresh-token`, requestOptions)

    const data = await response.json()

    if (!response.ok) {
      console.log('refreshToken: 刷新令牌请求失败', response.status)
      throw new Error(data.message || '刷新令牌失败')
    }

    // 再次检查用户是否在此期间登出
    const userLoggedOutNow =
      localStorage.getItem('user_logged_out') === 'true' ||
      sessionStorage.getItem('user_logged_out') === 'true'
    if (userLoggedOutNow) {
      console.log('refreshToken: 用户在刷新过程中登出，不保存新令牌')
      throw new Error('用户在刷新过程中登出')
    }

    // 获取当前用户信息
    const userInfo = getUserInfo()

    if (!userInfo) {
      console.log('refreshToken: 无法获取用户信息')
      throw new Error('无法获取用户信息')
    }

    // 获取"记住我"设置
    const rememberMe = localStorage.getItem('rememberMe') === 'true'

    // 安全地保存新令牌到内存中（作为备份，主要使用HttpOnly Cookie）
    console.log('refreshToken: 保存新令牌')
    saveTokens(data.data.token, data.data.refreshToken, rememberMe)

    return data
  } catch (error) {
    console.error('刷新令牌错误:', error)
    // 如果刷新失败，清除用户信息，要求重新登录
    logout()
    throw error
  }
}

/**
 * 创建带有认证头的请求
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>} - 请求结果
 */
export const fetchWithAuth = async (url, options = {}) => {
  try {
    // 获取内存中的令牌（作为备份）
    let token = getToken()

    // 生成CSRF令牌
    const csrfToken = generateCsrfToken()

    // 创建请求头
    const headers = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    }

    // 如果内存中有令牌，也添加到Authorization头中（双重保险）
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // 合并请求选项
    const requestOptions = {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
      credentials: 'include', // 使用include而不是same-origin，确保跨域请求也能发送cookie
    }

    // 发送请求
    let response = await fetch(url, requestOptions)

    // 如果响应为401（未授权），尝试刷新令牌
    if (response.status === 401) {
      try {
        // 尝试刷新令牌
        await refreshToken()

        // 获取内存中的新令牌（如果有）
        token = getToken()

        // 如果内存中有令牌，添加到Authorization头中
        if (token) {
          requestOptions.headers['Authorization'] = `Bearer ${token}`
        }

        // 使用新的Cookie和可能的新令牌重新发送请求
        response = await fetch(url, requestOptions)
      } catch (refreshError) {
        // 刷新令牌失败，需要重新登录
        console.error('刷新令牌失败:', refreshError)
        // 清除认证信息
        logout()
        throw new Error('会话已过期，请重新登录')
      }
    }

    // 检查响应内容类型，安全地解析JSON
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

    if (!response.ok) {
      throw new Error(data.message || '请求失败')
    }

    return data
  } catch (error) {
    console.error('认证请求错误:', error)
    throw error
  }
}

/**
 * 刷新当前用户信息（包括管理员状态）
 * @returns {Promise<Object|null>} - 更新后的用户信息或null
 */
export const refreshUserInfo = async () => {
  try {
    // 获取用户信息
    const userInfo = getUserInfo()

    // 如果没有用户信息，返回null
    if (!userInfo) {
      return null
    }

    const userId = userInfo.id

    // 使用fetchWithAuth确保发送认证token
    const url = `${API_URL}/${userId}/profile`
    const data = await fetchWithAuth(url)

    // 安全地更新用户信息
    saveUserInfo({
      ...userInfo,
      ...data.data,
    })

    // 返回完整的用户信息（包括令牌）
    return {
      ...data.data,
      token: getToken(),
      refreshToken: getRefreshToken(),
    }
  } catch (error) {
    console.error('刷新用户信息错误:', error)
    return null
  }
}

// 获取用户详细信息
export const getUserProfile = async (userId) => {
  try {
    // 使用fetchWithAuth而不是普通fetch，确保发送认证token
    const url = `${API_URL}/${userId}/profile`
    const data = await fetchWithAuth(url)

    return data.data
  } catch (error) {
    console.error('获取用户资料错误:', error)
    throw error
  }
}

// 更新用户信息
export const updateUserProfile = async (userId, userData) => {
  try {
    // 使用fetchWithAuth确保发送认证token
    const url = `${API_URL}/${userId}`
    const data = await fetchWithAuth(url, {
      method: 'PUT',
      body: JSON.stringify(userData),
    })

    // 更新本地存储中的用户信息
    const currentUser = getCurrentUser()
    if (currentUser && currentUser.id === userId) {
      const updatedUser = {
        ...currentUser,
        username: userData.username,
        email: userData.email,
      }
      localStorage.setItem('user', JSON.stringify(updatedUser))
    }

    return data.data
  } catch (error) {
    console.error('更新用户资料错误:', error)
    throw error
  }
}

// 注销账户（永久删除）
export const deactivateAccount = async (userId) => {
  try {
    // 使用fetchWithAuth确保发送认证token
    const url = `${API_URL}/${userId}/deactivate`
    const data = await fetchWithAuth(url, {
      method: 'DELETE',
    })

    // 成功注销后清除本地存储
    logout()

    return data
  } catch (error) {
    console.error('注销账户错误:', error)
    throw error
  }
}
