import { COORDINATE_CONSTANTS } from './constants.js'

/**
 * 计算坐标系统的宽度
 * @param {number} imageWidth - 图片宽度
 * @returns {number} 系统宽度
 */
export function calculateSystemWidth(imageWidth) {
  return (imageWidth || 0) + COORDINATE_CONSTANTS.Y_AXIS_OFFSET
}

/**
 * 计算坐标系统的高度
 * @param {number} imageHeight - 图片高度
 * @returns {number} 系统高度
 */
export function calculateSystemHeight(imageHeight) {
  return (imageHeight || 0) + COORDINATE_CONSTANTS.Y_AXIS_OFFSET
}

/**
 * 计算X轴标签
 * @param {number} width - 图片宽度
 * @returns {Array} 标签数组
 */
export function calculateXAxisLabels(width) {
  if (width <= 0) return []
  
  const labels = []
  const step = Math.max(COORDINATE_CONSTANTS.AXIS_STEP_MIN, Math.ceil(width / 10))
  
  for (let x = 0; x <= width; x += step) {
    // 位置需要加上 Y 轴的偏移，并微调使其居中对齐刻度
    labels.push({ 
      pos: x + COORDINATE_CONSTANTS.Y_AXIS_OFFSET - COORDINATE_CONSTANTS.AXIS_LABEL_OFFSET, 
      text: Math.round(x) 
    })
  }
  
  return labels
}

/**
 * 计算Y轴标签
 * @param {number} height - 图片高度
 * @returns {Array} 标签数组
 */
export function calculateYAxisLabels(height) {
  if (height <= 0) return []
  
  const labels = []
  const step = Math.max(COORDINATE_CONSTANTS.AXIS_STEP_MIN, Math.ceil(height / 10))
  
  for (let y = 0; y <= height; y += step) {
    // 位置需要微调使文字大致与刻度线垂直居中
    labels.push({ 
      pos: y - COORDINATE_CONSTANTS.Y_LABEL_OFFSET, 
      text: Math.round(y) 
    })
  }
  
  return labels
}

/**
 * 计算边界框
 * @param {Array} vertices - 顶点数组
 * @param {number} offsetX - X轴偏移
 * @param {number} offsetY - Y轴偏移
 * @returns {Object|null} 边界框信息或null
 */
export function calculateBoundingBox(vertices, offsetX = COORDINATE_CONSTANTS.Y_AXIS_OFFSET, offsetY = COORDINATE_CONSTANTS.X_AXIS_OFFSET) {
  if (!vertices || vertices.length < COORDINATE_CONSTANTS.MIN_VERTICES) return null
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  
  const pointsString = vertices.map(v => {
    const x = v?.x ?? 0
    const y = v?.y ?? 0
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
    return `${x + offsetX},${y + offsetY}`
  }).join(' ')

  // 检查边界是否有效
  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return null
  }

  const width = maxX - minX
  const height = maxY - minY

  return {
    points: pointsString,
    x: minX,
    y: minY,
    width,
    height,
    vertices: vertices.map(v => ({
      x: (v?.x ?? 0).toFixed(0),
      y: (v?.y ?? 0).toFixed(0)
    }))
  }
}

/**
 * 生成工具提示文本
 * @param {string} label - 标签
 * @param {Array} vertices - 顶点数组
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @returns {string} 工具提示文本
 */
export function generateTooltipText(label, vertices, width, height) {
  const verticesText = vertices.map(v => `(${v.x},${v.y})`).join(' ')
  return `${label}\nVertices: ${verticesText}\nW:${width.toFixed(1)}, H:${height.toFixed(1)}`
}

/**
 * 检查点是否在视口内
 * @param {Object} block - 块对象
 * @param {Object} viewport - 视口对象
 * @param {number} padding - 边距
 * @returns {boolean} 是否在视口内
 */
export function isBlockInViewport(block, viewport, padding = COORDINATE_CONSTANTS.VIEWPORT_PADDING) {
  const { top, bottom, left, right } = viewport
  
  const extendedTop = top - padding
  const extendedBottom = bottom + padding
  const extendedLeft = left - padding
  const extendedRight = right + padding
  
  return !(
    (block.x + block.width + COORDINATE_CONSTANTS.Y_AXIS_OFFSET) < extendedLeft ||
    (block.x + COORDINATE_CONSTANTS.Y_AXIS_OFFSET) > extendedRight ||
    (block.y + block.height) < extendedTop ||
    block.y > extendedBottom
  )
}

/**
 * 计算视口矩形
 * @param {number} scrollTop - 滚动顶部位置
 * @param {number} scrollLeft - 滚动左侧位置
 * @param {number} wrapperHeight - 容器高度
 * @param {number} wrapperWidth - 容器宽度
 * @param {number} zoomLevel - 缩放级别
 * @returns {Object} 视口矩形
 */
export function calculateViewportRect(scrollTop, scrollLeft, wrapperHeight, wrapperWidth, zoomLevel) {
  return {
    top: scrollTop / zoomLevel,
    left: scrollLeft / zoomLevel,
    bottom: (scrollTop + wrapperHeight) / zoomLevel,
    right: (scrollLeft + wrapperWidth) / zoomLevel
  }
}

/**
 * 计算动态匹配半径
 * @param {number} zoomLevel - 缩放级别
 * @returns {number} 动态半径
 */
export function calculateDynamicRadius(zoomLevel) {
  return COORDINATE_CONSTANTS.DYNAMIC_RADIUS_BASE / (zoomLevel || 1)
}
