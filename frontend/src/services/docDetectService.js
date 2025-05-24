/**
 * 文档检测服务
 * 处理与后端API的所有交互
 */

// 坐标管理状态
let currentImageId = null
let allRectangles = [] // 所有矩形
let activeRectangles = [] // 当前有效的矩形（用于提交）

/**
 * 测试后端连接
 * @returns {Promise<Object>} 连接测试结果
 */
export async function testBackendConnection() {
  try {
    const response = await fetch('/api/python/test')
    console.log('测试连接响应状态:', response.status)

    const data = await response.json().catch((e) => {
      console.error('解析测试响应失败:', e)
      return { status: 'error', message: '无法解析响应' }
    })

    console.log('测试连接响应数据:', data)
    if (data.status === 'ok') {
      console.log('后端服务正常运行')
    } else {
      console.error('后端服务异常')
    }

    return data
  } catch (error) {
    console.error('测试连接失败:', error)
    throw error
  }
}

/**
 * 上传图片
 * @param {FormData} formData 包含图片的FormData对象
 * @returns {Promise<Object>} 上传结果
 */
export async function uploadImage(formData) {
  try {
    // 发送到后端进行处理
    const response = await fetch('/api/python/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('上传失败')
    }

    const data = await response.json()
    console.log('收到后端响应:', data)
    return data
  } catch (error) {
    console.error('上传错误:', error)
    throw error
  }
}

/**
 * 提交切割请求
 * @param {Object} submitData 切割数据
 * @returns {Promise<Object>} 切割结果
 */
export async function cropImage(submitData) {
  try {
    const response = await fetch('/api/python/crop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submitData),
    })

    if (!response.ok) {
      throw new Error('处理失败')
    }

    const data = await response.json()
    console.log('切割结果:', data)
    return data
  } catch (error) {
    console.error('提交错误:', error)
    throw error
  }
}

/**
 * 提取文本
 * @param {Object} extractData 提取文本的数据
 * @returns {Promise<Object>} 文本提取结果
 */
export async function extractText(extractData) {
  try {
    const response = await fetch('/api/python/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(extractData),
    })

    if (!response.ok) {
      throw new Error('提取失败')
    }

    const data = await response.json()
    console.log('文本提取结果:', data)
    return data
  } catch (error) {
    console.error('提取错误:', error)
    throw error
  }
}

/**
 * 下载ZIP文件
 * @param {string} zipUrl ZIP文件的URL
 * @returns {Promise<Blob>} ZIP文件的Blob对象
 */
export async function downloadZipFile(zipUrl) {
  try {
    console.log('开始下载ZIP文件，URL:', zipUrl)

    const response = await fetch(zipUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/zip, application/octet-stream',
      },
      credentials: 'same-origin',
    })

    console.log('ZIP文件下载响应:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries([...response.headers.entries()]),
      url: response.url,
    })

    if (!response.ok) {
      throw new Error(`下载失败: ${response.status} ${response.statusText}`)
    }

    const blob = await response.blob()
    console.log('成功获取ZIP文件Blob:', {
      size: blob.size,
      type: blob.type,
    })

    return blob
  } catch (error) {
    console.error('下载错误:', error)
    throw error
  }
}

/**
 * ========== 坐标管理服务 ==========
 */

/**
 * 初始化坐标管理
 * @param {string} imageId 图片ID
 */
export function initializeCoordinateManager(imageId) {
  currentImageId = imageId
  allRectangles = []
  activeRectangles = []
  console.log('坐标管理器已初始化，图片ID:', imageId)
}

/**
 * 更新所有矩形数据
 * @param {Array} rectangles 矩形数组
 */
export function updateAllRectangles(rectangles) {
  allRectangles = [...rectangles]
  // 默认情况下，所有矩形都是有效的
  activeRectangles = [...rectangles]
  console.log('更新所有矩形数据，总数:', allRectangles.length)
}

/**
 * 添加新矩形
 * @param {Object} rectangle 矩形对象
 */
export function addRectangle(rectangle) {
  allRectangles.push(rectangle)
  activeRectangles.push(rectangle)
  console.log('添加新矩形:', rectangle.id, '当前总数:', allRectangles.length)
}

/**
 * 删除矩形
 * @param {string} rectangleId 矩形ID
 */
export function removeRectangle(rectangleId) {
  allRectangles = allRectangles.filter((rect) => rect.id !== rectangleId)
  activeRectangles = activeRectangles.filter((rect) => rect.id !== rectangleId)
  console.log('删除矩形:', rectangleId, '剩余数量:', allRectangles.length)
}

/**
 * 清空所有矩形
 */
export function clearAllRectangles() {
  allRectangles = []
  activeRectangles = []
  console.log('已清空所有矩形')
}

/**
 * 设置有效矩形（用于筛选）
 * @param {Array} filteredRectangles 筛选后的矩形数组
 */
export function setActiveRectangles(filteredRectangles) {
  activeRectangles = [...filteredRectangles]
  console.log('设置有效矩形，数量:', activeRectangles.length)
}

/**
 * 获取当前有效的矩形数据（用于提交）
 * @returns {Array} 有效矩形数组
 */
export function getActiveRectangles() {
  return [...activeRectangles]
}

/**
 * 获取所有矩形数据
 * @returns {Array} 所有矩形数组
 */
export function getAllRectangles() {
  return [...allRectangles]
}

/**
 * 获取当前图片ID
 * @returns {string} 图片ID
 */
export function getCurrentImageId() {
  return currentImageId
}

/**
 * 准备提交数据（基于当前有效矩形）
 * @returns {Object} 提交数据对象
 */
export function prepareSubmitData() {
  if (!currentImageId) {
    throw new Error('未设置图片ID')
  }

  if (activeRectangles.length === 0) {
    throw new Error('没有有效的矩形数据')
  }

  const submitData = {
    image_id: currentImageId,
    rectangles: activeRectangles.map((rect) => ({
      id: rect.id,
      class: rect.class || 'unknown',
      confidence: rect.confidence || 1.0,
      coords: rect.coords,
    })),
  }

  console.log('准备提交数据:', {
    image_id: currentImageId,
    rectangles_count: activeRectangles.length,
    rectangles: submitData.rectangles,
  })

  return submitData
}
