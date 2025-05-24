<template>
  <div class="min-h-screen bg-base-200 flex flex-col">
    <!-- 内容容器 -->
    <div class="container mx-auto px-4 py-6 w-full max-w-full">
      <!-- 标题部分和主题切换 -->
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-accent-focus dark:text-white">文档解析</h1>
        <div class="tooltip" data-tip="切换主题">
          <ThemeToggle />
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-4">
        <!-- 左侧：图片上传和预览区域 -->
        <div class="lg:w-2/3 order-2 lg:order-1">
          <!-- 功能按钮区域 -->
          <div class="card bg-base-100 shadow-xl mb-4">
            <div class="card-body p-4">
              <!-- 修改按钮样式，确保它不是占满整个宽度 -->
              <div class="flex space-x-2">
                <button
                  v-if="hasImage"
                  class="btn btn-accent btn-sm px-4 inline-flex items-center"
                  @click="refreshPage"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>换一张</span>
                </button>

                <!-- 绘制模式切换按钮 -->
                <button
                  v-if="hasImage"
                  class="btn btn-sm"
                  :class="{ 'btn-primary': isDrawingMode, 'btn-outline': !isDrawingMode }"
                  @click="toggleDrawingMode"
                >
                  <span v-if="isDrawingMode">绘制模式: 开启</span>
                  <span v-else>绘制模式: 关闭</span>
                </button>
                <!-- 清空矩形按钮 -->
                <button
                  v-if="hasImage"
                  class="btn btn-error btn-sm px-4 inline-flex items-center"
                  @click="clearAllRectangles"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span>清空矩形</span>
                </button>
                <input
                  type="file"
                  ref="fileInput"
                  accept="image/*"
                  class="hidden"
                  @change="handleImageUpload"
                />
              </div>
            </div>
          </div>

          <!-- Canvas容器 -->
          <div class="card bg-base-100 shadow-xl overflow-hidden h-[70vh] lg:h-[80vh]">
            <div class="card-body p-4">
              <div
                ref="canvasContainer"
                class="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-base-300 rounded-box relative"
                @dragover.prevent="onDragOverHandler"
                @dragleave.prevent="onDragLeaveHandler"
                @drop.prevent="onDropHandler"
                @paste="onPasteHandler"
                @click="onCanvasClick"
                tabindex="0"
                :class="{
                  'cursor-pointer hover:bg-base-300 transition-colors': !hasImage,
                  'cursor-default': hasImage,
                }"
              >
                <!-- 使用矩形绘制工具子组件 -->
                <RectangleDrawingTool
                  ref="rectangleDrawingTool"
                  :hasImage="hasImage"
                  :originalImageWidth="originalImageWidth"
                  :originalImageHeight="originalImageHeight"
                  :containerWidth="canvasContainer?.clientWidth || 0"
                  :containerHeight="canvasContainer?.clientHeight || 0"
                  :currentImageId="currentImageId"
                  :rectangles="rectangles"
                  :isDrawingMode="isDrawingMode"
                  @rectangle-created="handleRectangleCreated"
                  @rectangle-moved="handleRectangleMoved"
                  @rectangle-selected="handleRectangleSelected"
                  @rectangle-unhighlighted="handleRectangleUnhighlighted"
                  @rectangle-deleted="handleRectangleDeleted"
                  @rectangle-modified="handleRectangleModified"
                />
                <div v-if="!hasImage" class="text-center">
                  <!-- 显示加载状态或上传提示 -->
                  <div v-if="isLoading" class="flex flex-col items-center justify-center">
                    <span class="loading loading-bars loading-xl text-accent mb-4"></span>
                    <p class="text-base-content/60 italic">
                      {{ statusText }}
                    </p>
                  </div>
                  <div v-else>
                    <div class="text-5xl text-base-content/30 mb-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-24 w-24 mx-auto"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="1"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <p class="text-base-content/60 italic mb-2">
                      {{ statusText }}
                    </p>
                    <p class="text-base-content/60 text-sm">
                      点击此区域选择图片，或拖放图片到此处，也可以直接粘贴图片
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：坐标信息 -->
        <RectangleCard
          class="lg:w-1/3 order-1 lg:order-2 mb-4 lg:mb-0"
          :rectangles="rectangles"
          :original-image-width="originalImageWidth"
          :original-image-height="originalImageHeight"
          :image-id="currentImageId"
          :extracting-all-text="extractingAllText"
          :submitting="submitting"
          @highlight="highlightRect"
          @unhighlight="unhighlightRect"
          @text-extracted="handleTextExtracted"
          @update-rect="handleUpdateRect"
          @extract-all-text="extractAllText"
          @submit-crop="submitCrop"
          @extract-text-for-rect="extractTextForRect"
          @filter-changed="handleFilterChanged"
        />
      </div>
    </div>

    <!-- 结果对话框 -->
    <ResultDialog
      :show="showResultDialog"
      :result-data="resultData"
      @close="showResultDialog = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import RectangleDrawingTool from './RectangleDrawingTool.vue'
