<template>
  <div class="rectangle-drawing-tool">
    <div
      ref="canvasWrapper"
      class="relative overflow-visible"
      v-show="hasImage"
      tabindex="0"
      @keydown="handleKeyDown"
    >
      <canvas ref="canvas"></canvas>
      <!-- 十字线元素 -->
      <div ref="crosshairH" class="crosshair-h"></div>
      <div ref="crosshairV" class="crosshair-v"></div>
      <!-- 坐标显示 -->
      <div ref="coordinatesDisplay" class="coordinates-display"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
// 引入坐标计算工具函数
import {
  calculateRectCoordinates,
  calculateMouseCoordinates,
  calculateScaleFactor,
} from '@/utils/coordinateUtils'
// 引入颜色管理工具函数
import { getRandomColorHue, generateCanvasColors, hueToHexColor } from '@/utils/colorUtils'
// 使用全局的fabric变量，确保在index.html中通过CDN加载了fabric.js
/* global fabric */

// 从父组件接收的属性
const props = defineProps({
  // 是否有图片加载
  hasImage: {
    type: Boolean,
    required: true,
  },
  // 原始图片宽度
  originalImageWidth: {
    type: Number,
    required: true,
  },
  // 原始图片高度
  originalImageHeight: {
    type: Number,
    required: true,
  },
  // 容器宽度
  containerWidth: {
    type: Number,
    required: true,
  },
  // 容器高度
  containerHeight: {
    type: Number,
    required: true,
  },
  // 当前图片ID
  currentImageId: {
    type: String,
    default: null,
  },
  // 矩形数据（从父组件传入）
  rectangles: {
    type: Array,
    default: () => [],
  },
  // 绘制模式状态（从父组件传入）
  isDrawingMode: {
    type: Boolean,
    default: false,
  },
})

// 向父组件发送的事件
const emit = defineEmits([
  'rectangle-created', // 新创建矩形（仅包含坐标和基本信息）
  'rectangle-moved', // 矩形移动后的坐标更新
  'rectangle-selected', // 矩形被选中
  'rectangle-deleted', // 矩形被删除
])

// 响应式状态（仅保留渲染相关状态）
const canvas = ref(null)
const fabricCanvas = ref(null)
const canvasWrapper = ref(null)
const crosshairH = ref(null)
const crosshairV = ref(null)
const coordinatesDisplay = ref(null)
const scaleX = ref(1)
const scaleY = ref(1)
const isDrawing = ref(false)
const currentRect = ref(null)
const startX = ref(0)
const startY = ref(0)
const rectCounter = ref(0)
const selectedRect = ref(null) // 当前选中的矩形

// 组件挂载
onMounted(() => {
  initCanvas()

  // 添加点击事件监听，用于设置焦点
  if (canvasWrapper.value) {
    canvasWrapper.value.addEventListener('click', handleCanvasClick)
  }
})

// 监听绘制模式变化，更新鼠标样式
watch(
  () => props.isDrawingMode,
  (newMode) => {
    if (canvasWrapper.value) {
      canvasWrapper.value.style.cursor = newMode ? 'crosshair' : 'default'
    }
  },
  { immediate: true },
)

// 组件卸载时移除事件监听
onUnmounted(() => {
  if (canvasWrapper.value) {
    canvasWrapper.value.removeEventListener('click', handleCanvasClick)
  }
})

// 绘制模式切换逻辑已移至父组件

// 处理画布点击事件，用于设置焦点
const handleCanvasClick = () => {
  // 设置tabindex属性，使元素可以获取焦点
  if (canvasWrapper.value && !canvasWrapper.value.hasAttribute('tabindex')) {
    canvasWrapper.value.setAttribute('tabindex', '0')
  }

  // 设置焦点
  if (canvasWrapper.value) {
    canvasWrapper.value.focus()
  }

  // 注意：不再在这里清除选中状态，以便保持矩形的选中状态
  // 选中状态将通过点击画布空白处或删除矩形时清除
}

// 处理键盘事件
const handleKeyDown = (e) => {
  // 查找当前高亮的矩形
  const highlightedRect = props.rectangles.find((rect) => rect.isHighlighted)

  console.log('键盘事件触发:', e.key, '选中矩形:', highlightedRect ? highlightedRect.id : 'none')

  // 如果按下退格键或删除键，且有选中的矩形，则删除该矩形
  if ((e.key === 'Backspace' || e.key === 'Delete') && highlightedRect) {
    console.log('删除矩形:', highlightedRect.id)

    // 通知父组件删除矩形
    emit('rectangle-deleted', highlightedRect)

    // 清除选中状态
    selectedRect.value = null

    // 阻止事件冒泡和默认行为
    e.stopPropagation()
    e.preventDefault()

    return false
  }
}

