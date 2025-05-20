// src/services/secureApiService.js
import { getApiKey } from './apiKeyService'
import { generateCsrfToken } from './routeSecurityService'
import { useOcrStore } from '@/stores/ocrStore'

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
 * 安全地处理API错误
 * @param {Error} error - 错误对象
 * @param {string} defaultMessage - 默认错误消息
 * @returns {Error} - 处理后的错误对象
 */
const handleApiError = (error, defaultMessage) => {
  // 记录错误
  console.error(`API错误: ${defaultMessage}`, error)

  // 获取OCR存储以显示通知
  const ocrStore = useOcrStore ? useOcrStore() : null

  // 显示通知
  if (ocrStore) {
    ocrStore._showNotification(error.message || defaultMessage, 'error')
  }

  // 返回错误
  return error
}

/**
 * 安全地发送API请求
 * @param {string} endpoint - API端点
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>} - 请求结果
 */
export const secureApiRequest = async (endpoint, options = {}) => {
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

    // 发送请求
    const response = await fetch(url, requestOptions)

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

    // 检查响应状态
    if (!response.ok) {
      throw new Error(data.message || '请求失败')
    }

    return data
  } catch (error) {
    throw handleApiError(error, '请求失败')
  }
}

/**
 * 使用服务器端API密钥进行OCR处理
 * @param {File} file - 要处理的文件
 * @param {string[]} languageHints - 语言提示
 * @param {string} recognitionDirection - 识别方向
 * @param {string} recognitionMode - 识别模式
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} - OCR结果
 */
export const processWithServerApi = async (
  file,
  languageHints = [],
  recognitionDirection = 'horizontal',
  recognitionMode = 'text',
  userId = null,
) => {
  try {
    // 检查文件类型
    const isPdf = file.type === 'application/pdf'
    console.log('文件类型:', file.type, '是PDF:', isPdf)

    // 如果是PDF文件，需要先在前端渲染为图像
    if (isPdf) {
      console.log('检测到PDF文件，尝试在前端渲染为图像...')

      // 检查PDF.js库是否已加载
      if (typeof window === 'undefined' || !window.pdfjsLib) {
        console.error('PDF.js库未加载，无法处理PDF文件')
        throw new Error('PDF.js库未加载，请确保在HTML中通过<script>标签引入了pdf.min.js')
      }

      try {
        // 导入PDF适配器
        const { renderPdfPage } = await import('@/utils/pdfAdapter')

        // 读取文件数据
        const arrayBuffer = await file.arrayBuffer()
        const pdfData = new Uint8Array(arrayBuffer)

        // 渲染第一页为图像
        console.log('渲染PDF第1页...')
        const renderResult = await renderPdfPage(pdfData, 1, 1.5)

        if (!renderResult || !renderResult.dataUrl) {
          throw new Error('PDF渲染失败')
        }

        console.log('PDF渲染成功，转换为Blob...')

        // 将Data URL转换为Blob
        const base64Data = renderResult.dataUrl.split(',')[1]
        const byteCharacters = atob(base64Data)
        const byteArrays = []

        for (let i = 0; i < byteCharacters.length; i += 512) {
          const slice = byteCharacters.slice(i, i + 512)
          const byteNumbers = new Array(slice.length)

          for (let j = 0; j < slice.length; j++) {
            byteNumbers[j] = slice.charCodeAt(j)
          }

          byteArrays.push(new Uint8Array(byteNumbers))
        }

        // 创建Blob对象
        const blob = new Blob(byteArrays, { type: 'image/png' })

        // 创建新的File对象
        const renderedImageFile = new File([blob], file.name.replace('.pdf', '.png'), {
          type: 'image/png',
          lastModified: new Date().getTime(),
        })

        console.log('PDF已转换为图像文件，大小:', renderedImageFile.size)

        // 使用转换后的图像文件替换原始PDF文件
        file = renderedImageFile
      } catch (pdfError) {
        console.error('PDF渲染失败:', pdfError)
        throw new Error(`PDF处理失败: ${pdfError.message}`)
      }
    }

    // 创建FormData
    const formData = new FormData()
    formData.append('file', file)

    // 添加语言提示
    if (languageHints.length > 0) {
      languageHints.forEach((lang) => {
        formData.append('languageHints', lang)
      })
    }

    // 添加其他参数
    formData.append('recognitionDirection', recognitionDirection)
    formData.append('recognitionMode', recognitionMode)

    // 添加用户ID
    if (userId) {
      formData.append('userId', userId)
    }

    // 生成CSRF令牌
    const csrfToken = generateCsrfToken()

    console.log('发送OCR请求，文件类型:', file.type, '文件大小:', file.size)

    // 发送请求 - 添加CSRF令牌以确保请求能够通过
    const response = await fetch(`${API_BASE_URL}/ocr/process`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken,
      },
      body: formData,
      credentials: 'include', // 使用include而不是same-origin，确保跨域请求也能发送cookie
    })

    // 解析响应
    const result = await response.json()

    console.log('OCR处理响应:', {
      status: response.status,
      success: result.success,
      message: result.message,
      hasData: !!result.data,
    })

    // 检查响应状态
    if (!result.success) {
      console.error('OCR处理失败:', result)

      // 检查是否是PDF相关错误
      if (result.message && result.message.includes('PDF')) {
        throw new Error(`服务器不支持直接处理PDF文件: ${result.message}`)
      }

      throw new Error(result.message || result.error || '处理请求失败')
    }

    console.log('OCR处理成功，处理结果:', {
      hasData: !!result.data,
      hasText: !!result.text,
      textLength: result.text?.length || result.data?.originalFullText?.length || 0,
      language: result.language || result.data?.detectedLanguageCode || 'und',
    })

    // 确保返回的数据是有效的
    if (!result.data && result.text) {
      // 兼容不同的响应格式
      return {
        originalFullText: result.text,
        detectedLanguageCode: result.language || 'und',
        symbolsData: result.symbolsData || [],
      }
    }

    return result.data || result // 兼容不同的响应格式
  } catch (error) {
    throw handleApiError(error, 'OCR处理失败')
  }
}

/**
 * 使用客户端API密钥进行OCR处理
 * @param {string} base64Image - Base64编码的图像
 * @param {string[]} languageHints - 语言提示
 * @param {string} recognitionDirection - 识别方向
 * @returns {Promise<Object>} - OCR结果
 */
export const processWithClientApi = async (
  base64Image,
  languageHints = [],
  recognitionDirection = 'horizontal',
) => {
  try {
    // 获取API密钥
    const apiKey = getApiKey()

    if (!apiKey) {
      throw new Error('未找到API密钥')
    }

    // 构建请求体
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: 'DOCUMENT_TEXT_DETECTION',
            },
          ],
        },
      ],
    }

    // 添加语言提示
    if (languageHints.length > 0) {
      requestBody.requests[0].imageContext = {
        languageHints,
      }
    }

    // 发送请求到Google Vision API
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    // 检查响应状态
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API请求失败: ${response.status} ${errorText}`)
    }

    // 解析响应
    const data = await response.json()

    // 检查API响应中是否包含错误
    if (data.error) {
      throw new Error(`API错误: ${data.error.message || JSON.stringify(data.error)}`)
    }

    // 检查返回的结果是否包含所需的数据
    if (!data.responses || data.responses.length === 0) {
      throw new Error('API返回空结果')
    }

    return data.responses[0]
  } catch (error) {
    throw handleApiError(error, 'OCR处理失败')
  }
}
