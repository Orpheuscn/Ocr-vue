import { ref } from 'vue'

/**
 * 多边形交互相关的状态和方法
 * @returns {Object} 多边形交互相关的响应式数据和方法
 */
export function usePolygonInteraction() {
  // 悬停状态
  const activePolygonIndex = ref(-1)
  const tooltipText = ref('')
  const tooltipPos = ref({ x: 0, y: 0 })
  const tooltipVisible = ref(false)
  const copyToastPosition = ref({ top: '0px', left: '0px' })

  // 鼠标位置状态
  const mousePosition = ref({ x: 0, y: 0 })

  // 显示多边形悬停效果
  const showPolygonHover = (index, event, tooltip) => {
    activePolygonIndex.value = index
    tooltipText.value = tooltip
    tooltipPos.value = { x: event.clientX, y: event.clientY }
    tooltipVisible.value = true
    updateTooltipPosition(event)
  }

  // 隐藏多边形悬停效果
  const hidePolygonHover = () => {
    activePolygonIndex.value = -1
    tooltipVisible.value = false
  }

  // 更新工具提示位置
  const updateTooltipPosition = (event) => {
    if (!tooltipVisible.value) return

    const tooltip = document.querySelector('.coordinate-tooltip')
    if (!tooltip) return

    const rect = tooltip.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let x = event.clientX + 10
    let y = event.clientY - 10

    // 防止工具提示超出视口边界
    if (x + rect.width > viewportWidth) {
      x = event.clientX - rect.width - 10
    }
    if (y < 0) {
      y = event.clientY + 20
    }
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 10
    }

    tooltipPos.value = { x, y }
  }

  // 复制块文本
  const copyBlockText = (text, event, showNotification) => {
    if (!text || !text.trim()) return

    // 设置复制提示的位置
    copyToastPosition.value = {
      top: `${event.offsetY}px`,
      left: `${event.offsetX}px`,
    }

    navigator.clipboard
      .writeText(text.trim())
      .then(() => {
        if (showNotification) {
          showNotification('文本已复制到剪贴板', 'success')
        }
      })
      .catch(() => {
        if (showNotification) {
          showNotification('复制失败，请重试', 'error')
        }
      })
  }

  // 添加全局鼠标移动监听器
  const addMouseListeners = () => {
    const mouseMoveHandler = (e) => {
      mousePosition.value = { x: e.clientX, y: e.clientY }
    }

    const touchMoveHandler = (e) => {
      if (e.touches && e.touches[0]) {
        mousePosition.value = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }

    window.addEventListener('mousemove', mouseMoveHandler)
    window.addEventListener('touchmove', touchMoveHandler)

    return { mouseMoveHandler, touchMoveHandler }
  }

  // 移除全局鼠标移动监听器
  const removeMouseListeners = (handlers) => {
    if (handlers) {
      window.removeEventListener('mousemove', handlers.mouseMoveHandler)
      window.removeEventListener('touchmove', handlers.touchMoveHandler)
    }
  }

  // 添加工具提示移动监听器
  const addTooltipListener = () => {
    document.addEventListener('mousemove', updateTooltipPosition)
  }

  // 移除工具提示移动监听器
  const removeTooltipListener = () => {
    document.removeEventListener('mousemove', updateTooltipPosition)
  }

  return {
    // 状态
    activePolygonIndex,
    tooltipText,
    tooltipPos,
    tooltipVisible,
    copyToastPosition,
    mousePosition,

    // 方法
    showPolygonHover,
    hidePolygonHover,
    updateTooltipPosition,
    copyBlockText,
    addMouseListeners,
    removeMouseListeners,
    addTooltipListener,
    removeTooltipListener,
  }
}
