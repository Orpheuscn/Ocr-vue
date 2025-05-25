<template>
  <div>
    <!-- 悬浮按钮 -->
    <FloatingButton
      type="warning"
      position="left-bottom"
      :offset="{ x: 4, y: 24 }"
      :visible="store.hasOcrResult || store.currentFiles.length > 0"
      :tooltip="i18n.t('addMaskingArea')"
      @click="openMaskingModal"
    >
      <template #icon>
        <FloatingButtonIcons type="masking" />
      </template>
    </FloatingButton>

    <!-- 遮挡工具浮窗 -->
    <div v-if="isModalOpen" class="masking-modal">
      <div class="masking-modal-content bg-base-200 shadow-xl">
        <!-- 浮窗顶部工具栏 -->
        <div class="masking-modal-header bg-base-300">
          <div class="flex items-center gap-2">
            <span class="badge badge-accent">{{ i18n.t('maskingMode') }}</span>
            <span class="text-sm">{{ i18n.t('dragToSelectMaskingArea') }}</span>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-sm btn-accent" @click="clearAllMasks">
              {{ i18n.t('clearAll') }}
            </button>
            <button class="btn btn-sm btn-accent" @click="applyMasks">
              {{ i18n.t('apply') }}
            </button>
            <button class="btn btn-sm btn-accent" @click="closeMaskingModal">
              {{ i18n.t('cancel') }}
            </button>
          </div>
        </div>

        <!-- Canvas 容器 -->
        <div class="masking-canvas-container flex flex-col items-center justify-center">
          <div ref="canvasWrapper" class="canvas-wrapper">
            <canvas ref="canvasEl" id="masking-canvas"></canvas>
            <!-- 坐标指示器 -->
            <div class="crosshair-h" ref="crosshairH"></div>
            <div class="crosshair-v" ref="crosshairV"></div>
            <div class="coordinates-display" ref="coordinatesDisplay"></div>

            <!-- 矩形删除按钮列表 -->
            <div
              v-for="(rect, index) in rectangles"
              :key="index"
              class="rect-delete-btn"
              :style="{
                top: `${rect.rect.top}px`,
                left: `${rect.rect.left}px`,
              }"
              @click="deleteRect(index)"
              title="删除此遮挡区域"
            >
              <div class="btn btn-xs btn-circle btn-error">×</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 调试信息 -->
    <div
      v-if="showDebug"
      class="fixed bottom-2 right-2 bg-black text-white p-2 z-50 text-xs max-w-xs overflow-auto max-h-40"
    >
      <p>{{ i18n.t('maskingAreasCount') }}: {{ store.maskedAreas?.length || 0 }}</p>
      <p v-if="originalImageInfo.width">
        原图尺寸: {{ originalImageInfo.width }}x{{ originalImageInfo.height }}
      </p>
      <p v-if="scaleInfo.scaleX">
        缩放比例: X={{ scaleInfo.scaleX.toFixed(3) }}, Y={{ scaleInfo.scaleY.toFixed(3) }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useOcrStore } from '@/stores/ocrStore'
import { useI18nStore } from '@/stores/i18nStore'
import FloatingButton from '@/components/UI/FloatingButton.vue'
import FloatingButtonIcons from '@/components/UI/FloatingButtonIcons.vue'
// 引入fabric.js (确保它在index.html中已全局引入)

// 状态管理
const store = useOcrStore()
const i18n = useI18nStore()

// 浮窗状态
const isModalOpen = ref(false)
const showDebug = ref(false)

// Canvas 相关
const canvas = ref(null)
const canvasEl = ref(null)
const canvasWrapper = ref(null)
const crosshairH = ref(null)
const crosshairV = ref(null)
const coordinatesDisplay = ref(null)

// 记录矩形
const rectangles = ref([])
const currentRect = ref(null)
const isDrawing = ref(false)
const startX = ref(0)
const startY = ref(0)

// 图像信息
const originalImageInfo = ref({
  width: 0,
  height: 0,
})

// 缩放信息
const scaleInfo = ref({
  scaleX: 1,
  scaleY: 1,
})

// 打开遮挡浮窗
const openMaskingModal = () => {
  isModalOpen.value = true
  showDebug.value = false // 默认不显示调试信息

  // 延迟初始化 Canvas，确保 DOM 已更新
  nextTick(() => {
    initCanvas()
  })
}

// 关闭遮挡浮窗
const closeMaskingModal = () => {
  isModalOpen.value = false
  showDebug.value = false

  // 清理资源
  if (canvas.value) {
    canvas.value.dispose()
    canvas.value = null
  }

  // 重置状态
  rectangles.value = []
  currentRect.value = null
}