import RectangleCard from './RectangleCard.vue'
import ResultDialog from './ResultDialog.vue'
import ThemeToggle from '../common/ThemeToggle.vue'
// 引入API服务
import * as docDetectService from '@/services/docDetectService'

// 响应式状态
const fileInput = ref(null)
const canvasContainer = ref(null)
const rectangleDrawingTool = ref(null)
const hasImage = ref(false)
const isLoading = ref(false) // 是否正在加载图片
const statusText = ref('请上传或拖入图片，也可以直接粘贴')
const originalImageWidth = ref(0)
const originalImageHeight = ref(0)
const rectangles = ref([])
const currentImageId = ref(null)
const submitting = ref(false)
const extractingAllText = ref(false) // 是否正在进行全局OCR
const isDrawingMode = ref(false) // 是否处于绘制模式

// 筛选和排序状态已移至 RectangleCard 组件

// 结果对话框状态
const showResultDialog = ref(false)
const resultData = ref(null)

// 主题切换功能已移至ThemeToggle组件

// 切换绘制模式
const toggleDrawingMode = () => {
  isDrawingMode.value = !isDrawingMode.value
  console.log('绘制模式:', isDrawingMode.value ? '开启' : '关闭')

  // 调用子组件的方法切换绘制模式
  if (rectangleDrawingTool.value) {
    rectangleDrawingTool.value.toggleDrawingMode()
  }
}

// 处理子组件事件
const handleRectangleCreated = (rectInfo) => {
  // 创建完整的矩形数据对象
  const newRect = {
    id: rectInfo.id,
    coords: rectInfo.coords,
    fabricObject: rectInfo.fabricObject,
    class: rectInfo.class || 'unknown',
    confidence: rectInfo.confidence || 1.0,
    showJson: true,
    showText: false,
    isHighlighted: false,
    ocrText: null,
    ocrProcessing: false,
    isUserDrawn: !rectInfo.isAutoDetected,
    isAutoDetected: rectInfo.isAutoDetected || false,
    colorHue: rectInfo.colorHue,
    color: rectInfo.color, // 保存十六进制颜色用于卡片显示
  }

  rectangles.value.push(newRect)

  // 更新坐标管理器
  docDetectService.addRectangle(newRect)
}

const handleRectangleMoved = (moveInfo) => {
  // 更新矩形坐标
  const index = rectangles.value.findIndex((r) => r.id === moveInfo.id)
  if (index !== -1) {
    rectangles.value[index].coords = moveInfo.coords
  }
}

const handleRectangleSelected = (rect) => {
  // 调用统一的高亮方法
  highlightRect(rect)
}

const handleRectangleUnhighlighted = (rect) => {
  // 调用统一的取消高亮方法
  unhighlightRect(rect)
}

const handleRectangleDeleted = (rect) => {
  // 从Canvas中删除矩形（通过子组件）
  if (rectangleDrawingTool.value) {
    rectangleDrawingTool.value.deleteRectangle(rect)
  }

  // 从数据中移除
  const index = rectangles.value.findIndex((r) => r.id === rect.id)
  if (index !== -1) {
    rectangles.value.splice(index, 1)
  }

  // 更新坐标管理器
  docDetectService.removeRectangle(rect.id)
}

const handleRectangleModified = (modifyInfo) => {
  // 更新矩形坐标（拖拽或调整大小后）
  const index = rectangles.value.findIndex((r) => r.id === modifyInfo.id)
  if (index !== -1) {
    rectangles.value[index].coords = modifyInfo.coords
    console.log('矩形坐标已更新:', modifyInfo.id, modifyInfo.coords)
  }
}

// 组件挂载
onMounted(() => {
  // 主题初始化已移至ThemeToggle组件

  // 可以在开发环境中测试后端连接
  if (process.env.NODE_ENV === 'development') {
    testBackendConnection()
  }

  // 确保文件输入框始终可用
  nextTick(() => {
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  })

  // 筛选列表初始化已移至 RectangleCard 组件
})

