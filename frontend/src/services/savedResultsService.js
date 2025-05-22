// src/services/savedResultsService.js

/**
 * 保存的OCR结果服务
 * 用于管理用户保存的OCR结果
 */

import { getToken } from './tokenService.js'

// 使用相对路径，这样请求会通过Vite的代理转发
const API_URL = '/api'

// 存储键名（用于本地存储备份）
const SAVED_RESULTS_KEY = 'ocr_saved_results'

// 发布状态
export const PUBLISH_STATUS = {
  PUBLISHED: 'published', // 已发布
  FLAGGED: 'flagged', // 已标记
  REMOVED: 'removed', // 已移除
}

/**
 * 获取所有保存的OCR结果
 * @returns {Array} 保存的OCR结果数组
 */
export const getSavedResults = async () => {
  try {
    // 检查用户是否已登录
    if (!getToken()) {
      console.log('用户未登录，不能获取保存的OCR结果')
      return []
    }

    // 尝试从API获取结果
    try {
      // 简化请求，不使用CSRF令牌
      const response = await fetch(`${API_URL}/saved-results`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()

        // 确保所有结果都有id字段
        const results = (data.data || []).map((result) => {
          // 如果没有id字段但有_id字段，使用_id作为id
          if (!result.id && result._id) {
            console.log('API结果没有id字段但有_id字段，使用_id作为id:', result._id)
            result.id = result._id.toString()
          }
          return result
        })

        return results
      } else {
        console.error('从API获取OCR结果失败:', await response.text())
      }
    } catch (apiError) {
      console.error('从API获取OCR结果失败:', apiError)
    }

    // 如果API请求失败，使用本地存储作为备份
    // 注意：只有在用户已登录的情况下才会执行到这里
    const savedResultsStr = localStorage.getItem(SAVED_RESULTS_KEY)
    if (!savedResultsStr) {
      return []
    }

    // 确保本地存储的结果也有id字段
    const localResults = JSON.parse(savedResultsStr)
    return localResults.map((result) => {
      if (!result.id) {
        result.id = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        console.log('为本地存储结果生成临时ID:', result.id)
      }
      return result
    })
  } catch (error) {
    console.error('获取保存的OCR结果时出错:', error)
    return []
  }
}

/**
 * 保存OCR结果
 * @param {Object} result - OCR结果对象
 * @returns {boolean} 是否保存成功
 */
export const saveResult = async (result) => {
  try {
    if (!result || !result.text) {
      console.error('无效的OCR结果')
      return false
    }

    // 检查用户是否已登录
    const token = getToken()
    const isLoggedIn = !!token

    // 创建新的结果对象
    const newResult = {
      text: result.text,
      language: result.language || 'und',
      languageName: result.languageName || '未知语言',
      preview: result.text.substring(0, 100) + (result.text.length > 100 ? '...' : ''),
      wordCount: result.text.split(/\s+/).filter(Boolean).length,
      charCount: result.text.length,
    }

    // 如果用户已登录，尝试保存到API
    if (isLoggedIn) {
      try {
        // 简化请求，不使用CSRF令牌
        const response = await fetch(`${API_URL}/saved-results`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify(newResult),
        })

        if (response.ok) {
          console.log('OCR结果已保存到服务器')

          // 同时保存到本地存储作为备份
          try {
            // 获取现有的保存结果
            const savedResultsStr = localStorage.getItem(SAVED_RESULTS_KEY)
            const savedResults = savedResultsStr ? JSON.parse(savedResultsStr) : []

            // 添加本地ID和时间戳
            const localResult = { ...newResult }
            localResult.id = Date.now().toString() // 使用时间戳作为唯一ID
            localResult.timestamp = new Date().toISOString()

            // 添加到结果数组的开头（最新的在前面）
            savedResults.unshift(localResult)

            // 限制保存的结果数量，最多保存50条
            const limitedResults = savedResults.slice(0, 50)

            // 保存到localStorage
            localStorage.setItem(SAVED_RESULTS_KEY, JSON.stringify(limitedResults))
            console.log('OCR结果已同时保存到本地存储作为备份')
          } catch (localError) {
            console.error('保存OCR结果到本地存储时出错:', localError)
          }

          return true
        } else {
          console.error('保存OCR结果到服务器失败:', await response.text())
        }
      } catch (apiError) {
        console.error('API保存OCR结果失败:', apiError)
      }

      // 如果API保存失败，尝试保存到本地存储作为备份
      try {
        // 获取现有的保存结果
        const savedResultsStr = localStorage.getItem(SAVED_RESULTS_KEY)
        const savedResults = savedResultsStr ? JSON.parse(savedResultsStr) : []

        // 添加本地ID和时间戳
        const localResult = { ...newResult }
        localResult.id = Date.now().toString() // 使用时间戳作为唯一ID
        localResult.timestamp = new Date().toISOString()

        // 添加到结果数组的开头（最新的在前面）
        savedResults.unshift(localResult)

        // 限制保存的结果数量，最多保存50条
        const limitedResults = savedResults.slice(0, 50)

        // 保存到localStorage
        localStorage.setItem(SAVED_RESULTS_KEY, JSON.stringify(limitedResults))
        console.log('API保存失败，OCR结果已保存到本地存储')

        return true
      } catch (localError) {
        console.error('保存OCR结果到本地存储时出错:', localError)
        return false
      }
    } else {
      // 用户未登录，显示提示信息
      console.log('用户未登录，OCR结果未保存')
      return false
    }
  } catch (error) {
    console.error('保存OCR结果时出错:', error)
    return false
  }
}

