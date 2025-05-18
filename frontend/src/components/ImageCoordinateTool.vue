<template>
  <div class="container mx-auto px-4 py-6 w-full max-w-full">
    <!-- 标题部分和主题切换 -->
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-accent-focus dark:text-white">图片坐标映射工具</h1>
      <label class="swap swap-rotate">
        <!-- 这个 checkbox 控制图标的切换 -->
        <input type="checkbox" v-model="isDarkTheme" class="theme-controller" value="dark" />

        <!-- 太阳图标 -->
        <svg
          class="swap-on fill-current w-8 h-8"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path
            d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"
          />
        </svg>

        <!-- 月亮图标 -->
        <svg
          class="swap-off fill-current w-8 h-8"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path
            d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"
          />
        </svg>
      </label>
    </div>

    <div class="flex flex-col lg:flex-row gap-4">
      <!-- 左侧：图片上传和预览区域 -->
      <div class="lg:w-2/3 order-2 lg:order-1">
        <!-- 上传按钮 -->
        <div class="card bg-base-100 shadow-md mb-4">
          <div class="card-body p-4 flex justify-center">
            <input
              type="file"
              ref="fileInput"
              accept="image/*"
              class="hidden"
              @change="handleImageUpload"
            />
            <button class="btn btn-accent btn-wide" @click="triggerFileInput">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"
                />
              </svg>
              上传图片
            </button>
          </div>
        </div>

        <!-- Canvas容器 -->
        <div class="card bg-base-100 shadow-md overflow-hidden h-[70vh] lg:h-[80vh]">
          <div
            ref="canvasContainer"
            class="w-full h-full flex items-center justify-center border-2 border-dashed border-base-300 rounded-box relative"
          >
            <div ref="canvasWrapper" class="relative overflow-visible">
              <canvas ref="canvas"></canvas>
              <!-- 十字线元素 -->
              <div ref="crosshairH" class="crosshair-h"></div>
              <div ref="crosshairV" class="crosshair-v"></div>
              <!-- 坐标显示 -->
              <div ref="coordinatesDisplay" class="coordinates-display"></div>
            </div>
            <p v-if="!hasImage" class="text-base-content/60 italic absolute">{{ statusText }}</p>
          </div>
        </div>
      </div>

      <!-- 右侧：坐标信息 -->
      <div class="lg:w-1/3 order-1 lg:order-2 mb-4 lg:mb-0">
        <div class="card bg-base-100 shadow-md h-full">
          <div class="card-body">
            <h2 class="card-title text-accent">矩形坐标信息</h2>
            <div id="display-coordinates" class="hidden"></div>
            <div
              ref="originalCoordinates"
              class="space-y-4 overflow-auto max-h-[40vh] lg:max-h-[70vh]"
            >
              <div class="text-base-content">
                原图尺寸: {{ originalImageWidth }} × {{ originalImageHeight }}
              </div>
              <div
                v-for="(rect, index) in rectangles"
                :key="rect.id"
                class="border-l-4 p-3 rounded-md"
                :style="{ borderColor: getRectColor(rect) }"
              >
                <div class="font-medium">矩形 #{{ index + 1 }}</div>
                <div class="text-sm">
                  <div>左上角: ({{ rect.coords.topLeft.x }}, {{ rect.coords.topLeft.y }})</div>
                  <div>
                    右下角: ({{ rect.coords.bottomRight.x }}, {{ rect.coords.bottomRight.y }})
                  </div>
                  <div>宽度: {{ rect.coords.width }}px, 高度: {{ rect.coords.height }}px</div>
                </div>
              </div>
            </div>
            <button v-if="rectangles.length > 0" class="btn btn-primary mt-4" @click="submitCrop">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              提交切割
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
// 使用全局的fabric变量，确保在index.html中通过CDN加载了fabric.js
/* global fabric */

// 响应式状态
const canvas = ref(null)
const fabricCanvas = ref(null)
const fileInput = ref(null)
const canvasContainer = ref(null)
const canvasWrapper = ref(null)
const crosshairH = ref(null)
const crosshairV = ref(null)
const coordinatesDisplay = ref(null)
const originalCoordinates = ref(null)
const hasImage = ref(false)
const statusText = ref('请先上传一张图片')
const isDarkTheme = ref(localStorage.getItem('theme') === 'dark')
const originalImageWidth = ref(0)
const originalImageHeight = ref(0)
const scaleX = ref(1)
const scaleY = ref(1)
const isDrawing = ref(false)
const currentRect = ref(null)
const rectangles = ref([])
const startX = ref(0)
const startY = ref(0)
const rectCounter = ref(0)
const currentImageId = ref(null)
const submitting = ref(false)

// 颜色管理
const usedColors = ref([])
const colorPool = [0, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350]

// 主题监听
watch(isDarkTheme, (newValue) => {
  const theme = newValue ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
})

// 组件挂载
onMounted(() => {
  initTheme()
  initCanvas()
})

// 初始化主题
const initTheme = () => {
  // 检查localStorage中是否有保存的主题
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme)
    isDarkTheme.value = savedTheme === 'dark'
  } else {
    // 检查系统偏好
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      document.documentElement.setAttribute('data-theme', 'dark')
      isDarkTheme.value = true
    }
  }
}

// 初始化Canvas
const initCanvas = () => {
  fabricCanvas.value = new fabric.Canvas(canvas.value, {
    selection: false,
    width: 100,
    height: 100,
  })

  hasImage.value = false
  if (fabricCanvas.value.wrapperEl) {
    fabricCanvas.value.wrapperEl.style.display = 'none'
  }

  // 设置Canvas事件监听
  setupCanvasEventListeners()
}

