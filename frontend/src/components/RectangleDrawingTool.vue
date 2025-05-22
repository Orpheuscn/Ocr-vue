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
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
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
})

// 向父组件发送的事件
const emit = defineEmits([
  'rectangle-added',
  'rectangle-updated',
  'rectangle-deleted',
  'rectangle-highlighted',
  'rectangle-unhighlighted',
])

// 响应式状态
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
const rectangles = ref([])
const selectedRect = ref(null) // 当前选中的矩形
const isDrawingMode = ref(false) // 是否处于绘制模式

// 颜色管理
const usedColors = ref([])
const colorPool = [0, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350]

// 组件挂载
onMounted(() => {
  initCanvas()

  // 添加点击事件监听，用于设置焦点
  if (canvasWrapper.value) {
    canvasWrapper.value.addEventListener('click', handleCanvasClick)

    // 设置默认鼠标样式
    canvasWrapper.value.style.cursor = isDrawingMode.value ? 'crosshair' : 'default'
  }
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  if (canvasWrapper.value) {
    canvasWrapper.value.removeEventListener('click', handleCanvasClick)
  }
})

// 切换绘制模式
const toggleDrawingMode = () => {
  isDrawingMode.value = !isDrawingMode.value
  console.log('绘制模式:', isDrawingMode.value ? '开启' : '关闭')

  // 切换到选择模式时，清除当前选中的矩形
  if (!isDrawingMode.value) {
    selectedRect.value = null
  }

  // 更新鼠标样式
  if (canvasWrapper.value) {
    canvasWrapper.value.style.cursor = isDrawingMode.value ? 'crosshair' : 'default'
  }
}

