import { ref } from 'vue'

/**
 * 全屏模式管理相关的状态和方法
 * @param {Ref} coordViewContainer - 坐标视图容器引用
 * @returns {Object} 全屏模式相关的响应式数据和方法
 */
export function useFullscreenMode(coordViewContainer) {
  // 全屏状态
  const isFullscreen = ref(false)
  
  // 全屏状态变化处理
  const handleFullscreenChange = () => {
    isFullscreen.value = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    )
  }
  
  // ESC键退出全屏处理
  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && isFullscreen.value) {
      toggleFullscreen()
    }
  }
  
  // 切换全屏模式
  const toggleFullscreen = () => {
    if (!coordViewContainer.value) return
    
    if (!isFullscreen.value) {
      // 进入全屏模式
      if (coordViewContainer.value.requestFullscreen) {
        coordViewContainer.value.requestFullscreen()
      } else if (coordViewContainer.value.webkitRequestFullscreen) {
        // Safari
        coordViewContainer.value.webkitRequestFullscreen()
      } else if (coordViewContainer.value.msRequestFullscreen) {
        // IE11
        coordViewContainer.value.msRequestFullscreen()
      }
    } else {
      // 退出全屏模式
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        // Safari
        document.webkitExitFullscreen()
      } else if (document.msExitFullscreen) {
        // IE11
        document.msExitFullscreen()
      }
    }
  }
  
  // 强制退出全屏（用于关闭坐标视图时）
  const forceExitFullscreen = () => {
    if (isFullscreen.value) {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen()
      }
    }
  }
  
  // 添加全屏事件监听器
  const addFullscreenListeners = () => {
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)
    document.addEventListener('keydown', handleKeyDown)
  }
  
  // 移除全屏事件监听器
  const removeFullscreenListeners = () => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
    document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    document.removeEventListener('keydown', handleKeyDown)
  }
  
  return {
    // 状态
    isFullscreen,
    
    // 方法
    toggleFullscreen,
    forceExitFullscreen,
    handleFullscreenChange,
    handleKeyDown,
    addFullscreenListeners,
    removeFullscreenListeners
  }
}