// 监听hasImage变化
watch(
  () => props.hasImage,
  (newValue) => {
    if (fabricCanvas.value && fabricCanvas.value.wrapperEl) {
      fabricCanvas.value.wrapperEl.style.display = newValue ? 'block' : 'none'
    }
  },
)

// 初始化Canvas
const initCanvas = () => {
  fabricCanvas.value = new fabric.Canvas(canvas.value, {
    selection: false, // 禁用选择功能
    width: 100,
    height: 100,
  })

  if (fabricCanvas.value.wrapperEl) {
    fabricCanvas.value.wrapperEl.style.display = props.hasImage ? 'block' : 'none'
  }

  // 设置Canvas事件监听
  setupCanvasEventListeners()
}

// 设置Canvas事件监听
const setupCanvasEventListeners = () => {
  // 鼠标移动事件，显示十字线和坐标
  fabricCanvas.value.on('mouse:move', (e) => {
    if (!props.hasImage) return

    const pointer = fabricCanvas.value.getPointer(e.e)

    // 更新十字线位置
    if (crosshairH.value && crosshairV.value) {
      crosshairH.value.style.top = pointer.y + 'px'
      crosshairV.value.style.left = pointer.x + 'px'
      crosshairH.value.style.display = 'block'
      crosshairV.value.style.display = 'block'
    }

    // 更新坐标显示
    if (coordinatesDisplay.value) {
      coordinatesDisplay.value.style.left = pointer.x + 10 + 'px'
      coordinatesDisplay.value.style.top = pointer.y + 10 + 'px'
      coordinatesDisplay.value.style.display = 'block'

      // 使用工具函数计算原始图像坐标
      const originalCoords = calculateMouseCoordinates(
        pointer.x,
        pointer.y,
        scaleX.value,
        scaleY.value,
      )

      coordinatesDisplay.value.textContent = `(${originalCoords.x}, ${originalCoords.y})`
    }

    // 处理矩形绘制
    if (isDrawing.value && currentRect.value) {
      // 计算矩形宽高
      let width = Math.abs(pointer.x - startX.value)
      let height = Math.abs(pointer.y - startY.value)

      // 计算矩形左上角
      let left = pointer.x < startX.value ? pointer.x : startX.value
      let top = pointer.y < startY.value ? pointer.y : startY.value

      // 确保矩形不超出画布边界
      const canvasWidth = fabricCanvas.value.width
      const canvasHeight = fabricCanvas.value.height

      if (left < 0) {
        width += left
        left = 0
      }

      if (top < 0) {
        height += top
        top = 0
      }

      if (left + width > canvasWidth) {
        width = canvasWidth - left
      }

      if (top + height > canvasHeight) {
        height = canvasHeight - top
      }

      // 更新矩形
      currentRect.value.set({
        left: left,
        top: top,
        width: width,
        height: height,
      })

      fabricCanvas.value.renderAll()
    }
  })

  // 鼠标离开Canvas
  fabricCanvas.value.on('mouse:out', () => {
    if (crosshairH.value && crosshairV.value && coordinatesDisplay.value) {
      crosshairH.value.style.display = 'none'
      crosshairV.value.style.display = 'none'
      coordinatesDisplay.value.style.display = 'none'
    }
  })

  // 使用已定义的isDrawingMode变量来跟踪绘制模式

  // 鼠标按下，仅用于绘制新矩形（移除点击选中功能）
  fabricCanvas.value.on('mouse:down', (e) => {
    if (!props.hasImage) return

    try {
      // 只有在绘制模式下才创建新矩形
      if (props.isDrawingMode) {
        const pointer = fabricCanvas.value.getPointer(e.e)

        // 开始绘制新矩形
        isDrawing.value = true
        startX.value = pointer.x
        startY.value = pointer.y

        // 创建新矩形 - 使用颜色工具函数
        const colorHue = getRandomColorHue()
        const colors = generateCanvasColors(colorHue)
        const hexColor = hueToHexColor(colorHue)

        currentRect.value = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: colors.fill,
          stroke: colors.stroke,
          strokeWidth: 1,
          selectable: false, // 禁用选中功能
          movable: false, // 禁用移动功能
          hasControls: false, // 不显示控制点
          hasBorders: false, // 不显示边框
          lockRotation: true, // 锁定旋转
          lockScalingX: true, // 锁定X轴缩放
          lockScalingY: true, // 锁定Y轴缩放
          hoverCursor: 'default', // 默认光标样式
        })

        // 保存颜色信息到fabric对象
        currentRect.value.colorHue = colorHue
        currentRect.value.hexColor = hexColor

        fabricCanvas.value.add(currentRect.value)
      }
    } catch (error) {
      console.error('鼠标按下事件处理错误:', error)
    }
  })

  // 鼠标释放，完成矩形绘制
  fabricCanvas.value.on('mouse:up', () => {
    if (!isDrawing.value || !currentRect.value) return

    isDrawing.value = false

    // 检查矩形是否有效（宽高必须大于阈值）
    if (currentRect.value.width < 10 || currentRect.value.height < 10) {
      fabricCanvas.value.remove(currentRect.value)
      currentRect.value = null
      return
    }

    // 使用工具函数计算原始坐标
    const coords = calculateRectCoordinates(
      currentRect.value,
      scaleX.value,
      scaleY.value,
      props.originalImageWidth,
      props.originalImageHeight,
    )

    // 生成矩形ID
    const rectId = `rect_${++rectCounter.value}`

    // 创建矩形基本信息（包含颜色信息）
    const rectInfo = {
      id: rectId,
      coords: coords,
      fabricObject: currentRect.value, // 保存fabric对象引用
      colorHue: currentRect.value.colorHue,
      color: currentRect.value.hexColor,
    }

    // 通知父组件新创建了矩形
    emit('rectangle-created', rectInfo)

    currentRect.value = null
  })

  // 鼠标悬停在矩形上
  fabricCanvas.value.on('mouse:over', (e) => {
    if (e.target && e.target.type === 'rect') {
      console.log('鼠标悬停在矩形上，尝试查找对应的矩形对象:', e.target)
      const rect = findRectangleByFabricObject(e.target)
      if (rect) {
        console.log('找到矩形:', rect.id)
        highlightRect(rect)

        // 设置焦点到画布容器，以便能够接收键盘事件
        if (canvasWrapper.value) {
          canvasWrapper.value.focus()
        }
      } else {
        console.warn('未找到对应的矩形对象')
      }
    }
  })

  // 鼠标离开矩形
  fabricCanvas.value.on('mouse:out', (e) => {
    if (e.target && e.target.type === 'rect') {
      console.log('鼠标离开矩形，尝试查找对应的矩形对象:', e.target)
      const rect = findRectangleByFabricObject(e.target)
      if (rect) {
        console.log('找到矩形:', rect.id)
        // 直接取消高亮，因为现在没有选中状态
        unhighlightRect(rect)
      } else {
        console.warn('未找到对应的矩形对象')
      }
    }
  })

  // 移除对象移动事件处理，因为现在禁用了移动功能

  // 移除所有选中相关的事件处理，因为现在禁用了点击选中功能
}

