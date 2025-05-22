// src/services/apiClient.js
import { useOcrStore } from '@/stores/ocrStore'

const API_BASE_URL = '/api'

/**
 * 使用服务器端API密钥进行简单OCR识别
 * @param {File} file - 要处理的文件对象（图片或PDF）
 * @param {string[]} languageHints - 可选的语言提示数组
 * @param {string} recognitionDirection - 识别方向，'horizontal'或'vertical'
 * @param {string} recognitionMode - 识别模式，'text'或'table'
 * @param {string} userId - 可选的用户ID，用于记录OCR统计
 * @returns {Promise<object>} - 包含OCR结果的对象
 */
export async function processSimple(
  file,
  languageHints = [],
  recognitionDirection = 'horizontal',
  recognitionMode = 'text',
  userId = null,
) {
  try {
    // 从store中获取处理后的图片数据
    const ocrStore = useOcrStore ? useOcrStore() : null
    let processedImage = null

    // 如果store存在且有处理后的图片，使用处理后的图片
    if (ocrStore && ocrStore.processedPreviewUrl) {
      console.log('API Client: 检测到处理后的图片，优先使用')

      try {
        // 从base64转换为File对象
        const base64Data = ocrStore.processedPreviewUrl.split(',')[1]
        const byteString = window.atob(base64Data)
        const ab = new ArrayBuffer(byteString.length)
        const ia = new Uint8Array(ab)

        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i)
        }

        processedImage = new File([ab], 'processed_image.jpg', { type: 'image/jpeg' })
        console.log('API Client: 成功从处理后的图片创建文件对象')
      } catch (error) {
        console.error('API Client: 处理后的图片转换失败:', error)
        // 转换失败时，回退到原始文件
        processedImage = null
      }
    }

    // 使用处理后的图片或原始文件
    const imageToProcess = processedImage || file
    console.log('API Client: 使用', processedImage ? '处理后的图片' : '原始图片', '进行OCR处理')

    const formData = new FormData()
    formData.append('file', imageToProcess)

    if (languageHints.length > 0) {
      languageHints.forEach((lang) => {
        formData.append('languageHints', lang)
      })
    }

    formData.append('recognitionDirection', recognitionDirection)
    formData.append('recognitionMode', recognitionMode)

    // 添加用户ID，用于记录OCR统计
    if (userId) {
      formData.append('userId', userId)
    }

    const response = await fetch(`${API_BASE_URL}/ocr/process`, {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || '处理请求失败')
    }

    // 如果返回了完整的OCR结果，构造一个处理后的结果对象
    const processedResult = {
      success: true,
      data: {
        ocrRawResult: result.ocrRawResult,
        fullTextAnnotation: result.fullTextAnnotation,
        originalFullText: result.text,
        detectedLanguageCode: result.language,
        symbolsData: result.symbolsData || [],
        // 新增其他字段，方便后续处理
        textAnnotations: [{ description: result.text, locale: result.language }],
      },
    }

    return processedResult
  } catch (error) {
    console.error('处理简单OCR请求错误:', error)
    throw error
  }
}

/**
 * 处理文件上传和OCR识别
 * @param {File} file - 要处理的文件对象（图片或PDF）
 * @param {string[]} languageHints - 可选的语言提示数组
 * @param {string} recognitionDirection - 识别方向，'horizontal'或'vertical'
 * @param {string} recognitionMode - 识别模式，'text'或'table'
 * @param {string} userId - 可选的用户ID，用于记录OCR统计
 * @returns {Promise<object>} - 包含OCR结果的对象
 */
export async function processFile(
  file,
  languageHints = [],
  recognitionDirection = 'horizontal',
  recognitionMode = 'text',
  userId = null,
) {
  try {
    const formData = new FormData()
    formData.append('file', file)

    if (languageHints.length > 0) {
      languageHints.forEach((lang) => {
        formData.append('languageHints', lang)
      })
    }

    formData.append('recognitionDirection', recognitionDirection)
    formData.append('recognitionMode', recognitionMode)

    // 添加用户ID，用于记录OCR统计
    if (userId) {
      formData.append('userId', userId)
    }

    const response = await fetch(`${API_BASE_URL}/ocr/process`, {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || '请求失败')
    }

    return result.data
  } catch (error) {
    console.error('处理文件错误:', error)
    throw error
  }
}

/**
 * 处理Base64编码的图像
 * @param {string} imageData - Base64编码的图像数据
 * @param {string[]} languageHints - 可选的语言提示数组
 * @param {string} recognitionDirection - 识别方向，'horizontal'或'vertical'
 * @param {string} recognitionMode - 识别模式，'text'或'table'
 * @returns {Promise<object>} - 包含OCR结果的对象
 */