/**
 * 删除保存的OCR结果
 * @param {string} id - 要删除的结果ID
 * @returns {boolean} 是否删除成功
 */
export const deleteResult = async (id) => {
  try {
    if (!id) {
      return false
    }

    // 检查用户是否已登录
    if (!getToken()) {
      console.log('用户未登录，不能删除OCR结果')
      return false
    }

    // 尝试从API删除
    try {
      // 简化请求，不使用CSRF令牌
      const response = await fetch(`${API_URL}/saved-results/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        credentials: 'include',
      })

      if (response.ok) {
        console.log('OCR结果已从服务器删除')

        // 同时从本地存储中删除（保持同步）
        try {
          const savedResultsStr = localStorage.getItem(SAVED_RESULTS_KEY)
          if (savedResultsStr) {
            const savedResults = JSON.parse(savedResultsStr)
            const filteredResults = savedResults.filter((result) => result.id !== id)
            localStorage.setItem(SAVED_RESULTS_KEY, JSON.stringify(filteredResults))
          }
        } catch (localError) {
          console.error('从本地存储删除OCR结果时出错:', localError)
        }

        return true
      } else {
        console.error('从服务器删除OCR结果失败:', await response.text())
      }
    } catch (apiError) {
      console.error('API删除OCR结果失败:', apiError)
    }

    // 如果API删除失败，尝试从本地存储删除作为备份
    // 注意：只有在用户已登录的情况下才会执行到这里
    try {
      const savedResultsStr = localStorage.getItem(SAVED_RESULTS_KEY)
      if (!savedResultsStr) {
        return false
      }

      const savedResults = JSON.parse(savedResultsStr)
      const filteredResults = savedResults.filter((result) => result.id !== id)

      // 如果长度相同，说明没有找到要删除的结果
      if (filteredResults.length === savedResults.length) {
        return false
      }

      // 保存更新后的结果
      localStorage.setItem(SAVED_RESULTS_KEY, JSON.stringify(filteredResults))
      console.log('OCR结果已从本地存储删除')

      return true
    } catch (localError) {
      console.error('从本地存储删除OCR结果时出错:', localError)
      return false
    }
  } catch (error) {
    console.error('删除OCR结果时出错:', error)
    return false
  }
}

/**
 * 清除所有保存的OCR结果
 * @returns {boolean} 是否清除成功
 */
export const clearAllResults = async () => {
  try {
    // 检查用户是否已登录
    if (!getToken()) {
      console.log('用户未登录，不能清除OCR结果')
      return false
    }

    // 尝试从API清除所有结果
    try {
      // 简化请求，不使用CSRF令牌
      const response = await fetch(`${API_URL}/saved-results/clear/all`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        credentials: 'include',
      })

      if (response.ok) {
        console.log('所有OCR结果已从服务器清除')
        // 同时清除本地存储
        localStorage.removeItem(SAVED_RESULTS_KEY)
        return true
      } else {
        console.error('从服务器清除所有OCR结果失败:', await response.text())
      }
    } catch (apiError) {
      console.error('API清除所有OCR结果失败:', apiError)
    }

    // 如果API清除失败，尝试清除本地存储作为备份
    // 注意：只有在用户已登录的情况下才会执行到这里
    try {
      localStorage.removeItem(SAVED_RESULTS_KEY)
      console.log('所有OCR结果已从本地存储清除')
      return true
    } catch (localError) {
      console.error('从本地存储清除所有OCR结果时出错:', localError)
      return false
    }
  } catch (error) {
    console.error('清除所有OCR结果时出错:', error)
    return false
  }
}

/**
 * 获取指定ID的OCR结果
 * @param {string} id - 结果ID
 * @returns {Object|null} OCR结果对象或null
 */
export const getResultById = async (id) => {
  try {
    if (!id) {
      return null
    }

    // 检查用户是否已登录
    if (!getToken()) {
      console.log('用户未登录，不能获取OCR结果')
      return null
    }

    // 尝试从API获取
    try {
      // 简化请求，不使用CSRF令牌
      const response = await fetch(`${API_URL}/saved-results/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          console.log('从服务器获取OCR结果成功')
          return data.data
        }
      } else {
        console.error('从服务器获取OCR结果失败:', await response.text())
      }
    } catch (apiError) {
      console.error('API获取OCR结果失败:', apiError)
    }

    // 如果API获取失败，尝试从本地存储获取作为备份
    // 注意：只有在用户已登录的情况下才会执行到这里
    try {
      const savedResultsStr = localStorage.getItem(SAVED_RESULTS_KEY)
      if (!savedResultsStr) {
        return null
      }

      const savedResults = JSON.parse(savedResultsStr)
      return savedResults.find((result) => result.id === id) || null
    } catch (localError) {
      console.error('从本地存储获取OCR结果时出错:', localError)
      return null
    }
  } catch (error) {
    console.error('获取指定ID的OCR结果时出错:', error)
    return null
  }
}