// 通过fabric对象查找矩形
const findRectangleByFabricObject = (fabricObject) => {
  console.log('查找矩形对象，当前矩形总数:', props.rectangles.length)

  // 首先尝试通过fabric对象引用查找
  const rect = props.rectangles.find((r) => r.fabricObject === fabricObject)
  if (rect) {
    console.log('通过fabric对象引用找到矩形:', rect.id)
    return rect
  }

  console.log('通过fabric对象引用未找到矩形，尝试通过位置和尺寸匹配')

  // 如果找不到，尝试通过位置和尺寸匹配
  const matchedRect = props.rectangles.find((r) => {
    if (!r.fabricObject) return false

    // 比较位置和尺寸是否相近
    const positionMatch =
      Math.abs(r.fabricObject.left - fabricObject.left) < 1 &&
      Math.abs(r.fabricObject.top - fabricObject.top) < 1 &&
      Math.abs(r.fabricObject.width - fabricObject.width) < 1 &&
      Math.abs(r.fabricObject.height - fabricObject.height) < 1

    if (positionMatch) {
      console.log('通过位置和尺寸找到矩形:', r.id)
    }

    return positionMatch
  })

  if (!matchedRect) {
    console.log('未找到匹配的矩形')
  }

  return matchedRect
}

// 计算矩形的原始坐标函数已移至工具函数文件

// 颜色管理已移至 colorUtils.js 工具函数

