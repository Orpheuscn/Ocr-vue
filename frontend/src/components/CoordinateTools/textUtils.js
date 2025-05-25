import { COORDINATE_CONSTANTS, BLOCK_LEVELS } from './constants.js'

/**
 * 匹配符号数据
 * @param {Object} symbol - 符号对象
 * @param {Array} filteredSymbolsData - 过滤后的符号数据
 * @param {number} dynamicRadius - 动态匹配半径
 * @returns {Object|null} 匹配的符号数据或null
 */
export function matchSymbolData(symbol, filteredSymbolsData, dynamicRadius) {
  return filteredSymbolsData.find(fd => {
    if (!fd.isFiltered || fd.text !== symbol.text) return false
    
    // 获取符号边界框的第一个顶点（左上角）
    const symbolX = symbol.boundingBox?.vertices?.[0]?.x ?? COORDINATE_CONSTANTS.SYMBOL_MATCH_FALLBACK
    const symbolY = symbol.boundingBox?.vertices?.[0]?.y ?? COORDINATE_CONSTANTS.SYMBOL_MATCH_FALLBACK
    
    // 增加匹配半径，并考虑缩放
    return Math.abs(fd.x - symbolX) < dynamicRadius && Math.abs(fd.y - symbolY) < dynamicRadius
  })
}

/**
 * 处理符号文本和换行
 * @param {Object} symbol - 符号对象
 * @param {Object} symbolData - 匹配的符号数据
 * @returns {string} 处理后的文本
 */
export function processSymbolText(symbol, symbolData) {
  let text = symbol.text
  
  if (symbolData) {
    // 根据检测到的换行类型添加相应的分隔符
    if (symbolData.detectedBreak === COORDINATE_CONSTANTS.BREAK_TYPES.SPACE || 
        symbolData.detectedBreak === COORDINATE_CONSTANTS.BREAK_TYPES.EOL_SURE_SPACE) {
      text += ' '
    } else if (symbolData.detectedBreak === COORDINATE_CONSTANTS.BREAK_TYPES.LINE_BREAK) {
      text += '\n'
    }
  } else if (symbol.text) {
    // 处理倾斜文本，即使没有匹配到filteredSymbolsData
    text += ' ' // 假设添加一个空格作为分隔符
  }
  
  return text
}

/**
 * 收集块文本
 * @param {Object} block - 块对象
 * @param {Array} filteredSymbolsData - 过滤后的符号数据
 * @param {number} zoomLevel - 缩放级别
 * @returns {Object} 包含文本和是否有文本的对象
 */
export function collectBlockText(block, filteredSymbolsData, zoomLevel) {
  let blockText = ''
  let hasAnyText = false
  const dynamicRadius = COORDINATE_CONSTANTS.DYNAMIC_RADIUS_BASE / (zoomLevel || 1)
  
  block.paragraphs?.forEach(para => {
    para.words?.forEach(word => {
      word.symbols?.forEach(symbol => {
        const symbolData = matchSymbolData(symbol, filteredSymbolsData, dynamicRadius)
        
        if (symbolData || symbol.text) {
          hasAnyText = true
          blockText += processSymbolText(symbol, symbolData)
        }
      })
    })
  })
  
  return { text: blockText, hasText: hasAnyText }
}

/**
 * 收集段落文本
 * @param {Object} paragraph - 段落对象
 * @param {Array} filteredSymbolsData - 过滤后的符号数据
 * @param {number} zoomLevel - 缩放级别
 * @returns {Object} 包含文本和是否有文本的对象
 */
export function collectParagraphText(paragraph, filteredSymbolsData, zoomLevel) {
  let paraText = ''
  let hasAnyText = false
  const dynamicRadius = COORDINATE_CONSTANTS.DYNAMIC_RADIUS_BASE / (zoomLevel || 1)
  
  paragraph.words?.forEach(word => {
    word.symbols?.forEach(symbol => {
      const symbolData = matchSymbolData(symbol, filteredSymbolsData, dynamicRadius)
      
      if (symbolData || symbol.text) {
        hasAnyText = true
        paraText += processSymbolText(symbol, symbolData)
      }
    })
  })
  
  return { text: paraText, hasText: hasAnyText }
}

/**
 * 收集单词文本
 * @param {Object} word - 单词对象
 * @param {Array} filteredSymbolsData - 过滤后的符号数据
 * @param {number} zoomLevel - 缩放级别
 * @returns {Object} 包含文本和是否有文本的对象
 */
export function collectWordText(word, filteredSymbolsData, zoomLevel) {
  let wordText = ''
  let hasAnyText = false
  const dynamicRadius = COORDINATE_CONSTANTS.DYNAMIC_RADIUS_BASE / (zoomLevel || 1)
  
  word.symbols?.forEach(symbol => {
    const symbolData = matchSymbolData(symbol, filteredSymbolsData, dynamicRadius)
    
    if (symbolData || symbol.text) {
      hasAnyText = true
      wordText += symbol.text // 单词级别不需要额外的分隔符
    }
  })
  
  return { text: wordText, hasText: hasAnyText }
}

/**
 * 检查符号是否应该被处理
 * @param {Object} symbol - 符号对象
 * @param {Array} filteredSymbolsData - 过滤后的符号数据
 * @param {number} zoomLevel - 缩放级别
 * @returns {boolean} 是否应该处理
 */
export function shouldProcessSymbol(symbol, filteredSymbolsData, zoomLevel) {
  const dynamicRadius = COORDINATE_CONSTANTS.DYNAMIC_RADIUS_BASE / (zoomLevel || 1)
  const symbolData = matchSymbolData(symbol, filteredSymbolsData, dynamicRadius)
  
  return symbolData || (symbol.text && symbol.boundingBox?.vertices?.length >= COORDINATE_CONSTANTS.MIN_VERTICES)
}

/**
 * 根据块级别收集文本
 * @param {Object} item - 要处理的项目（块、段落、单词或符号）
 * @param {string} blockLevel - 块级别
 * @param {Array} filteredSymbolsData - 过滤后的符号数据
 * @param {number} zoomLevel - 缩放级别
 * @returns {Object} 包含文本和是否有文本的对象
 */
export function collectTextByLevel(item, blockLevel, filteredSymbolsData, zoomLevel) {
  switch (blockLevel) {
    case BLOCK_LEVELS.BLOCKS:
      return collectBlockText(item, filteredSymbolsData, zoomLevel)
    case BLOCK_LEVELS.PARAGRAPHS:
      return collectParagraphText(item, filteredSymbolsData, zoomLevel)
    case BLOCK_LEVELS.WORDS:
      return collectWordText(item, filteredSymbolsData, zoomLevel)
    case BLOCK_LEVELS.SYMBOLS:
      // 符号级别直接返回符号文本
      return { 
        text: item.text || '', 
        hasText: shouldProcessSymbol(item, filteredSymbolsData, zoomLevel)
      }
    default:
      return { text: '', hasText: false }
  }
}