/**
 * 发布OCR结果
 * @param {string} id - OCR结果ID
 * @returns {boolean} 是否发布成功
 */
export const publishResult = async (id) => {
  try {
    // 检查用户是否已登录
    if (!getToken()) {
      console.log('用户未登录，不能发布OCR结果')
      return false
    }

    // 检查ID是否有效
    if (!id) {
      console.error('发布OCR结果失败: 无效的ID', id)
      return false
    }

    console.log('发布OCR结果，ID:', id)

    // 尝试从API发布结果
    try {
      const response = await fetch(`${API_URL}/saved-results/${id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        credentials: 'include',
      })

      if (response.ok) {
        console.log('OCR结果已发布')

        // 同时更新本地存储
        try {
          const savedResultsStr = localStorage.getItem(SAVED_RESULTS_KEY)
          if (savedResultsStr) {
            const savedResults = JSON.parse(savedResultsStr)
            const updatedResults = savedResults.map((result) => {
              if (result.id === id) {
                return {
                  ...result,
                  isPublic: true,
                  publishStatus: PUBLISH_STATUS.PUBLISHED,
                  publishedAt: new Date().toISOString(),
                }
              }
              return result
            })
            localStorage.setItem(SAVED_RESULTS_KEY, JSON.stringify(updatedResults))
          }
        } catch (localError) {
          console.error('更新本地存储时出错:', localError)
        }

        return true
      } else {
        const errorText = await response.text()
        console.error('发布OCR结果失败:', errorText)
        return false
      }
    } catch (apiError) {
      console.error('API发布OCR结果失败:', apiError)
      return false
    }
  } catch (error) {
    console.error('发布OCR结果时出错:', error)
    return false
  }
}