// 处理画布点击事件，用于设置焦点
const handleCanvasClick = (e) => {
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
  const highlightedRect = rectangles.value.find((rect) => rect.isHighlighted)

  console.log('键盘事件触发:', e.key, '选中矩形:', highlightedRect ? highlightedRect.id : 'none')

  // 如果按下退格键或删除键，且有选中的矩形，则删除该矩形
  if ((e.key === 'Backspace' || e.key === 'Delete') && highlightedRect) {
    console.log('删除矩形:', highlightedRect.id)

    // 删除矩形
    deleteRectangle(highlightedRect)

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
    selection: true, // 允许选择
    selectionColor: 'rgba(100, 100, 255, 0.3)', // 选择区域的颜色
    selectionBorderColor: 'rgba(100, 100, 255, 0.8)', // 选择边框的颜色
    selectionLineWidth: 1, // 选择边框的宽度
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

      // 计算原始图像坐标
      const originalX = Math.round(pointer.x / scaleX.value)
      const originalY = Math.round(pointer.y / scaleY.value)

      coordinatesDisplay.value.textContent = `(${originalX}, ${originalY})`
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

  // 鼠标按下，开始绘制矩形或选中矩形
  fabricCanvas.value.on('mouse:down', (e) => {
    if (!props.hasImage) return

    try {
      // 如果点击在矩形上，选中该矩形
      if (e.target && e.target.type === 'rect') {
        const rect = findRectangleByFabricObject(e.target)
        if (rect) {
          console.log('点击选中矩形:', rect.id)

          // 设置为选中状态
          selectedRect.value = rect
          highlightRect(rect)

          // 设置焦点到画布容器，以便能够接收键盘事件
          if (canvasWrapper.value) {
            canvasWrapper.value.focus()
          }

          // 阻止继续处理，避免创建新矩形
          return
        }
      }

      // 如果点击在空白处，清除选中状态
      selectedRect.value = null

      // 只有在绘制模式下才创建新矩形
      if (isDrawingMode.value) {
        const pointer = fabricCanvas.value.getPointer(e.e)

        // 开始绘制新矩形
        isDrawing.value = true
        startX.value = pointer.x
        startY.value = pointer.y

        // 创建新矩形
        const colorHue = getRandomColorHue()
        currentRect.value = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: `hsla(${colorHue}, 80%, 60%, 0.3)`,
          stroke: `hsla(${colorHue}, 80%, 60%, 0.8)`,
          strokeWidth: 1,
          selectable: true, // 设置为可选中
          movable: true, // 设置为可移动
          hasControls: false, // 不显示控制点
          hasBorders: true, // 显示边框
          lockRotation: true, // 锁定旋转
          lockScalingX: true, // 锁定X轴缩放
          lockScalingY: true, // 锁定Y轴缩放
          hoverCursor: 'move', // 鼠标悬停时的光标样式
        })

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

    // 计算原始坐标
    const coords = calculateCoordinates(currentRect.value)

    // 保存矩形信息
    const rectId = `rect_${++rectCounter.value}`
    const newRect = {
      id: rectId,
      rect: currentRect.value,
      coords: coords, // 使用计算的坐标
      class: 'unknown', // 添加默认类别
      showJson: true,
      showText: false,
      isHighlighted: false,
      ocrText: null, // OCR识别的文本
      ocrProcessing: false, // 是否正在OCR处理中
      isUserDrawn: true, // 标记为用户绘制的矩形
    }

    // 不需要单独为每个矩形添加鼠标事件
    // 这些事件会通过 fabric.js 的 mouse:over 和 mouse:out 事件自动处理
    // 确保所有矩形都能正确响应鼠标悬停

    // 添加选中事件，使矩形可以被选中
    currentRect.value.on('selected', () => {
      console.log('矩形被选中:', newRect.id)

      // 设置为选中状态
      selectedRect.value = newRect
      highlightRect(newRect)

      // 设置焦点到画布容器，以便能够接收键盘事件
      if (canvasWrapper.value) {
        canvasWrapper.value.focus()
      }
    })

    rectangles.value.push(newRect)

    // 通知父组件新增了矩形
    emit('rectangle-added', newRect)

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
        // 只有当没有其他交互（如选中）时才取消高亮
        if (!selectedRect.value || selectedRect.value.id !== rect.id) {
          unhighlightRect(rect)
        }
      } else {
        console.warn('未找到对应的矩形对象')
      }
    }
  })

  // 对象移动后更新坐标
  fabricCanvas.value.on('object:modified', (e) => {
    if (e.target && e.target.type === 'rect') {
      const rect = findRectangleByFabricObject(e.target)
      if (rect) {
        // 更新矩形的坐标
        rect.coords = calculateCoordinates(e.target)
        console.log('矩形移动后更新坐标:', rect.id, rect.coords)
      }
    }
  })

  // 选中对象时的事件处理
  fabricCanvas.value.on('selection:created', (e) => {
    if (e.selected && e.selected.length > 0 && e.selected[0].type === 'rect') {
      const rect = findRectangleByFabricObject(e.selected[0])
      if (rect) {
        console.log('Fabric.js 选中矩形:', rect.id)
        selectedRect.value = rect
        highlightRect(rect)

        // 设置焦点到画布容器，以便能够接收键盘事件
        if (canvasWrapper.value) {
          canvasWrapper.value.focus()
        }
      }
    }
  })

  // 选中对象更新时的事件处理
  fabricCanvas.value.on('selection:updated', (e) => {
    if (e.selected && e.selected.length > 0 && e.selected[0].type === 'rect') {
      const rect = findRectangleByFabricObject(e.selected[0])
      if (rect) {
        console.log('Fabric.js 更新选中矩形:', rect.id)
        selectedRect.value = rect
        highlightRect(rect)
      }
    }
  })

  // 清除选中时的事件处理
  fabricCanvas.value.on('selection:cleared', () => {
    console.log('Fabric.js 清除选中')
    // 不清除选中状态，保持矩形的选中状态以便删除
  })
}

// 通过fabric对象查找矩形
const findRectangleByFabricObject = (fabricObject) => {
  console.log('查找矩形对象，当前矩形总数:', rectangles.value.length)

  // 首先尝试通过严格相等查找
  const rect = rectangles.value.find((r) => r.rect === fabricObject)
  if (rect) {
    console.log(
      '通过严格相等找到矩形:',
      rect.id,
      rect.isUserDrawn ? '(用户绘制)' : rect.isAutoDetected ? '(自动检测)' : '',
    )
    return rect
  }

  console.log('通过严格相等未找到矩形，尝试通过位置和尺寸匹配')

  // 如果找不到，尝试通过位置和尺寸匹配
  const matchedRect = rectangles.value.find((r) => {
    if (!r.rect) return false

    // 比较位置和尺寸是否相近
    const positionMatch =
      Math.abs(r.rect.left - fabricObject.left) < 1 &&
      Math.abs(r.rect.top - fabricObject.top) < 1 &&
      Math.abs(r.rect.width - fabricObject.width) < 1 &&
      Math.abs(r.rect.height - fabricObject.height) < 1

    if (positionMatch) {
      console.log(
        '通过位置和尺寸找到矩形:',
        r.id,
        r.isUserDrawn ? '(用户绘制)' : r.isAutoDetected ? '(自动检测)' : '',
      )
    }

    return positionMatch
  })

  if (!matchedRect) {
    console.log('未找到匹配的矩形')
  }

  return matchedRect
}

