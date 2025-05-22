<template>
  <div class="image-recognition-tool">
    <!-- 主容器 -->
    <div class="container mx-auto px-4 py-6">
      <!-- 标题和说明 -->
      <div class="mb-6 text-center">
        <h1 class="text-2xl font-bold mb-2">图像识别工具</h1>
        <p class="text-base-content/70">
          上传图片，使用 Google Cloud Vision API 识别图像中的物体和场景
        </p>
      </div>

      <!-- 主要内容区域 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 左侧：上传和控制区域 -->
        <div class="lg:col-span-1">
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">上传图片</h2>
              <p class="text-sm mb-4">支持 JPG、PNG、WEBP 等常见图片格式</p>

              <!-- 文件上传区域 -->
              <div
                class="border-2 border-dashed border-base-300 rounded-box p-6 text-center cursor-pointer hover:bg-base-200 transition-colors"
                @click="triggerFileInput"
                @dragover.prevent="onDragOverHandler"
                @dragleave.prevent="onDragLeaveHandler"
                @drop.prevent="onDropHandler"
                @paste="onPasteHandler"
              >
                <input
                  type="file"
                  ref="fileInput"
                  class="hidden"
                  accept="image/*"
                  @change="handleImageUpload"
                />
                <div class="flex flex-col items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-12 w-12 text-base-content/50 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p class="text-base-content/70">点击或拖放图片到此处</p>
                  <p class="text-xs text-base-content/50 mt-1">也可以粘贴剪贴板中的图片</p>
                </div>
              </div>

              <!-- 状态信息 -->
              <div v-if="statusText" class="mt-4">
                <div
                  class="alert"
                  :class="{
                    'alert-info': isLoading,
                    'alert-success': !isLoading && hasImage,
                    'alert-error': !isLoading && !hasImage && statusText.includes('错误'),
                  }"
                >
                  <span>{{ statusText }}</span>
                </div>
              </div>

              <!-- 识别控制按钮 -->
              <div class="card-actions justify-end mt-4">
                <button
                  class="btn btn-primary"
                  @click="recognizeImage"
                  :disabled="!hasImage || isLoading"
                >
                  <span v-if="isLoading">
                    <span class="loading loading-spinner"></span>
                    处理中...
                  </span>
                  <span v-else>识别图像</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 识别结果列表 -->
          <div v-if="recognitionResults.length > 0" class="card bg-base-100 shadow-xl mt-6">
            <div class="card-body">
              <h2 class="card-title">识别结果</h2>
              <div class="overflow-y-auto max-h-[50vh]">
                <div
                  v-for="(item, index) in recognitionResults"
                  :key="index"
                  class="p-2 border-b border-base-300 hover:bg-base-200 cursor-pointer"
                  @mouseover="highlightObject(item)"
                  @mouseout="unhighlightObject(item)"
                >
                  <div class="flex justify-between items-center">
                    <span class="font-medium">{{ item.description }}</span>
                    <span class="badge badge-primary">{{ (item.score * 100).toFixed(0) }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：图像和识别结果显示区域 -->
        <div class="lg:col-span-2">
          <!-- Canvas容器 -->
          <div class="card bg-base-100 shadow-xl overflow-hidden h-[70vh] lg:h-[80vh]">
            <div class="card-body p-4">
              <div
                ref="canvasContainer"
                class="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-base-300 rounded-box relative"
                :class="{
                  'cursor-pointer hover:bg-base-300 transition-colors': !hasImage,
                  'cursor-default': hasImage,
                }"
              >
                <!-- 图像显示区域 -->
                <canvas ref="canvas" class="max-w-full max-h-full object-contain"></canvas>

                <!-- 加载指示器 -->
                <div
                  v-if="isLoading"
                  class="absolute inset-0 flex items-center justify-center bg-base-100/70"
                >
                  <div class="loading loading-spinner loading-lg"></div>
                </div>

                <!-- 无图像时的提示 -->
                <div v-if="!hasImage && !isLoading" class="text-center p-4">
                  <p class="text-base-content/70">请上传图片以开始识别</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
// 使用全局的 fabric 对象，而不是导入它
// fabric.js 已通过 CDN 在 index.html 中引入

// 状态变量
const fileInput = ref(null)
const canvas = ref(null)
const canvasContainer = ref(null)
const fabricCanvas = ref(null)
const statusText = ref('')
const isLoading = ref(false)
const hasImage = ref(false)
const originalImageWidth = ref(0)
const originalImageHeight = ref(0)
const recognitionResults = ref([])
// 保存Base64图像数据
let currentImageBase64 = null

// 初始化 fabric.js 画布
onMounted(() => {
  // 使用全局的 fabric 对象
  if (window.fabric) {
    fabricCanvas.value = new window.fabric.Canvas(canvas.value, {
      selection: false,
      preserveObjectStacking: true,
    })

    // 监听窗口大小变化，调整画布大小
    window.addEventListener('resize', resizeCanvas)
    resizeCanvas()
  } else {
    console.error('fabric.js 未加载，请检查 CDN 链接')
  }
})

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  if (fabricCanvas.value) {
    fabricCanvas.value.dispose()
  }
})

