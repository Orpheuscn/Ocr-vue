/**
 * 通知系统相关的方法
 * @param {Object} store - OCR store
 * @returns {Object} 通知相关的方法
 */
export function useNotifications(store) {
  // 显示通知的统一方法
  const showNotification = (message, type = 'info') => {
    // 如果store中有通知函数就使用它
    if (typeof store._showNotification === 'function') {
      store._showNotification(message, type)
    } else if (typeof store.showNotification === 'function') {
      store.showNotification(message, type)
    } else {
      // 否则直接使用控制台
      console.log(`[${type}] ${message}`)
    }
  }
  
  // 显示成功通知
  const showSuccess = (message) => {
    showNotification(message, 'success')
  }
  
  // 显示错误通知
  const showError = (message) => {
    showNotification(message, 'error')
  }
  
  // 显示警告通知
  const showWarning = (message) => {
    showNotification(message, 'warning')
  }
  
  // 显示信息通知
  const showInfo = (message) => {
    showNotification(message, 'info')
  }
  
  return {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
}