// 应用遮挡区域
const applyMasks = async () => {
  if (rectangles.value.length === 0) {
    console.log('没有遮挡区域可应用')
    closeMaskingModal()
    return
  }

  try {
    // 将矩形数据转换为遮挡区域并存储到 store
    store.maskedAreas = rectangles.value.map((rect) => {
      return {
        x: Math.round(rect.coords.topLeft.x),
        y: Math.round(rect.coords.topLeft.y),
        width: Math.round(rect.coords.bottomRight.x - rect.coords.topLeft.x),
        height: Math.round(rect.coords.bottomRight.y - rect.coords.topLeft.y),
      }
    })

    console.log('应用遮挡区域:', store.maskedAreas)

    // 创建一个Canvas来实际处理图片
    await processImageWithMasks()

    // 关闭遮挡工具窗口
    closeMaskingModal()
  } catch (error) {
    console.error('应用遮挡区域失败:', error)
  }
}

// 处理图片，实际应用遮挡效果
const processImageWithMasks = async () => {
  return new Promise((resolve, reject) => {
    try {
      // 检查是否有图片和遮挡区域
      if (!store.filePreviewUrl || !store.maskedAreas || store.maskedAreas.length === 0) {
        console.warn('无图片或遮挡区域可处理')
        resolve()
        return
      }

      // 加载原始图片
      const img = new Image()
      img.crossOrigin = 'Anonymous'

      img.onload = () => {
        // 创建一个临时canvas来处理图片
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = img.naturalWidth
        tempCanvas.height = img.naturalHeight
        const ctx = tempCanvas.getContext('2d')

        if (!ctx) {
          console.error('无法获取Canvas上下文')
          reject(new Error('无法获取Canvas上下文'))
          return
        }

        // 绘制原始图片到canvas
        ctx.drawImage(img, 0, 0)

        // 在遮挡区域绘制黑色矩形
        ctx.fillStyle = 'black' // 可以根据需要修改颜色

        store.maskedAreas.forEach((area) => {
          ctx.fillRect(area.x, area.y, area.width, area.height)
        })

        // 将处理后的图像转换为base64
        const processedImageUrl = tempCanvas.toDataURL('image/jpeg')

        // 更新store中的预览URL，替换为处理后的图片
        store.maskedImageUrl = processedImageUrl

        // 更新用于预览和OCR处理的URL
        store.processedPreviewUrl = processedImageUrl

        // 创建一个简单的文件对象，用于OCR处理
        try {
          // 将base64转换为Blob
          const base64Data = processedImageUrl.split(',')[1]
          const blob = base64ToBlob(base64Data, 'image/jpeg')

          // 创建并记录处理后的文件对象，但暂不使用
          console.log('已创建处理后的图片文件，大小:', Math.round(blob.size / 1024), 'KB')
        } catch (error) {
          console.error('创建处理后的文件失败:', error)
          // 即使创建文件失败，我们仍然继续使用处理后的预览URL
        }

        console.log('图片遮挡处理完成，已更新预览URL')
        resolve()
      }

      img.onerror = (error) => {
        console.error('加载图片失败:', error)
        reject(error)
      }

      img.src = store.filePreviewUrl
    } catch (error) {
      console.error('处理图片失败:', error)
      reject(error)
    }
  })
}

// 辅助函数：将base64转换为Blob对象
const base64ToBlob = (base64, mimeType) => {
  const byteCharacters = atob(base64)
  const byteArrays = []

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512)

    const byteNumbers = new Array(slice.length)
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)
    byteArrays.push(byteArray)
  }

  return new Blob(byteArrays, { type: mimeType })
}

// 初始化 Canvas
const initCanvas = async () => {
  if (!canvasWrapper.value) {
    console.error('Canvas容器未找到')
    return
  }

  console.log('初始化Canvas', canvasWrapper.value)

  // 获取当前显示的图片
  let imageUrl
  if (store.filePreviewUrl) {
    imageUrl = store.filePreviewUrl
  } else {
    console.error('没有找到图片预览URL')
    return
  }

  try {
    // 检查 fabric 对象是否存在
    if (typeof window.fabric === 'undefined') {
      console.error('Fabric对象未找到，请确保已全局引入fabric.js')
      return
    }

    // 创建 Canvas
    if (canvas.value) {
      // 如果已存在，则清理
      canvas.value.dispose()
    }

    canvas.value = new window.fabric.Canvas('masking-canvas', {
      selection: false,
      preserveObjectStacking: true,
    })

    if (!canvas.value) {
      console.error('Canvas初始化失败')
      return
    }

    // 设置canvas上的鼠标样式为十字线
    if (canvas.value.wrapperEl) {
      canvas.value.wrapperEl.style.cursor = 'crosshair'
    }

    // 确保upper-canvas也有十字光标样式
    const upperCanvas = document.querySelector('.canvas-container .upper-canvas')
    if (upperCanvas) {
      upperCanvas.style.cursor = 'crosshair'
    }

    // 加载图片
    await loadImageToCanvas(imageUrl)

    // 启用矩形绘制
    enableRectangleDrawing()

    // 如果有已存在的遮挡区域，加载它们
    if (store.maskedAreas && store.maskedAreas.length > 0) {
      loadExistingMasks()
    }
  } catch (error) {
    console.error('初始化Canvas失败:', error)
  }
}