// 调整画布大小
const resizeCanvas = () => {
  if (!canvasContainer.value || !fabricCanvas.value) return

  const containerWidth = canvasContainer.value.clientWidth
  const containerHeight = canvasContainer.value.clientHeight

  fabricCanvas.value.setWidth(containerWidth)
  fabricCanvas.value.setHeight(containerHeight)
  fabricCanvas.value.renderAll()

  // 如果有图像，重新调整图像大小
  if (hasImage.value) {
    fitImageToCanvas()
  }
}

// 触发文件输入
const triggerFileInput = () => {
  fileInput.value.click()
}

// 处理图片上传
const handleImageUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return
  processImageFile(file)
}

// 处理拖放
const onDragOverHandler = (e) => {
  e.preventDefault()
  canvasContainer.value.classList.add('border-primary')
}

const onDragLeaveHandler = (e) => {
  e.preventDefault()
  canvasContainer.value.classList.remove('border-primary')
}

const onDropHandler = (e) => {
  e.preventDefault()
  canvasContainer.value.classList.remove('border-primary')

  const file = e.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) {
    processImageFile(file)
  }
}

// 处理粘贴
const onPasteHandler = (e) => {
  e.preventDefault()

  // 从剪贴板获取图片
  const clipboardData = e.clipboardData
  const items = clipboardData ? clipboardData.items : null
  if (!items) return

  // 查找图片数据
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile()
      if (file) {
        processImageFile(file)
        break
      }
    }
  }
}

// 将文件转换为Base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = (error) => reject(error)
  })
}

// 统一处理图片文件
const processImageFile = async (file) => {
  try {
    // 显示加载提示
    statusText.value = '正在处理图片，请稍候...'
    hasImage.value = false
    isLoading.value = true

    // 将图片转换为Base64
    const base64Image = await fileToBase64(file)
    console.log('图片已转换为Base64格式')

    // 直接在前端显示图片
    const img = new Image()
    img.onload = () => {
      // 保存原始尺寸
      originalImageWidth.value = img.width
      originalImageHeight.value = img.height

      // 清除画布
      fabricCanvas.value.clear()

      // 创建fabric图像对象
      const fabricImage = new window.fabric.Image(img, {
        selectable: false,
        evented: false,
        lockMovementX: true,
        lockMovementY: true,
        lockRotation: true,
        lockScalingX: true,
        lockScalingY: true,
      })

      // 添加到画布
      fabricCanvas.value.add(fabricImage)
      fitImageToCanvas()

      // 更新状态
      statusText.value = '图片加载成功，可以开始识别'
      hasImage.value = true
      isLoading.value = false

      // 保存Base64图像数据供后续识别使用
      currentImageBase64 = base64Image
    }

    img.onerror = (err) => {
      console.error('图片加载错误:', err)
      statusText.value = '图片加载失败，请重试'
      isLoading.value = false
    }

    // 设置图片源
    img.src = base64Image
  } catch (error) {
    console.error('处理图片错误:', error)
    statusText.value = `错误: ${error.message}`
    hasImage.value = false
    isLoading.value = false
  }
}

// 调整图像大小以适应画布
const fitImageToCanvas = () => {
  if (!fabricCanvas.value) return

  const objects = fabricCanvas.value.getObjects()
  if (objects.length === 0) return

  const image = objects[0]
  if (!image) return

  const canvasWidth = fabricCanvas.value.getWidth()
  const canvasHeight = fabricCanvas.value.getHeight()
  const imgWidth = image.width
  const imgHeight = image.height

  // 计算缩放比例
  const scaleX = canvasWidth / imgWidth
  const scaleY = canvasHeight / imgHeight
  const scale = Math.min(scaleX, scaleY) * 0.9 // 留出一些边距

  // 设置图像缩放和位置
  image.scale(scale)
  image.set({
    left: (canvasWidth - imgWidth * scale) / 2,
    top: (canvasHeight - imgHeight * scale) / 2,
  })

  fabricCanvas.value.renderAll()
}