// 计算矩形的原始坐标
const calculateCoordinates = (rect) => {
  // 获取显示坐标
  const displayLeft = rect.left
  const displayTop = rect.top
  const displayRight = displayLeft + rect.width
  const displayBottom = displayTop + rect.height

  // 转换为原始图像坐标
  const originalLeft = Math.round(displayLeft / scaleX.value)
  const originalTop = Math.round(displayTop / scaleY.value)
  const originalRight = Math.round(displayRight / scaleX.value)
  const originalBottom = Math.round(displayBottom / scaleY.value)

  // 确保坐标不超出原图范围
  const boundedLeft = Math.max(0, Math.min(originalLeft, props.originalImageWidth))
  const boundedTop = Math.max(0, Math.min(originalTop, props.originalImageHeight))
  const boundedRight = Math.max(0, Math.min(originalRight, props.originalImageWidth))
  const boundedBottom = Math.max(0, Math.min(originalBottom, props.originalImageHeight))

  // 计算宽度和高度
  const width = boundedRight - boundedLeft
  const height = boundedBottom - boundedTop

  // 返回坐标信息
  return {
    topLeft: { x: boundedLeft, y: boundedTop },
    topRight: { x: boundedRight, y: boundedTop },
    bottomLeft: { x: boundedLeft, y: boundedBottom },
    bottomRight: { x: boundedRight, y: boundedBottom },
    width: width,
    height: height,
  }
}

// 获取随机色相
const getRandomColorHue = () => {
  if (colorPool.length === 0) {
    // 所有颜色都已使用，重置
    colorPool.push(...usedColors.value)
    usedColors.value = []
  }

  // 随机选择一个颜色
  const randomIndex = Math.floor(Math.random() * colorPool.length)
  const selectedHue = colorPool[randomIndex]

  // 从可用池中移除并加入已使用池
  colorPool.splice(randomIndex, 1)
  usedColors.value.push(selectedHue)

  return selectedHue
}

// 高亮矩形
const highlightRect = (rect) => {
  // 先取消所有其他矩形的高亮状态
  rectangles.value.forEach((r) => {
    if (r.id !== rect.id && r.isHighlighted) {
      unhighlightRect(r)
    }
  })

  // 保存原始样式以便恢复
  if (rect.rect && !rect.rect._originalStyle) {
    rect.rect._originalStyle = {
      strokeWidth: rect.rect.strokeWidth,
      stroke: rect.rect.stroke,
      fill: rect.rect.fill,
    }
  }

  // 设置高亮样式
  if (rect.rect) {
    const currentColor = rect.rect.stroke || 'hsla(0, 80%, 60%, 0.8)' // 提供默认颜色
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
    rect.rect.set({
      strokeWidth: 2,
      stroke: highlightStroke,
      fill: highlightFill,
    })

    // 确保矩形在顶层显示
    fabricCanvas.value.bringToFront(rect.rect)
    fabricCanvas.value.renderAll()
  }

  // 标记为高亮状态
  rect.isHighlighted = true

  // 设置为当前选中的矩形
  selectedRect.value = rect

  // 设置焦点到画布容器，以便能够接收键盘事件
  if (canvasWrapper.value) {
    canvasWrapper.value.focus()
  }

  // 通知父组件矩形被高亮
  emit('rectangle-highlighted', rect)
}

// 取消高亮矩形
const unhighlightRect = (rect) => {
  // 如果矩形是当前选中的矩形，则不取消高亮
  if (selectedRect.value && selectedRect.value.id === rect.id) {
    return
  }

  // 恢复原始样式
  if (rect.rect && rect.rect._originalStyle) {
    rect.rect.set({
      strokeWidth: rect.rect._originalStyle.strokeWidth,
      stroke: rect.rect._originalStyle.stroke,
      fill: rect.rect._originalStyle.fill,
    })

    fabricCanvas.value.renderAll()
  }

  // 取消高亮状态标记
  rect.isHighlighted = false

  // 通知父组件矩形取消高亮
  emit('rectangle-unhighlighted', rect)
}