// 换一张图片 - 重置到上传界面
const refreshPage = () => {
  // 清空所有状态
  hasImage.value = false
  isLoading.value = false
  statusText.value = '请上传或拖入图片，也可以直接粘贴'
  originalImageWidth.value = 0
  originalImageHeight.value = 0
  rectangles.value = []
  currentImageId.value = null
  submitting.value = false
  extractingAllText.value = false
  isDrawingMode.value = false
  showResultDialog.value = false
  resultData.value = null

  // 清空画布
  if (rectangleDrawingTool.value) {
    rectangleDrawingTool.value.clearCanvas()
  }

  // 清空文件输入
  if (fileInput.value) {
    fileInput.value.value = ''
  }

  // 重置坐标管理器
  docDetectService.initializeCoordinateManager(null)
}

// 筛选和排序事件处理已移至 RectangleCard 组件

// 全局OCR提取
const extractAllText = async () => {
  try {
    // 使用坐标管理服务准备提取数据
    const extractData = docDetectService.prepareSubmitData()

    // 防止重复提取
    if (extractingAllText.value) return
    extractingAllText.value = true

    // 为所有有效矩形设置ocr处理状态
    const activeRects = docDetectService.getActiveRectangles()
    activeRects.forEach((activeRect) => {
      const rect = rectangles.value.find((r) => r.id === activeRect.id)
      if (rect) {
        // 跳过figure类型，其他类型标记为正在处理
        if (rect.class !== 'figure') {
          rect.ocrProcessing = true
        }
        // 自动切换到文本视图
        rect.showText = true
        rect.showJson = false
      }
    })

    // 使用服务提取文本
    const data = await docDetectService.extractText(extractData)

    extractingAllText.value = false

    if (data.success) {
      // 处理OCR结果
      if (data.results && Array.isArray(data.results)) {
        // 更新每个矩形的OCR结果
        data.results.forEach((result) => {
          const rect = rectangles.value.find((r) => r.id === result.id)
          if (rect) {
            rect.ocrProcessing = false

            if (rect.class === 'figure') {
              // 对于figure类型，设置特殊文本
              rect.ocrText = '这是一张图片'
            } else {
              // 对于其他类型，设置OCR结果
              rect.ocrText = result.text || '无法识别文本'
            }
          }
        })
      }
    } else {
      // 清除所有矩形的处理状态
      rectangles.value.forEach((rect) => {
        rect.ocrProcessing = false
      })
      alert(`错误: ${data.error || '提取失败'}`)
    }
  } catch (error) {
    extractingAllText.value = false
    // 清除所有矩形的处理状态
    rectangles.value.forEach((rect) => {
      rect.ocrProcessing = false
    })
    console.error('提取错误:', error)
    alert(`错误: ${error.message}`)
  }
}

// 批量切割提交
const submitCrop = async () => {
  try {
    // 使用坐标管理服务准备提交数据
    const submitData = docDetectService.prepareSubmitData()

    // 防止重复提交
    if (submitting.value) return
    submitting.value = true

    // 使用服务提交切割请求
    const data = await docDetectService.cropImage(submitData)

    if (data.success) {
      // 显示结果对话框
      handleShowResultDialog(data)
    } else {
      alert(`错误: ${data.error || '处理失败'}`)
    }
  } catch (error) {
    console.error('提交错误:', error)
    alert(`错误: ${error.message}`)
  } finally {
    submitting.value = false
  }
}

// 单个矩形OCR提取
const extractTextForRect = async (rect) => {
  // 如果是图片类型，直接设置特殊文本
  if (rect.class === 'figure') {
    const updatedRect = {
      ...rect,
      ocrText: '这是一张图片',
      showText: true,
      showJson: false,
    }
    handleUpdateRect(updatedRect)
    return
  }

  // 防止重复提取
  if (rect.ocrProcessing) return

  // 设置处理状态
  const processingRect = {
    ...rect,
    ocrProcessing: true,
    showText: true,
    showJson: false,
  }
  handleUpdateRect(processingRect)

  // 准备提取数据
  const extractData = {
    image_id: currentImageId.value,
    rectangles: [
      {
        id: rect.id,
        class: rect.class || 'unknown',
        confidence: rect.confidence || 1.0,
        coords: rect.coords,
      },
    ],
  }

  try {
    // 使用服务提取文本
    const data = await docDetectService.extractText(extractData)

    let updatedRect = { ...rect, ocrProcessing: false }

    if (data.success && data.results && Array.isArray(data.results)) {
      // 查找对应的结果
      const result = data.results.find((r) => r.id === rect.id)
      if (result) {
        updatedRect.ocrText = result.text || '无法识别文本'
      } else {
        updatedRect.ocrText = '无法识别文本'
      }
    } else {
      updatedRect.ocrText = '提取失败'
    }

    // 更新矩形数据
    handleUpdateRect(updatedRect)
  } catch (error) {
    const errorRect = {
      ...rect,
      ocrProcessing: false,
      ocrText: `提取出错: ${error.message}`,
    }
    handleUpdateRect(errorRect)
    console.error('OCR提取错误:', error)
  }
}