// 加载图片到Canvas
const loadImageToCanvas = (imageUrl) => {
  return new Promise((resolve, reject) => {
    // 先加载图片获取尺寸
    const img = new Image()

    img.onload = () => {
      // 保存原图尺寸
      originalImageInfo.value = {
        width: img.naturalWidth,
        height: img.naturalHeight,
      }

      // 计算Canvas容器的可用尺寸
      const containerHeight = canvasWrapper.value.clientHeight

      // 计算缩放比例，强制让图片高度与容器高度相等
      const scale = containerHeight / img.naturalHeight

      // 计算显示尺寸
      const displayWidth = Math.round(img.naturalWidth * scale)
      const displayHeight = containerHeight

      // 存储缩放比例，用于后续坐标转换
      scaleInfo.value = {
        scaleX: img.naturalWidth / displayWidth,
        scaleY: img.naturalHeight / displayHeight,
      }

      // 设置Canvas尺寸
      if (canvas.value) {
        canvas.value.setWidth(displayWidth)
        canvas.value.setHeight(displayHeight)

        // 设置十字线尺寸
        if (crosshairH.value && crosshairV.value) {
          crosshairH.value.style.width = `${displayWidth}px`
          crosshairV.value.style.height = `${displayHeight}px`
        }

        // 加载图片作为背景
        try {
          window.fabric.Image.fromURL(
            imageUrl,
            (oImg) => {
              if (canvas.value) {
                canvas.value.setBackgroundImage(oImg, canvas.value.renderAll.bind(canvas.value), {
                  scaleX: displayWidth / img.naturalWidth,
                  scaleY: displayHeight / img.naturalHeight,
                })
              }
              resolve()
            },
            { crossOrigin: 'Anonymous' },
          )
        } catch (error) {
          console.error('加载背景图片失败:', error)
          reject(error)
        }
      } else {
        console.error('Canvas未初始化，无法加载图片')
        reject(new Error('Canvas未初始化'))
      }
    }

    img.onerror = (error) => {
      console.error('加载图片失败:', error)
      reject(error)
    }

    img.src = imageUrl
  })
}

