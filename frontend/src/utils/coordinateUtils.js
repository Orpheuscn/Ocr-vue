/**
 * 坐标计算工具函数
 * 用于处理图像和画布之间的坐标转换
 */

/**
 * 计算矩形的原始坐标
 * @param {Object} rect - 画布上的矩形对象
 * @param {Number} scaleX - X轴缩放比例
 * @param {Number} scaleY - Y轴缩放比例
 * @param {Number} originalImageWidth - 原始图像宽度
 * @param {Number} originalImageHeight - 原始图像高度
 * @returns {Object} 原始图像上的坐标信息
 */
export const calculateRectCoordinates = (rect, scaleX, scaleY, originalImageWidth, originalImageHeight) => {
  // 获取显示坐标
  const displayLeft = rect.left
  const displayTop = rect.top
  const displayRight = displayLeft + rect.width
  const displayBottom = displayTop + rect.height

  // 转换为原始图像坐标
  const originalLeft = Math.round(displayLeft / scaleX)
  const originalTop = Math.round(displayTop / scaleY)
  const originalRight = Math.round(displayRight / scaleX)
  const originalBottom = Math.round(displayBottom / scaleY)

  // 确保坐标不超出原图范围
  const boundedLeft = Math.max(0, Math.min(originalLeft, originalImageWidth))
  const boundedTop = Math.max(0, Math.min(originalTop, originalImageHeight))
  const boundedRight = Math.max(0, Math.min(originalRight, originalImageWidth))
  const boundedBottom = Math.max(0, Math.min(originalBottom, originalImageHeight))

  // 计算宽度和高度
  const width = boundedRight - boundedLeft
  const height = boundedBottom - boundedTop

  // 返回坐标信息
  return {
    topLeft: { x: boundedLeft, y: boundedTop },
    topRight: { x: boundedRight, y: boundedTop },
    bottomLeft: { x: boundedLeft, y: boundedBottom },
    bottomRight: { x: boundedRight, y: boundedBottom },
    width: width,
    height: height,
  }
}

/**
 * 计算鼠标位置对应的原始图像坐标
 * @param {Number} displayX - 画布上的X坐标
 * @param {Number} displayY - 画布上的Y坐标
 * @param {Number} scaleX - X轴缩放比例
 * @param {Number} scaleY - Y轴缩放比例
 * @returns {Object} 原始图像上的坐标
 */
export const calculateMouseCoordinates = (displayX, displayY, scaleX, scaleY) => {
  const originalX = Math.round(displayX / scaleX)
  const originalY = Math.round(displayY / scaleY)
  
  return { x: originalX, y: originalY }
}

/**
 * 计算画布的缩放比例
 * @param {Number} imageWidth - 原始图像宽度
 * @param {Number} imageHeight - 原始图像高度
 * @param {Number} containerWidth - 容器宽度
 * @param {Number} containerHeight - 容器高度
 * @returns {Object} X和Y轴的缩放比例
 */
export const calculateScaleFactor = (imageWidth, imageHeight, containerWidth, containerHeight) => {
  // 计算宽高比
  const imageRatio = imageWidth / imageHeight
  const containerRatio = containerWidth / containerHeight

  let scaleX, scaleY

  // 根据宽高比决定如何缩放
  if (imageRatio > containerRatio) {
    // 图片较宽，以宽度为基准缩放
    scaleX = containerWidth / imageWidth
    scaleY = scaleX
  } else {
    // 图片较高，以高度为基准缩放
    scaleY = containerHeight / imageHeight
    scaleX = scaleY
  }

  return { scaleX, scaleY }
}