// 筛选、排序和画布可见性更新逻辑已移至 RectangleCard 组件

// 主题初始化功能已移至ThemeToggle组件

// 拖放相关事件处理 - 使用封装方法避免模板中的语法错误
const onDragOverHandler = (e) => {
  if (!hasImage.value) {
    onDragOver(e)
  }
}

const onDragLeaveHandler = (e) => {
  if (!hasImage.value) {
    onDragLeave(e)
  }
}

const onDropHandler = (e) => {
  if (!hasImage.value) {
    onDrop(e)
  }
}

const onPasteHandler = (e) => {
  if (!hasImage.value) {
    onPaste(e)
  }
}

const onCanvasClick = () => {
  if (!hasImage.value) {
    triggerFileInput()
  }
}

// 当文件拖动到元素上时
const onDragOver = (e) => {
  e.preventDefault()
  if (!canvasContainer.value) return

  canvasContainer.value.classList.add('border-accent')
  canvasContainer.value.classList.add('border-solid')
  canvasContainer.value.classList.remove('border-dashed')

  // 更新状态文本
  statusText.value = '松开鼠标上传图片'
}

// 当文件拖动离开元素时
const onDragLeave = (e) => {
  e.preventDefault()
  if (!canvasContainer.value) return

  canvasContainer.value.classList.remove('border-accent')
  canvasContainer.value.classList.remove('border-solid')
  canvasContainer.value.classList.add('border-dashed')

  // 恢复状态文本
  statusText.value = '请上传或拖入图片'
}

// 当文件被拖放到元素上时
const onDrop = (e) => {
  e.preventDefault()

  // 重置样式
  if (canvasContainer.value) {
    canvasContainer.value.classList.remove('border-accent')
    canvasContainer.value.classList.remove('border-solid')
    canvasContainer.value.classList.add('border-dashed')
  }

  // 获取文件
  const files = e.dataTransfer.files
  if (files.length === 0) return

  const file = files[0]
  // 检查是否为图片文件
  if (!file.type.startsWith('image/')) {
    statusText.value = '只支持图片文件'
    return
  }

  // 处理图片文件
  processImageFile(file)
}

// 处理粘贴事件
const onPaste = (e) => {
  e.preventDefault()

  // 从剪贴板获取图片
  const items = (e.clipboardData || window.clipboardData).items
  if (!items) return

  // 查找图片数据
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile()
      if (file) {
        // 处理图片文件
        processImageFile(file)
        break
      }
    }
  }
}

// 处理图片上传
const handleImageUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  // 使用统一的图片处理函数
  await processImageFile(file)
}

// 统一处理图片文件
const processImageFile = async (file) => {
  // 创建FormData对象，用于发送到后端
  const formData = new FormData()
  formData.append('file', file)

  // 显示加载提示
  statusText.value = '正在上传并分析图片，请稍候...'
  hasImage.value = false
  isLoading.value = true

  try {
    // 使用服务上传图片
    const data = await docDetectService.uploadImage(formData)

    if (data.success) {
      // 保存图片信息
      currentImageId.value = data.image_id

      // 初始化坐标管理器
      docDetectService.initializeCoordinateManager(data.image_id)

      // 加载检测结果图片
      const img = new Image()
      img.onload = () => {
        // 保存原图尺寸
        originalImageWidth.value = data.width
        originalImageHeight.value = data.height

        // 使用子组件设置Canvas
        if (rectangleDrawingTool.value) {
          // 设置Canvas尺寸
          rectangleDrawingTool.value.setupCanvas(img)

          // 加载图片到Canvas
          rectangleDrawingTool.value.loadImageToCanvas(img)
        }

        // 更新UI状态
        hasImage.value = true
        isLoading.value = false
        if (canvasContainer.value) {
          canvasContainer.value.classList.add('border-accent')
          canvasContainer.value.classList.remove('border-dashed')
          canvasContainer.value.classList.add('border-solid')
        }

        // 重置矩形列表
        rectangles.value = []

        // 渲染检测到的矩形
        if (data.rectangles && data.rectangles.length > 0 && rectangleDrawingTool.value) {
          rectangleDrawingTool.value.renderDetectedRectangles(data.rectangles)

          // 等待矩形渲染完成后，更新坐标管理器
          setTimeout(() => {
            docDetectService.updateAllRectangles(rectangles.value)
          }, 100)
        }
      }

      // 使用图片代理服务
      const proxyUrl = `/api/python/images/${data.image_id}`
      img.src = proxyUrl

      img.onerror = (err) => {
        console.error('图片加载错误:', err)
        statusText.value = '图片加载失败，请重试'
      }
    } else {
      statusText.value = `错误: ${data.error || '上传失败'}`
      hasImage.value = false
      isLoading.value = false
    }
  } catch (error) {
    console.error('上传错误:', error)
    statusText.value = `错误: ${error.message}`
    hasImage.value = false
    isLoading.value = false
  }
}

