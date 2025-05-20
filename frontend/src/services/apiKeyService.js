// src/services/apiKeyService.js

/**
 * 安全的API密钥管理服务
 * 使用更安全的方式存储和管理API密钥
 */

// API密钥存储键名
const API_KEY_STORAGE_KEY = 'api_key_secure'

// 使用内存存储敏感API密钥，防止XSS攻击
// 注意：这种方法在页面刷新后会丢失密钥，需要结合其他方法使用
const memoryStorage = {
  apiKey: null
}

/**
 * 获取当前存储方式
 * 优先使用sessionStorage，如果用户选择了"记住API密钥"则使用localStorage
 * @returns {Storage} - 存储对象
 */
const getStorage = () => {
  const rememberApiKey = localStorage.getItem('rememberApiKey') === 'true'
  return rememberApiKey ? localStorage : sessionStorage
}

/**
 * 安全地保存API密钥
 * @param {string} apiKey - API密钥
 * @param {boolean} remember - 是否记住API密钥
 */
export const saveApiKey = (apiKey, remember = false) => {
  try {
    // 将"记住API密钥"选项保存到localStorage
    localStorage.setItem('rememberApiKey', remember.toString())
    
    // 将API密钥保存到内存中
    memoryStorage.apiKey = apiKey
    
    // 将加密后的API密钥保存到存储中
    // 在实际应用中，应该使用更安全的加密方法
    const storage = getStorage()
    
    // 简单混淆API密钥（注意：这不是真正的加密，仅用于演示）
    // 在生产环境中应使用更强的加密方法
    const encodedApiKey = btoa(apiKey)
    
    storage.setItem(API_KEY_STORAGE_KEY, encodedApiKey)
  } catch (error) {
    console.error('保存API密钥时出错:', error)
    throw new Error('无法保存API密钥')
  }
}

/**
 * 获取API密钥
 * @returns {string|null} - API密钥或null
 */
export const getApiKey = () => {
  try {
    // 优先从内存中获取API密钥
    if (memoryStorage.apiKey) {
      return memoryStorage.apiKey
    }
    
    // 如果内存中没有，尝试从存储中获取
    const storage = getStorage()
    const encodedApiKey = storage.getItem(API_KEY_STORAGE_KEY)
    
    if (!encodedApiKey) {
      return null
    }
    
    // 解码API密钥
    const apiKey = atob(encodedApiKey)
    
    // 恢复到内存存储
    memoryStorage.apiKey = apiKey
    
    return apiKey
  } catch (error) {
    console.error('获取API密钥时出错:', error)
    return null
  }
}

/**
 * 清除API密钥
 */
export const clearApiKey = () => {
  try {
    // 清除内存存储
    memoryStorage.apiKey = null
    
    // 清除sessionStorage中的API密钥
    sessionStorage.removeItem(API_KEY_STORAGE_KEY)
    
    // 清除localStorage中的API密钥
    localStorage.removeItem(API_KEY_STORAGE_KEY)
    
    // 保留"记住API密钥"设置
  } catch (error) {
    console.error('清除API密钥时出错:', error)
  }
}

/**
 * 检查是否有API密钥
 * @returns {boolean} - 是否有API密钥
 */
export const hasApiKey = () => {
  return getApiKey() !== null
}

/**
 * 安全地发送API请求
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @param {boolean} includeApiKey - 是否包含API密钥
 * @returns {Promise<Response>} - 请求响应
 */
export const secureApiRequest = async (url, options = {}, includeApiKey = false) => {
  try {
    // 创建请求选项
    const requestOptions = { ...options }
    
    // 如果需要包含API密钥
    if (includeApiKey) {
      const apiKey = getApiKey()
      
      if (!apiKey) {
        throw new Error('未找到API密钥')
      }
      
      // 根据请求方法添加API密钥
      if (options.method === 'GET' || !options.method) {
        // 对于GET请求，将API密钥添加到URL中
        const separator = url.includes('?') ? '&' : '?'
        url = `${url}${separator}key=${apiKey}`
      } else {
        // 对于其他请求，将API密钥添加到请求体中
        if (options.headers && options.headers['Content-Type'] === 'application/json') {
          // JSON请求体
          const body = options.body ? JSON.parse(options.body) : {}
          body.apiKey = apiKey
          requestOptions.body = JSON.stringify(body)
        } else if (options.body instanceof FormData) {
          // FormData请求体
          const formData = options.body
          formData.append('apiKey', apiKey)
          requestOptions.body = formData
        }
      }
    }
    
    // 发送请求
    return fetch(url, requestOptions)
  } catch (error) {
    console.error('安全API请求错误:', error)
    throw error
  }
}