// 识别图像
const recognizeImage = () => {
  if (!hasImage.value || !currentImageBase64) {
    statusText.value = '请先上传图片'
    return
  }

  statusText.value = '正在识别图像，请稍候...'
  isLoading.value = true
  recognitionResults.value = []

  // 发送识别请求 - 使用Base64图像数据
  console.log('准备发送Base64图像数据', {
    endpoint: '/api/node/recognition/processBase64',
    method: 'POST',
    hasBase64: !!currentImageBase64,
    base64Length: currentImageBase64 ? currentImageBase64.length : 0,
  })

  fetch(`/api/node/recognition/processBase64`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // 包含 cookies
    body: JSON.stringify({
      base64Image: currentImageBase64,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('识别请求失败')
      }
      return response.json()
    })
    .then((data) => {
      console.log('识别结果:', data)
      if (data.success) {
        // 处理识别结果
        statusText.value = '识别完成'

        // 合并标签和对象结果
        const combinedResults = []

        // 处理对象结果（有边界框）
        if (data.results && data.results.objects) {
          data.results.objects.forEach((obj) => {
            combinedResults.push({
              description: obj.name,
              score: obj.score,
              boundingPoly: obj.boundingPoly,
              type: 'object',
            })
          })
        }

        // 处理标签结果（无边界框）
        if (data.results && data.results.labels) {
          data.results.labels.forEach((label) => {
            // 只添加那些不在对象中的标签
            const isDuplicate = combinedResults.some(
              (item) => item.description.toLowerCase() === label.description.toLowerCase(),
            )
            if (!isDuplicate) {
              combinedResults.push({
                description: label.description,
                score: label.score,
                type: 'label',
              })
            }
          })
        }

        // 更新结果
        recognitionResults.value = combinedResults

        // 在画布上绘制识别结果
        drawRecognitionResults(combinedResults)
      } else {
        statusText.value = `错误: ${data.error || '识别失败'}`
      }
      isLoading.value = false
    })
    .catch((error) => {
      console.error('识别错误:', error)
      statusText.value = `错误: ${error.message}`
      isLoading.value = false
    })
}

// 在画布上绘制识别结果
const drawRecognitionResults = (results) => {
  if (!fabricCanvas.value) return

  // 获取图像对象
  const objects = fabricCanvas.value.getObjects()
  if (objects.length === 0) return

  const image = objects[0]
  if (!image) return

  // 清除之前的识别结果
  fabricCanvas.value
    .getObjects()
    .slice(1)
    .forEach((obj) => {
      fabricCanvas.value.remove(obj)
    })

  // 绘制新的识别结果
  results.forEach((result, index) => {
    // 只处理有边界框的对象
    if (!result.boundingPoly || result.type === 'label') return

    // 处理不同类型的边界多边形
    let vertices = []

    if (result.boundingPoly.normalizedVertices) {
      // 处理标准化顶点
      vertices = result.boundingPoly.normalizedVertices
    } else if (result.boundingPoly.vertices) {
      // 处理非标准化顶点 - 需要转换为标准化坐标
      vertices = result.boundingPoly.vertices.map((v) => ({
        x: v.x / originalImageWidth.value,
        y: v.y / originalImageHeight.value,
      }))
    }

    if (vertices.length < 3) return

    // 创建多边形点
    const points = vertices.map((vertex) => ({
      x: image.left + image.width * image.scaleX * vertex.x,
      y: image.top + image.height * image.scaleY * vertex.y,
    }))

    // 创建矩形
    const rect = new window.fabric.Polygon(points, {
      stroke: `hsl(${(index * 30) % 360}, 80%, 60%)`,
      strokeWidth: 2,
      fill: `hsla(${(index * 30) % 360}, 80%, 60%, 0.2)`,
      objectCaching: false,
      selectable: false,
      evented: false,
      id: `object_${index}`,
    })

    // 添加到画布
    fabricCanvas.value.add(rect)
  })

  fabricCanvas.value.renderAll()
}

// 高亮显示对象
const highlightObject = (item) => {
  if (!fabricCanvas.value) return

  const index = recognitionResults.value.indexOf(item)
  const objectId = `object_${index}`

  // 查找对应的对象
  const obj = fabricCanvas.value.getObjects().find((o) => o.id === objectId)
  if (!obj) return

  // 保存原始样式
  if (!obj._originalStyle) {
    obj._originalStyle = {
      strokeWidth: obj.strokeWidth,
      stroke: obj.stroke,
      fill: obj.fill,
    }
  }

  // 设置高亮样式
  obj.set({
    strokeWidth: 4,
    stroke: obj.stroke.replace('60%', '50%'),
    fill: obj.fill.replace('0.2', '0.5'),
  })

  // 确保对象在顶层
  fabricCanvas.value.bringToFront(obj)
  fabricCanvas.value.renderAll()
}

// 取消高亮显示
const unhighlightObject = (item) => {
  if (!fabricCanvas.value) return

  const index = recognitionResults.value.indexOf(item)
  const objectId = `object_${index}`

  // 查找对应的对象
  const obj = fabricCanvas.value.getObjects().find((o) => o.id === objectId)
  if (!obj || !obj._originalStyle) return

  // 恢复原始样式
  obj.set({
    strokeWidth: obj._originalStyle.strokeWidth,
    stroke: obj._originalStyle.stroke,
    fill: obj._originalStyle.fill,
  })

  fabricCanvas.value.renderAll()
}
</script>

<style scoped>
.image-recognition-tool {
  min-height: calc(100vh - 64px);
}
</style>