// 测试后端连接
const testBackendConnection = async () => {
  try {
    await docDetectService.testBackendConnection()
  } catch (error) {
    console.error('测试连接失败:', error)
  }
}

// 删除矩形功能已移至键盘事件处理（退格键）

// 获取矩形颜色的功能已移至RectangleCard组件

// 格式化矩形数据为JSON字符串的功能已移至RectangleCard组件

// 高亮矩形
const highlightRect = (rect) => {
  // 先清除所有矩形的高亮状态
  rectangles.value.forEach((r) => {
    if (r.id !== rect.id && r.isHighlighted) {
      unhighlightRect(r)
    }
  })

  // 使用子组件的方法高亮矩形
  if (rectangleDrawingTool.value) {
    rectangleDrawingTool.value.highlightRect(rect)
  }

  // 标记为高亮状态
  rect.isHighlighted = true
}

// 取消高亮矩形
const unhighlightRect = (rect) => {
  // 使用子组件的方法取消高亮矩形
  if (rectangleDrawingTool.value) {
    rectangleDrawingTool.value.unhighlightRect(rect)
  }

  // 取消高亮状态标记
  rect.isHighlighted = false
}

// 触发文件输入
const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.value = '' // 清空文件输入，确保可以重复选择同一文件
    fileInput.value.click()
  }
}

// 清空所有矩形（只清空矩形，保留图片）
const clearAllRectangles = () => {
  if (rectangleDrawingTool.value) {
    // 调用子组件的方法清空所有矩形（只清空矩形，不清空图片）
    rectangleDrawingTool.value.clearRectangles()

    // 清空父组件中的矩形数组
    rectangles.value = []

    // 更新坐标管理器
    docDetectService.clearAllRectangles()
  }
}

// 处理矩形更新事件
const handleUpdateRect = (updatedRect) => {
  const index = rectangles.value.findIndex((r) => r.id === updatedRect.id)
  if (index !== -1) {
    rectangles.value[index] = updatedRect
  }
}

// 处理文本提取完成事件
const handleTextExtracted = (rect) => {
  console.log('文本提取完成:', rect.id, rect.ocrText)
}

// 处理筛选变化事件
const handleFilterChanged = (filterData) => {
  console.log('筛选状态变化:', filterData)

  // 更新画布显示
  if (rectangleDrawingTool.value) {
    if (filterData.filter === 'all') {
      // 显示所有矩形
      rectangleDrawingTool.value.showAllRectangles()
      // 设置所有矩形为有效
      docDetectService.setActiveRectangles(rectangles.value)
    } else {
      // 只显示筛选后的矩形
      rectangleDrawingTool.value.updateVisibleRectangles(filterData.filteredRectangles)
      // 设置筛选后的矩形为有效
      docDetectService.setActiveRectangles(filterData.filteredRectangles)
    }
  }
}

// 切割提交事件处理已移至主组件的 submitCrop 函数

// 处理显示结果对话框事件
const handleShowResultDialog = (data) => {
  // 将完整的结果数据传递给对话框组件
  resultData.value = data

  // 显示结果对话框
  showResultDialog.value = true
}
</script>

<style>
/* 添加全局主题过渡效果 */
.theme-transition,
.theme-transition * {
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease,
    box-shadow 0.3s ease !important;
}

/* 确保黑暗主题正确应用 */
.dark-theme {
  color-scheme: dark;
}
</style>