export async function processBase64Image(
  imageData,
  languageHints = [],
  recognitionDirection = 'horizontal',
  recognitionMode = 'text',
) {
  try {
    const response = await fetch(`${API_BASE_URL}/ocr/processBase64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageData,
        languageHints,
        recognitionDirection,
        recognitionMode,
      }),
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || '请求失败')
    }

    return result.data
  } catch (error) {
    console.error('处理图像错误:', error)
    throw error
  }
}

/**
 * 处理PDF文件
 * @param {File} pdfFile - 要处理的PDF文件
 * @param {string[]} languageHints - 可选的语言提示数组
 * @param {number} pageNumber - 要处理的页码
 * @param {string} recognitionDirection - 识别方向，'horizontal'或'vertical'
 * @param {string} recognitionMode - 识别模式，'text'或'table'
 * @returns {Promise<object>} - 包含OCR结果的对象
 */
export async function processPdf(
  pdfFile,
  languageHints = [],
  pageNumber = 1,
  recognitionDirection = 'horizontal',
  recognitionMode = 'text',
) {
  try {
    const formData = new FormData()
    formData.append('pdf', pdfFile)

    if (languageHints.length > 0) {
      languageHints.forEach((lang) => {
        formData.append('languageHints', lang)
      })
    }

    formData.append('pageNumber', pageNumber)
    formData.append('recognitionDirection', recognitionDirection)
    formData.append('recognitionMode', recognitionMode)

    const response = await fetch(`${API_BASE_URL}/ocr/processPdf`, {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || '请求失败')
    }

    return result.data
  } catch (error) {
    console.error('处理PDF错误:', error)
    throw error
  }
}

/**
 * 获取PDF页面
 * @param {string} pdfData - Base64编码的PDF数据
 * @param {number} pageNumber - 要获取的页码
 * @param {number} scale - 缩放比例
 * @returns {Promise<object>} - 包含页面图像数据的对象
 */
export async function getPdfPage(pdfData, pageNumber = 1, scale = 1.5) {
  try {
    const response = await fetch(`${API_BASE_URL}/ocr/getPdfPage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pdfData,
        pageNumber,
        scale,
      }),
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || '请求失败')
    }

    return result.data
  } catch (error) {
    console.error('获取PDF页面错误:', error)
    throw error
  }
}

/**
 * 获取支持的语言列表
 * @returns {Promise<Array>} - 支持的语言列表
 */
export async function getSupportedLanguages() {
  try {
    const response = await fetch(`${API_BASE_URL}/ocr/languages`)
    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || '获取语言列表失败')
    }

    return result.data
  } catch (error) {
    console.error('获取语言列表错误:', error)
    throw error
  }
}

/**
 * 应用图像过滤器
 * @param {object} ocrResult - OCR结果对象
 * @param {object} filters - 过滤器设置
 * @returns {Promise<object>} - 更新后的OCR结果
 */
export async function applyFilters(ocrResult, filters) {
  try {
    const response = await fetch(`${API_BASE_URL}/ocr/applyFilters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ocrResult,
        filters,
      }),
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || '应用过滤器失败')
    }

    return result.data
  } catch (error) {
    console.error('应用过滤器错误:', error)
    throw error
  }
}

/**
 * 设置识别方向
 * @param {object} ocrResult - OCR结果对象
 * @param {string} direction - 识别方向，'horizontal'或'vertical'
 * @returns {Promise<object>} - 更新后的OCR结果
 */
export async function setRecognitionDirection(ocrResult, direction) {
  try {
    const response = await fetch(`${API_BASE_URL}/ocr/setRecognitionDirection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ocrResult,
        direction,
      }),
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || '设置识别方向失败')
    }

    return result.data
  } catch (error) {
    console.error('设置识别方向错误:', error)
    throw error
  }
}

/**
 * 设置显示模式
 * @param {object} ocrResult - OCR结果对象
 * @param {string} mode - 显示模式，'parallel'、'paragraph'或'table'
 * @returns {Promise<object>} - 更新后的OCR结果
 */
export async function setDisplayMode(ocrResult, mode) {
  try {
    const response = await fetch(`${API_BASE_URL}/ocr/setDisplayMode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ocrResult,
        mode,
      }),
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || '设置显示模式失败')
    }

    return result.data
  } catch (error) {
    console.error('设置显示模式错误:', error)
    throw error
  }
}

/**
 * 应用表格设置
 * @param {object} ocrResult - OCR结果对象
 * @param {object} settings - 表格设置
 * @returns {Promise<object>} - 更新后的OCR结果
 */
export async function setTableSettings(ocrResult, settings) {
  try {
    const response = await fetch(`${API_BASE_URL}/ocr/setTableSettings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ocrResult,
        settings,
      }),
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || '应用表格设置失败')
    }

    return result.data
  } catch (error) {
    console.error('应用表格设置错误:', error)
    throw error
  }
}

/**
 * 应用遮罩
 * @param {string} image - Base64编码的图像数据
 * @param {Array} masks - 遮罩区域数组
 * @param {object} dimensions - 图像尺寸
 * @returns {Promise<object>} - 包含遮罩后的图像数据
 */
export async function applyMasks(image, masks, dimensions) {
  try {
    const response = await fetch(`${API_BASE_URL}/ocr/applyMasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image,
        masks,
        dimensions,
      }),
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || '应用遮罩失败')
    }

    return result.data
  } catch (error) {
    console.error('应用遮罩错误:', error)
    throw error
  }
}

/**
 * 检查服务器端API密钥状态
 * @returns {Promise<object>} - 包含API可用性状态的对象
 */
export async function checkApiStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/ocr/apiStatus`)
    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || '获取API状态失败')
    }

    return result.data
  } catch (error) {
    console.error('检查API状态错误:', error)
    // 出错时返回API不可用
    return { apiAvailable: false, keyPrefix: null }
  }
}