// 启用矩形绘制
const enableRectangleDrawing = () => {
  if (!canvas.value) {
    console.error('无法启用绘制，Canvas未初始化')
    return
  }

  console.log('启用矩形绘制')

  // 鼠标移动时不再显示十字线和坐标
  canvas.value.on('mouse:move', function () {
    // 不再调用 updateCrosshair
  })

  // 鼠标进入/离开Canvas - 不再显示十字线
  canvas.value.on('mouse:over', function () {
    // 禁用十字线显示
  })

  canvas.value.on('mouse:out', function () {
    // 禁用十字线显示
  })

  // 鼠标按下时开始绘制
  canvas.value.on('mouse:down', function (o) {
    if (!canvas.value) return

    let pointer
    try {
      pointer = o.pointer || canvas.value.getPointer(o.e)
    } catch (e) {
      console.error('获取鼠标位置失败:', e)
      return
    }

    isDrawing.value = true
    startX.value = pointer.x
    startY.value = pointer.y

    // 使用固定的灰色而非随机色
    const fillColor = 'hsla(0, 0%, 30%, 0.3)' // 深灰色半透明
    const strokeColor = 'hsla(0, 0%, 30%, 0.8)' // 深灰色半透明边框

    // 创建一个新矩形
    try {
      currentRect.value = new window.fabric.Rect({
        left: startX.value,
        top: startY.value,
        width: 0,
        height: 0,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: 1,
        selectable: false,
      })

      canvas.value.add(currentRect.value)
      canvas.value.renderAll()
    } catch (e) {
      console.error('创建矩形失败:', e)
    }
  })

  // 鼠标移动时调整矩形大小
  canvas.value.on('mouse:move', function (o) {
    if (!isDrawing.value || !currentRect.value || !canvas.value) return

    let pointer
    try {
      pointer = o.pointer || canvas.value.getPointer(o.e)
    } catch (e) {
      console.error('获取鼠标位置失败:', e)
      return
    }

    let width = Math.abs(pointer.x - startX.value)
    let height = Math.abs(pointer.y - startY.value)

    if (!width || !height) {
      return
    }

    // 计算矩形的左上角坐标
    let left = pointer.x < startX.value ? pointer.x : startX.value
    let top = pointer.y < startY.value ? pointer.y : startY.value

    // 更新矩形
    currentRect.value.set({
      left: left,
      top: top,
      width: width,
      height: height,
    })

    canvas.value.renderAll()
  })

  // 鼠标释放时完成绘制
  canvas.value.on('mouse:up', function () {
    if (!isDrawing.value || !canvas.value) return
    isDrawing.value = false

    // 如果矩形太小，则删除它
    if (currentRect.value && (currentRect.value.width < 5 || currentRect.value.height < 5)) {
      canvas.value.remove(currentRect.value)
      currentRect.value = null
      return
    }

    if (currentRect.value) {
      // 计算原始坐标
      const coords = calculateCoordinates(currentRect.value)

      // 保存矩形信息
      rectangles.value.push({
        rect: currentRect.value,
        coords: coords,
        stroke: currentRect.value.stroke,
        fill: currentRect.value.fill,
      })

      // 重置当前矩形
      currentRect.value = null
    }
  })
}

// 计算矩形的原图坐标
const calculateCoordinates = (rect) => {
  const left = rect.left * scaleInfo.value.scaleX
  const top = rect.top * scaleInfo.value.scaleY
  const right = (rect.left + rect.width) * scaleInfo.value.scaleX
  const bottom = (rect.top + rect.height) * scaleInfo.value.scaleY

  // 确保坐标不超出原图范围
  const boundedLeft = Math.max(0, Math.min(left, originalImageInfo.value.width))
  const boundedTop = Math.max(0, Math.min(top, originalImageInfo.value.height))
  const boundedRight = Math.max(0, Math.min(right, originalImageInfo.value.width))
  const boundedBottom = Math.max(0, Math.min(bottom, originalImageInfo.value.height))

  // 返回四个角点坐标
  return {
    topLeft: { x: boundedLeft, y: boundedTop },
    topRight: { x: boundedRight, y: boundedTop },
    bottomLeft: { x: boundedLeft, y: boundedBottom },
    bottomRight: { x: boundedRight, y: boundedBottom },
  }
}

// 加载已有的遮挡区域
const loadExistingMasks = () => {
  if (!canvas.value || !store.maskedAreas) return

  store.maskedAreas.forEach((area) => {
    // 使用固定的灰色
    const fillColor = 'hsla(0, 0%, 30%, 0.3)' // 深灰色半透明
    const strokeColor = 'hsla(0, 0%, 30%, 0.8)' // 深灰色半透明边框

    // 转换坐标
    const displayX = area.x / scaleInfo.value.scaleX
    const displayY = area.y / scaleInfo.value.scaleY
    const displayWidth = area.width / scaleInfo.value.scaleX
    const displayHeight = area.height / scaleInfo.value.scaleY

    // 创建矩形
    try {
      const rect = new window.fabric.Rect({
        left: displayX,
        top: displayY,
        width: displayWidth,
        height: displayHeight,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: 1,
        selectable: false,
      })

      // 添加到Canvas
      canvas.value.add(rect)

      // 保存矩形信息
      rectangles.value.push({
        rect: rect,
        coords: {
          topLeft: { x: area.x, y: area.y },
          topRight: { x: area.x + area.width, y: area.y },
          bottomLeft: { x: area.x, y: area.y + area.height },
          bottomRight: { x: area.x + area.width, y: area.y + area.height },
        },
        stroke: strokeColor,
        fill: fillColor,
      })
    } catch (e) {
      console.error('创建已有遮挡区域失败:', e)
    }
  })

  if (canvas.value) {
    canvas.value.renderAll()
  }
}

// 删除矩形
const deleteRect = (index) => {
  if (!canvas.value) return

  if (index >= 0 && index < rectangles.value.length) {
    // 从Canvas中移除
    canvas.value.remove(rectangles.value[index].rect)

    // 从数组中移除
    rectangles.value.splice(index, 1)

    canvas.value.renderAll()
  }
}

