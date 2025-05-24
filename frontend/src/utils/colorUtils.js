/**
 * 颜色管理工具函数
 * 统一管理矩形颜色分配和计算
 */

// 颜色池 - HSL色相值
const colorPool = [0, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350]

// 预定义的颜色数组（用于矩形卡片显示）
const predefinedColors = [
  '#FF6B6B', // 红色
  '#4ECDC4', // 青色
  '#45B7D1', // 蓝色
  '#96CEB4', // 绿色
  '#FFEAA7', // 黄色
  '#DDA0DD', // 紫色
  '#98D8C8', // 薄荷绿
  '#F7DC6F', // 金黄色
  '#BB8FCE', // 淡紫色
  '#85C1E9', // 天蓝色
]

// 已使用的颜色记录
let usedColors = []

/**
 * 获取随机颜色色相值（用于Canvas绘制）
 * @returns {number} HSL色相值 (0-360)
 */
export const getRandomColorHue = () => {
  // 如果所有颜色都用完了，重置已使用颜色列表
  if (usedColors.length >= colorPool.length) {
    usedColors = []
  }

  // 从未使用的颜色中随机选择
  const availableColors = colorPool.filter(color => !usedColors.includes(color))
  const randomIndex = Math.floor(Math.random() * availableColors.length)
  const selectedColor = availableColors[randomIndex]

  // 记录已使用的颜色
  usedColors.push(selectedColor)

  return selectedColor
}

/**
 * 根据矩形ID获取预定义颜色（用于矩形卡片显示）
 * @param {Object} rect - 矩形对象
 * @returns {string} 十六进制颜色值
 */
export const getRectColor = (rect) => {
  return predefinedColors[rect.id.replace('rect_', '') % predefinedColors.length]
}

/**
 * 生成Canvas矩形的填充和边框颜色
 * @param {number} hue - HSL色相值
 * @returns {Object} 包含fill和stroke颜色的对象
 */
export const generateCanvasColors = (hue) => {
  return {
    fill: `hsla(${hue}, 80%, 60%, 0.3)`,
    stroke: `hsla(${hue}, 80%, 60%, 0.8)`
  }
}

/**
 * 重置颜色使用记录
 */
export const resetColorUsage = () => {
  usedColors = []
}

/**
 * 获取当前已使用的颜色数量
 * @returns {number} 已使用颜色数量
 */
export const getUsedColorCount = () => {
  return usedColors.length
}

/**
 * 检查是否还有可用颜色
 * @returns {boolean} 是否还有可用颜色
 */
export const hasAvailableColors = () => {
  return usedColors.length < colorPool.length
}
