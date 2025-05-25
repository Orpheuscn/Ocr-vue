import { ref, computed } from 'vue'
import { processPageBoundaries, filterVisibleBoundaries } from '../utils/index.js'

/**
 * 边界数据处理相关的状态和方法
 * @param {Object} store - OCR store
 * @param {Ref} selectedBlockLevel - 选中的块级别
 * @param {Ref} zoomLevel - 缩放级别
 * @param {Ref} viewportRect - 视口矩形
 * @param {Ref} viewportPadding - 视口边距
 * @param {Ref} showBounds - 是否显示边界
 * @returns {Object} 边界数据相关的响应式数据和方法
 */
export function useBlockBoundaries(store, selectedBlockLevel, zoomLevel, viewportRect, viewportPadding, showBounds) {
  // 边界缓存
  let blockBoundariesCache = null
  
  // 计算边界数据（带缓存）
  const blockBoundaries = computed(() => {
    // 检查缓存是否有效
    if (
      blockBoundariesCache &&
      blockBoundariesCache.level === selectedBlockLevel.value &&
      blockBoundariesCache.zoom === zoomLevel.value
    ) {
      return blockBoundariesCache.data
    }

    if (!store.fullTextAnnotation?.pages) return []
    
    // 使用工具函数处理边界
    const boundaries = processPageBoundaries(
      store.fullTextAnnotation.pages,
      selectedBlockLevel.value,
      store.filteredSymbolsData,
      zoomLevel.value
    )

    // 更新缓存
    blockBoundariesCache = {
      level: selectedBlockLevel.value,
      zoom: zoomLevel.value,
      data: boundaries
    }

    return boundaries
  })
  
  // 计算可见边界（优化渲染性能）
  const visibleBlockBoundaries = computed(() => 
    filterVisibleBoundaries(
      blockBoundaries.value,
      viewportRect.value,
      viewportPadding.value,
      showBounds.value
    )
  )
  
  // 清除缓存的方法
  const invalidateCache = () => {
    blockBoundariesCache = null
  }
  
  // 强制重新计算边界
  const forceRecalculate = () => {
    invalidateCache()
    // 触发重新计算
    return blockBoundaries.value
  }
  
  return {
    // 计算属性
    blockBoundaries,
    visibleBlockBoundaries,
    
    // 方法
    invalidateCache,
    forceRecalculate
  }
}
