/**
 * 坐标系统相关常量
 */
export const COORDINATE_CONSTANTS = {
  // 坐标轴偏移
  Y_AXIS_OFFSET: 30, // Y轴标签偏移量
  X_AXIS_OFFSET: 0,  // X轴标签偏移量
  
  // 缩放相关
  DEFAULT_ZOOM: 1,
  MIN_ZOOM: 0.2,
  MAX_ZOOM: 2,
  ZOOM_STEP: 0.1,
  
  // 视口相关
  VIEWPORT_PADDING: 1000, // 视口扩展边距
  
  // 符号匹配相关
  DYNAMIC_RADIUS_BASE: 15, // 基础匹配半径
  SYMBOL_MATCH_FALLBACK: -999, // 符号匹配失败时的默认值
  
  // 轴标签相关
  AXIS_STEP_MIN: 50, // 轴标签最小间距
  AXIS_LABEL_OFFSET: 5, // 轴标签位置微调
  Y_LABEL_OFFSET: 7, // Y轴标签垂直偏移
  
  // 边界验证
  MIN_VERTICES: 3, // 最小顶点数量
  
  // 文本处理
  BREAK_TYPES: {
    SPACE: 'SPACE',
    EOL_SURE_SPACE: 'EOL_SURE_SPACE',
    LINE_BREAK: 'LINE_BREAK'
  }
}

/**
 * 块级别类型
 */
export const BLOCK_LEVELS = {
  BLOCKS: 'blocks',
  PARAGRAPHS: 'paragraphs', 
  WORDS: 'words',
  SYMBOLS: 'symbols'
}

/**
 * 块级别标签映射
 */
export const BLOCK_LEVEL_LABELS = {
  [BLOCK_LEVELS.BLOCKS]: '区块',
  [BLOCK_LEVELS.PARAGRAPHS]: '段落',
  [BLOCK_LEVELS.WORDS]: '单词',
  [BLOCK_LEVELS.SYMBOLS]: '符号'
}