const setupCanvasEventListeners = () => {
  // 鼠标移动事件，显示十字线和坐标
  fabricCanvas.value.on('mouse:move', (e) => {
    if (!hasImage.value) return

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
      const width = pointer.x - startX.value
      const height = pointer.y - startY.value

      // 防止宽高为负数
      if (width < 0) {
        currentRect.value.set({ left: pointer.x })
      }
      if (height < 0) {
        currentRect.value.set({ top: pointer.y })
      }

      currentRect.value.set({
        width: Math.abs(width),
        height: Math.abs(height),
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

  // 鼠标按下，开始绘制矩形
  fabricCanvas.value.on('mouse:down', (e) => {
    if (!hasImage.value) return

    const pointer = fabricCanvas.value.getPointer(e.e)
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
      selectable: false,
    })

    fabricCanvas.value.add(currentRect.value)
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

    // 保存矩形信息
    const rectId = `rect_${++rectCounter.value}`
    rectangles.value.push({
      id: rectId,
      rect: currentRect.value,
      coords: calculateCoordinates(currentRect.value),
    })

    currentRect.value = null
  })
}

// 触发文件输入
const triggerFileInput = () => {
  fileInput.value.click()
}

// 处理图片上传
const handleImageUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return

  // 创建FormData对象，用于发送到后端
  const formData = new FormData()
  formData.append('file', file)

  // 显示加载提示
  statusText.value = '正在上传并分析图片，请稍候...'
  hasImage.value = false
  if (fabricCanvas.value.wrapperEl) {
    fabricCanvas.value.wrapperEl.style.display = 'none'
  }

  // 发送到后端进行处理
  fetch('/api/python/upload', {
    method: 'POST',
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('上传失败')
      }
      return response.json()
    })
    .then((data) => {
      if (data.success) {
        // 保存图片信息
        currentImageId.value = data.image_id

        // 加载检测结果图片
        const img = new Image()
        img.onload = () => {
          // 保存原图尺寸
          originalImageWidth.value = data.width
          originalImageHeight.value = data.height

          // 设置Canvas尺寸
          setupCanvas(img)

          // 加载图片到Canvas
          loadImageToCanvas(img)

          // 更新UI状态
          hasImage.value = true
          if (canvasContainer.value) {
            canvasContainer.value.classList.add('border-accent')
            canvasContainer.value.classList.remove('border-dashed')
            canvasContainer.value.classList.add('border-solid')
          }

          // 设置十字线尺寸
          if (crosshairH.value && crosshairV.value) {
            crosshairH.value.style.width = fabricCanvas.value.width + 'px'
            crosshairV.value.style.height = fabricCanvas.value.height + 'px'
          }

          // 重置矩形和坐标信息
          rectangles.value = []
          rectCounter.value = 0

          // 添加检测到的矩形
          if (data.rectangles && data.rectangles.length > 0) {
            addDetectedRectangles(data.rectangles)
          }
        }
        img.src = data.original_image_url
      } else {
        statusText.value = `错误: ${data.error || '上传失败'}`
        hasImage.value = false
      }
    })
    .catch((error) => {
      console.error('上传错误:', error)
      statusText.value = `错误: ${error.message}`
      hasImage.value = false
    })
}

// 设置Canvas尺寸
const setupCanvas = (img) => {
  // 计算适合容器的尺寸
  const containerWidth = canvasContainer.value.clientWidth - 40 // 预留边距
  const containerHeight = canvasContainer.value.clientHeight - 40

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
}

// 加载图片到Canvas
const loadImageToCanvas = (img) => {
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
}

// 添加检测到的矩形
const addDetectedRectangles = (detectedRects) => {
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
      selectable: false,
    })

    fabricCanvas.value.add(rect)

    // 保存矩形信息
    rectangles.value.push({
      id: rectData.id || `rect_${++rectCounter.value}`,
      rect: rect,
      coords: calculateCoordinates(rect),
      class: rectData.class,
      confidence: rectData.confidence,
    })
  })

  fabricCanvas.value.renderAll()
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

  // 返回坐标信息
  return {
    topLeft: { x: originalLeft, y: originalTop },
    topRight: { x: originalRight, y: originalTop },
    bottomLeft: { x: originalLeft, y: originalBottom },
    bottomRight: { x: originalRight, y: originalBottom },
    width: originalRight - originalLeft,
    height: originalBottom - originalTop,
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

// 获取矩形颜色（用于边框）
const getRectColor = (rect) => {
  if (rect.rect && rect.rect.stroke) {
    return rect.rect.stroke
  }
  return '#4CAF50'
}

// 提交切割
const submitCrop = () => {
  if (rectangles.value.length === 0) {
    alert('请先绘制至少一个矩形区域')
    return
  }

  // 防止重复提交
  if (submitting.value) return
  submitting.value = true

  // 准备提交数据
  const submitData = {
    image_id: currentImageId.value,
    rectangles: rectangles.value.map((rect) => {
      return {
        id: rect.id,
        class: rect.class || 'unknown',
        confidence: rect.confidence || 1.0,
        coords: rect.coords,
      }
    }),
  }

  // 发送到后端进行切割
  fetch('/api/python/crop', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(submitData),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('处理失败')
      }
      return response.json()
    })
    .then((data) => {
      submitting.value = false
      if (data.success) {
        // 显示结果对话框
        alert('切割成功！')
        // 这里可以添加更丰富的结果展示逻辑
      } else {
        alert(`错误: ${data.error || '处理失败'}`)
      }
    })
    .catch((error) => {
      submitting.value = false
      console.error('提交错误:', error)
      alert(`错误: ${error.message}`)
    })
}
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
