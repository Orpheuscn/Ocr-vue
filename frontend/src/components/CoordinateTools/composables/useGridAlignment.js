import { ref, watch, nextTick } from 'vue'

/**
 * 网格对齐管理相关的状态和方法
 * @param {Object} store - OCR store
 * @param {Function} updateViewportRect - 更新视口的方法
 * @returns {Object} 网格对齐相关的响应式数据和方法
 */
export function useGridAlignment(store, updateViewportRect) {
  // 网格对齐工具引用和状态
  const gridAlignmentToolRef = ref(null)
  const alignedSymbols = ref([]) // 存储子组件计算的对齐后符号数据
  
  // 处理网格对齐状态变化
  const handleGridAlignChange = (isAligned) => {
    console.log(`网格对齐状态变为: ${isAligned ? '已对齐' : '未对齐'}`)
    
    // 强制更新视口信息，确保UI正确显示
    nextTick(() => {
      if (updateViewportRect) {
        updateViewportRect()
      }
    })
  }
  
  // 初始化对齐符号数据
  const initializeAlignedSymbols = () => {
    if (store.filteredSymbolsData?.length) {
      alignedSymbols.value = store.filteredSymbolsData
        .filter((s) => s.isFiltered)
        .map((symbol) => ({
          text: symbol.text || '',
          x: symbol.x,
          y: symbol.y,
          width: Math.max(symbol.width || 0, 20),
          height: Math.max(symbol.height || 0, 20),
          fontSize: `${Math.max(12, symbol.height * 0.8)}px`
        }))
    }
  }
  
  // 更新对齐符号数据
  const updateAlignedSymbols = (newData) => {
    // 只有在非网格对齐模式下或子组件未初始化时才手动更新
    if (!gridAlignmentToolRef.value?.showGridAlign) {
      alignedSymbols.value = newData
        .filter((s) => s.isFiltered)
        .map((symbol) => ({
          text: symbol.text || '',
          x: symbol.x,
          y: symbol.y,
          width: Math.max(symbol.width || 0, 20),
          height: Math.max(symbol.height || 0, 20),
          fontSize: `${Math.max(12, symbol.height * 0.8)}px`
        }))
    }
  }
  
  // 设置监听器
  const setupWatchers = () => {
    // 监听过滤数据变化，更新字符显示
    const stopWatcher = watch(
      () => store.filteredSymbolsData,
      (newData) => {
        updateAlignedSymbols(newData)
      },
      { deep: true }
    )
    
    return stopWatcher
  }
  
  // 验证网格对齐工具引用
  const validateGridAlignmentTool = () => {
    nextTick(() => {
      if (!gridAlignmentToolRef.value) {
        console.warn('GridAlignmentTool组件引用未找到，可能影响网格对齐功能')
      }
    })
  }
  
  return {
    // 状态
    gridAlignmentToolRef,
    alignedSymbols,
    
    // 方法
    handleGridAlignChange,
    initializeAlignedSymbols,
    updateAlignedSymbols,
    setupWatchers,
    validateGridAlignmentTool
  }
}
