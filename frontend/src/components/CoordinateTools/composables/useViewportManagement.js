import { ref, nextTick } from 'vue'
import { calculateViewportRect, COORDINATE_CONSTANTS } from '../utils/index.js'

/**
 * 视口管理相关的状态和方法
 * @param {Ref} coordSystemWrapper - 坐标系统包装器引用
 * @param {Ref} zoomLevel - 缩放级别
 * @returns {Object} 视口管理相关的响应式数据和方法
 */
export function useViewportManagement(coordSystemWrapper, zoomLevel) {
  // 视口相关状态
  const viewportRect = ref({ top: 0, bottom: 0, left: 0, right: 0 })
  const scrollTop = ref(0)
  const scrollLeft = ref(0)
  const viewportPadding = ref(COORDINATE_CONSTANTS.VIEWPORT_PADDING)
  
  // 用于跟踪滚动位置变化
  let lastScrollTop = 0
  let lastScrollLeft = 0
  
  // 更新视口矩形信息
  const updateViewportRect = () => {
    if (!coordSystemWrapper.value) return

    const wrapperRect = coordSystemWrapper.value.getBoundingClientRect()
    const scrollInfo = coordSystemWrapper.value

    scrollTop.value = scrollInfo.scrollTop
    scrollLeft.value = scrollInfo.scrollLeft

    // 使用工具函数计算可视区域的边界
    viewportRect.value = calculateViewportRect(
      scrollTop.value,
      scrollLeft.value,
      wrapperRect.height,
      wrapperRect.width,
      zoomLevel.value
    )

    // 强制刷新visibleBlockBoundaries
    nextTick(() => {
      // 通过触发reactive更新，使用一个微小的变化来触发响应式更新
      const currentScrollTop = scrollTop.value
      scrollTop.value = currentScrollTop + 0.001
      scrollTop.value = currentScrollTop
    })
  }
  
  // 优化的滚动处理函数
  const handleScroll = (onCacheInvalidate) => {
    // 立即更新可视区域，不再使用requestAnimationFrame延迟，避免点击操作延迟
    updateViewportRect()
    
    // 仍然使用requestAnimationFrame来限制额外的更新
    if (!window._scrollRequestPending) {
      window._scrollRequestPending = true
      requestAnimationFrame(() => {
        updateViewportRect()
        // 当滚动距离较大时，可能需要重新计算缓存
        if (
          Math.abs(scrollTop.value - lastScrollTop) > 100 ||
          Math.abs(scrollLeft.value - lastScrollLeft) > 100
        ) {
          if (onCacheInvalidate) onCacheInvalidate() // 强制重新计算缓存
        }
        lastScrollTop = scrollTop.value
        lastScrollLeft = scrollLeft.value
        window._scrollRequestPending = false
      })
    }
  }
  
  // 添加滚动事件监听器
  const addScrollListener = (onCacheInvalidate) => {
    if (coordSystemWrapper.value) {
      const scrollHandler = () => handleScroll(onCacheInvalidate)
      coordSystemWrapper.value.addEventListener('scroll', scrollHandler)
      return scrollHandler
    }
    return null
  }
  
  // 移除滚动事件监听器
  const removeScrollListener = (scrollHandler) => {
    if (coordSystemWrapper.value && scrollHandler) {
      coordSystemWrapper.value.removeEventListener('scroll', scrollHandler)
    }
  }
  
  // 添加窗口大小变化监听器
  const addResizeListener = () => {
    window.addEventListener('resize', updateViewportRect)
  }
  
  // 移除窗口大小变化监听器
  const removeResizeListener = () => {
    window.removeEventListener('resize', updateViewportRect)
  }
  
  return {
    // 状态
    viewportRect,
    scrollTop,
    scrollLeft,
    viewportPadding,
    
    // 方法
    updateViewportRect,
    handleScroll,
    addScrollListener,
    removeScrollListener,
    addResizeListener,
    removeResizeListener
  }
}
