import { ref, computed, nextTick } from 'vue'
import {
  calculateSystemWidth,
  calculateSystemHeight,
  calculateXAxisLabels,
  calculateYAxisLabels,
  COORDINATE_CONSTANTS,
} from '../utils/index.js'

/**
 * 坐标系统相关的状态和方法
 * @param {Object} store - OCR store
 * @returns {Object} 坐标系统相关的响应式数据和方法
 */
export function useCoordinateSystem(store) {
  // 缩放级别
  const zoomLevel = ref(COORDINATE_CONSTANTS.DEFAULT_ZOOM)

  // 计算系统尺寸
  const systemWidth = computed(() => calculateSystemWidth(store.imageDimensions.width))
  const systemHeight = computed(() => calculateSystemHeight(store.imageDimensions.height))

  // 计算轴标签
  const xAxisLabels = computed(() => calculateXAxisLabels(store.imageDimensions.width || 0))
  const yAxisLabels = computed(() => calculateYAxisLabels(store.imageDimensions.height || 0))

  // 缩放控制方法
  const zoomIn = () => {
    zoomLevel.value = Math.min(
      COORDINATE_CONSTANTS.MAX_ZOOM,
      zoomLevel.value + COORDINATE_CONSTANTS.ZOOM_STEP,
    )
  }

  const zoomOut = () => {
    zoomLevel.value = Math.max(
      COORDINATE_CONSTANTS.MIN_ZOOM,
      zoomLevel.value - COORDINATE_CONSTANTS.ZOOM_STEP,
    )
  }

  // 处理变换结束事件
  const handleTransformEnd = () => {
    // 这个方法现在只是一个占位符，实际的逻辑在组件中处理
  }

  return {
    // 状态
    zoomLevel,
    systemWidth,
    systemHeight,
    xAxisLabels,
    yAxisLabels,

    // 方法
    zoomIn,
    zoomOut,
    handleTransformEnd,
  }
}
