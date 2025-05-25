import { calculateBoundingBox, generateTooltipText, isBlockInViewport } from './coordinateUtils.js'
import { collectTextByLevel } from './textUtils.js'
import { COORDINATE_CONSTANTS, BLOCK_LEVELS, BLOCK_LEVEL_LABELS } from './constants.js'

/**
 * 创建边界对象
 * @param {Array} vertices - 顶点数组
 * @param {string} label - 标签
 * @param {string} text - 文本内容
 * @param {number} offsetX - X轴偏移
 * @param {number} offsetY - Y轴偏移
 * @returns {Object|null} 边界对象或null
 */
export function createBoundary(vertices, label, text = '', offsetX = COORDINATE_CONSTANTS.Y_AXIS_OFFSET, offsetY = COORDINATE_CONSTANTS.X_AXIS_OFFSET) {
  const boundingBox = calculateBoundingBox(vertices, offsetX, offsetY)
  
  if (!boundingBox) return null
  
  const tooltip = generateTooltipText(label, boundingBox.vertices, boundingBox.width, boundingBox.height)
  
  return {
    points: boundingBox.points,
    tooltip,
    text,
    x: boundingBox.x,
    y: boundingBox.y,
    width: boundingBox.width,
    height: boundingBox.height
  }
}

/**
 * 处理块级边界
 * @param {Object} block - 块对象
 * @param {Array} filteredSymbolsData - 过滤后的符号数据
 * @param {number} zoomLevel - 缩放级别
 * @param {number} count - 计数器
 * @returns {Object|null} 边界对象或null
 */
export function processBlockBoundary(block, filteredSymbolsData, zoomLevel, count) {
  const { text, hasText } = collectTextByLevel(block, BLOCK_LEVELS.BLOCKS, filteredSymbolsData, zoomLevel)
  
  if (hasText && block.boundingBox?.vertices?.length >= COORDINATE_CONSTANTS.MIN_VERTICES) {
    const label = `${BLOCK_LEVEL_LABELS[BLOCK_LEVELS.BLOCKS]} ${count}`
    return createBoundary(block.boundingBox.vertices, label, text)
  }
  
  return null
}

/**
 * 处理段落级边界
 * @param {Object} paragraph - 段落对象
 * @param {Array} filteredSymbolsData - 过滤后的符号数据
 * @param {number} zoomLevel - 缩放级别
 * @param {number} count - 计数器
 * @returns {Object|null} 边界对象或null
 */
export function processParagraphBoundary(paragraph, filteredSymbolsData, zoomLevel, count) {
  const { text, hasText } = collectTextByLevel(paragraph, BLOCK_LEVELS.PARAGRAPHS, filteredSymbolsData, zoomLevel)
  
  if (hasText && paragraph.boundingBox?.vertices?.length >= COORDINATE_CONSTANTS.MIN_VERTICES) {
    const label = `${BLOCK_LEVEL_LABELS[BLOCK_LEVELS.PARAGRAPHS]} ${count}`
    return createBoundary(paragraph.boundingBox.vertices, label, text)
  }
  
  return null
}

/**
 * 处理单词级边界
 * @param {Object} word - 单词对象
 * @param {Array} filteredSymbolsData - 过滤后的符号数据
 * @param {number} zoomLevel - 缩放级别
 * @param {number} count - 计数器
 * @returns {Object|null} 边界对象或null
 */
export function processWordBoundary(word, filteredSymbolsData, zoomLevel, count) {
  const { text, hasText } = collectTextByLevel(word, BLOCK_LEVELS.WORDS, filteredSymbolsData, zoomLevel)
  
  if (hasText && word.boundingBox?.vertices?.length >= COORDINATE_CONSTANTS.MIN_VERTICES) {
    const label = `${BLOCK_LEVEL_LABELS[BLOCK_LEVELS.WORDS]} ${count}`
    return createBoundary(word.boundingBox.vertices, label, text)
  }
  
  return null
}

/**
 * 处理符号级边界
 * @param {Object} symbol - 符号对象
 * @param {Array} filteredSymbolsData - 过滤后的符号数据
 * @param {number} zoomLevel - 缩放级别
 * @returns {Object|null} 边界对象或null
 */
export function processSymbolBoundary(symbol, filteredSymbolsData, zoomLevel) {
  const { hasText } = collectTextByLevel(symbol, BLOCK_LEVELS.SYMBOLS, filteredSymbolsData, zoomLevel)
  
  if (hasText && symbol.boundingBox?.vertices?.length >= COORDINATE_CONSTANTS.MIN_VERTICES) {
    const label = `${BLOCK_LEVEL_LABELS[BLOCK_LEVELS.SYMBOLS]}: ${symbol.text}`
    return createBoundary(symbol.boundingBox.vertices, label, symbol.text)
  }
  
  return null
}

/**
 * 处理页面中的所有边界
 * @param {Array} pages - 页面数组
 * @param {string} selectedBlockLevel - 选中的块级别
 * @param {Array} filteredSymbolsData - 过滤后的符号数据
 * @param {number} zoomLevel - 缩放级别
 * @returns {Array} 边界数组
 */
export function processPageBoundaries(pages, selectedBlockLevel, filteredSymbolsData, zoomLevel) {
  const boundaries = []
  let count = 1
  
  pages.forEach(page => {
    page.blocks?.forEach(block => {
      if (selectedBlockLevel === BLOCK_LEVELS.BLOCKS) {
        const boundary = processBlockBoundary(block, filteredSymbolsData, zoomLevel, count++)
        if (boundary) boundaries.push(boundary)
      } else {
        block.paragraphs?.forEach(paragraph => {
          if (selectedBlockLevel === BLOCK_LEVELS.PARAGRAPHS) {
            const boundary = processParagraphBoundary(paragraph, filteredSymbolsData, zoomLevel, count++)
            if (boundary) boundaries.push(boundary)
          } else {
            paragraph.words?.forEach(word => {
              if (selectedBlockLevel === BLOCK_LEVELS.WORDS) {
                const boundary = processWordBoundary(word, filteredSymbolsData, zoomLevel, count++)
                if (boundary) boundaries.push(boundary)
              } else if (selectedBlockLevel === BLOCK_LEVELS.SYMBOLS) {
                word.symbols?.forEach(symbol => {
                  const boundary = processSymbolBoundary(symbol, filteredSymbolsData, zoomLevel)
                  if (boundary) boundaries.push(boundary)
                })
              }
            })
          }
        })
      }
    })
  })
  
  return boundaries
}

/**
 * 过滤可见边界
 * @param {Array} boundaries - 边界数组
 * @param {Object} viewportRect - 视口矩形
 * @param {number} viewportPadding - 视口边距
 * @param {boolean} showBounds - 是否显示边界
 * @returns {Array} 可见边界数组
 */
export function filterVisibleBoundaries(boundaries, viewportRect, viewportPadding, showBounds) {
  if (!showBounds) return []
  
  return boundaries
    .filter(block => isBlockInViewport(block, viewportRect, viewportPadding))
    .map((block, index) => ({
      ...block,
      originalIndex: index // 保存原始索引，以便追踪对应关系
    }))
}