// 高亮矩形（仅处理视觉效果）
const highlightRect = (rect) => {
  // 保存原始样式以便恢复
  if (rect.fabricObject && !rect.fabricObject._originalStyle) {
    rect.fabricObject._originalStyle = {
      strokeWidth: rect.fabricObject.strokeWidth,
      stroke: rect.fabricObject.stroke,
      fill: rect.fabricObject.fill,
    }
  }

  // 设置高亮样式
  if (rect.fabricObject) {
    const currentColor = rect.fabricObject.stroke || 'hsla(0, 80%, 60%, 0.8)' // 提供默认颜色
    let highlightStroke, highlightFill

    if (currentColor.includes('hsla')) {
      // 提取色相值
      const hueMatch = currentColor.match(/hsla\((\d+)/)
      const hue = hueMatch ? hueMatch[1] : '0'

      // 创建高亮颜色 - 边框为实色，填充为半透明
      highlightStroke = `hsla(${hue}, 100%, 50%, 1)`
      highlightFill = `hsla(${hue}, 100%, 60%, 0.5)`
    } else {
      // 如果是其他颜色格式则使用明亮的红色
      highlightStroke = 'rgba(255, 0, 0, 1)'
      highlightFill = 'rgba(255, 0, 0, 0.5)'
    }

    // 应用高亮样式
    rect.fabricObject.set({
      strokeWidth: 2,
      stroke: highlightStroke,
      fill: highlightFill,
    })

    // 确保矩形在顶层显示
    fabricCanvas.value.bringToFront(rect.fabricObject)
    fabricCanvas.value.renderAll()
  }

  // 设置为当前选中的矩形
  selectedRect.value = rect

  // 设置焦点到画布容器，以便能够接收键盘事件
  if (canvasWrapper.value) {
    canvasWrapper.value.focus()
  }

  // 通知父组件矩形被选中
  emit('rectangle-selected', rect)
}

// 取消高亮矩形（仅处理视觉效果）
const unhighlightRect = (rect) => {
  // 恢复原始样式
  if (rect.fabricObject && rect.fabricObject._originalStyle) {
    rect.fabricObject.set({
      strokeWidth: rect.fabricObject._originalStyle.strokeWidth,
      stroke: rect.fabricObject._originalStyle.stroke,
      fill: rect.fabricObject._originalStyle.fill,
    })

    fabricCanvas.value.renderAll()
  }
}

// 删除矩形（仅处理Canvas删除）
const deleteRectangle = (rect) => {
  // 从canvas中移除矩形
  if (rect.fabricObject && fabricCanvas.value) {
    fabricCanvas.value.remove(rect.fabricObject)
    fabricCanvas.value.renderAll()
  }
}

// 暴露给父组件的方法
defineExpose({
  // 设置Canvas尺寸
  setupCanvas(img) {
    // 使用工具函数计算缩放比例
    const scale = calculateScaleFactor(
      img.width,
      img.height,
      props.containerWidth,
      props.containerHeight,
    )

    scaleX.value = scale.scaleX
    scaleY.value = scale.scaleY

    // 设置画布尺寸
    const canvasWidth = img.width * scale.scaleX
    const canvasHeight = img.height * scale.scaleY

    // 重新初始化Canvas
    fabricCanvas.value.setWidth(canvasWidth)
    fabricCanvas.value.setHeight(canvasHeight)

    // 缩放比例已在之前设置

    // 设置十字线尺寸
    if (crosshairH.value && crosshairV.value) {
      crosshairH.value.style.width = fabricCanvas.value.width + 'px'
      crosshairV.value.style.height = fabricCanvas.value.height + 'px'
    }

    return { canvasWidth, canvasHeight, scale }
  },

  // 加载图片到Canvas
  loadImageToCanvas(img) {
    const imgInstance = new fabric.Image(img, {
      selectable: false,
      evented: false,
      left: 0,
      top: 0,
      scaleX: scaleX.value,
      scaleY: scaleY.value,
    })

    fabricCanvas.value.clear()
    fabricCanvas.value.add(imgInstance)
    fabricCanvas.value.renderAll()

    if (fabricCanvas.value.wrapperEl) {
      fabricCanvas.value.wrapperEl.style.display = 'block'
    }

    // 重置计数器
    rectCounter.value = 0
  },

  // 渲染检测到的矩形（仅处理Canvas渲染）
  renderDetectedRectangles(rectanglesData) {
    rectanglesData.forEach((rectData) => {
      const coords = rectData.coords
      const topLeft = coords.topLeft
      const bottomRight = coords.bottomRight

      // 计算显示坐标
      const displayLeft = topLeft.x * scaleX.value
      const displayTop = topLeft.y * scaleY.value
      const displayWidth = (bottomRight.x - topLeft.x) * scaleX.value
      const displayHeight = (bottomRight.y - topLeft.y) * scaleY.value

      // 生成颜色
      const colorHue = getRandomColorHue()
      const colors = generateCanvasColors(colorHue)
      const hexColor = hueToHexColor(colorHue)

      // 创建矩形
      const rect = new fabric.Rect({
        left: displayLeft,
        top: displayTop,
        width: displayWidth,
        height: displayHeight,
        fill: colors.fill,
        stroke: colors.stroke,
        strokeWidth: 1,
        selectable: false, // 禁用选中功能
        movable: false, // 禁用移动功能
        hasControls: false, // 不显示控制点
        hasBorders: false, // 不显示边框
        lockRotation: true, // 锁定旋转
        lockScalingX: true, // 锁定X轴缩放
        lockScalingY: true, // 锁定Y轴缩放
        hoverCursor: 'default', // 默认光标样式
      })

      // 保存颜色信息到fabric对象
      rect.colorHue = colorHue
      rect.hexColor = hexColor

      fabricCanvas.value.add(rect)

      // 通知父组件新创建了矩形
      emit('rectangle-created', {
        id: rectData.id || `rect_${++rectCounter.value}`,
        coords: rectData.coords,
        fabricObject: rect,
        class: rectData.class,
        confidence: rectData.confidence,
        isAutoDetected: true,
        colorHue: colorHue,
        color: hexColor,
      })
    })

    fabricCanvas.value.renderAll()
  },

  // 高亮矩形（仅视觉效果）
  highlightRect,

  // 取消高亮矩形（仅视觉效果）
  unhighlightRect,

  // 删除矩形（仅Canvas删除）
  deleteRectangle,

  // 清除所有矩形（只清除矩形，保留图片）
  clearRectangles() {
    if (fabricCanvas.value) {
      // 获取所有对象
      const objects = fabricCanvas.value.getObjects()

      // 只删除矩形对象，保留图片对象
      objects.forEach((obj) => {
        if (obj.type === 'rect') {
          fabricCanvas.value.remove(obj)
        }
      })

      fabricCanvas.value.renderAll()
    }
    rectCounter.value = 0
    selectedRect.value = null
  },

  // 清空整个画布（包括图片和矩形）
  clearCanvas() {
    if (fabricCanvas.value) {
      fabricCanvas.value.clear()
      fabricCanvas.value.renderAll()
    }
    rectCounter.value = 0
    selectedRect.value = null
  },

  // 渲染画布
  renderCanvas() {
    if (fabricCanvas.value) {
      fabricCanvas.value.renderAll()
    }
  },

  // 更新可见矩形（用于筛选显示）
  updateVisibleRectangles(filteredRectangles) {
    if (!fabricCanvas.value) return

    // 获取所有矩形对象
    const objects = fabricCanvas.value.getObjects()

    // 创建筛选后矩形ID的集合，用于快速查找
    const filteredIds = new Set(filteredRectangles.map((rect) => rect.id))

    objects.forEach((obj) => {
      if (obj.type === 'rect') {
        // 查找对应的矩形数据
        const rect = props.rectangles.find((r) => r.fabricObject === obj)
        if (rect) {
          // 根据筛选结果设置可见性
          obj.visible = filteredIds.has(rect.id)
        }
      }
    })

    fabricCanvas.value.renderAll()
  },

  // 显示所有矩形
  showAllRectangles() {
    if (!fabricCanvas.value) return

    // 获取所有矩形对象
    const objects = fabricCanvas.value.getObjects()

    objects.forEach((obj) => {
      if (obj.type === 'rect') {
        obj.visible = true
      }
    })

    fabricCanvas.value.renderAll()
  },
})
</script>

<style scoped>
/* 十字线样式 */
.crosshair-h,
.crosshair-v {
  position: absolute;
  pointer-events: none;
  z-index: 100;
  display: none;
}
.crosshair-h {
  width: 100%;
  height: 0;
  border-top: 1px dashed rgba(255, 0, 0, 0.9);
  left: 0;
}
.crosshair-v {
  height: 100%;
  width: 0;
  border-left: 1px dashed rgba(255, 0, 0, 0.9);
  top: 0;
}
/* 实时坐标显示框 */
.coordinates-display {
  position: absolute;
  background-color: rgba(100, 100, 100, 0.85);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  z-index: 120;
  display: none;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
}
[data-theme='dark'] .coordinates-display {
  background-color: rgba(150, 150, 150, 0.85);
  color: #000;
}
</style>
