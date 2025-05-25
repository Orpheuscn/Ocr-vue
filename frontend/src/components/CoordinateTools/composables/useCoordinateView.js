import { ref } from 'vue'

/**
 * 坐标视图控制相关的状态和方法
 * @param {Function} forceExitFullscreen - 强制退出全屏的方法
 * @returns {Object} 坐标视图控制相关的响应式数据和方法
 */
export function useCoordinateView(forceExitFullscreen) {
  // 视图显示状态
  const showCoordinateView = ref(false)
  const showBounds = ref(true) // 控制 SVG 边界显隐
  const selectedBlockLevel = ref('blocks') // 控制 SVG 边界级别
  const showCopySuccess = ref(false) // 复制成功状态
  
  // 切换坐标视图显示
  const toggleCoordinateView = () => {
    showCoordinateView.value = !showCoordinateView.value
  }
  
  // 关闭坐标视图
  const closeCoordinateView = () => {
    showCoordinateView.value = false
    
    // 如果处于全屏状态，退出全屏
    if (forceExitFullscreen) {
      forceExitFullscreen()
    }
  }
  
  // 切换边界显示
  const toggleBlockVisibility = () => {
    showBounds.value = !showBounds.value
  }
  
  // 设置块级别
  const setBlockLevel = (level) => {
    selectedBlockLevel.value = level
  }
  
  // 显示复制成功提示
  const showCopySuccessToast = () => {
    showCopySuccess.value = true
    setTimeout(() => {
      showCopySuccess.value = false
    }, 2000)
  }
  
  return {
    // 状态
    showCoordinateView,
    showBounds,
    selectedBlockLevel,
    showCopySuccess,
    
    // 方法
    toggleCoordinateView,
    closeCoordinateView,
    toggleBlockVisibility,
    setBlockLevel,
    showCopySuccessToast
  }
}