// 清除所有遮挡区域
const clearAllMasks = () => {
  if (!canvas.value) return

  // 移除所有矩形
  rectangles.value.forEach((rectInfo) => {
    canvas.value.remove(rectInfo.rect)
  })

  // 清空数组
  rectangles.value = []

  canvas.value.renderAll()
}

// 窗口大小变化时调整Canvas
const handleResize = () => {
  if (!canvas.value || !canvas.value.backgroundImage) return

  // 重新计算并设置Canvas尺寸
  const containerWidth = canvasWrapper.value.clientWidth
  const containerHeight = canvasWrapper.value.clientHeight

  const bgImg = canvas.value.backgroundImage
  const imgWidth = bgImg.width / bgImg.scaleX
  const imgHeight = bgImg.height / bgImg.scaleY

  const scale = Math.min(containerWidth / imgWidth, containerHeight / imgHeight)

  const displayWidth = Math.round(imgWidth * scale)
  const displayHeight = Math.round(imgHeight * scale)

  // 更新缩放比例
  scaleInfo.value = {
    scaleX: originalImageInfo.value.width / displayWidth,
    scaleY: originalImageInfo.value.height / displayHeight,
  }

  // 设置Canvas尺寸
  canvas.value.setWidth(displayWidth)
  canvas.value.setHeight(displayHeight)

  // 调整所有矩形
  rectangles.value.forEach((rectInfo) => {
    const coords = rectInfo.coords
    const displayX = coords.topLeft.x / scaleInfo.value.scaleX
    const displayY = coords.topLeft.y / scaleInfo.value.scaleY
    const displayWidth = (coords.bottomRight.x - coords.topLeft.x) / scaleInfo.value.scaleX
    const displayHeight = (coords.bottomRight.y - coords.topLeft.y) / scaleInfo.value.scaleY

    rectInfo.rect.set({
      left: displayX,
      top: displayY,
      width: displayWidth,
      height: displayHeight,
    })
  })

  // 更新背景图像
  canvas.value.setBackgroundImage(bgImg, canvas.value.renderAll.bind(canvas.value), {
    scaleX: displayWidth / imgWidth,
    scaleY: displayHeight / imgHeight,
  })

  // 设置十字线尺寸
  if (crosshairH.value && crosshairV.value) {
    crosshairH.value.style.width = `${displayWidth}px`
    crosshairV.value.style.height = `${displayHeight}px`
  }

  canvas.value.renderAll()
}

// 快捷键处理
const handleKeyDown = (e) => {
  // Ctrl+Shift+D 切换调试信息
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    showDebug.value = !showDebug.value
  }

  // ESC 关闭浮窗
  if (e.key === 'Escape' && isModalOpen.value) {
    closeMaskingModal()
  }

  // Delete 删除最后一个矩形
  if (e.key === 'Delete' && rectangles.value.length > 0) {
    deleteRect(rectangles.value.length - 1)
  }
}

// 生命周期钩子
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('resize', handleResize)

  // 清理Canvas
  if (canvas.value) {
    canvas.value.dispose()
    canvas.value = null
  }
})
</script>

<style scoped>
.masking-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  z-index: 50;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.masking-modal-content {
  border-radius: 0.5rem;
  width: 95%;
  height: 90%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.masking-modal-header {
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.masking-canvas-container {
  flex: 1;
  display: flex;
  overflow: hidden;
  padding: 1rem;
  max-height: calc(100% - 56px); /* 减去头部工具栏高度 */
}

.canvas-wrapper {
  position: relative;
  overflow: hidden;
  margin: auto;
  max-width: 95%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: crosshair; /* 添加十字光标 */
}

/* 原有的浮动按钮样式已移动到 UI/FloatingButton.vue 组件中 */

/* 坐标指示器 */
.crosshair-h {
  position: absolute;
  height: 1px;
  background-color: rgba(255, 0, 0, 0.5);
  pointer-events: none;
  display: none;
}

.crosshair-v {
  position: absolute;
  width: 1px;
  background-color: rgba(255, 0, 0, 0.5);
  pointer-events: none;
  display: none;
}

.coordinates-display {
  position: absolute;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 4px;
  border-radius: 2px;
  font-size: 12px;
  pointer-events: none;
  display: none;
}

/* 矩形删除按钮样式 */
.rect-delete-btn {
  position: absolute;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 10;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.rect-delete-btn:hover {
  opacity: 1;
}

/* 添加选择器确保Canvas元素及其子元素也有十字光标 */
:deep(.canvas-container),
:deep(.canvas-container canvas) {
  cursor: crosshair !important;
}
</style>
