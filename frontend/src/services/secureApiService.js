// src/services/secureApiService.js
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
 * 使用服务器端API进行OCR处理
 * @param {File|Object} file - 要处理的文件或已处理的图像数据对象
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
    // 检查是否是已处理的图像数据对象
    let isProcessedImage = file && typeof file === 'object' && file.isProcessed === true;
    // 检查是否是PDF文件
    const isPdfFile = file.type === 'application/pdf';
    
    // 如果是已处理的图像数据，直接使用
    if (isProcessedImage) {
      console.log('使用已处理的图像数据...');
      // 在后续代码中处理
    } 
    // 检查是否是PDF文件
    else if (isPdfFile) {
      console.log('检测到PDF文件，需要将其转换为图像...');
      // 从ocrStore获取当前渲染的PDF页面图像
      const { useOcrStore } = await import('@/stores/ocrStore');
      const ocrStore = useOcrStore();
      
      // 检查是否有已渲染的PDF页面图像
      if (!ocrStore.filePreviewUrl || !ocrStore.filePreviewUrl.startsWith('data:image/')) {
        console.log('尝试渲染当前PDF页面...');
        // 尝试渲染当前PDF页面
        const renderResult = await ocrStore.renderCurrentPdfPageToPreview();
        if (!renderResult || !ocrStore.filePreviewUrl) {
          throw new Error('无法渲染PDF页面，请重新加载文件');
        }
      }
      
      // 从filePreviewUrl中提取Base64图像数据
      const base64Image = ocrStore.filePreviewUrl.split(',')[1];
      if (!base64Image) {
        throw new Error('无法获取PDF页面图像数据');
      }
      
      console.log('成功获取PDF页面图像数据，准备发送给后端...');
      
      // 将PDF转换为已处理的图像数据对象
      file = {
        processedImage: base64Image,
        isProcessed: true,
        originalName: file.name.replace('.pdf', '.png'),
        type: 'image/png'
      };
      
      // 更新isProcessedImage标志
      isProcessedImage = true;
    }

    // 创建FormData
    const formData = new FormData()
    
    // 处理不同类型的输入
    if (isProcessedImage) {
      // 如果是已处理的图像数据，创建Blob并添加到FormData
      const byteCharacters = atob(file.processedImage);
      const byteArrays = [];
      
      for (let i = 0; i < byteCharacters.length; i += 512) {
        const slice = byteCharacters.slice(i, i + 512);
        const byteNumbers = new Array(slice.length);
        
        for (let j = 0; j < slice.length; j++) {
          byteNumbers[j] = slice.charCodeAt(j);
        }
        
        byteArrays.push(new Uint8Array(byteNumbers));
      }
      
      // 创建Blob对象
      const blob = new Blob(byteArrays, { type: 'image/png' });
      
      // 创建新的File对象
      const processedFile = new File([blob], file.originalName || 'processed-image.png', {
        type: 'image/png', // 强制设置为image/png类型
        lastModified: new Date().getTime(),
      });
      
      // 添加到FormData
      formData.append('file', processedFile);
    } else {
      // 如果是普通文件，直接添加
      formData.append('file', file);
    }

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