// 删除矩形
const deleteRectangle = (rect) => {
  // 从canvas中移除矩形
  if (rect.rect && fabricCanvas.value) {
    fabricCanvas.value.remove(rect.rect)
    fabricCanvas.value.renderAll()
  }

  // 从矩形数组中移除
  const index = rectangles.value.findIndex((r) => r.id === rect.id)
  if (index !== -1) {
    rectangles.value.splice(index, 1)

    // 通知父组件矩形被删除
    emit('rectangle-deleted', rect)
  }
}

// 暴露给父组件的方法
defineExpose({
  // 设置Canvas尺寸
  setupCanvas(img) {
    // 计算适合容器的尺寸
    const containerWidth = props.containerWidth - 40 // 预留边距
    const containerHeight = props.containerHeight - 40

    // 计算缩放比例
    const scaleWidth = containerWidth / img.width
    const scaleHeight = containerHeight / img.height

    // 使用较小的缩放比例，确保图像完全可见
    const scale = Math.min(scaleWidth, scaleHeight)

    // 设置画布尺寸
    const canvasWidth = img.width * scale
    const canvasHeight = img.height * scale

    // 重新初始化Canvas
    fabricCanvas.value.setWidth(canvasWidth)
    fabricCanvas.value.setHeight(canvasHeight)

    // 保存缩放比例
    scaleX.value = scale
    scaleY.value = scale

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

    // 重置矩形
    rectangles.value = []
    rectCounter.value = 0
  },

  // 添加检测到的矩形
  addDetectedRectangles(detectedRects) {
    detectedRects.forEach((rectData) => {
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
      const fillColor = `hsla(${colorHue}, 80%, 60%, 0.3)`
      const strokeColor = `hsla(${colorHue}, 80%, 60%, 0.8)`

      // 创建矩形
      const rect = new fabric.Rect({
        left: displayLeft,
        top: displayTop,
        width: displayWidth,
        height: displayHeight,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: 1,
        selectable: true, // 设置为可选中
        movable: true, // 设置为可移动
        hasControls: false, // 不显示控制点
        hasBorders: true, // 显示边框
        lockRotation: true, // 锁定旋转
        lockScalingX: true, // 锁定X轴缩放
        lockScalingY: true, // 锁定Y轴缩放
        hoverCursor: 'move', // 鼠标悬停时的光标样式
      })

      fabricCanvas.value.add(rect)

      // 创建矩形对象
      const rectObject = {
        id: rectData.id || `rect_${++rectCounter.value}`,
        rect: rect,
        coords: rectData.coords, // 使用原始坐标信息
        class: rectData.class,
        confidence: rectData.confidence,
        showJson: true,
        showText: false,
        isHighlighted: false,
        ocrText: null, // OCR识别的文本
        ocrProcessing: false, // 是否正在OCR处理中
        isAutoDetected: true, // 标记为自动检测的矩形
      }

      // 不需要单独为每个矩形添加鼠标事件
      // 这些事件会通过 fabric.js 的 mouse:over 和 mouse:out 事件自动处理
      // 确保所有矩形都能正确响应鼠标悬停

      // 添加选中事件，使矩形可以被选中
      rect.on('selected', () => {
        console.log('矩形被选中:', rectObject.id)

        // 设置为选中状态
        selectedRect.value = rectObject
        highlightRect(rectObject)

        // 设置焦点到画布容器，以便能够接收键盘事件
        if (canvasWrapper.value) {
          canvasWrapper.value.focus()
        }
      })

      // 保存矩形信息
      rectangles.value.push(rectObject)

      // 通知父组件新增了矩形
      emit('rectangle-added', rectObject)
    })

    fabricCanvas.value.renderAll()
  },

  // 获取所有矩形
  getRectangles() {
    return rectangles.value
  },

  // 删除矩形
  deleteRectangle,

  // 高亮矩形
  highlightRect,

  // 取消高亮矩形
  unhighlightRect,

  // 清除所有矩形
  clearRectangles() {
    rectangles.value.forEach((rect) => {
      if (rect.rect && fabricCanvas.value) {
        fabricCanvas.value.remove(rect.rect)
      }
    })
    rectangles.value = []
    rectCounter.value = 0
    fabricCanvas.value.renderAll()
  },

  // 渲染画布
  renderCanvas() {
    if (fabricCanvas.value) {
      fabricCanvas.value.renderAll()
    }
  },

  // 切换绘制模式
  toggleDrawingMode,

  // 获取当前绘制模式状态
  isInDrawingMode() {
    return isDrawingMode.value
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
